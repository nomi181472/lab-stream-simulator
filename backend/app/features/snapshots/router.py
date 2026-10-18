"""
Snapshot FastAPI Router.
Provides the /api/v1/cameras/{id}/snapshot.jpg endpoint.
"""

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.features.snapshots.service import snapshot_service
from backend.app.shared.database.database import get_db_session

router = APIRouter(prefix="/cameras", tags=["Snapshots"])


@router.get("/{camera_id}/snapshot.jpg")
async def get_camera_snapshot(
    camera_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    try:
        jpeg_bytes = await snapshot_service.get_camera_snapshot(db, camera_id)
        return Response(
            content=jpeg_bytes,
            media_type="image/jpeg",
            headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except TimeoutError as e:
        raise HTTPException(status_code=504, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{camera_id}/stream.mjpg")
async def stream_camera_mjpeg(camera_id: str):
    """
    Live continuous MJPEG video stream.
    Opens directly in ANY browser (Chrome, Edge, Safari, Firefox), mobile browsers, or simple <img> tags.
    """
    import asyncio
    from fastapi.responses import StreamingResponse
    from backend.app.shared.configuration.config import settings
    from backend.app.shared.subprocesses.manager import process_manager

    ffmpeg = process_manager.find_binary("ffmpeg")
    rtsp_target = f"rtsp://127.0.0.1:{settings.RTSP_PORT}/cameras/{camera_id}/main"

    async def frame_generator():
        cmd = [
            ffmpeg,
            "-rtsp_transport", "tcp",
            "-i", rtsp_target,
            "-f", "image2pipe",
            "-vcodec", "mjpeg",
            "-q:v", "5",
            "-r", "20",
            "pipe:1",
        ]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
        )
        buf = bytearray()
        try:
            while True:
                chunk = await proc.stdout.read(16384)
                if not chunk:
                    break
                buf.extend(chunk)
                while True:
                    start = buf.find(b"\xff\xd8")
                    if start == -1:
                        buf.clear()
                        break
                    end = buf.find(b"\xff\xd9", start + 2)
                    if end == -1:
                        if start > 0:
                            del buf[:start]
                        break
                    frame = bytes(buf[start : end + 2])
                    del buf[: end + 2]
                    yield (
                        b"--frame\r\n"
                        b"Content-Type: image/jpeg\r\n\r\n" + frame + b"\r\n"
                    )
        except Exception:
            pass
        finally:
            try:
                proc.terminate()
                await proc.wait()
            except Exception:
                pass

    return StreamingResponse(
        frame_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
    )
