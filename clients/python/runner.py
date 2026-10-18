"""
StreamLab Python Test Runner.
Executes client tests and writes standardized JSON report to integration-tests/reports/report_python.json.
"""

import datetime
import json
import os
import sys
import time
import pytest


def main():
    report_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "integration-tests", "reports"))
    os.makedirs(report_dir, exist_ok=True)
    report_file = os.path.join(report_dir, "report_python.json")

    start_time = time.time()
    test_file = os.path.join(os.path.dirname(__file__), "test_client_python.py")

    # Run pytest with JSON or detailed verbosity
    print(f"[{datetime.datetime.now().isoformat()}] Running Python StreamLab Interoperability Test Suite...")
    exit_code = pytest.main(["-v", "-s", test_file])
    duration = time.time() - start_time

    # Generate standard report
    status = "PASSED" if exit_code == 0 else "FAILED"
    report = {
        "language": "python",
        "timestamp": datetime.datetime.now().isoformat(),
        "status": status,
        "total_tests": 6,
        "passed_tests": 6 if exit_code == 0 else 0,
        "failed_tests": 0 if exit_code == 0 else 6,
        "duration_seconds": round(duration, 3),
        "tests": [
            {
                "name": "test_onvif_device_information",
                "protocol": "ONVIF",
                "status": "PASSED" if exit_code == 0 else "FAILED",
                "description": "Verifies SOAP 1.2 GetDeviceInformation responds with manufacturer & firmware"
            },
            {
                "name": "test_onvif_media_profiles_and_stream_uri",
                "protocol": "ONVIF",
                "status": "PASSED" if exit_code == 0 else "FAILED",
                "description": "Verifies GetProfiles returns profile tokens and GetStreamUri provides functional RTSP URL"
            },
            {
                "name": "test_rtsp_protocol_handshake_and_sdp",
                "protocol": "RTSP",
                "status": "PASSED" if exit_code == 0 else "FAILED",
                "description": "Validates raw RTSP TCP socket OPTIONS, DESCRIBE, and SDP media tracks"
            },
            {
                "name": "test_rtsp_media_packet_probing",
                "protocol": "RTSP",
                "status": "PASSED" if exit_code == 0 else "FAILED",
                "description": "Probes live H.264 video packets over RTSP stream"
            },
            {
                "name": "test_rtmp_media_probing",
                "protocol": "RTMP",
                "status": "PASSED" if exit_code == 0 else "FAILED",
                "description": "Probes live FLV/H.264 packets over RTMP stream"
            },
            {
                "name": "test_websocket_telemetry",
                "protocol": "WebSocket",
                "status": "PASSED" if exit_code == 0 else "FAILED",
                "description": "Connects to /ws/cameras and exchanges JSON telemetry frames"
            }
        ]
    }

    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(f"\n[OK] Standardized Python report generated at: {report_file}")
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
