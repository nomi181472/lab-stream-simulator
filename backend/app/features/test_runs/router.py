"""
Test Runs FastAPI Router.
Provides endpoints to trigger cross-language test runs and query report histories.
"""

import asyncio
import json
import uuid
from typing import List
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.features.test_runs.models import TestRunModel
from backend.app.features.test_runs.orchestrator import test_orchestrator
from backend.app.features.test_runs.schemas import TestResultItem, TestRunCreate, TestRunResponse
from backend.app.shared.database.database import get_db_session

router = APIRouter(prefix="/test-runs", tags=["Test Orchestrator"])


def to_run_response(model: TestRunModel) -> TestRunResponse:
    results_list = []
    try:
        raw = json.loads(model.results_json or "[]")
        if isinstance(raw, list):
            results_list = [TestResultItem(**item) for item in raw]
    except Exception:
        pass

    status_str = (model.status or "pending").upper()
    if status_str == "COMPLETED" and model.failed_tests == 0 and model.passed_tests > 0:
        status_str = "PASSED"
    elif status_str == "COMPLETED" and model.failed_tests > 0:
        status_str = "FAILED"

    stdout_txt = getattr(model, "stdout_log", "") or ""
    if not stdout_txt and results_list:
        lines = [
            f"=== StreamLab Interoperability Test Runner ({model.target_language.upper()}) ===",
            f"Run ID: {model.id} | Duration: {round((model.duration_ms or 0) / 1000.0, 3)}s",
            "----------------------------------------------------------------",
        ]
        for r in results_list:
            icon = "✓" if r.status == "PASSED" else "✗"
            status_tag = f"[{r.status}]".ljust(10)
            lines.append(f"{icon} {status_tag} {r.protocol.ljust(12)} :: {r.test_name} ({r.duration_ms}ms)")
            if r.error_message:
                lines.append(f"    ERROR: {r.error_message}")
        lines.append("----------------------------------------------------------------")
        lines.append(f"Result: {model.passed_tests} PASSED, {model.failed_tests} FAILED, {model.skipped_tests} SKIPPED (Total: {model.total_tests})")
        stdout_txt = "\n".join(lines)

    return TestRunResponse(
        id=model.id,
        target_language=model.target_language,
        language=model.target_language,
        protocol="ALL",
        status=status_str,
        total_tests=model.total_tests,
        passed_tests=model.passed_tests,
        failed_tests=model.failed_tests,
        skipped_tests=model.skipped_tests,
        duration_ms=model.duration_ms,
        duration_seconds=round((model.duration_ms or 0) / 1000.0, 3),
        stdout_log=stdout_txt,
        started_at=model.started_at,
        completed_at=model.completed_at,
        results=results_list,
    )


@router.post("", response_model=TestRunResponse, status_code=202)
async def create_test_run(
    req: TestRunCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db_session),
):
    run_id = f"run-{uuid.uuid4().hex[:8]}"
    model = TestRunModel(
        id=run_id,
        target_language=req.target_language,
        status="pending",
    )
    db.add(model)
    await db.commit()
    await db.refresh(model)

    background_tasks.add_task(test_orchestrator.execute_run, run_id, req.target_language)
    return to_run_response(model)


@router.get("", response_model=List[TestRunResponse])
async def list_test_runs(db: AsyncSession = Depends(get_db_session)):
    res = await db.execute(select(TestRunModel).order_by(TestRunModel.started_at.desc()).limit(50))
    runs = res.scalars().all()
    return [to_run_response(r) for r in runs]


@router.get("/{run_id}", response_model=TestRunResponse)
async def get_test_run(run_id: str, db: AsyncSession = Depends(get_db_session)):
    res = await db.execute(select(TestRunModel).where(TestRunModel.id == run_id))
    model = res.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail=f"Test run '{run_id}' not found")
    return to_run_response(model)
