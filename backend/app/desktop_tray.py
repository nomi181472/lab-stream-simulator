"""
StreamLab Desktop Launcher.
Runs the FastAPI Core, MediaMTX, and embedded Mission Control UI in the background,
and provides a System Tray icon (or Headless/Console runner on Linux servers)
for quick browser access and lifecycle management.
"""

import os
import signal
import subprocess
import sys
import time
import threading
import webbrowser
from pathlib import Path

# Ensure project root is in sys.path
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent.parent
if getattr(sys, "frozen", False):
    PROJECT_ROOT = Path(sys.executable).resolve().parent

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.shared.patch_windows import patch_windows_asyncio
patch_windows_asyncio()

from PIL import Image, ImageDraw
import uvicorn

from backend.app.shared.configuration.config import settings
from backend.app.main import app


def create_tray_icon_image():
    """Generate a clean 64x64 StreamLab camera icon for the system tray."""
    img = Image.new("RGBA", (64, 64), color=(0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded rectangle background (Cyan/Teal theme)
    draw.rounded_rectangle([2, 2, 62, 62], radius=12, fill=(15, 23, 42), outline=(14, 165, 233), width=3)
    
    # Camera body
    draw.rounded_rectangle([14, 20, 50, 48], radius=6, fill=(14, 165, 233))
    
    # Camera lens circle
    draw.ellipse([24, 26, 40, 42], fill=(15, 23, 42), outline=(255, 255, 255), width=2)
    # Inner lens glow
    draw.ellipse([29, 31, 35, 37], fill=(56, 189, 248))
    
    # Top flash / sensor
    draw.rounded_rectangle([26, 15, 38, 19], radius=2, fill=(244, 63, 94))

    return img


class StreamLabTrayApp:
    def __init__(self):
        self.server = None
        self.server_thread = None
        self.icon = None
        self.is_running = True
        self._stop_event = threading.Event()

    def start_uvicorn(self):
        """Run uvicorn server in background thread."""
        patch_windows_asyncio()
        config = uvicorn.Config(
            app=app,
            host=settings.HOST,
            port=settings.API_PORT,
            log_level="info",
            access_log=False,
        )
        self.server = uvicorn.Server(config)
        self.server.run()

    def open_browser(self, _=None):
        """Open StreamLab Mission Control in user's default browser."""
        try:
            webbrowser.open(f"http://localhost:{settings.API_PORT}")
        except Exception:
            pass

    def open_docs(self, _=None):
        """Open Swagger API docs in user's default browser."""
        try:
            webbrowser.open(f"http://localhost:{settings.API_PORT}/docs")
        except Exception:
            pass

    def open_videos(self, _=None):
        """Open videos directory in default system file manager."""
        videos_dir = str(settings.VIDEOS_DIR)
        if not os.path.exists(videos_dir):
            return
        try:
            if sys.platform == "win32":
                os.startfile(videos_dir)
            elif sys.platform == "darwin":
                subprocess.run(["open", videos_dir], check=False)
            else:
                subprocess.run(["xdg-open", videos_dir], check=False)
        except Exception as err:
            print(f"[StreamLab] Could not open file manager: {err}", file=sys.stderr)

    def stop_app(self, _=None):
        """Gracefully stop backend, MediaMTX and exit."""
        self.is_running = False
        self._stop_event.set()
        if self.server:
            self.server.should_exit = True
        if self.icon:
            try:
                self.icon.stop()
            except Exception:
                pass

    def run(self):
        # 1. Start backend server in daemon thread
        self.server_thread = threading.Thread(target=self.start_uvicorn, daemon=True)
        self.server_thread.start()

        # 2. Actively wait for backend to be healthy, then pop open browser if GUI desktop is active
        def launch_browser():
            import urllib.request
            # Poll /healthz until server is fully initialized (up to 30 seconds)
            for _ in range(60):
                time.sleep(0.5)
                try:
                    with urllib.request.urlopen(f"http://127.0.0.1:{settings.API_PORT}/healthz", timeout=1) as resp:
                        if resp.status == 200:
                            break
                except Exception:
                    pass

            has_display = True
            if sys.platform.startswith("linux"):
                has_display = bool(os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY"))

            if has_display:
                self.open_browser()

        threading.Thread(target=launch_browser, daemon=True).start()

        # 3. Check if system tray GUI is supported / available
        can_run_tray = True
        if sys.platform.startswith("linux"):
            if not (os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY")):
                can_run_tray = False

        if can_run_tray:
            try:
                import pystray
                menu = pystray.Menu(
                    pystray.MenuItem("StreamLab Simulator", None, enabled=False),
                    pystray.Menu.SEPARATOR,
                    pystray.MenuItem("🌐 Open Mission Control", self.open_browser, default=True),
                    pystray.MenuItem("📚 API Documentation", self.open_docs),
                    pystray.MenuItem("📁 Open Video Sources", self.open_videos),
                    pystray.Menu.SEPARATOR,
                    pystray.MenuItem("❌ Exit StreamLab", self.stop_app),
                )
                icon_img = create_tray_icon_image()
                self.icon = pystray.Icon(
                    name="StreamLab",
                    icon=icon_img,
                    title="StreamLab - Virtual IP Camera Simulator",
                    menu=menu,
                )
                self.icon.run()
                return
            except Exception as exc:
                print(f"[StreamLab] System tray GUI not available ({exc}). Running in console mode.", flush=True)

        # 4. Console Fallback Mode (Headless / Linux server / Docker / No system tray)
        print("=" * 60, flush=True)
        print(" StreamLab - Virtual IP Camera Simulator", flush=True)
        print(f" Mission Control UI: http://localhost:{settings.API_PORT}", flush=True)
        print(f" API Documentation:  http://localhost:{settings.API_PORT}/docs", flush=True)
        print(" Press Ctrl+C to shut down.", flush=True)
        print("=" * 60, flush=True)

        def handle_signal(sig, frame):
            print("\n[StreamLab] Signal received, shutting down gracefully...", flush=True)
            self.stop_app()

        try:
            signal.signal(signal.SIGINT, handle_signal)
            signal.signal(signal.SIGTERM, handle_signal)
        except Exception:
            pass

        while self.is_running and not self._stop_event.is_set():
            try:
                self._stop_event.wait(timeout=1.0)
            except (KeyboardInterrupt, SystemExit):
                self.stop_app()
                break


def main():
    app_instance = StreamLabTrayApp()
    app_instance.run()


if __name__ == "__main__":
    main()
