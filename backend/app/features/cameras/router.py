"""
Camera FastAPI Router.
Provides REST API endpoints for Camera CRUD, lifecycle control (start, stop, restart), and status.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.features.cameras.schemas import (
    CameraCreate,
    CameraResponse,
    CameraStatusResponse,
    CameraUpdate,
)
from backend.app.features.cameras.service import camera_service
from backend.app.shared.database.database import get_db_session

router = APIRouter(prefix="/cameras", tags=["Cameras"])


@router.get("", response_model=List[CameraResponse])
async def list_cameras(db: AsyncSession = Depends(get_db_session)):
    return await camera_service.list_cameras(db)


@router.post("", response_model=CameraResponse, status_code=status.HTTP_201_CREATED)
async def create_camera(
    req: CameraCreate,
    db: AsyncSession = Depends(get_db_session),
):
    try:
        return await camera_service.create_camera(db, req)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{camera_id}", response_model=CameraResponse)
async def get_camera(
    camera_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    cam = await camera_service.get_camera(db, camera_id)
    if not cam:
        raise HTTPException(status_code=404, detail=f"Camera '{camera_id}' not found")
    return cam


@router.put("/{camera_id}", response_model=CameraResponse)
async def update_camera(
    camera_id: str,
    req: CameraUpdate,
    db: AsyncSession = Depends(get_db_session),
):
    cam = await camera_service.update_camera(db, camera_id, req)
    if not cam:
        raise HTTPException(status_code=404, detail=f"Camera '{camera_id}' not found")
    return cam


@router.delete("/{camera_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_camera(
    camera_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    deleted = await camera_service.delete_camera(db, camera_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Camera '{camera_id}' not found")


@router.post("/{camera_id}/start", response_model=CameraResponse)
async def start_camera(
    camera_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    try:
        cam = await camera_service.start_camera(db, camera_id)
        if not cam:
            raise HTTPException(status_code=404, detail=f"Camera '{camera_id}' not found")
        return cam
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{camera_id}/stop", response_model=CameraResponse)
async def stop_camera(
    camera_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    cam = await camera_service.stop_camera(db, camera_id)
    if not cam:
        raise HTTPException(status_code=404, detail=f"Camera '{camera_id}' not found")
    return cam


@router.post("/{camera_id}/restart", response_model=CameraResponse)
async def restart_camera(
    camera_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    try:
        cam = await camera_service.restart_camera(db, camera_id)
        if not cam:
            raise HTTPException(status_code=404, detail=f"Camera '{camera_id}' not found")
        return cam
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{camera_id}/status", response_model=CameraStatusResponse)
async def get_camera_status(
    camera_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    cam = await camera_service.get_camera(db, camera_id)
    if not cam:
        raise HTTPException(status_code=404, detail=f"Camera '{camera_id}' not found")
    readers = cam.stats.readers_count if cam.stats else 0
    return CameraStatusResponse(
        id=cam.id,
        status=cam.status,
        uptime_seconds=cam.uptime_seconds,
        restart_count=cam.restart_count,
        last_error=cam.last_error,
        readers_count=readers,
    )
