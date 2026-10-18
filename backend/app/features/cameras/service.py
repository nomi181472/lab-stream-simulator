"""
Camera Service.
Manages virtual camera lifecycle, dynamic FFmpeg command generation, and MediaMTX stream path synchronization.
"""

import asyncio
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.features.cameras.models import CameraModel
from backend.app.features.cameras.schemas import (
    CameraCreate,
    CameraResponse,
    CameraUpdate,
    StreamStats,
)
from backend.app.features.video_sources.models import VideoSourceModel
from backend.app.features.websocket.connection_manager import ws_manager
from backend.app.shared.configuration.config import settings
from backend.app.shared.logging.logger import get_logger
from backend.app.shared.subprocesses.manager import process_manager

logger = get_logger(__name__, feature="cameras")


class CameraService:
    def _build_urls(self, cam: CameraModel) -> Dict[str, str]:
        auth_prefix = f"{cam.username}:{cam.password}@" if (cam.auth_enabled and cam.username and cam.password) else ""
        host = cam.hostname or settings.ADVERTISED_HOST

        rtsp_url = f"rtsp://{auth_prefix}{host}:{settings.RTSP_PORT}/{cam.rtsp_path}"
        rtmp_url = f"rtmp://{host}:{settings.RTMP_PORT}/{cam.rtmp_path}"
        snapshot_url = f"http://{host}:{settings.API_PORT}/{cam.snapshot_path}"
        hls_url = f"http://{host}:{settings.HLS_PORT}/{cam.rtsp_path}/index.m3u8"
        webrtc_url = f"http://{host}:{settings.WEBRTC_PORT}/{cam.rtsp_path}/whep"

        return {
            "rtsp_url": rtsp_url,
            "rtmp_url": rtmp_url,
            "snapshot_url": snapshot_url,
            "hls_url": hls_url,
            "webrtc_url": webrtc_url,
        }

    async def get_stream_stats(self, cam_id: str) -> StreamStats:
        """Query MediaMTX API for real stream stats (readers count, publishing state)."""
        try:
            async with httpx.AsyncClient(timeout=1.5) as client:
                res = await client.get(f"{settings.MEDIAMTX_API_URL}/v3/paths/get/cameras/{cam_id}/main")
                if res.status_code == 200:
                    data = res.json()
                    readers = len(data.get("readers", []))
                    ready = data.get("ready", False)
                    bytes_recv = data.get("bytesReceived", 0)
                    return StreamStats(
                        readers_count=readers,
                        bytes_received=bytes_recv,
                        is_publishing=ready,
                    )
        except Exception:
            pass
        return StreamStats(readers_count=0, bytes_received=0, is_publishing=False)

    async def to_response(self, cam: CameraModel) -> CameraResponse:
        urls = self._build_urls(cam)
        stats = await self.get_stream_stats(cam.id) if cam.status == "running" else StreamStats()
        return CameraResponse(
            id=cam.id,
            name=cam.name,
            manufacturer=cam.manufacturer,
            model=cam.model,
            serial_number=cam.serial_number,
            firmware_version=cam.firmware_version,
            hostname=cam.hostname,
            video_source_id=cam.video_source_id,
            playlist_mode=cam.playlist_mode,
            resolution_width=cam.resolution_width,
            resolution_height=cam.resolution_height,
            fps=cam.fps,
            bitrate_kbps=cam.bitrate_kbps,
            video_codec=cam.video_codec,
            audio_codec=cam.audio_codec,
            rtsp_path=cam.rtsp_path,
            rtmp_path=cam.rtmp_path,
            snapshot_path=cam.snapshot_path,
            auth_enabled=cam.auth_enabled,
            username=cam.username,
            password=cam.password,
            overlay_enabled=cam.overlay_enabled,
            overlay_format=cam.overlay_format,
            overlay_timezone=cam.overlay_timezone,
            overlay_custom_text=cam.overlay_custom_text,
            overlay_font_size=cam.overlay_font_size,
            overlay_font_color=cam.overlay_font_color,
            overlay_bg_color=cam.overlay_bg_color,
            overlay_position=cam.overlay_position,
            status=cam.status,
            uptime_seconds=cam.uptime_seconds,
            restart_count=cam.restart_count,
            last_error=cam.last_error,
            created_at=cam.created_at,
            updated_at=cam.updated_at,
            rtsp_url=urls["rtsp_url"],
            rtmp_url=urls["rtmp_url"],
            snapshot_url=urls["snapshot_url"],
            hls_url=urls["hls_url"],
            webrtc_url=urls["webrtc_url"],
            stats=stats,
        )

    async def create_camera(self, db: AsyncSession, req: CameraCreate) -> CameraResponse:
        cam_id = req.id or f"cam-{uuid.uuid4().hex[:6]}"
        serial = req.serial_number or f"SL-SN-{cam_id.upper()}"

        rtsp_path = f"cameras/{cam_id}/main"
        rtmp_path = f"cameras/{cam_id}/main"
        snapshot_path = f"api/v1/cameras/{cam_id}/snapshot.jpg"

        cam = CameraModel(
            id=cam_id,
            name=req.name,
            manufacturer=req.manufacturer,
            model=req.model,
            serial_number=serial,
            firmware_version=req.firmware_version,
            hostname=req.hostname,
            video_source_id=req.video_source_id,
            playlist_mode=req.playlist_mode,
            resolution_width=req.resolution_width,
            resolution_height=req.resolution_height,
            fps=req.fps,
            bitrate_kbps=req.bitrate_kbps,
            video_codec=req.video_codec,
            audio_codec=req.audio_codec,
            rtsp_path=rtsp_path,
            rtmp_path=rtmp_path,
            snapshot_path=snapshot_path,
            auth_enabled=req.auth_enabled,
            username=req.username,
            password=req.password,
            overlay_enabled=req.overlay_enabled,
            overlay_format=req.overlay_format,
            overlay_timezone=req.overlay_timezone,
            overlay_custom_text=req.overlay_custom_text,
            overlay_font_size=req.overlay_font_size,
            overlay_font_color=req.overlay_font_color,
            overlay_bg_color=req.overlay_bg_color,
            overlay_position=req.overlay_position,
            status="stopped",
        )
        db.add(cam)
        await db.commit()
        await db.refresh(cam)

        await ws_manager.broadcast_event(
            "camera.created",
            cam.id,
            {"name": cam.name, "status": cam.status},
        )
        return await self.to_response(cam)

    async def list_cameras(self, db: AsyncSession) -> List[CameraResponse]:
        res = await db.execute(select(CameraModel).order_by(CameraModel.name))
        cams = res.scalars().all()
        return [await self.to_response(c) for c in cams]

    async def get_camera(self, db: AsyncSession, camera_id: str) -> Optional[CameraResponse]:
        res = await db.execute(select(CameraModel).where(CameraModel.id == camera_id))
        cam = res.scalar_one_or_none()
        return await self.to_response(cam) if cam else None

    async def update_camera(self, db: AsyncSession, camera_id: str, req: CameraUpdate) -> Optional[CameraResponse]:
        res = await db.execute(select(CameraModel).where(CameraModel.id == camera_id))
        cam = res.scalar_one_or_none()
        if not cam:
            return None

        was_running = cam.status == "running"
        if was_running:
            await self.stop_camera(db, camera_id)

        for k, v in req.model_dump(exclude_unset=True).items():
            setattr(cam, k, v)

        await db.commit()
        await db.refresh(cam)

        if was_running:
            await self.start_camera(db, camera_id)

        await ws_manager.broadcast_event(
            "camera.status",
            cam.id,
            {"status": cam.status, "action": "updated"},
        )
        return await self.to_response(cam)

    async def delete_camera(self, db: AsyncSession, camera_id: str) -> bool:
        res = await db.execute(select(CameraModel).where(CameraModel.id == camera_id))
        cam = res.scalar_one_or_none()
        if not cam:
            return False

        await self.stop_camera(db, camera_id)
        await db.delete(cam)
        await db.commit()

        await ws_manager.broadcast_event(
            "camera.deleted",
            camera_id,
            {"status": "deleted"},
        )
        return True

    def build_ffmpeg_command(self, cam: CameraModel, source_file: str) -> List[str]:
        """Construct the FFmpeg command line with real-time monotonic timestamp overlay and tee output."""
        ffmpeg = process_manager.find_binary("ffmpeg")
        font_opt = "font='Arial':"

        font_size = cam.overlay_font_size or 22
        bg_color = cam.overlay_bg_color or "black@0.5"
        font_color = cam.overlay_font_color or "yellow"
        position = cam.overlay_position or "top"
        overlay_format = cam.overlay_format or "24h"
        bitrate = cam.bitrate_kbps or 2048
        fps = cam.fps or 25

        # Safe label escaping
        safe_name = (cam.name or "Camera").replace("'", "").replace(":", "-")
        custom_txt = f" | {cam.overlay_custom_text}" if cam.overlay_custom_text else ""
        header_text = f"{safe_name} ({cam.id}){custom_txt}"

        time_fmt = "%Y-%m-%d %T" if overlay_format == "24h" else "%Y-%m-%d %I:%M:%S %p"
        y_box = "0" if position == "top" else f"h-{font_size * 2}"
        y_text = "12" if position == "top" else f"h-{int(font_size * 1.5)}"

        filters = []
        if cam.overlay_enabled:
            filters.append(f"drawbox=y={y_box}:h={font_size * 2}:color={bg_color}:t=fill")
            filters.append(
                f"drawtext={font_opt}text='{header_text}':x=20:y={y_text}:"
                f"fontsize={font_size}:fontcolor=white:shadowcolor=black:shadowx=2:shadowy=2"
            )
            filters.append(
                f"drawtext={font_opt}text='%{{localtime\\:{time_fmt}}}':x=w-tw-20:y={y_text}:"
                f"fontsize={font_size}:fontcolor={font_color}:shadowcolor=black:shadowx=2:shadowy=2"
            )

        filter_str = ",".join(filters) if filters else "null"

        rtsp_target = f"rtsp://127.0.0.1:{settings.RTSP_PORT}/{cam.rtsp_path}"
        source_clean = str(Path(source_file).resolve()).replace(os.sep, "/")

        cmd = [
            ffmpeg,
            "-re",
            "-stream_loop", "-1",
            "-i", source_clean,
            "-vf", filter_str,
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-tune", "zerolatency",
            "-pix_fmt", "yuv420p",
            "-b:v", f"{bitrate}k",
            "-r", str(fps),
            "-g", str(fps),
            "-c:a", "aac",
            "-b:a", "64k",
            "-f", "rtsp",
            "-rtsp_transport", "tcp",
            rtsp_target,
        ]
        return cmd

    async def start_camera(self, db: AsyncSession, camera_id: str) -> Optional[CameraResponse]:
        res = await db.execute(select(CameraModel).where(CameraModel.id == camera_id))
        cam = res.scalar_one_or_none()
        if not cam:
            return None

        # Resolve video source
        source_path = None
        if cam.video_source_id:
            src_res = await db.execute(select(VideoSourceModel).where(VideoSourceModel.id == cam.video_source_id))
            src = src_res.scalar_one_or_none()
            if src:
                source_path = src.file_path

        if not source_path or not os.path.exists(source_path):
            # Fallback to default fixture video in videos/
            default_vids = list(settings.VIDEOS_DIR.glob("*.mp4"))
            if default_vids:
                source_path = str(default_vids[0].resolve())
            else:
                raise RuntimeError(f"No valid video source found for camera {camera_id}")

        cmd = self.build_ffmpeg_command(cam, source_path)

        async def on_stream_exit(cid: str, code: int):
            # Handler for loop observation and error broadcast
            await ws_manager.broadcast_event(
                "stream.error" if code != 0 else "stream.looped",
                cid,
                {"exit_code": code},
            )

        await process_manager.start_camera_stream(camera_id, cmd, on_exit=on_stream_exit)

        cam.status = "running"
        cam.last_error = ""
        await db.commit()
        await db.refresh(cam)

        await ws_manager.broadcast_event(
            "camera.started",
            camera_id,
            {"status": "running", "rtsp_path": cam.rtsp_path, "rtmp_path": cam.rtmp_path},
        )
        return await self.to_response(cam)

    async def stop_camera(self, db: AsyncSession, camera_id: str) -> Optional[CameraResponse]:
        res = await db.execute(select(CameraModel).where(CameraModel.id == camera_id))
        cam = res.scalar_one_or_none()
        if not cam:
            return None

        await process_manager.stop_camera_stream(camera_id)

        cam.status = "stopped"
        await db.commit()
        await db.refresh(cam)

        await ws_manager.broadcast_event(
            "camera.stopped",
            camera_id,
            {"status": "stopped"},
        )
        return await self.to_response(cam)

    async def restart_camera(self, db: AsyncSession, camera_id: str) -> Optional[CameraResponse]:
        await self.stop_camera(db, camera_id)
        await asyncio.sleep(0.5)
        return await self.start_camera(db, camera_id)


camera_service = CameraService()
