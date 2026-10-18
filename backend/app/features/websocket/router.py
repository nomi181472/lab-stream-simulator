"""
WebSocket FastAPI Router.
Provides the /ws/cameras WebSocket endpoint.
"""

import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.app.features.websocket.connection_manager import ws_manager
from backend.app.shared.logging.logger import get_logger

logger = get_logger(__name__, feature="websocket")

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/cameras")
async def websocket_cameras_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Receive client ping or control messages
            data = await websocket.receive_text()
            is_ping = data.strip().lower() == "ping"
            try:
                import json
                from datetime import datetime, timezone
                parsed = json.loads(data)
                if parsed.get("type") == "ping":
                    is_ping = True
            except Exception:
                pass

            if is_ping:
                pong_msg = json.dumps({
                    "type": "pong",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "client": "server",
                    "status": "connected"
                })
                await websocket.send_text(pong_msg)
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception as e:
        logger.debug(f"WebSocket connection error: {e}")
        await ws_manager.disconnect(websocket)


@router.websocket("/ws/cameras/{camera_id}/stream")
async def websocket_camera_video_stream(websocket: WebSocket, camera_id: str):
    """
    Direct WebSocket video frame streaming.
    Streams raw JPEG frames over WebSocket as binary data so any web client can render it in a <canvas> or <img>.
    """
    await websocket.accept()
    from backend.app.shared.configuration.config import settings
    from backend.app.shared.subprocesses.manager import process_manager

    ffmpeg = process_manager.find_binary("ffmpeg")
    rtsp_target = f"rtsp://127.0.0.1:{settings.RTSP_PORT}/cameras/{camera_id}/main"

    cmd = [
        ffmpeg,
        "-rtsp_transport", "tcp",
        "-i", rtsp_target,
        "-f", "image2pipe",
        "-vcodec", "mjpeg",
        "-q:v", "5",
        "-r", "15",
        "pipe:1",
    ]

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.DEVNULL,
    )

    try:
        buf = bytearray()
        while True:
            chunk = await proc.stdout.read(16384)
            if not chunk:
                break
            buf.extend(chunk)

            # Extract complete JPEG frames (SOI: 0xFFD8, EOI: 0xFFD9)
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
                await websocket.send_bytes(frame)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.debug(f"WebSocket video stream error for camera {camera_id}: {e}")
    finally:
        try:
            proc.terminate()
            await proc.wait()
        except Exception:
            pass

