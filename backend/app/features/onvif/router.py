"""
ONVIF FastAPI Router.
Mounts /onvif/device_service and /onvif/media_service SOAP endpoints.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.features.onvif.soap_handlers import onvif_soap_handler
from backend.app.shared.database.database import get_db_session

router = APIRouter(prefix="/onvif", tags=["ONVIF SOAP Services"])


@router.post("/device_service")
async def device_service_root(
    request: Request,
    db: AsyncSession = Depends(get_db_session),
):
    body = await request.body()
    status_code, xml_resp = await onvif_soap_handler.handle_request(body, "device", db)
    media_type = "application/soap+xml; charset=utf-8" if "soap-envelope" in xml_resp else "text/xml; charset=utf-8"
    return Response(content=xml_resp, status_code=status_code, media_type=media_type)


@router.post("/device_service/{camera_id}")
async def device_service_camera(
    camera_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
):
    body = await request.body()
    status_code, xml_resp = await onvif_soap_handler.handle_request(body, "device", db, camera_id=camera_id)
    media_type = "application/soap+xml; charset=utf-8" if "soap-envelope" in xml_resp else "text/xml; charset=utf-8"
    return Response(content=xml_resp, status_code=status_code, media_type=media_type)


@router.post("/media_service")
async def media_service_root(
    request: Request,
    db: AsyncSession = Depends(get_db_session),
):
    body = await request.body()
    status_code, xml_resp = await onvif_soap_handler.handle_request(body, "media", db)
    media_type = "application/soap+xml; charset=utf-8" if "soap-envelope" in xml_resp else "text/xml; charset=utf-8"
    return Response(content=xml_resp, status_code=status_code, media_type=media_type)


@router.post("/media_service/{camera_id}")
async def media_service_camera(
    camera_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
):
    body = await request.body()
    status_code, xml_resp = await onvif_soap_handler.handle_request(body, "media", db, camera_id=camera_id)
    media_type = "application/soap+xml; charset=utf-8" if "soap-envelope" in xml_resp else "text/xml; charset=utf-8"
    return Response(content=xml_resp, status_code=status_code, media_type=media_type)
