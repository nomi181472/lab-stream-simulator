"use client";

import { useState, useEffect } from "react";
import {
  Play,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  Radio,
  Video,
  ArrowRight,
  Terminal,
  Activity,
  Layers,
  Cpu,
} from "lucide-react";

interface ProtocolInfo {
  name: string;
  badge: string;
  uri: string;
  command: string;
  description: string;
}

const protocols: Record<string, ProtocolInfo> = {
  RTSP: {
    name: "RTSP 1.0 (Real-Time Streaming Protocol)",
    badge: "Port 8554",
    uri: "rtsp://localhost:8554/cameras/101/main",
    command: "ffplay -rtsp_transport tcp rtsp://localhost:8554/cameras/101/main",
    description: "Production RTSP feed with TCP-interleaved & UDP RTP streaming for VLC, OpenCV, FFmpeg, and NVRs.",
  },
  ONVIF: {
    name: "ONVIF Profile S (SOAP 1.2 & WS-Discovery)",
    badge: "Port 8000 / UDP 3702",
    uri: "http://localhost:8000/onvif/device_service",
    command: "curl -X POST http://localhost:8000/onvif/device_service -d '<GetDeviceInformation/>'",
    description: "WSDL-compliant SOAP 1.2 XML service with WS-Security digest and UDP 3702 multicast auto-discovery.",
  },
  MJPEG: {
    name: "Direct Browser MJPEG Stream",
    badge: "Zero-Plugin HTTP",
    uri: "http://localhost:8000/api/v1/cameras/101/stream.mjpg",
    command: '<img src="http://localhost:8000/api/v1/cameras/101/stream.mjpg" alt="Live Camera" />',
    description: "Zero-latency multipart/x-mixed-replace stream viewable natively in Chrome, Safari, Firefox, and Edge.",
  },
  RTMP: {
    name: "RTMP Live Ingest & Egress",
    badge: "Port 1935",
    uri: "rtmp://localhost:1935/cameras/101/main",
    command: "ffmpeg -i input.mp4 -f flv rtmp://localhost:1935/live/stream_key",
    description: "Full RTMP server supporting live broadcast playback and OBS Studio external publisher ingest.",
  },
  WebRTC: {
    name: "WebRTC WHEP (Sub-Second Latency)",
    badge: "Port 8889",
    uri: "http://localhost:8889/cameras/101/main/whep",
    command: "curl -X POST -H 'Content-Type: application/sdp' --data-binary @offer.sdp ...",
    description: "Ultra-low-latency real-time video delivery directly into HTML5 video elements via WebRTC HTTP Egress.",
  },
  HLS: {
    name: "HLS (HTTP Live Streaming)",
    badge: "Port 8888",
    uri: "http://localhost:8888/cameras/101/main/index.m3u8",
    command: "vlc http://localhost:8888/cameras/101/main/index.m3u8",
    description: "Adaptive segmented streaming compatible with Apple Safari, iOS devices, and Hls.js web players.",
  },
};

