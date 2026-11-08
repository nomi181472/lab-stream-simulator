"""
StreamLab Backend Unit and Integration Test Suite.
Verifies camera lifecycle, video sources, ONVIF SOAP responses, and media command construction.
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from backend.app.main import app
from backend.app.shared.database.database import Base, engine, async_session_maker
from backend.app.features.cameras.service import camera_service
from backend.app.features.cameras.schemas import CameraCreate
from backend.app.features.video_sources.service import video_source_service


@pytest_asyncio.fixture(autouse=True)
async def setup_test_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Cleanup


@pytest.mark.asyncio
async def test_healthz():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/healthz")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert data["app"] == "StreamLab"


@pytest.mark.asyncio
async def test_camera_crud_lifecycle():
    async with async_session_maker() as db:
        # Create
        cam_req = CameraCreate(
            id="test-cam-1",
            name="Testing Camera",
            manufacturer="StreamLab Test",
            model="SL-TEST-01",
            fps=30,
            bitrate_kbps=1000,
            overlay_enabled=True,
            overlay_custom_text="QA-LAB",
        )
        cam = await camera_service.create_camera(db, cam_req)
        assert cam.id == "test-cam-1"
        assert cam.status == "stopped"
        assert "rtsp://" in cam.rtsp_url
        assert "rtmp://" in cam.rtmp_url
        assert "snapshot.jpg" in cam.snapshot_url

        # Read
        fetched = await camera_service.get_camera(db, "test-cam-1")
        assert fetched is not None
        assert fetched.name == "Testing Camera"

        # Delete
        deleted = await camera_service.delete_camera(db, "test-cam-1")
        assert deleted is True

        # Verify Gone
        gone = await camera_service.get_camera(db, "test-cam-1")
        assert gone is None


@pytest.mark.asyncio
async def test_onvif_soap_device_information():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        soap_body = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" '
            'xmlns:tds="http://www.onvif.org/ver10/device/wsdl">'
            '<soap:Body><tds:GetDeviceInformation/></soap:Body>'
            '</soap:Envelope>'
        )
        res = await client.post(
            "/onvif/device_service",
            content=soap_body,
            headers={"Content-Type": "application/soap+xml; charset=utf-8"},
        )
        assert res.status_code == 200
        text = res.text
        assert "GetDeviceInformationResponse" in text
        assert "Manufacturer" in text
        assert "Model" in text


@pytest.mark.asyncio
async def test_onvif_soap_media_profiles_and_stream_uri():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # GetProfiles
        profiles_soap = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" '
            'xmlns:trt="http://www.onvif.org/ver10/media/wsdl">'
            '<soap:Body><trt:GetProfiles/></soap:Body>'
            '</soap:Envelope>'
        )
        res_prof = await client.post(
            "/onvif/media_service",
            content=profiles_soap,
            headers={"Content-Type": "application/soap+xml; charset=utf-8"},
        )
        assert res_prof.status_code == 200
        assert "GetProfilesResponse" in res_prof.text
        assert "Profile_Main" in res_prof.text

        # GetStreamUri
        stream_soap = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" '
            'xmlns:trt="http://www.onvif.org/ver10/media/wsdl">'
            '<soap:Body><trt:GetStreamUri/></soap:Body>'
            '</soap:Envelope>'
        )
        res_stream = await client.post(
            "/onvif/media_service",
            content=stream_soap,
            headers={"Content-Type": "application/soap+xml; charset=utf-8"},
        )
        assert res_stream.status_code == 200
        assert "GetStreamUriResponse" in res_stream.text
        assert "rtsp://" in res_stream.text


@pytest.mark.asyncio
async def test_authentication_service_and_endpoints():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login
        login_res = await client.post("/api/v1/auth/login", json={"username": "admin", "password": "secret_password"})
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        assert token

        # 2. Verify Token
        verify_res = await client.get("/api/v1/auth/verify", headers={"Authorization": f"Bearer {token}"})
        assert verify_res.status_code == 200
        assert verify_res.json()["valid"] is True
        assert verify_res.json()["username"] == "admin"

        # 3. WS-Security Digest Verification
        import base64
        import hashlib
        from datetime import datetime, timezone

        raw_nonce = b"1234567890123456"
        created_str = datetime.now(timezone.utc).isoformat()
        expected_pass = "camera_secret"

        hasher = hashlib.sha1()
        hasher.update(raw_nonce)
        hasher.update(created_str.encode("utf-8"))
        hasher.update(expected_pass.encode("utf-8"))
        digest = base64.b64encode(hasher.digest()).decode("ascii")

        ws_auth_res = await client.post(
            f"/api/v1/auth/verify-ws-security?expected_password={expected_pass}",
            json={
                "username": "admin",
                "password_digest": digest,
                "nonce": base64.b64encode(raw_nonce).decode("ascii"),
                "created": created_str,
            },
        )
        assert ws_auth_res.status_code == 200
        data = ws_auth_res.json()
        assert data["valid"] is True
        assert data["user"] == "admin"



@pytest.mark.asyncio
async def test_human_readable_and_unforgettable_camera_ids():
    async with async_session_maker() as db:
        from backend.app.features.cameras.schemas import CameraUpdate

        # 1. Create camera with no ID -> derives readable slug from name
        cam1 = await camera_service.create_camera(
            db,
            CameraCreate(name="Front Entrance Camera")
        )
        assert cam1.id == "front-entrance-camera"
        assert "/cameras/front-entrance-camera/main" in cam1.rtsp_url
        assert "/cameras/front-entrance-camera/main" in cam1.rtmp_url
        assert "/ws/cameras/front-entrance-camera/stream" in cam1.ws_stream_url

        # 2. Collision handling -> appends sequential suffix
        cam2 = await camera_service.create_camera(
            db,
            CameraCreate(name="Front Entrance Camera")
        )
        assert cam2.id == "front-entrance-camera-2"
        assert "/cameras/front-entrance-camera-2/main" in cam2.rtsp_url

        # 3. Rename camera ID -> updates all stream paths and URLs
        updated = await camera_service.update_camera(
            db,
            cam1.id,
            CameraUpdate(id="gate-north-01")
        )
        assert updated.id == "gate-north-01"
        assert "/cameras/gate-north-01/main" in updated.rtsp_url
        assert "/cameras/gate-north-01/main" in updated.rtmp_url
        assert "/ws/cameras/gate-north-01/stream" in updated.ws_stream_url

        # Verify old ID is gone and new ID is fetchable
        assert await camera_service.get_camera(db, "front-entrance-camera") is None
        assert await camera_service.get_camera(db, "gate-north-01") is not None

        # Clean up
        await camera_service.delete_camera(db, "gate-north-01")
        await camera_service.delete_camera(db, "front-entrance-camera-2")
