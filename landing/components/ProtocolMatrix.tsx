"use client";

import { useState } from "react";
import {
  Radio,
  Video,
  Layers,
  Shield,
  Zap,
  Globe,
  Terminal,
  Server,
  Cpu,
  CheckCircle2,
  Copy,
  Check,
} from "lucide-react";

interface ProtocolDetail {
  id: string;
  name: string;
  category: "Industrial" | "Web" | "Broadcast" | "Telemetry";
  port: string;
  transport: string;
  standards: string;
  clients: string[];
  endpoint: string;
  features: string[];
  description: string;
}

const protocolData: ProtocolDetail[] = [
  {
    id: "rtsp",
    name: "RTSP 1.0 Live Streaming",
    category: "Industrial",
    port: "8554 (TCP/UDP)",
    transport: "RTP over TCP-interleaved & UDP",
    standards: "RFC 2326 / RFC 3550 / RFC 3984 (H.264)",
    clients: ["VLC Media Player", "OpenCV cv2.VideoCapture", "FFmpeg / ffplay", "Milestone / Shinobi / Frigate NVRs"],
    endpoint: "rtsp://localhost:8554/cameras/{camera_id}/main",
    features: [
      "Full RTSP state machine: OPTIONS, DESCRIBE, SETUP, PLAY, TEARDOWN",
      "TCP interleaved transmission for strict firewall traversal",
      "Monotonically advancing Presentation Timestamps (PTS) across video loops",
      "H.264 baseline/main/high profiles and AAC audio stream muxing",
      "Zero connection drops when source file loops",
    ],
    description:
      "Enterprise RTSP 1.0 streaming engine powered by MediaMTX. Delivers real RTP media packets over TCP or UDP for any surveillance NVR, computer vision pipeline, or embedded camera client.",
  },
  {
    id: "onvif",
    name: "ONVIF Profile S & WS-Discovery",
    category: "Industrial",
    port: "8000 (HTTP) / 3702 (UDP Multicast)",
    transport: "SOAP 1.2 XML / UDP Multicast 239.255.255.250",
    standards: "ONVIF Core Spec v16.12 / Profile S / WS-Discovery 1.1 / WS-Security",
    clients: ["ONVIF Device Manager (ODM)", "Milestone XProtect", "Synology Surveillance Station", "Python onvif-zeep"],
    endpoint: "http://localhost:8000/onvif/device_service",
    features: [
      "WS-Discovery UDP 3702 multicast probe daemon replying with valid ProbeMatches",
      "Device Service: GetDeviceInformation, GetCapabilities, GetServices, GetSystemDateAndTime",
      "Media Service: GetProfiles, GetStreamUri (resolving to RTSP), GetSnapshotUri, GetVideoEncoderConfigurations",
      "WS-Security UsernameToken password digest verification with nonce cache & drift checks",
      "Strict WSDL and XML Schema validation compliance",
    ],
    description:
      "Genuine ONVIF Profile S implementation allowing security software and NVRs to scan your network, discover StreamLab virtual cameras automatically, and negotiate video profiles.",
  },
  {
    id: "mjpeg",
    name: "Direct Browser MJPEG",
    category: "Web",
    port: "8000 (HTTP)",
    transport: "HTTP multipart/x-mixed-replace",
    standards: "RFC 2046 / MIME Multipart",
    clients: ["Google Chrome", "Mozilla Firefox", "Apple Safari", "Microsoft Edge", "HTML5 <img> tags"],
    endpoint: "http://localhost:8000/api/v1/cameras/{camera_id}/stream.mjpg",
    features: [
      "Zero-plugin streaming playable natively in any standard web browser",
      "Embeddable via standard HTML <img src='...'> tags without WebAssembly or Flash",
      "Dynamic frame rate throttling & JPEG quality compression controls",
      "Instant startup with zero buffering latency",
      "Ideal for lightweight web dashboards and embedded IoT displays",
    ],
    description:
      "Direct HTTP MJPEG multipart stream allowing modern web applications to display live video without requiring WebRTC negotiation, HLS playlist buffering, or native plugins.",
  },
  {
    id: "rtmp",
    name: "RTMP Live Ingest & Egress",
    category: "Broadcast",
    port: "1935 (TCP)",
    transport: "RTMP chunk stream multiplexing over TCP",
    standards: "Adobe RTMP 1.0 Specification",
    clients: ["OBS Studio", "vMix", "FFmpeg live push", "YouTube/Twitch simulators"],
    endpoint: "rtmp://localhost:1935/cameras/{camera_id}/main",
    features: [
      "Simultaneous RTMP egress (camera broadcasting) and ingest (external publisher push)",
      "OBS Studio support: Stream external desktop or capture cards into StreamLab",
      "Automatic FLV demuxing and remuxing into RTSP and WebRTC streams",
      "Stream key validation and isolated publishing mountpoints",
      "Sub-second broadcast latency",
    ],
    description:
      "High-throughput RTMP server enabling live broadcast simulation and OBS Studio ingestion, allowing testers to push mock feeds from video tools directly into virtual camera pipelines.",
  },
  {
    id: "webrtc",
    name: "WebRTC WHEP (Sub-Second Web)",
    category: "Web",
    port: "8889 (HTTP/UDP)",
    transport: "WHEP (WebRTC HTTP Egress Protocol) / SRTP",
    standards: "IETF WHEP Draft / RFC 8825 WebRTC",
    clients: ["Chrome", "Safari", "Edge", "Firefox", "HTML5 <video> with WebRTC WHEP Client"],
    endpoint: "http://localhost:8889/cameras/{camera_id}/main/whep",
    features: [
      "Sub-second (200-400ms) ultra-low latency browser playback",
      "Standard HTTP POST offer/answer SDP signaling protocol (WHEP)",
      "Direct H.264 video decoding using browser hardware acceleration",
      "No ICE server or complex STUN/TURN infrastructure needed for local lab environments",
      "Ideal for remote teleoperation and live PTZ monitoring",
    ],
    description:
      "Ultra-low-latency real-time video streaming directly to modern browsers using standard WebRTC HTTP Egress Protocol (WHEP) without heavy third-party plugins.",
  },
  {
    id: "hls",
    name: "HLS (HTTP Live Streaming)",
    category: "Web",
    port: "8888 (HTTP)",
    transport: "HTTP/1.1 or HTTP/2 segmented transport",
    standards: "RFC 8216 HLS Specification",
    clients: ["Apple Safari", "iOS / iPadOS Native Video Player", "Hls.js", "Video.js", "Android ExoPlayer"],
    endpoint: "http://localhost:8888/cameras/{camera_id}/main/index.m3u8",
    features: [
      "Automatic MPEG-TS and fMP4 chunk generation directly from MediaMTX",
      "Seamless playback across mobile devices, tablets, and smart TVs",
      "Adaptive playlist caching and CDN-friendly delivery",
      "Zero client installation required on iOS Safari",
      "Clean fallbacks for legacy streaming infrastructures",
    ],
    description:
      "Standard HTTP Live Streaming engine creating live m3u8 playlists and video segments for broad compatibility across mobile browsers and video player libraries.",
  },
  {
    id: "websocket",
    name: "WebSocket Telemetry & JPEG Pipe",
    category: "Telemetry",
    port: "8000 (WS / WSS)",
    transport: "RFC 6455 WebSocket over TCP",
    standards: "RFC 6455 / JSON Schema Events",
    clients: ["Next.js Mission Control", "React / Vue Web Apps", "Node.js ws", "Python websockets"],
    endpoint: "ws://localhost:8000/ws/cameras",
    features: [
      "Structured JSON event broadcast for camera lifecycles, errors, and loop restarts",
      "Binary JPEG frame pipe (ws://.../stream) for high-efficiency canvas rendering",
      "Bounded async queues (maxsize 256) preventing memory starvation on slow clients",
      "Bi-directional telemetry and command triggers",
      "Real-time FPS and connected reader metric broadcast",
    ],
    description:
      "Dual-purpose WebSocket interface delivering real-time camera lifecycle telemetry events and a low-overhead binary frame pipe for HTML5 canvas renderers.",
  },
];