export default function Hero() {
  const [copiedDocker, setCopiedDocker] = useState(false);
  const [copiedUri, setCopiedUri] = useState(false);
  const [activeProtoKey, setActiveProtoKey] = useState("RTSP");
  const [timestamp, setTimestamp] = useState("2026-11-06 12:15:00");

  const dockerCommand = "docker run -d -p 8000:8000 -p 8554:8554 -p 1935:1935 botonetics/streamlab-backend";

  // Monotonically advancing wall clock effect matching StreamLab's real-time burn-in engine
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const formatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      setTimestamp(formatted);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyDocker = () => {
    navigator.clipboard.writeText(dockerCommand);
    setCopiedDocker(true);
    setTimeout(() => setCopiedDocker(false), 2000);
  };

  const handleCopyUri = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2000);
  };

  const activeProto = protocols[activeProtoKey];

  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
      {/* Background Glow & Grid Accents */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[300px] bg-secondary/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Announcement Pill */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-surface-100 border border-primary/30 text-xs text-slate-300 shadow-glow-cyan/20">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="font-semibold text-white">Zero Mock Tolerance</span>
            <span className="text-slate-500">•</span>
            <span className="text-primary font-medium">Genuine FFmpeg & MediaMTX Engines</span>
          </div>
        </div>

        {/* Primary H1 Heading (SEO Centered) */}
        <div className="text-center max-w-4xl mx-auto mb-8">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.12]">
            Enterprise Virtual IP Camera Simulator &amp;{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-300 to-indigo-400">
              Protocol Compliance Lab
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Eliminate physical camera dependencies in your automated CI/CD pipelines, computer vision benchmarks, and NVR integrations.
            Stream real <strong>RTSP, RTMP, WebRTC, HLS, browser MJPEG</strong>, and <strong>ONVIF Profile S (WS-Discovery)</strong> feeds from any video file with uninterrupted looping and real-time wall-clock timestamps.
          </p>
        </div>

        {/* Quick Docker Install Command */}
        <div className="max-w-2xl mx-auto mb-10">
          <div className="flex items-center justify-between gap-3 p-2 sm:p-2.5 rounded-xl bg-surface-200 border border-border shadow-2xl">
            <div className="flex items-center gap-2.5 overflow-x-auto text-xs font-mono text-slate-300 px-3 py-1">
              <span className="text-primary font-bold">$</span>
              <span className="whitespace-nowrap">{dockerCommand}</span>
            </div>
            <button
              onClick={handleCopyDocker}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-surface-100 hover:bg-surface-50 border border-slate-700 hover:border-primary transition-all flex-shrink-0"
              title="Copy Docker command"
              aria-label="Copy Docker command to clipboard"
            >
              {copiedDocker ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <div className="mt-2.5 flex items-center justify-center gap-6 text-xs text-muted-foreground font-medium">
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" /> Zero installation required
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" /> Windows, Linux &amp; macOS
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" /> Docker Hub Verified
            </span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <a
            href="#quickstart"
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-background bg-primary hover:bg-primary-hover shadow-glow-cyan transition-all transform hover:-translate-y-0.5"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Launch StreamLab Stack</span>
          </a>

          <a
            href="#protocols"
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-white bg-surface-100 hover:bg-surface-50 border border-border hover:border-slate-600 transition-all"
          >
            <span>Explore Protocols &amp; Specs</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </a>

          <a
            href="https://github.com/nomi181472/lab-stream-simulator"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white bg-transparent hover:bg-surface-200 border border-transparent hover:border-border transition-all"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span>GitHub Repository (MIT)</span>
          </a>
        </div>

        {/* Interactive Live Camera Stream Mockup */}
        <div className="max-w-5xl mx-auto rounded-2xl glass-panel-glow overflow-hidden">
          {/* Top Camera Status Header */}
          <div className="px-5 py-3.5 bg-surface-200/90 border-b border-border flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-bold text-emerald-400 uppercase tracking-wider font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                LIVE STREAMING
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-white font-semibold font-mono">CAM-101 (Front Entrance)</span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
                SL-CAM-1080P
              </span>
            </div>

            <div className="flex items-center gap-4 text-muted-foreground font-mono text-[11px]">
              <span className="hidden md:inline">25.0 FPS</span>
              <span className="hidden md:inline">2048 Kbps</span>
              <span className="hidden sm:inline">H.264 / AAC</span>
              <span className="text-primary font-semibold">12 Connected Readers</span>
            </div>
          </div>

          {/* Simulated Video Canvas with Surveillance Overlay */}
          <div className="relative aspect-video w-full bg-slate-950 overflow-hidden flex items-center justify-center surveillance-overlay select-none">
            {/* Fallback image with stream demo gif */}
            <img
              src="/streamlab_marketing_demo.gif"
              alt="StreamLab live video stream loop and telemetry feed"
              className="w-full h-full object-cover opacity-85"
            />

            {/* In-Video Surveillance Overlay (Top-Left) */}
            <div className="absolute top-4 left-4 z-10 font-mono text-xs sm:text-sm font-bold text-white bg-black/60 px-3 py-1.5 rounded border border-white/10 backdrop-blur-sm tracking-wider">
              [CAM-101: GATE-1] | {timestamp}
            </div>

            {/* In-Video Surveillance REC Indicator (Top-Right) */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2 font-mono text-xs font-bold text-red-500 bg-black/60 px-2.5 py-1 rounded border border-white/10 backdrop-blur-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
              <span>REC</span>
            </div>

            {/* Bottom-Left Live Telemetry Banner */}
            <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center gap-3 font-mono text-[11px] text-slate-300 bg-black/70 px-3 py-1.5 rounded border border-white/10 backdrop-blur-sm">
              <span className="text-primary font-bold">RESOLUTION:</span> 1280x720
              <span className="text-slate-600">|</span>
              <span className="text-primary font-bold">LOOP:</span> Monotonic PTS Continuous
              <span className="text-slate-600">|</span>
              <span className="text-primary font-bold">PROFILE:</span> ONVIF Profile S
            </div>
          </div>

          {/* Protocol Switcher Tabs */}
          <div className="p-4 sm:p-6 bg-surface-300 border-t border-border">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Inspect Multi-Protocol Endpoints:
              </span>
              <span className="text-xs font-mono text-primary font-semibold">
                Active Protocol: {activeProtoKey}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-4">
              {Object.keys(protocols).map((key) => {
                const isActive = activeProtoKey === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveProtoKey(key)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold font-mono transition-all text-center border ${
                      isActive
                        ? "bg-primary text-background border-primary shadow-glow-cyan/50"
                        : "bg-surface-200 text-slate-300 border-border hover:bg-surface-100 hover:text-white hover:border-slate-600"
                    }`}
                  >
                    {key}
                  </button>
                );
              })}
            </div>

            {/* Active Protocol Card */}
            <div className="p-4 rounded-xl bg-surface-200 border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-white">{activeProto.name}</span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-surface-100 text-cyan-300 border border-cyan-800">
                    {activeProto.badge}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{activeProto.description}</p>
                <div className="flex items-center gap-2 font-mono text-xs text-emerald-400 bg-surface-400 p-2 rounded-lg border border-border overflow-x-auto">
                  <span className="text-slate-500 select-none">URI:</span>
                  <span className="select-all">{activeProto.uri}</span>
                </div>
              </div>

              <div className="flex sm:flex-col gap-2">
                <button
                  onClick={() => handleCopyUri(activeProto.uri)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-surface-100 hover:bg-surface-50 border border-slate-700 text-white transition-all"
                  aria-label="Copy Protocol URI"
                >
                  {copiedUri ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUri ? "Copied URI" : "Copy URI"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Core Pillars KPI Section */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
          <div className="p-5 rounded-xl bg-surface-200/60 border border-border flex flex-col items-center text-center">
            <span className="text-3xl font-black text-primary font-mono">0%</span>
            <span className="text-xs font-bold uppercase tracking-wider text-white mt-1">Mock Packets</span>
            <span className="text-xs text-muted-foreground mt-1">Real FFmpeg &amp; MediaMTX pipeline</span>
          </div>

          <div className="p-5 rounded-xl bg-surface-200/60 border border-border flex flex-col items-center text-center">
            <span className="text-3xl font-black text-emerald-400 font-mono">7+</span>
            <span className="text-xs font-bold uppercase tracking-wider text-white mt-1">Protocols</span>
            <span className="text-xs text-muted-foreground mt-1">RTSP, RTMP, ONVIF, WebRTC, HLS, MJPEG</span>
          </div>

          <div className="p-5 rounded-xl bg-surface-200/60 border border-border flex flex-col items-center text-center">
            <span className="text-3xl font-black text-indigo-400 font-mono">6</span>
            <span className="text-xs font-bold uppercase tracking-wider text-white mt-1">Client SDKs</span>
            <span className="text-xs text-muted-foreground mt-1">Python, TS, Go, Dart, C#, Kotlin</span>
          </div>

          <div className="p-5 rounded-xl bg-surface-200/60 border border-border flex flex-col items-center text-center">
            <span className="text-3xl font-black text-cyan-400 font-mono">100%</span>
            <span className="text-xs font-bold uppercase tracking-wider text-white mt-1">Loop Continuity</span>
            <span className="text-xs text-muted-foreground mt-1">Monotonic timestamps, 0 client drops</span>
          </div>
        </div>
      </div>
    </section>
  );
}
