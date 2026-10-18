"""
RTMP Diagnostics and Stream Statistics Router.
"""

from typing import Any, Dict
from fastapi import APIRouter
import httpx

from backend.app.shared.configuration.config import settings

router = APIRouter(prefix="/rtmp", tags=["RTMP Diagnostics"])


@router.get("/stats")
async def get_rtmp_stats() -> Dict[str, Any]:
    """Query live RTMP connections from MediaMTX."""
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            conns_res = await client.get(f"{settings.MEDIAMTX_API_URL}/v3/rtmpconns/list")
            paths_res = await client.get(f"{settings.MEDIAMTX_API_URL}/v3/paths/list")
            return {
                "ok": True,
                "rtmp_port": settings.RTMP_PORT,
                "connections": conns_res.json() if conns_res.status_code == 200 else {},
                "paths": paths_res.json() if paths_res.status_code == 200 else {},
            }
    except Exception as e:
        return {
            "ok": False,
            "rtmp_port": settings.RTMP_PORT,
            "error": str(e),
            "connections": {},
            "paths": {},
        }
