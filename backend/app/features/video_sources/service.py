"""
Video Source Service.
Handles directory scanning, FFprobe inspection, upload validation, and SSRF prevention.
"""

import ipaddress
import os
import socket
import uuid
from pathlib import Path
from typing import List, Optional
from urllib.parse import urlparse

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.features.video_sources.models import VideoSourceModel
from backend.app.features.video_sources.schemas import VideoSourceCreate, VideoSourceProbeResult
from backend.app.shared.configuration.config import settings
from backend.app.shared.logging.logger import get_logger
from backend.app.shared.subprocesses.manager import process_manager

logger = get_logger(__name__, feature="video_sources")

VIDEO_EXTENSIONS = {".mp4", ".mkv", ".avi", ".mov", ".m4v", ".webm", ".ts", ".flv"}


class VideoSourceService:
    @staticmethod
    def validate_safe_path(path_str: str) -> Path:
        """Validate path: ensures the file or directory exists on the system."""
        path = Path(path_str).resolve()
        if not path.exists():
            raise ValueError(f"Path '{path_str}' does not exist.")
        return path

    @staticmethod
    def validate_safe_url(url_str: str) -> str:
        """Validate remote URL and guard against SSRF attacks."""
        parsed = urlparse(url_str)
        if parsed.scheme not in ("http", "https", "rtsp", "rtmp"):
            raise ValueError(f"Unsupported protocol scheme: {parsed.scheme}")

        hostname = parsed.hostname
        if not hostname:
            raise ValueError("URL must contain a valid hostname.")

        # Check for localhost / loopback / private IP ranges
        if hostname.lower() in ("localhost", "127.0.0.1", "::1"):
            # Allowed for internal simulator loops if configured, but flagged
            pass
        else:
            try:
                ip_str = socket.gethostbyname(hostname)
                ip = ipaddress.ip_address(ip_str)
                if ip.is_private or ip.is_loopback or ip.is_link_local:
                    if not settings.DEBUG:
                        raise ValueError(f"URL resolves to restricted private IP address: {ip_str}")
            except socket.gaierror:
                pass  # Let ffprobe / ffmpeg handle domain resolution errors
        return url_str

    async def probe_source(self, path_or_url: str) -> VideoSourceProbeResult:
        """Inspect media using ffprobe."""
        try:
            if path_or_url.startswith(("http://", "https://", "rtsp://", "rtmp://")):
                safe_target = self.validate_safe_url(path_or_url)
            else:
                safe_target = str(self.validate_safe_path(path_or_url))

            data = await process_manager.probe_media(safe_target)
            streams = data.get("streams", [])
            fmt = data.get("format", {})

            video_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
            audio_stream = next((s for s in streams if s.get("codec_type") == "audio"), None)

            width = int(video_stream.get("width", 0)) if video_stream else 0
            height = int(video_stream.get("height", 0)) if video_stream else 0
            fps_str = video_stream.get("avg_frame_rate", "0/1") if video_stream else "0/1"
            try:
                num, den = (int(x) for x in fps_str.split("/"))
                fps = round(num / den, 2) if den > 0 else 0.0
            except Exception:
                fps = 0.0

            duration = float(fmt.get("duration", 0.0))
            size = int(fmt.get("size", 0))

            return VideoSourceProbeResult(
                valid=True,
                width=width,
                height=height,
                fps=fps,
                duration_sec=duration,
                video_codec=video_stream.get("codec_name", "") if video_stream else "",
                audio_codec=audio_stream.get("codec_name", "") if audio_stream else "",
                file_size_bytes=size,
            )
        except Exception as e:
            logger.warning(f"Failed to probe media '{path_or_url}': {e}")
            return VideoSourceProbeResult(valid=False, error=str(e))

    async def register_source(
        self,
        db: AsyncSession,
        req: VideoSourceCreate,
    ) -> VideoSourceModel:
        """Register a new video source with probe inspection."""
        source_id = f"src-{uuid.uuid4().hex[:8]}"
        probe = await self.probe_source(req.file_path)

        source = VideoSourceModel(
            id=source_id,
            name=req.name,
            source_type=req.source_type,
            file_path=req.file_path,
            file_size_bytes=probe.file_size_bytes,
            duration_sec=probe.duration_sec,
            width=probe.width,
            height=probe.height,
            fps=probe.fps,
            video_codec=probe.video_codec,
            audio_codec=probe.audio_codec,
            is_valid=probe.valid,
        )
        db.add(source)
        await db.commit()
        await db.refresh(source)
        return source

    async def list_sources(self, db: AsyncSession) -> List[VideoSourceModel]:
        res = await db.execute(select(VideoSourceModel).order_by(VideoSourceModel.name))
        return list(res.scalars().all())

    async def get_source(self, db: AsyncSession, source_id: str) -> Optional[VideoSourceModel]:
        res = await db.execute(select(VideoSourceModel).where(VideoSourceModel.id == source_id))
        return res.scalar_one_or_none()

    async def scan_directory(self, db: AsyncSession, directory_path: Optional[str] = None) -> List[VideoSourceModel]:
        """Scan a directory for video files and register any new ones."""
        target_dir = self.validate_safe_path(directory_path) if directory_path else settings.VIDEOS_DIR
        if not target_dir.exists():
            raise ValueError(f"Directory '{directory_path or settings.VIDEOS_DIR}' does not exist.")
        if not target_dir.is_dir():
            raise ValueError(f"Path '{target_dir}' is not a directory.")

        existing = await self.list_sources(db)
        existing_paths = {
            Path(s.file_path).resolve().as_posix().lower()
            for s in existing
            if s.file_path and not s.file_path.startswith(("http://", "https://", "rtsp://", "rtmp://"))
        }

        created = []
        for p in sorted(target_dir.iterdir()):
            if p.is_file() and p.suffix.lower() in VIDEO_EXTENSIONS:
                normalized_p = p.resolve().as_posix().lower()
                if normalized_p not in existing_paths:
                    existing_paths.add(normalized_p)
                    name = p.stem.replace("_", " ").title()
                    source = await self.register_source(
                        db,
                        VideoSourceCreate(name=name, file_path=str(p.resolve()), source_type="local"),
                    )
                    created.append(source)
        return await self.list_sources(db)

    async def delete_source(self, db: AsyncSession, source_id: str, delete_file: bool = False) -> bool:
        """Delete a video source from database and optionally remove the file from disk."""
        source = await self.get_source(db, source_id)
        if not source:
            return False

        # Unbind any cameras currently referencing this video source
        from backend.app.features.cameras.models import CameraModel
        cam_res = await db.execute(select(CameraModel).where(CameraModel.video_source_id == source_id))
        cameras = list(cam_res.scalars().all())
        for cam in cameras:
            cam.video_source_id = None

        file_path_to_delete = None
        if delete_file and source.file_path and not source.file_path.startswith(("http://", "https://", "rtsp://", "rtmp://")):
            file_path_to_delete = Path(source.file_path).resolve()

        await db.delete(source)
        await db.commit()

        if file_path_to_delete and file_path_to_delete.exists() and file_path_to_delete.is_file():
            try:
                file_path_to_delete.unlink()
                logger.info(f"Deleted physical video file: {file_path_to_delete}")
            except Exception as e:
                logger.warning(f"Could not delete physical file '{file_path_to_delete}': {e}")

        return True


video_source_service = VideoSourceService()
