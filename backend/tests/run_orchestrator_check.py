"""
Trigger a full interop run across the client test runners using the TestOrchestrator.
"""

import asyncio
import uuid
from backend.app.shared.database.database import init_db, async_session_maker
from backend.app.features.test_runs.models import TestRunModel
from backend.app.features.test_runs.orchestrator import test_orchestrator
from backend.app.shared.subprocesses.manager import process_manager


async def main():
    await init_db()
    run_id = f"test-run-{uuid.uuid4().hex[:8]}"

    async with async_session_maker() as db:
        run = TestRunModel(
            id=run_id,
            target_language="python",
            status="pending",
        )
        db.add(run)
        await db.commit()

    print(f"Created TestRunModel: {run_id}. Executing test suite...")
    try:
        await test_orchestrator.execute_run(run_id, target_language="python")
    finally:
        await process_manager.stop_all()

    async with async_session_maker() as db:
        final_run = await db.get(TestRunModel, run_id)
        print(f"Test Run Completed! Status: {final_run.status}")
        print(f"Total: {final_run.total_tests}, Passed: {final_run.passed_tests}, Failed: {final_run.failed_tests}")
        print(f"Results JSON: {final_run.results_json[:300]}...")


if __name__ == "__main__":
    asyncio.run(main())
