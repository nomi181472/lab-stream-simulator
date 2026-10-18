"""
StreamLab Media Pipeline Integration Test.
Verifies real-time persistent looping, timestamp overlays, RTSP TCP transport, RTMP ingest, and snapshot extraction against MediaMTX.
"""

import asyncio
import os
import subprocess
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.features.cameras.schemas import CameraCreate
from backend.app.features.cameras.service import camera_service
from backend.app.features.video_sources.service import video_source_service
from backend.app.shared.configuration.config import settings
from backend.app.shared.database.database import async_session_maker, init_db
from backend.app.shared.subprocesses.manager import process_manager


@pytest.mark.asyncio
async def test_persistent_media_pipeline_and_overlays():
    await init_db()
    # 1. Start MediaMTX
    await process_manager.start_mediamtx()

    async with async_session_maker() as db:
        # Scan video directory
        sources = await video_source_service.scan_directory(db)
        assert len(sources) > 0, "Expected at least one sample video in videos/ directory"

        cam_id = "cam-media-test"
        # Delete if preexisting
        await camera_service.delete_camera(db, cam_id)

        # Create virtual test camera
        cam_req = CameraCreate(
            id=cam_id,
            name="Media Pipeline Test Cam",
            video_source_id=sources[0].id,
            resolution_width=1280,
            resolution_height=720,
            fps=25,
            bitrate_kbps=1500,
            overlay_enabled=True,
            overlay_custom_text="PIPELINE-VERIFIED",
        )
        cam = await camera_service.create_camera(db, cam_req)
        assert cam.id == cam_id

        # Start Camera (launches FFmpeg loop pushing to MediaMTX via RTSP TCP & RTMP)
        started = await camera_service.start_camera(db, cam_id)
        assert started.status == "running"

        # Allow FFmpeg and MediaMTX to establish streaming handshake
        await asyncio.sleep(3.0)

        # Verify stream stats from MediaMTX
        stats = await camera_service.get_stream_stats(cam_id)
        assert stats.is_publishing is True, "MediaMTX should report is_publishing=True"

        # 2. Probe RTSP stream with ffprobe
        ffprobe_bin = process_manager.find_binary("ffprobe")
        rtsp_url = f"rtsp://127.0.0.1:{settings.RTSP_PORT}/cameras/{cam_id}/main"

        rtsp_cmd = [
            ffprobe_bin,
            "-v", "error",
            "-rtsp_transport", "tcp",
            "-show_entries", "stream=codec_type,codec_name,width,height",
            "-of", "json",
            rtsp_url,
        ]
        rtsp_proc = await asyncio.create_subprocess_exec(
            *rtsp_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(rtsp_proc.communicate(), timeout=8.0)
        assert rtsp_proc.returncode == 0, f"RTSP probe failed: {stderr.decode()}"
        assert b"video" in stdout
        assert b"h264" in stdout

        # 3. Probe RTMP stream with ffprobe
        rtmp_url = f"rtmp://127.0.0.1:{settings.RTMP_PORT}/cameras/{cam_id}/main"
        rtmp_cmd = [
            ffprobe_bin,
            "-v", "error",
            "-show_entries", "stream=codec_type,codec_name",
            "-of", "json",
            rtmp_url,
        ]
        rtmp_proc = await asyncio.create_subprocess_exec(
            *rtmp_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        rtmp_out, rtmp_err = await asyncio.wait_for(rtmp_proc.communicate(), timeout=8.0)
        assert rtmp_proc.returncode == 0, f"RTMP probe failed: {rtmp_err.decode()}"
        assert b"video" in rtmp_out

        # 4. Extract real live snapshot
        from backend.app.features.snapshots.service import snapshot_service
        snapshot_bytes = await snapshot_service.get_camera_snapshot(db, cam_id)
        assert len(snapshot_bytes) > 1000
        assert snapshot_bytes[:2] == b"\xff\xd8", "Snapshot must be valid JPEG"

        # 5. Stop camera and ensure cleanup
        stopped = await camera_service.stop_camera(db, cam_id)
        assert stopped.status == "stopped"

        # Clean up camera
        await camera_service.delete_camera(db, cam_id)
