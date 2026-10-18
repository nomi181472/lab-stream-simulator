"""
Test Run Database Model.
Stores test orchestration runs and cross-language interoperability results.
"""

from datetime import datetime, timezone
from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.shared.database.database import Base


class TestRunModel(Base):
    __tablename__ = "test_runs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    target_language: Mapped[str] = mapped_column(String(32), default="all")
    status: Mapped[str] = mapped_column(String(32), default="pending")  # pending, running, completed, failed
    total_tests: Mapped[int] = mapped_column(Integer, default=0)
    passed_tests: Mapped[int] = mapped_column(Integer, default=0)
    failed_tests: Mapped[int] = mapped_column(Integer, default=0)
    skipped_tests: Mapped[int] = mapped_column(Integer, default=0)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    results_json: Mapped[str] = mapped_column(Text, default="{}")
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
