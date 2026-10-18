"""
StreamLab Python Interoperability Test Suite.
Validates ONVIF SOAP 1.2, RTSP DESCRIBE/SDP & RTP packets, RTMP media ingest/egress, and WebSocket telemetry.
"""

import asyncio
import json
import os
import shutil
import socket
import subprocess
import time
from pathlib import Path
import httpx
import pytest
import websockets

BASE_URL = "http://127.0.0.1:8000"
ONVIF_DEVICE_URL = "http://127.0.0.1:8000/onvif/device_service"
ONVIF_MEDIA_URL = "http://127.0.0.1:8000/onvif/media_service"
WS_URL = "ws://127.0.0.1:8000/ws/cameras"
RTSP_HOST = "127.0.0.1"
RTSP_PORT = 8554
RTMP_PORT = 1935

CAMERA_ID = os.environ.get("STREAMLAB_CAMERA_ID", "101")
RTSP_PATH = os.environ.get("STREAMLAB_RTSP_PATH", f"cameras/{CAMERA_ID}/main")
RTMP_PATH = os.environ.get("STREAMLAB_RTMP_PATH", f"cameras/{CAMERA_ID}/main")
RTSP_URL = os.environ.get("STREAMLAB_RTSP_URL", f"rtsp://{RTSP_HOST}:{RTSP_PORT}/{RTSP_PATH}")
RTMP_URL = os.environ.get("STREAMLAB_RTMP_URL", f"rtmp://127.0.0.1:{RTMP_PORT}/{RTMP_PATH}")

FFPROBE_BIN = shutil.which("ffprobe") or str(Path(__file__).resolve().parents[2] / "bin" / "ffprobe.exe")


@pytest.mark.asyncio
async def test_onvif_device_information():
    """Verify genuine ONVIF SOAP 1.2 GetDeviceInformation response."""
    soap_body = """<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:tds="http://www.onvif.org/ver10/device/wsdl">
  <soap:Body>
    <tds:GetDeviceInformation/>
  </soap:Body>
</soap:Envelope>"""

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            ONVIF_DEVICE_URL,
            content=soap_body,
            headers={"Content-Type": "application/soap+xml; charset=utf-8"},
            timeout=5.0
        )
        assert resp.status_code == 200, f"Expected 200 OK, got {resp.status_code}"
        text = resp.text
        assert "GetDeviceInformationResponse" in text, "Missing GetDeviceInformationResponse in SOAP body"
        assert "StreamLab Virtual Manufacturer" in text or "StreamLab" in text, "Missing Manufacturer in device info"
        assert "FirmwareVersion" in text, "Missing FirmwareVersion in device info"


@pytest.mark.asyncio
async def test_onvif_media_profiles_and_stream_uri():
    """Verify ONVIF GetProfiles and GetStreamUri return valid RTSP endpoints."""
    # 1. Get Profiles
    soap_profiles = """<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:trt="http://www.onvif.org/ver10/media/wsdl">
  <soap:Body>
    <trt:GetProfiles/>
  </soap:Body>
</soap:Envelope>"""

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            ONVIF_MEDIA_URL,
            content=soap_profiles,
            headers={"Content-Type": "application/soap+xml; charset=utf-8"},
            timeout=5.0
        )
        assert resp.status_code == 200
        text = resp.text
        assert "GetProfilesResponse" in text
        assert "Profiles" in text
        assert "token=" in text

        # 2. Get Stream URI
        soap_stream_uri = """<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:trt="http://www.onvif.org/ver10/media/wsdl"
               xmlns:tt="http://www.onvif.org/ver10/schema">
  <soap:Body>
    <trt:GetStreamUri>
      <trt:StreamSetup>
        <tt:Stream>RTP-Unicast</tt:Stream>
        <tt:Transport><tt:Protocol>RTSP</tt:Protocol></tt:Transport>
      </trt:StreamSetup>
      <trt:ProfileToken>PROFILE_MAIN_001</trt:ProfileToken>
    </trt:GetStreamUri>
  </soap:Body>
</soap:Envelope>"""

        resp_stream = await client.post(
            ONVIF_MEDIA_URL,
            content=soap_stream_uri,
            headers={"Content-Type": "application/soap+xml; charset=utf-8"},
            timeout=5.0
        )
        assert resp_stream.status_code == 200
        stream_text = resp_stream.text
        assert "GetStreamUriResponse" in stream_text
        assert "rtsp://" in stream_text, "Returned StreamUri must be an RTSP URI"


