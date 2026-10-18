"""
Video Source FastAPI Router.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.features.video_sources.models import VideoSourceModel
from backend.app.features.video_sources.schemas import (
    VideoSourceCreate,
    VideoSourceProbeResult,
    VideoSourceResponse,
)
from backend.app.features.video_sources.service import video_source_service
from backend.app.shared.configuration.config import settings
from backend.app.shared.database.database import get_db_session

router = APIRouter(prefix="/video-sources", tags=["Video Sources"])


@router.get("", response_model=List[VideoSourceResponse])
async def list_video_sources(db: AsyncSession = Depends(get_db_session)):
    return await video_source_service.list_sources(db)


@router.post("", response_model=VideoSourceResponse, status_code=201)
async def create_video_source(
    req: VideoSourceCreate,
    db: AsyncSession = Depends(get_db_session),
):
    try:
        return await video_source_service.register_source(db, req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/probe", response_model=VideoSourceProbeResult)
async def probe_media_source(path_or_url: str = Query(..., description="Path or URL to probe")):
    return await video_source_service.probe_source(path_or_url)


@router.post("/scan", response_model=List[VideoSourceResponse])
async def scan_video_directory(
    directory: Optional[str] = Query(None, description="Optional custom directory to scan"),
    db: AsyncSession = Depends(get_db_session),
):
    try:
        return await video_source_service.scan_directory(db, directory)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/upload", response_model=VideoSourceResponse, status_code=201)
async def upload_video_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db_session),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename")

    ext = "." + file.filename.split(".")[-1].lower()
    from backend.app.features.video_sources.service import VIDEO_EXTENSIONS
    if ext not in VIDEO_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported video file extension: {ext}")

    dest = settings.VIDEOS_DIR / file.filename
    settings.VIDEOS_DIR.mkdir(parents=True, exist_ok=True)

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File exceeds maximum size of {settings.MAX_UPLOAD_SIZE_MB}MB")

    with open(dest, "wb") as f:
        f.write(content)

    return await video_source_service.register_source(
        db,
        VideoSourceCreate(
            name=file.filename.rsplit(".", 1)[0].replace("_", " ").title(),
            file_path=str(dest.resolve()),
            source_type="local",
        ),
    )
