"""
StreamLab Global Configuration.
Loads settings from environment variables and provides centralized configuration.
"""

import os
import sys
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


def _resolve_project_root() -> Path:
    if getattr(sys, "frozen", False):
        exe_dir = Path(sys.executable).resolve().parent
        if (exe_dir / "videos").exists() or (exe_dir / "bin").exists() or (exe_dir / "config").exists():
            return exe_dir
        if hasattr(sys, "_MEIPASS"):
            return Path(sys._MEIPASS)
        return exe_dir
    return Path(__file__).resolve().parent.parent.parent.parent.parent


def _resolve_database_url(project_root: Path) -> str:
    if getattr(sys, "frozen", False):
        if sys.platform == "win32":
            local_app_data = os.environ.get("LOCALAPPDATA")
            data_dir = (Path(local_app_data) / "StreamLab") if local_app_data else (project_root / "data")
        elif sys.platform.startswith("linux"):
            xdg_data = os.environ.get("XDG_DATA_HOME")
            data_dir = (Path(xdg_data) / "streamlab") if xdg_data else (Path.home() / ".local" / "share" / "streamlab")
        elif sys.platform == "darwin":
            data_dir = Path.home() / "Library" / "Application Support" / "StreamLab"
        else:
            data_dir = project_root / "data"

        try:
            data_dir.mkdir(parents=True, exist_ok=True)
            db_file = data_dir / "streamlab.db"
            return f"sqlite+aiosqlite:///{db_file.as_posix()}"
        except Exception:
            fallback = project_root / "data"
            fallback.mkdir(parents=True, exist_ok=True)
            return f"sqlite+aiosqlite:///{fallback.as_posix()}/streamlab.db"
    
    (project_root / "backend").mkdir(parents=True, exist_ok=True)
    return f"sqlite+aiosqlite:///{project_root.as_posix()}/backend/streamlab.db"


_root = _resolve_project_root()


class Settings(BaseSettings):
    # Base paths
    PROJECT_ROOT: Path = _root
    VIDEOS_DIR: Path = _root / "videos"
    CONFIG_DIR: Path = _root / "config"
    BIN_DIR: Path = _root / "bin"
    DATABASE_URL: str = _resolve_database_url(_root)

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
