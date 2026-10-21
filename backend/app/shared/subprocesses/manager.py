"""
StreamLab Subprocess and Media Process Manager.
Supervises FFmpeg and MediaMTX background processes with bounded retries and clean shutdowns.
"""

import asyncio
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from backend.app.shared.configuration.config import settings
from backend.app.shared.logging.logger import get_logger

logger = get_logger(__name__, feature="subprocesses")


class ProcessInfo:
    def __init__(self, camera_id: str, command: List[str], on_exit: Optional[Callable[[str, int], Any]] = None):
        self.camera_id = camera_id
        self.command = command
        self.process: Optional[asyncio.subprocess.Process] = None
        self.start_time: Optional[datetime] = None
        self.restart_count: int = 0
        self.last_error: Optional[str] = None
        self.should_run: bool = True
        self.on_exit = on_exit
        self.task: Optional[asyncio.Task] = None


class SubprocessManager:
    def __init__(self):
        self.processes: Dict[str, ProcessInfo] = {}
        self.mediamtx_process: Optional[asyncio.subprocess.Process] = None
        self._mediamtx_task: Optional[asyncio.Task] = None

    async def start_mediamtx(self) -> None:
        """Start or verify MediaMTX media server."""
        # If running in containerized environment where mediamtx is external
        if getattr(settings, "MEDIAMTX_HOST", "127.0.0.1") not in ("127.0.0.1", "localhost"):
            logger.info(f"MediaMTX host is set to external host '{settings.MEDIAMTX_HOST}'. Skipping embedded process startup.")
            return

        try:
            import httpx
            async with httpx.AsyncClient(timeout=1.0) as client:
                res = await client.get(f"{settings.MEDIAMTX_API_URL}/v3/config/global/get")
                if res.status_code in (200, 401):
                    logger.info("MediaMTX is already running externally.")
                    return
        except Exception:
            pass

        mediamtx_bin = self.find_binary("mediamtx")
        config_file = str(settings.PROJECT_ROOT / "config" / "mediamtx" / "mediamtx.yml")
        cmd = [mediamtx_bin, config_file]

        logger.info(f"Starting embedded MediaMTX: {' '.join(cmd)}")
        self.mediamtx_process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        # Wait for MediaMTX API to become responsive
        for _ in range(15):
            await asyncio.sleep(0.3)
            try:
                import httpx
                async with httpx.AsyncClient(timeout=0.5) as client:
                    res = await client.get(f"{settings.MEDIAMTX_API_URL}/v3/config/global/get")
                    if res.status_code == 200:
                        logger.info("MediaMTX server started and verified ready.")
                        return
            except Exception:
                pass
        logger.warning("MediaMTX started but health check timed out.")

    def find_binary(self, name: str) -> str:
        """Find an executable in local bin/, system PATH, or standard OS paths."""
        is_windows = os.name == "nt"
        exe_name = f"{name}.exe" if is_windows else name

        candidates = [
            str(settings.BIN_DIR / exe_name),
            str(settings.BIN_DIR / name),
            exe_name,
            name,
        ]

        if is_windows:
            candidates.extend([
                rf"C:\Program Files\ffmpeg\bin\{exe_name}",
                rf"C:\ffmpeg\bin\{exe_name}",
                rf"C:\Users\noman\AppData\Local\Programs\ffmpeg\bin\{exe_name}",
            ])
        else:
            candidates.extend([
                f"/usr/local/bin/{name}",
                f"/usr/bin/{name}",
            ])

        for c in candidates:
            if os.path.isfile(c) and (is_windows or os.access(c, os.X_OK)):
                return str(Path(c).resolve())
            found = shutil.which(c)
            if found:
                return str(Path(found).resolve())

        # If running inside WSL, or if binary is named directly
        found = shutil.which(name)
        if found:
            return str(Path(found).resolve())

        raise FileNotFoundError(f"Binary '{name}' not found. Please ensure it is installed or placed in bin/.")

    def find_font(self) -> Optional[str]:
        """Locate a usable TrueType font for FFmpeg drawtext."""
        if settings.DEFAULT_FONT and os.path.isfile(settings.DEFAULT_FONT):
            return settings.DEFAULT_FONT

        if os.name == "nt":
            windir = os.environ.get("WINDIR", r"C:\Windows")
            candidates = [
                rf"{windir}\Fonts\arial.ttf",
                rf"{windir}\Fonts\segoeui.ttf",
                rf"{windir}\Fonts\consola.ttf",
            ]
        else:
            candidates = [
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
                "/usr/share/fonts/dejavu/DejaVuSans.ttf",
            ]

        for c in candidates:
            if os.path.isfile(c):
                return c
        return None

    async def probe_media(self, path_or_url: str) -> Dict[str, Any]:
        """Run ffprobe asynchronously and return parsed media stream metadata."""
        ffprobe = self.find_binary("ffprobe")
        cmd = [
            ffprobe,
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            path_or_url,
        ]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode != 0:
            err = stderr.decode(errors="replace").strip()
            raise RuntimeError(f"FFprobe failed with code {proc.returncode}: {err}")

        return json.loads(stdout.decode(errors="replace"))

    async def start_camera_stream(
        self,
        camera_id: str,
        cmd: List[str],
        on_exit: Optional[Callable[[str, int], Any]] = None,
    ) -> None:
        """Start a supervised FFmpeg streaming worker for a camera."""
        await self.stop_camera_stream(camera_id)

        info = ProcessInfo(camera_id, cmd, on_exit=on_exit)
        self.processes[camera_id] = info
        info.task = asyncio.create_task(self._supervise_worker(info))

    async def _supervise_worker(self, info: ProcessInfo) -> None:
        """Worker loop that restarts the stream with bounded exponential backoff."""
        max_retries = 5
        base_delay = 1.0

        while info.should_run:
            try:
                logger.info(f"Starting camera process: {info.camera_id}", extra={"camera_id": info.camera_id})
                info.start_time = datetime.now(timezone.utc)
                info.process = await asyncio.create_subprocess_exec(
                    *info.command,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, stderr = await info.process.communicate()
                return_code = info.process.returncode

                if not info.should_run:
                    break

                err_msg = stderr.decode(errors="replace").strip()
                info.last_error = err_msg or f"Exited with code {return_code}"
                logger.warning(
                    f"Camera process {info.camera_id} exited with code {return_code}: {info.last_error[:200]}",
                    extra={"camera_id": info.camera_id},
                )

                if info.on_exit:
                    try:
                        res = info.on_exit(info.camera_id, return_code)
                        if asyncio.iscoroutine(res):
                            await res
                    except Exception as e:
                        logger.error(f"Error in on_exit callback: {e}")

                info.restart_count += 1
                if info.restart_count > max_retries:
                    logger.error(
                        f"Camera {info.camera_id} exceeded max retries ({max_retries}). Marking failed.",
                        extra={"camera_id": info.camera_id},
                    )
                    info.should_run = False
                    break

                backoff = min(base_delay * (2 ** (info.restart_count - 1)), 16.0)
                await asyncio.sleep(backoff)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Unexpected supervisor error for {info.camera_id}: {e}")
                await asyncio.sleep(2.0)

    async def stop_camera_stream(self, camera_id: str) -> None:
        """Gracefully stop and clean up a camera streaming worker."""
        info = self.processes.pop(camera_id, None)
        if not info:
            return

        info.should_run = False
        if info.task and not info.task.done():
            info.task.cancel()

        if info.process and info.process.returncode is None:
            try:
                info.process.terminate()
                await asyncio.wait_for(info.process.wait(), timeout=3.0)
            except (asyncio.TimeoutError, ProcessLookupError):
                try:
                    info.process.kill()
                except ProcessLookupError:
                    pass

    async def stop_all(self) -> None:
        """Stop all running camera workers and media processes."""
        camera_ids = list(self.processes.keys())
        for cid in camera_ids:
            await self.stop_camera_stream(cid)

        if self.mediamtx_process and self.mediamtx_process.returncode is None:
            try:
                self.mediamtx_process.terminate()
                await asyncio.wait_for(self.mediamtx_process.wait(), timeout=3.0)
            except Exception:
                try:
                    self.mediamtx_process.kill()
                except Exception:
                    pass


process_manager = SubprocessManager()
