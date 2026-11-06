"""
StreamLab Desktop Tray Launcher.
Runs the FastAPI Core, MediaMTX, and embedded Mission Control UI in the background,
and provides a Windows System Tray icon for quick browser access and lifecycle management.
"""

import os
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

from PIL import Image, ImageDraw
import pystray
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

    def start_uvicorn(self):
        """Run uvicorn server in background thread."""
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
        webbrowser.open(f"http://localhost:{settings.API_PORT}")

    def open_docs(self, _=None):
        """Open Swagger API docs in user's default browser."""
        webbrowser.open(f"http://localhost:{settings.API_PORT}/docs")

    def open_videos(self, _=None):
        """Open videos directory in Windows File Explorer."""
        videos_dir = str(settings.VIDEOS_DIR)
        if os.path.exists(videos_dir):
            os.startfile(videos_dir)

    def stop_app(self, _=None):
        """Gracefully stop backend, MediaMTX and exit."""
        self.is_running = False
        if self.server:
            self.server.should_exit = True
        if self.icon:
            self.icon.stop()

    def run(self):
        # 1. Start backend server in daemon thread
        self.server_thread = threading.Thread(target=self.start_uvicorn, daemon=True)
        self.server_thread.start()

        # 2. Actively wait for backend to be healthy, then pop open browser
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
            self.open_browser()

        threading.Thread(target=launch_browser, daemon=True).start()

        # 3. Build Tray Menu
        menu = pystray.Menu(
            pystray.MenuItem("StreamLab Simulator", None, enabled=False),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("🌐 Open Mission Control", self.open_browser, default=True),
            pystray.MenuItem("📚 API Documentation", self.open_docs),
            pystray.MenuItem("📁 Open Video Sources", self.open_videos),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("❌ Exit StreamLab", self.stop_app),
        )

        # 4. Run System Tray Icon
        icon_img = create_tray_icon_image()
        self.icon = pystray.Icon(
            name="StreamLab",
            icon=icon_img,
            title="StreamLab - Virtual IP Camera Simulator",
            menu=menu,
        )

        try:
            self.icon.run()
        except KeyboardInterrupt:
            self.stop_app()


def main():
    app_instance = StreamLabTrayApp()
    app_instance.run()


if __name__ == "__main__":
    main()
