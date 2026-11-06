import {
  Layers,
  ArrowRight,
  Cpu,
  Server,
  Monitor,
  Activity,
  HardDrive,
  Workflow,
  Sparkles,
} from "lucide-react";

export default function Architecture() {
  return (
    <section id="architecture" className="py-20 relative bg-surface-300/30 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/15 border border-secondary/30 text-xs font-bold text-indigo-400 mb-3 uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5" />
            <span>Under the Hood</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            StreamLab System Architecture
          </h2>
          <p className="mt-4 text-base text-slate-300 leading-relaxed">
            Engineered with a high-performance decoupled supervisor model. The control plane operates asynchronously via FastAPI, orchestrating dedicated MediaMTX streaming daemons and FFmpeg transcoding instances.
          </p>
        </div>

        {/* Diagram Card */}
        <div className="glass-panel rounded-2xl p-6 sm:p-10 border border-border">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {/* 1. Client Ecosystem */}
            <div className="flex flex-col gap-4 p-6 rounded-xl bg-surface-200/90 border border-border">
              <div className="flex items-center gap-2.5 pb-3 border-b border-border">
                <Monitor className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-base text-white">Client Ecosystem</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Heterogeneous clients connecting simultaneously over standard networking protocols.
              </p>

              <div className="space-y-2 mt-2">
                <div className="p-3 rounded-lg bg-surface-300 border border-border/80 flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">Computer Vision &amp; AI</span>
                  <span className="text-[11px] font-mono text-cyan-300">OpenCV / YOLO / PyTorch</span>
                </div>
                <div className="p-3 rounded-lg bg-surface-300 border border-border/80 flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">Commercial NVRs &amp; VMS</span>
                  <span className="text-[11px] font-mono text-indigo-300">Milestone / Synology</span>
                </div>
                <div className="p-3 rounded-lg bg-surface-300 border border-border/80 flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">6-Language Test Suites</span>
                  <span className="text-[11px] font-mono text-emerald-300">Py / TS / Go / Dart / C# / Kt</span>
                </div>
                <div className="p-3 rounded-lg bg-surface-300 border border-border/80 flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">Modern Web Browsers</span>
                  <span className="text-[11px] font-mono text-amber-300">MJPEG &amp; WebRTC WHEP</span>
                </div>
              </div>
            </div>

            {/* 2. Control Plane & Media Ingress */}
            <div className="flex flex-col gap-4 p-6 rounded-xl bg-surface-200/90 border border-primary/30 shadow-glow-cyan/10">
              <div className="flex items-center gap-2.5 pb-3 border-b border-border">
                <Server className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base text-white">StreamLab Core Control</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Asynchronous Python FastAPI engine coordinating network services and subprocess lifecycles.
              </p>

              <div className="space-y-2 mt-2">
                <div className="p-3 rounded-lg bg-surface-300 border border-border/80 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-white">WS-Discovery Daemon</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                      UDP :3702
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground block">
                    Multicast responder for Probe &amp; Resolve queries.
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-surface-300 border border-border/80 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-white">ONVIF SOAP 1.2 Router</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400">
                      HTTP :8000
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground block">
                    Device, Media, and WS-Security digest handlers.
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-surface-300 border border-border/80 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-white">Subprocess Supervisor</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400">
                      AsyncIO
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground block">
                    Process isolation, health checks, auto-restarts.
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Media Pipeline Engine */}
            <div className="flex flex-col gap-4 p-6 rounded-xl bg-surface-200/90 border border-border">
              <div className="flex items-center gap-2.5 pb-3 border-b border-border">
                <Cpu className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base text-white">Streaming &amp; Transcoding</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Media server engine &amp; hardware-accelerated transcoding pipelines.
              </p>

              <div className="space-y-2 mt-2">
                <div className="p-3 rounded-lg bg-surface-300 border border-border/80 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-white">MediaMTX Core Engine</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                      Go Binary
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground block">
                    Zero-latency multiplexer for RTSP, RTMP, WebRTC, HLS.
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-surface-300 border border-border/80 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-white">FFmpeg PTS &amp; Overlay</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400">
                      libavcodec
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground block">
                    Monotonic timestamps + real-time wall-clock burn-in.
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-surface-300 border border-border/80 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-white">Video Source Ingestion</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
                      Disk / URL
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground block">
                    MP4, MKV, MOV, AVI media fixture inspection.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Dataflow Summary Bar */}
          <div className="mt-8 pt-6 border-t border-border flex flex-wrap items-center justify-between gap-4 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Workflow className="w-4 h-4 text-primary" />
              <span className="font-bold text-white">Dataflow Guarantee:</span>
              <span className="text-muted-foreground">
                Media files are read once, transcoded with continuous PTS, multiplexed into MediaMTX, and distributed to N readers without replication overhead.
              </span>
            </div>
            <span className="font-mono text-[11px] px-2 py-1 rounded bg-surface-200 border border-border text-emerald-400">
              Low CPU Footprint • Zero Memory Leaks
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