def test_rtsp_protocol_handshake_and_sdp():
    """Verify raw RTSP TCP protocol handshake (OPTIONS and DESCRIBE) and SDP payload."""
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(5.0)
    try:
        s.connect((RTSP_HOST, RTSP_PORT))
        
        # 1. Send OPTIONS
        req_options = (
            f"OPTIONS {RTSP_URL} RTSP/1.0\r\n"
            "CSeq: 1\r\n"
            "User-Agent: StreamLab-Python-Client\r\n\r\n"
        )
        s.sendall(req_options.encode())
        res_options = s.recv(4096).decode("utf-8", errors="replace")
        assert "RTSP/1.0 200 OK" in res_options or "Public:" in res_options, f"OPTIONS failed: {res_options}"

        # 2. Send DESCRIBE
        req_describe = (
            f"DESCRIBE {RTSP_URL} RTSP/1.0\r\n"
            "CSeq: 2\r\n"
            "Accept: application/sdp\r\n"
            "User-Agent: StreamLab-Python-Client\r\n\r\n"
        )
        s.sendall(req_describe.encode())
        res_describe = s.recv(8192).decode("utf-8", errors="replace")
        
        assert "RTSP/1.0 200 OK" in res_describe, f"DESCRIBE failed: {res_describe}"
        assert "m=video" in res_describe, "SDP does not contain m=video track definition"
        assert "H264" in res_describe or "h264" in res_describe or "rtpmap" in res_describe, "SDP does not contain H264 rtpmap"
    finally:
        s.close()


def test_rtsp_media_packet_probing():
    """Probe live RTSP stream using ffprobe to verify real media frames."""
    cmd = [
        FFPROBE_BIN,
        "-v", "error",
        "-rtsp_transport", "tcp",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height,codec_name",
        "-of", "json",
        RTSP_URL
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
    assert res.returncode == 0, f"ffprobe RTSP failed: {res.stderr}"
    data = json.loads(res.stdout)
    streams = data.get("streams", [])
    assert len(streams) > 0, "No video stream found on RTSP endpoint"
    assert streams[0]["codec_name"] == "h264", f"Expected h264, got {streams[0].get('codec_name')}"
    assert streams[0]["width"] >= 640
    assert streams[0]["height"] >= 360


def test_rtmp_media_probing():
    """Probe live RTMP stream using ffprobe to verify multiplexed RTMP delivery."""
    cmd = [
        FFPROBE_BIN,
        "-v", "error",
        "-show_entries", "format=format_name:stream=codec_name",
        "-of", "json",
        RTMP_URL
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
    assert res.returncode == 0, f"ffprobe RTMP failed: {res.stderr}"
    data = json.loads(res.stdout)
    assert "flv" in data.get("format", {}).get("format_name", ""), "RTMP stream format should be FLV"
    streams = data.get("streams", [])
    assert len(streams) > 0, "No video stream in RTMP delivery"
    assert streams[0]["codec_name"] == "h264", f"Expected h264, got {streams[0].get('codec_name')}"


@pytest.mark.asyncio
async def test_websocket_telemetry():
    """Verify WebSocket client connection and event streaming."""
    async with websockets.connect(WS_URL, open_timeout=5.0) as ws:
        # Send heartbeat ping
        await ws.send(json.dumps({"type": "ping", "client": "streamlab-python-test"}))
        
        # Receive response
        msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
        data = json.loads(msg)
        assert "type" in data, "WebSocket message must have a type"
        assert "timestamp" in data, "WebSocket message must have a timestamp"
