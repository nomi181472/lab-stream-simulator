"""
RTSP Diagnostics and Stream Statistics Router.
"""

from typing import Any, Dict
from fastapi import APIRouter
import httpx

from backend.app.shared.configuration.config import settings

router = APIRouter(prefix="/rtsp", tags=["RTSP Diagnostics"])


@router.get("/stats")
async def get_rtsp_stats() -> Dict[str, Any]:
    """Query live RTSP paths and reader sessions from MediaMTX."""
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            paths_res = await client.get(f"{settings.MEDIAMTX_API_URL}/v3/paths/list")
            sessions_res = await client.get(f"{settings.MEDIAMTX_API_URL}/v3/rtspsessions/list")
            return {
                "ok": True,
                "rtsp_port": settings.RTSP_PORT,
                "paths": paths_res.json() if paths_res.status_code == 200 else {},
                "sessions": sessions_res.json() if sessions_res.status_code == 200 else {},
            }
    except Exception as e:
        return {
            "ok": False,
            "rtsp_port": settings.RTSP_PORT,
            "error": str(e),
            "paths": {},
            "sessions": {},
        }
