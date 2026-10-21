"""
StreamLab - Multi-Protocol IP Camera Simulator & Interoperability Lab.
Main FastAPI Application Entrypoint.
"""

import sys
import asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.features.authentication.router import router as auth_router
from backend.app.features.cameras.router import router as cameras_router
from backend.app.features.cameras.schemas import CameraCreate
from backend.app.features.cameras.service import camera_service
from backend.app.features.observability.router import router as observability_router
from backend.app.features.onvif.router import router as onvif_router
from backend.app.features.onvif.ws_discovery import ws_discovery_server
from backend.app.features.rtmp.router import router as rtmp_router
from backend.app.features.rtsp.router import router as rtsp_router
from backend.app.features.snapshots.router import router as snapshots_router
from backend.app.features.test_runs.router import router as test_runs_router
from backend.app.features.video_sources.router import router as video_sources_router
from backend.app.features.video_sources.service import video_source_service
from backend.app.features.websocket.router import router as websocket_router
from backend.app.shared.configuration.config import settings
from backend.app.shared.database.database import async_session_maker, init_db
from backend.app.shared.logging.logger import get_logger
from backend.app.shared.proxy import frontend_proxy
from backend.app.shared.subprocesses.manager import process_manager

logger = get_logger(__name__, feature="main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup sequence
    logger.info("Initializing StreamLab database...")
    await init_db()

    # Start MediaMTX media server
    logger.info("Ensuring MediaMTX media server is running...")
    await process_manager.start_mediamtx()

    # Seed initial video sources and default camera if none exist
    async with async_session_maker() as db:
        logger.info("Scanning video directory for media fixtures...")
        sources = await video_source_service.scan_directory(db)
        cams = await camera_service.list_cameras(db)
        if not cams and sources:
            logger.info("Provisioning default virtual cameras (101 & cam-001)...")
            try:
                await camera_service.create_camera(
                    db,
                    CameraCreate(
                        id="101",
                        name="Front Entrance Surveillance",
                        manufacturer="StreamLab Labs",
                        model="SL-CAM-1080P",
                        serial_number="SL-SN-101001",
                        video_source_id=sources[0].id,
                        resolution_width=1280,
                        resolution_height=720,
                        fps=25,
                        bitrate_kbps=2048,
                        overlay_enabled=True,
                        overlay_custom_text="GATE-1",
                    ),
                )
                await camera_service.create_camera(
                    db,
                    CameraCreate(
                        id="cam-001",
                        name="Primary Surveillance Camera",
                        manufacturer="StreamLab Labs",
                        model="SL-CAM-1080P",
                        serial_number="SL-SN-001001",
                        video_source_id=sources[0].id,
                        resolution_width=1280,
                        resolution_height=720,
                        fps=25,
                        bitrate_kbps=2048,
                        overlay_enabled=True,
                        overlay_custom_text="CAM-001",
                    ),
                )
            except Exception as e:
                logger.warning(f"Failed to provision default cameras: {e}")

        # Auto-start cameras on boot so RTSP feeds are actively broadcasting
        active_cams = await camera_service.list_cameras(db)
        for c in active_cams:
            if c.video_source_id:
                try:
                    logger.info(f"Auto-starting camera {c.id} ({c.name})...")
                    await camera_service.start_camera(db, c.id)
                except Exception as e:
                    logger.warning(f"Could not auto-start camera {c.id}: {e}")

    # Start WS-Discovery UDP listener
    if settings.WS_DISCOVERY_ENABLED:
        logger.info("Starting WS-Discovery multicast listener...")
        await ws_discovery_server.start()

    # Start Frontend Proxy to bridge 0.0.0.0:3000 to local/WSL frontend if needed
    await frontend_proxy.start()

    logger.info("StreamLab application startup complete.")

    yield

    # Shutdown sequence
    logger.info("Shutting down StreamLab services...")
    await frontend_proxy.stop()
    if settings.WS_DISCOVERY_ENABLED:
        await ws_discovery_server.stop()
    await process_manager.stop_all()
    logger.info("All media processes stopped.")


app = FastAPI(
    title="StreamLab",
    description="Multi-Protocol IP Camera Simulator & Interoperability Lab",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST API v1
api_v1 = FastAPI(title="StreamLab REST API v1")
api_v1.include_router(auth_router)
api_v1.include_router(cameras_router)
api_v1.include_router(video_sources_router)
api_v1.include_router(snapshots_router)
api_v1.include_router(rtsp_router)
api_v1.include_router(rtmp_router)
api_v1.include_router(test_runs_router)

app.mount("/api/v1", api_v1)

# Mount ONVIF SOAP services
app.include_router(onvif_router)

# Mount WebSocket telemetry
app.include_router(websocket_router)

# Mount Observability & Health
app.include_router(observability_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.app.main:app",
        host=settings.HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG,
    )
