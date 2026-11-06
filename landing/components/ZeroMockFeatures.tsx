import {
  ShieldCheck,
  Clock,
  Repeat,
  Radio,
  Sliders,
  Lock,
  Cpu,
  Layers,
  Sparkles,
  CheckCircle,
} from "lucide-react";

export default function ZeroMockFeatures() {
  const features = [
    {
      icon: Repeat,
      color: "text-primary",
      bg: "bg-primary/10 border-primary/20",
      title: "Seamless Looping & Continuous PTS",
      description:
        "Standard test streams crash or tear down connections when videos loop. StreamLab's FFmpeg filter pipeline monotonically advances presentation timestamps across loop boundaries, guaranteeing zero client disconnections in VLC, OpenCV, or NVR software.",
    },
    {
      icon: Clock,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
      title: "Real-Time Surveillance Clock Overlay",
      description:
        "Every video frame is rendered with dynamic, monotonically advancing real-world wall-clock timestamps [CAM-NAME | YYYY-MM-DD HH:MM:SS] via hardware-accelerated typography filters, ensuring strict surveillance compliance verification.",
    },
    {
      icon: Radio,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10 border-cyan-500/20",
      title: "WS-Discovery UDP 3702 Multicast Daemon",
      description:
        "Genuine UDP 3702 multicast responder (239.255.255.250). When NVRs or ONVIF discovery tools broadcast Probe requests, StreamLab replies with RFC-compliant ProbeMatches containing live endpoint URIs for zero-config auto-discovery.",
    },
    {
      icon: ShieldCheck,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
      title: "Strict Zero-Mock Tolerance",
      description:
        "No stubbed video bytes, fake headers, or static images disguised as RTSP streams. StreamLab runs authentic MediaMTX streaming processes and FFmpeg transcoders, producing byte-accurate RTP, RTMP, and HLS packets.",
    },
    {
      icon: Sliders,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10 border-indigo-500/20",
      title: "Dynamic Camera Lifecycle Management",
      description:
        "Provision, configure, start, stop, restart, or scale virtual cameras on the fly. Configure unique manufacturer tags, serial numbers, firmware versions, resolutions (720p/1080p/4K), frame rates (15-60 FPS), and target bitrates.",
    },
    {
      icon: Lock,
      color: "text-rose-400",
      bg: "bg-rose-500/10 border-rose-500/20",
      title: "Enterprise Security Hardening",
      description:
        "Built-in protection against common media server vulnerabilities: strict path traversal defenses on video fixtures, SSRF mitigations on remote ingest URLs, and XXE defense on ONVIF SOAP 1.2 XML envelopes.",
    },
  ];

  return (
    <section id="features" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-100 border border-border text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Core Engineering Excellence</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Built for Engineers Who Need Genuine Protocol Behavior
          </h2>
          <p className="mt-4 text-base text-slate-300 leading-relaxed">
            Testing against fake mocks always leaves edge cases undetected until production. StreamLab replicates the exact physical and protocol behavior of commercial surveillance equipment.
          </p>
        </div>

        {/* 6 Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl glass-panel hover:border-slate-600 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center border mb-5 transition-transform group-hover:scale-105 ${feat.bg} ${feat.color}`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-primary transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {feat.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-border/60 flex items-center gap-2 text-xs font-semibold text-slate-400">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Production Verified</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
