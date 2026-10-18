import os
import glob
from PIL import Image, ImageDraw, ImageFont

def build_demo_gif(output_path="demo.gif"):
    W, H = 1000, 580
    bg_color = (13, 17, 23)
    card_bg = (22, 27, 34)
    border_color = (48, 54, 61)
    accent_blue = (56, 139, 253)
    accent_green = (46, 160, 67)
    accent_purple = (163, 113, 247)
    text_white = (240, 246, 252)
    text_muted = (139, 148, 158)
    terminal_bg = (1, 4, 9)

    font_title = ImageFont.truetype("arial.ttf", 24)
    font_sub = ImageFont.truetype("arial.ttf", 15)
    font_body = ImageFont.truetype("arial.ttf", 14)
    font_bold = ImageFont.truetype("arialbd.ttf", 15)
    font_code = ImageFont.truetype("consola.ttf", 14)
    font_badge = ImageFont.truetype("arialbd.ttf", 12)

    frames = []

    def make_base(scene_badge="LIVE DEMO", scene_title="StreamLab Quickstart"):
        im = Image.new("RGB", (W, H), bg_color)
        draw = ImageDraw.Draw(im)
        # Top banner
        draw.rectangle([(0, 0), (W, 60)], fill=card_bg)
        draw.line([(0, 60), (W, 60)], fill=border_color, width=1)
        # Logo text
        draw.text((25, 18), "StreamLab", fill=accent_blue, font=font_title)
        draw.text((160, 24), "Multi-Protocol IP Camera Simulator", fill=text_muted, font=font_sub)

        # Right scene indicator
        tw = draw.textlength(scene_badge, font=font_badge)
        bx = W - 35 - int(tw) - 16
        draw.rounded_rectangle([(bx, 18), (W - 25, 42)], radius=6, fill=(35, 50, 75), outline=accent_blue)
        draw.text((bx + 8, 23), scene_badge, fill=(120, 190, 255), font=font_badge)

        # Bottom status bar
        draw.rectangle([(0, H - 35), (W, H)], fill=card_bg)
        draw.line([(0, H - 35), (W, H - 35)], fill=border_color, width=1)
        draw.text((25, H - 25), "Host: 0.0.0.0 (LAN Accessible)  •  RTSP: :8554  •  RTMP: :1935  •  HTTP: :8000  •  Web: :3000", fill=text_muted, font=font_code)
        return im, draw

    # --- SCENE 1: Launch Services (Terminal & 0.0.0.0 bind) ---
    term_lines = [
        ("> start.bat", (200, 200, 200)),
        ("StreamLab - Multi-Protocol IP Camera Simulator & Interoperability Lab", accent_blue),
        ("Starting FastAPI Backend (with MediaMTX & WS-Discovery)...", text_muted),
        ("Starting Next.js Mission Control Web Frontend (:3000)...", text_muted),
        ("", text_muted),
        ("StreamLab is ONLINE and ready on ALL interfaces (0.0.0.0)!", accent_green),
        ("  • Local Dashboard:   http://localhost:3000", text_white),
        ("  • LAN Dashboard:     http://192.168.100.6:3000   (Any PC on WiFi)", (100, 220, 255)),
        ("  • RTSP Stream:       rtsp://192.168.100.6:8554/cameras/101/main", (130, 255, 160)),
        ("  • RTMP Stream:       rtmp://192.168.100.6:1935/cameras/101/main", (255, 200, 120)),
        ("  • MJPEG Direct URL:  http://192.168.100.6:8000/api/v1/cameras/101/stream.mjpg", (255, 160, 220)),
        ("  • WebSocket Stream:  ws://192.168.100.6:8000/ws/cameras/101/stream", (200, 180, 255)),
    ]

    for step in range(3, len(term_lines) + 1):
        im, draw = make_base("STEP 1: LAUNCH", "Universal Cross-Platform Startup")
        # Terminal Box
        draw.rounded_rectangle([(30, 80), (W - 30, H - 55)], radius=8, fill=terminal_bg, outline=border_color)
        # macOS/Linux terminal dots
        draw.ellipse([(45, 95), (55, 105)], fill=(255, 95, 86))
        draw.ellipse([(65, 95), (75, 105)], fill=(255, 189, 46))
        draw.ellipse([(85, 95), (95, 105)], fill=(39, 201, 63))
        draw.text((120, 93), "Terminal — StreamLab Universal Launcher (0.0.0.0 Exposure)", fill=text_muted, font=font_code)
        draw.line([(30, 120), (W - 30, 120)], fill=border_color, width=1)

        y = 135
        for line, col in term_lines[:step]:
            draw.text((50, y), line, fill=col, font=font_code)
            y += 24
        frames.append(im)

    # Hold on completed terminal
    for _ in range(8):
        frames.append(im)

    # --- SCENE 2: Web Dashboard & Camera Card ---
    home_shot = Image.open("screenshot_home.png").convert("RGB").resize((940, 420), Image.LANCZOS)
    for _ in range(12):
        im, draw = make_base("STEP 2: MISSION CONTROL", "Next.js Web Interface")
        # Embed screenshot inside card border
        im.paste(home_shot, (30, 85))
        draw.rectangle([(30, 85), (970, 505)], outline=accent_blue, width=2)
        # Callout badge
        draw.rounded_rectangle([(70, 105), (420, 150)], radius=6, fill=(10, 25, 45), outline=accent_blue, width=2)
        draw.text((85, 118), "Live Virtual Camera Provisioning & Status", fill=(200, 230, 255), font=font_bold)
        frames.append(im)

    # --- SCENE 3: Live Video Playback & Multi-Protocol Streaming ---
    video_files = sorted(glob.glob("video_clip_*.png"))
    for i, vf in enumerate(video_files):
        im, draw = make_base("STEP 3: MULTI-PROTOCOL STREAM", "Live Playback Across Devices")
        # Left: Video Player Box
        v_img = Image.open(vf).convert("RGB").resize((480, 270), Image.LANCZOS)
        im.paste(v_img, (35, 95))
        draw.rectangle([(35, 95), (515, 365)], outline=accent_green, width=2)

        # Player header
        draw.rounded_rectangle([(45, 105), (260, 135)], radius=4, fill=(0, 0, 0), outline=(50, 200, 100))
        draw.text((55, 112), "LIVE: Front Entrance (101)", fill=(100, 255, 140), font=font_code)

        # Player sub-info
        draw.rounded_rectangle([(35, 380), (515, 495)], radius=6, fill=card_bg, outline=border_color)
        draw.text((50, 395), "Active Stream Metadata:", fill=text_white, font=font_bold)
        draw.text((50, 420), "• Resolution: 1920x1080 @ 25 FPS  (H.264 / AAC)", fill=text_muted, font=font_body)
        draw.text((50, 445), "• Persistent Looping: Seamless EOF continuity", fill=text_muted, font=font_body)
        draw.text((50, 470), "• Real-Time Wall Clock Overlay: Monotonic UTC", fill=text_muted, font=font_body)

        # Right: URL Integration Guide Box
        draw.rounded_rectangle([(535, 95), (965, 495)], radius=8, fill=card_bg, outline=border_color)
        draw.text((555, 112), "Client Access URLs (LAN & Remote)", fill=text_white, font=font_bold)
        draw.line([(535, 140), (965, 140)], fill=border_color, width=1)

        urls = [
            ("VLC / NVR / FFplay (RTSP):", "rtsp://192.168.100.6:8554/cameras/101/main", accent_green),
            ("OBS / Media Ingest (RTMP):", "rtmp://192.168.100.6:1935/cameras/101/main", (255, 180, 80)),
            ("Direct Browser URL (MJPEG):", "http://192.168.100.6:8000/api/v1/cameras/101/stream.mjpg", (255, 130, 220)),
            ("HTML5 / Canvas (WebSocket):", "ws://192.168.100.6:8000/ws/cameras/101/stream", accent_purple),
            ("Browser HLS (Low Latency):", "http://192.168.100.6:8888/cameras/101/main/index.m3u8", accent_blue),
        ]

        uy = 155
        for title, link, col in urls:
            draw.text((555, uy), title, fill=text_muted, font=font_sub)
            draw.rounded_rectangle([(555, uy + 20), (945, uy + 48)], radius=4, fill=terminal_bg, outline=border_color)
            draw.text((565, uy + 26), link, fill=col, font=font_code)
            uy += 65

        frames.append(im)

    # --- SCENE 4: Verification Suites Passed ---
    for _ in range(12):
        im, draw = make_base("STEP 4: INTEROPERABILITY", "6-Language Protocol Verification")
        draw.rounded_rectangle([(30, 80), (W - 30, H - 55)], radius=8, fill=card_bg, outline=accent_green)
        draw.text((50, 105), "Automated Protocol Compliance Test Results (Zero Mock Tolerance)", fill=text_white, font=font_bold)
        draw.line([(30, 135), (W - 30, 135)], fill=border_color, width=1)

        suites = [
            ("Python 3.12 Suite", "pytest + httpx + websockets + ffprobe", "PASSED (100%)", accent_green),
            ("Node.js / TS Suite", "ws + fetch + net + ffprobe", "PASSED (100%)", accent_green),
            ("Go Suite", "net/http + net.Dial + ffprobe", "PASSED (100%)", accent_green),
            ("Dart Suite", "HttpClient + Socket + WebSocket + ffprobe", "PASSED (100%)", accent_green),
            ("C# .NET 10 Suite", "HttpClient + TcpClient + ClientWebSocket", "PASSED (100%)", accent_green),
            ("Kotlin JVM Suite", "HttpClient + Socket + WebSocket", "PASSED (100%)", accent_green),
        ]

        sy = 155
        for name, tech, st, col in suites:
            draw.rounded_rectangle([(50, sy), (W - 50, sy + 44)], radius=6, fill=terminal_bg, outline=border_color)
            draw.text((70, sy + 12), name, fill=text_white, font=font_bold)
            draw.text((260, sy + 14), tech, fill=text_muted, font=font_code)
            tw = draw.textlength(st, font=font_bold)
            draw.text((W - 80 - tw, sy + 12), st, fill=col, font=font_bold)
            sy += 55

        frames.append(im)

    print(f"Saving {len(frames)} frames into {output_path}...")
    frames[0].save(
        output_path,
        save_all=True,
        append_images=frames[1:],
        duration=120,
        loop=0,
        optimize=True,
    )
    print("Done generating demo GIF!")

if __name__ == "__main__":
    build_demo_gif()
