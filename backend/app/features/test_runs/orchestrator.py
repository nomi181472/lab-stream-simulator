"""
Test Orchestrator.
Manages automated test fixture provisioning, cross-language test execution, structured JSON report aggregation, and teardown.
"""

import asyncio
import json
import os
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.features.cameras.schemas import CameraCreate
from backend.app.features.cameras.service import camera_service
from backend.app.features.test_runs.models import TestRunModel
from backend.app.features.test_runs.schemas import TestResultItem, TestRunResponse
from backend.app.features.video_sources.models import VideoSourceModel
from backend.app.shared.configuration.config import settings
from backend.app.shared.database.database import async_session_maker
from backend.app.shared.logging.logger import get_logger

logger = get_logger(__name__, feature="test_runs")


class TestOrchestrator:
    SUPPORTED_LANGUAGES = ["python", "node", "golang", "dart", "dotnet", "kotlin"]

    async def execute_run(self, run_id: str, target_language: str = "all") -> None:
        """Background worker that provisions test cameras, executes suites, and compiles reports."""
        async with async_session_maker() as db:
            run = await db.get(TestRunModel, run_id)
            if not run:
                return

            run.status = "running"
            await db.commit()

            start_time = time.time()
            all_results: List[TestResultItem] = []

            # 1. Provision isolated test camera
            test_cam_id = f"test-cam-{uuid.uuid4().hex[:6]}"
            test_cam = None
            try:
                res_src = await db.execute(select(VideoSourceModel.id).where(VideoSourceModel.is_valid == True).limit(1))
                first_src_id = res_src.scalar_one_or_none() or "src-dd6801bc"

                test_cam = await camera_service.create_camera(
                    db,
                    CameraCreate(
                        id=test_cam_id,
                        name=f"Integration Test Camera {test_cam_id}",
                        manufacturer="StreamLab Labs",
                        model="SL-TEST-2026",
                        firmware_version="v2.5.0",
                        video_source_id=first_src_id,
                        resolution_width=1280,
                        resolution_height=720,
                        fps=25,
                        bitrate_kbps=1500,
                        overlay_enabled=True,
                        overlay_custom_text="TEST-SUITE-RUN",
                    ),
                )
                await camera_service.start_camera(db, test_cam_id)
                # Wait briefly for MediaMTX ingestion to stabilize
                await asyncio.sleep(2.5)

                languages_to_run = (
                    self.SUPPORTED_LANGUAGES
                    if target_language == "all"
                    else [target_language]
                )

                for lang in languages_to_run:
                    lang_results = await self._run_language_suite(lang, test_cam.id)
                    all_results.extend(lang_results)

            except Exception as e:
                logger.error(f"Error in test orchestrator run {run_id}: {e}")
            finally:
                # Teardown test camera
                if test_cam:
                    try:
                        await camera_service.delete_camera(db, test_cam_id)
                    except Exception:
                        pass

            duration_ms = int((time.time() - start_time) * 1000)
            passed = sum(1 for r in all_results if r.status == "PASSED")
            failed = sum(1 for r in all_results if r.status == "FAILED")
            skipped = sum(1 for r in all_results if r.status in ("SKIPPED", "UNSUPPORTED"))

            run.status = "completed" if failed == 0 else "failed"
            run.total_tests = len(all_results)
            run.passed_tests = passed
            run.failed_tests = failed
            run.skipped_tests = skipped
            run.duration_ms = duration_ms
            run.results_json = json.dumps([r.model_dump() for r in all_results])
            run.completed_at = datetime.now(timezone.utc)
            await db.commit()
            logger.info(f"Test run {run_id} finished: {passed} passed, {failed} failed, {skipped} skipped.")

    async def _run_language_suite(self, language: str, camera_id: str) -> List[TestResultItem]:
        """Dispatch real test runner script for a specific language."""
        script_map = {
            "python": [
                sys_py := str(settings.PROJECT_ROOT / "backend" / ".venv" / "Scripts" / "python.exe"),
                "clients/python/runner.py"
            ],
            "node": ["wsl", "bash", "-c", "cd /mnt/c/projects/lab-stream-simulator/clients/node && node dist/runner.js"],
            "golang": ["wsl", "bash", "-c", "cd /mnt/c/projects/lab-stream-simulator/clients/golang && go run main.go"],
            "dart": ["wsl", "bash", "-c", "cd /mnt/c/projects/lab-stream-simulator/clients/dart && dart bin/runner.dart"],
            "dotnet": ["wsl", "bash", "-c", "cd /mnt/c/projects/lab-stream-simulator/clients/dotnet && dotnet run"],
            "kotlin": ["wsl", "bash", "-c", "cd /mnt/c/projects/lab-stream-simulator/clients/kotlin && java -cp Runner.jar streamlab.client.KotlinClientRunner"],
        }

        # Check if runtime or runner exists
        cmd = script_map.get(language)
        if not cmd:
            return [
                TestResultItem(
                    language=language,
                    protocol="ALL",
                    test_name="language_runner_lookup",
                    status="UNSUPPORTED",
                    duration_ms=0,
                    error_message=f"No runner configured for language {language}",
                )
            ]

        # Check if client project directory exists
        client_dir = settings.PROJECT_ROOT / "clients" / language
        if not client_dir.exists():
            return [
                TestResultItem(
                    language=language,
                    protocol="ALL",
                    test_name="client_directory_exists",
                    status="SKIPPED",
                    duration_ms=0,
                    error_message=f"Client directory for {language} not yet present",
                )
            ]

        # Execute test runner
        start = time.time()
        try:
            env = dict(os.environ)
            env["STREAMLAB_CAMERA_ID"] = camera_id
            env["STREAMLAB_API_URL"] = f"http://127.0.0.1:{settings.API_PORT}"
            env["STREAMLAB_RTSP_URL"] = f"rtsp://127.0.0.1:{settings.RTSP_PORT}/cameras/{camera_id}/main"
            env["STREAMLAB_RTMP_URL"] = f"rtmp://127.0.0.1:{settings.RTMP_PORT}/cameras/{camera_id}/main"
            env["STREAMLAB_WS_URL"] = f"ws://127.0.0.1:{settings.API_PORT}/ws/cameras"

            proc = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=str(settings.PROJECT_ROOT),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=45.0)
            duration_ms = int((time.time() - start) * 1000)

            # Check for JSON report in standard integration-tests/reports/ path
            report_file = settings.PROJECT_ROOT / "integration-tests" / "reports" / f"report_{language}.json"
            if report_file.exists():
                try:
                    with open(report_file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    test_items = data.get("tests", []) or data.get("results", [])
                    items = []
                    for item in test_items:
                        items.append(
                            TestResultItem(
                                language=language,
                                protocol=item.get("protocol", "UNKNOWN"),
                                test_name=item.get("name") or item.get("test_name", "test"),
                                status=item.get("status", "FAILED"),
                                duration_ms=int(item.get("duration_seconds", 0) * 1000) or item.get("duration_ms", 0),
                                error_message=item.get("error") or item.get("error_message"),
                                details=item.get("details", {}),
                            )
                        )
                    if items:
                        return items
                except Exception:
                    pass

            # Fallback based on process return code
            status = "PASSED" if proc.returncode == 0 else "FAILED"
            out = stdout.decode(errors="replace")
            err = stderr.decode(errors="replace")
            return [
                TestResultItem(
                    language=language,
                    protocol="SUITE",
                    test_name=f"{language}_full_suite",
                    status=status,
                    duration_ms=duration_ms,
                    error_message=err if status == "FAILED" else None,
                    details={"stdout": out[:300], "exit_code": proc.returncode},
                )
            ]

        except asyncio.TimeoutError:
            return [
                TestResultItem(
                    language=language,
                    protocol="SUITE",
                    test_name=f"{language}_full_suite",
                    status="FAILED",
                    duration_ms=45000,
                    error_message="Test execution timed out after 45 seconds",
                )
            ]
        except Exception as e:
            return [
                TestResultItem(
                    language=language,
                    protocol="SUITE",
                    test_name=f"{language}_full_suite",
                    status="FAILED",
                    duration_ms=0,
                    error_message=str(e),
                )
            ]


test_orchestrator = TestOrchestrator()
