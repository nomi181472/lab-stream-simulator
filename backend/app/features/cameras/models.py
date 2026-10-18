"""
Camera Database Model.
Stores virtual IP camera specifications, media configurations, and runtime metadata.
"""

from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.shared.database.database import Base


class CameraModel(Base):
    __tablename__ = "cameras"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    manufacturer: Mapped[str] = mapped_column(String(128), default="StreamLab Virtual")
    model: Mapped[str] = mapped_column(String(128), default="SL-CAM-1080P")
    serial_number: Mapped[str] = mapped_column(String(128), default="SL-SN-000001")
    firmware_version: Mapped[str] = mapped_column(String(64), default="v2.4.0-build2026")
    hostname: Mapped[str] = mapped_column(String(255), default="127.0.0.1")

    # Source & Playlist
    video_source_id: Mapped[str] = mapped_column(String(64), nullable=True)
    playlist_mode: Mapped[str] = mapped_column(String(32), default="repeat-one")  # repeat-one, playlist-loop

    # Codec & Video Config
    resolution_width: Mapped[int] = mapped_column(Integer, default=1280)
    resolution_height: Mapped[int] = mapped_column(Integer, default=720)
    fps: Mapped[int] = mapped_column(Integer, default=25)
    bitrate_kbps: Mapped[int] = mapped_column(Integer, default=2048)
    video_codec: Mapped[str] = mapped_column(String(32), default="h264")
    audio_codec: Mapped[str] = mapped_column(String(32), default="aac")

    # Endpoints & Media Paths
    rtsp_path: Mapped[str] = mapped_column(String(255), nullable=False)
    rtmp_path: Mapped[str] = mapped_column(String(255), nullable=False)
    snapshot_path: Mapped[str] = mapped_column(String(255), nullable=False)

    # Authentication
    auth_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    username: Mapped[str] = mapped_column(String(128), default="admin")
    password: Mapped[str] = mapped_column(String(128), default="Password123")

    # Timestamp Overlay Configuration
    overlay_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    overlay_format: Mapped[str] = mapped_column(String(32), default="24h")  # 12h, 24h
    overlay_timezone: Mapped[str] = mapped_column(String(64), default="UTC")
    overlay_custom_text: Mapped[str] = mapped_column(String(255), default="")
    overlay_font_size: Mapped[int] = mapped_column(Integer, default=22)
    overlay_font_color: Mapped[str] = mapped_column(String(32), default="yellow")
    overlay_bg_color: Mapped[str] = mapped_column(String(32), default="black@0.5")
    overlay_position: Mapped[str] = mapped_column(String(32), default="top")  # top, bottom

    # Runtime Lifecycle State
    status: Mapped[str] = mapped_column(String(32), default="stopped")  # stopped, starting, running, error, restarting
    uptime_seconds: Mapped[float] = mapped_column(Float, default=0.0)
    restart_count: Mapped[int] = mapped_column(Integer, default=0)
    last_error: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
