"""
StreamLab Global Configuration.
Loads settings from environment variables and provides centralized configuration.
"""

from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Base paths
    PROJECT_ROOT: Path = Path(__file__).resolve().parent.parent.parent.parent.parent
    VIDEOS_DIR: Path = PROJECT_ROOT / "videos"
    CONFIG_DIR: Path = PROJECT_ROOT / "config"
    BIN_DIR: Path = PROJECT_ROOT / "bin"
    DATABASE_URL: str = f"sqlite+aiosqlite:///{PROJECT_ROOT}/backend/streamlab.db"

    # Server settings
    HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    # Streaming & MediaMTX Ports
    RTSP_PORT: int = 8554
    RTMP_PORT: int = 1935
    HLS_PORT: int = 8888
    WEBRTC_PORT: int = 8889
    MEDIAMTX_HOST: str = "127.0.0.1"
    MEDIAMTX_API_PORT: int = 9997
    MEDIAMTX_API_URL: str = "http://127.0.0.1:9997"

    # ONVIF & WS-Discovery
    ONVIF_ENABLED: bool = True
    WS_DISCOVERY_ENABLED: bool = True
    WS_DISCOVERY_PORT: int = 3702
    WS_DISCOVERY_MULTICAST_GROUP: str = "239.255.255.250"
    ADVERTISED_HOST: str = "127.0.0.1"

    # Proxy
    ENABLE_FRONTEND_PROXY: Optional[bool] = None

    # Authentication
    DEFAULT_USERNAME: str = "admin"
    DEFAULT_PASSWORD: str = "Password123"
    REQUIRE_AUTH: bool = False

    # Security
    ALLOWED_SOURCE_ROOTS: List[str] = []
    MAX_UPLOAD_SIZE_MB: int = 500
    MAX_CAMERA_PROCESSES: int = 16

    # Timestamp overlay
    DEFAULT_TIMEZONE: str = "UTC"
    DEFAULT_FONT: Optional[str] = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
