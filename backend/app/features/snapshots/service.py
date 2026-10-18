"""
Snapshot Extraction Service.
Extracts live JPEG frames on demand from the camera stream or video source using FFmpeg.
"""

import asyncio
from pathlib import Path
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.features.cameras.models import CameraModel
from backend.app.features.video_sources.models import VideoSourceModel
from backend.app.shared.configuration.config import settings
from backend.app.shared.logging.logger import get_logger
from backend.app.shared.subprocesses.manager import process_manager

logger = get_logger(__name__, feature="snapshots")


class SnapshotService:
    async def get_camera_snapshot(self, db: AsyncSession, camera_id: str) -> bytes:
        res = await db.execute(select(CameraModel).where(CameraModel.id == camera_id))
        cam = res.scalar_one_or_none()
        if not cam:
            raise FileNotFoundError(f"Camera '{camera_id}' not found")

        ffmpeg = process_manager.find_binary("ffmpeg")

        # If camera is running, check if stream is actually publishing on MediaMTX
        is_publishing = False
        if cam.status == "running":
            from backend.app.features.cameras.service import camera_service
            stats = await camera_service.get_stream_stats(camera_id)
            is_publishing = stats.is_publishing

        if is_publishing:
            rtsp_target = f"rtsp://127.0.0.1:{settings.RTSP_PORT}/{cam.rtsp_path}"
            cmd = [
                ffmpeg,
                "-y",
                "-rtsp_transport", "tcp",
                "-i", rtsp_target,
                "-vframes", "1",
                "-f", "image2",
                "-q:v", "2",
                "pipe:1",
            ]
            try:
                proc = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=3.0)
                if proc.returncode == 0 and stdout:
                    return stdout
            except Exception:
                pass

        # Camera stopped or RTSP stream not actively publishing: grab frame from source video file
        source_file = None
        if cam.video_source_id:
            src_res = await db.execute(select(VideoSourceModel).where(VideoSourceModel.id == cam.video_source_id))
            src = src_res.scalar_one_or_none()
            if src:
                source_file = src.file_path

        if not source_file or not Path(source_file).exists():
            default_vids = list(settings.VIDEOS_DIR.glob("*.mp4"))
            if default_vids:
                source_file = str(default_vids[0].resolve())
            else:
                raise FileNotFoundError("No source video file available for snapshot generation")

        cmd = [
            ffmpeg,
            "-y",
            "-ss", "00:00:01",
            "-i", source_file,
            "-vframes", "1",
            "-f", "image2",
            "-q:v", "2",
            "pipe:1",
        ]

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=5.0)
            if proc.returncode != 0 or not stdout:
                err = stderr.decode(errors="replace").strip()
                raise RuntimeError(f"FFmpeg snapshot failed (code {proc.returncode}): {err[:200]}")
            return stdout
        except asyncio.TimeoutError:
            try:
                proc.kill()
            except Exception:
                pass
            raise TimeoutError("FFmpeg snapshot extraction timed out")


snapshot_service = SnapshotService()