export default function ProtocolMatrix() {
  const [selectedProtocol, setSelectedProtocol] = useState<string>("rtsp");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeProto = protocolData.find((p) => p.id === selectedProtocol) || protocolData[0];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <section id="protocols" className="py-20 bg-surface-300/40 relative border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary mb-3 uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5" />
            <span>Comprehensive Protocol Matrix</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            One Unified Simulator. Seven Production Protocols.
          </h2>
          <p className="mt-4 text-base text-slate-300 leading-relaxed">
            StreamLab adheres strictly to official protocol specifications. Whether your software consumes enterprise ONVIF SOAP 1.2 or low-latency WebRTC WHEP, StreamLab behaves exactly like physical commercial hardware.
          </p>
        </div>

        {/* Protocol Selector Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {protocolData.map((proto) => {
            const isSelected = selectedProtocol === proto.id;
            return (
              <button
                key={proto.id}
                onClick={() => setSelectedProtocol(proto.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border ${
                  isSelected
                    ? "bg-primary text-background border-primary shadow-glow-cyan/50 font-black"
                    : "bg-surface-200 text-slate-300 border-border hover:bg-surface-100 hover:text-white"
                }`}
              >
                <span>{proto.name.split(" ")[0]}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  isSelected ? "bg-black/20 text-background" : "bg-surface-100 text-slate-400"
                }`}>
                  {proto.port.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Protocol Card Detailed Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 glass-panel rounded-2xl p-6 sm:p-8 border border-border">
          {/* Left Column: Overview & Endpoints */}
          <div className="lg:col-span-2 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h3 className="text-2xl font-black text-white">{activeProto.name}</h3>
                <span className="px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 text-xs font-mono font-bold">
                  {activeProto.port}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-secondary/20 text-indigo-300 border border-secondary/30 text-xs font-mono">
                  {activeProto.category}
                </span>
              </div>

              <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                {activeProto.description}
              </p>

              {/* Verified Features Checklist */}
              <div className="mb-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Key Capabilities &amp; Verification Checks:
                </h4>
                <ul className="space-y-2.5">
                  {activeProto.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Live Endpoint Box */}
            <div className="mt-4 p-4 rounded-xl bg-surface-400 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="overflow-hidden">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Default Live Endpoint:
                </span>
                <code className="text-xs font-mono text-cyan-300 select-all break-all block">
                  {activeProto.endpoint}
                </code>
              </div>
              <button
                onClick={() => handleCopy(activeProto.endpoint, activeProto.id)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-surface-100 hover:bg-surface-50 border border-border text-white flex-shrink-0 transition-all"
                aria-label="Copy Protocol Endpoint"
              >
                {copiedId === activeProto.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy Endpoint</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Spec Standards & Verified Clients */}
          <div className="flex flex-col gap-6 p-6 rounded-xl bg-surface-200/80 border border-border">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-primary" />
                Compliance Standards &amp; RFCs
              </h4>
              <p className="text-xs font-mono text-slate-200 bg-surface-300 p-2.5 rounded-lg border border-border">
                {activeProto.standards}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-emerald-400" />
                Network Transport
              </h4>
              <p className="text-xs font-mono text-slate-200 bg-surface-300 p-2.5 rounded-lg border border-border">
                {activeProto.transport}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                Verified Client Integrations
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {activeProto.clients.map((client, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-surface-300 text-slate-300 border border-slate-700"
                  >
                    {client}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <span className="text-xs text-muted-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
                Zero mock response guaranteed: Real MediaMTX &amp; FFmpeg packets.
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
