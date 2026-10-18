"""
Camera Pydantic Schemas.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class CameraBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    manufacturer: str = Field("StreamLab Virtual", max_length=128)
    model: str = Field("SL-CAM-1080P", max_length=128)
    serial_number: Optional[str] = None
    firmware_version: str = Field("v2.4.0-build2026", max_length=64)
    hostname: str = Field("127.0.0.1", max_length=255)

    video_source_id: Optional[str] = None
    playlist_mode: str = Field("repeat-one", pattern="^(repeat-one|playlist-loop)$")

    resolution_width: int = Field(1280, ge=320, le=3840)
    resolution_height: int = Field(720, ge=240, le=2160)
    fps: int = Field(25, ge=1, le=60)
    bitrate_kbps: int = Field(2048, ge=256, le=20000)
    video_codec: str = Field("h264", pattern="^(h264|h265|copy)$")
    audio_codec: str = Field("aac", pattern="^(aac|opus|none)$")

    auth_enabled: bool = False
    username: str = "admin"
    password: str = "Password123"

    overlay_enabled: bool = True
    overlay_format: str = Field("24h", pattern="^(12h|24h)$")
    overlay_timezone: str = "UTC"
    overlay_custom_text: str = ""
    overlay_font_size: int = Field(22, ge=10, le=72)
    overlay_font_color: str = "yellow"
    overlay_bg_color: str = "black@0.5"
    overlay_position: str = Field("top", pattern="^(top|bottom)$")


class CameraCreate(CameraBase):
    id: Optional[str] = None


class CameraUpdate(BaseModel):
    name: Optional[str] = None
    video_source_id: Optional[str] = None
    playlist_mode: Optional[str] = None
    resolution_width: Optional[int] = None
    resolution_height: Optional[int] = None
    fps: Optional[int] = None
    bitrate_kbps: Optional[int] = None
    video_codec: Optional[str] = None
    audio_codec: Optional[str] = None
    auth_enabled: Optional[bool] = None
    username: Optional[str] = None
    password: Optional[str] = None
    overlay_enabled: Optional[bool] = None
    overlay_format: Optional[str] = None
    overlay_timezone: Optional[str] = None
    overlay_custom_text: Optional[str] = None
    overlay_font_size: Optional[int] = None
    overlay_font_color: Optional[str] = None
    overlay_bg_color: Optional[str] = None
    overlay_position: Optional[str] = None


class StreamStats(BaseModel):
    readers_count: int = 0
    bytes_received: int = 0
    bytes_sent: int = 0
    is_publishing: bool = False


class CameraResponse(CameraBase):
    id: str
    rtsp_path: str
    rtmp_path: str
    snapshot_path: str
    status: str
    uptime_seconds: float
    restart_count: int
    last_error: str
    created_at: datetime
    updated_at: datetime
    rtsp_url: str
    rtmp_url: str
    snapshot_url: str
    hls_url: str
    webrtc_url: str
    stats: Optional[StreamStats] = None

    model_config = ConfigDict(from_attributes=True)


class CameraStatusResponse(BaseModel):
    id: str
    status: str
    uptime_seconds: float
    restart_count: int
    last_error: str
    readers_count: int = 0
