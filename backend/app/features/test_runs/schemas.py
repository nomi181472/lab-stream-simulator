"""
Test Run Pydantic Schemas.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class TestResultItem(BaseModel):
    language: str
    protocol: str  # ONVIF, RTSP, RTMP, WebSocket
    test_name: str
    status: str  # PASSED, FAILED, SKIPPED, UNSUPPORTED
    duration_ms: int
    error_message: Optional[str] = None
    details: Dict[str, Any] = {}


class TestRunCreate(BaseModel):
    target_language: str = Field("all", pattern="^(all|dart|node|python|dotnet|kotlin|golang)$")


class TestRunResponse(BaseModel):
    id: str
    target_language: str
    language: str = ""
    protocol: str = "ALL"
    status: str
    total_tests: int
    passed_tests: int
    failed_tests: int
    skipped_tests: int
    duration_ms: int
    duration_seconds: float = 0.0
    stdout_log: Optional[str] = ""
    started_at: datetime
    completed_at: Optional[datetime] = None
    results: List[TestResultItem] = []

    model_config = ConfigDict(from_attributes=True)
