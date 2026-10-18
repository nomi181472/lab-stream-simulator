"""
Video Source Pydantic Schemas.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class VideoSourceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    file_path: str = Field(..., min_length=1)
    source_type: str = Field("local", pattern="^(local|remote_url|generated)$")


class VideoSourceResponse(BaseModel):
    id: str
    name: str
    source_type: str
    file_path: str
    file_size_bytes: int
    duration_sec: float
    width: int
    height: int
    fps: float
    video_codec: str
    audio_codec: str
    is_valid: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VideoSourceProbeResult(BaseModel):
    valid: bool
    error: Optional[str] = None
    width: int = 0
    height: int = 0
    fps: float = 0.0
    duration_sec: float = 0.0
    video_codec: str = ""
    audio_codec: str = ""
    file_size_bytes: int = 0
