"""
Observability and Health Router.
Provides /healthz and /readyz endpoints.
"""

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import httpx

from backend.app.shared.configuration.config import settings
from backend.app.shared.database.database import get_db_session
from backend.app.shared.subprocesses.manager import process_manager

router = APIRouter(tags=["Observability"])


@router.get("/healthz")
async def liveness_probe():
    return {"status": "ok", "app": "StreamLab", "version": "1.0.0"}


@router.get("/readyz")
async def readiness_probe(db: AsyncSession = Depends(get_db_session)):
    checks = {
        "database": False,
        "ffmpeg": False,
        "mediamtx": False,
    }

    # DB check
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = True
    except Exception:
        pass

    # FFmpeg check
    try:
        bin_path = process_manager.find_binary("ffmpeg")
        checks["ffmpeg"] = bool(bin_path)
    except Exception:
        pass

    # MediaMTX check
    try:
        async with httpx.AsyncClient(timeout=1.0) as client:
            res = await client.get(f"{settings.MEDIAMTX_API_URL}/v3/config/global/get")
            if res.status_code == 200:
                checks["mediamtx"] = True
    except Exception:
        pass

    all_ready = checks["database"] and checks["ffmpeg"] and checks["mediamtx"]
    status_code = status.HTTP_200_OK if all_ready else status.HTTP_503_SERVICE_UNAVAILABLE
    import json
    return Response(
        content=json.dumps({"ready": all_ready, "checks": checks}),
        status_code=status_code,
        media_type="application/json",
    )
