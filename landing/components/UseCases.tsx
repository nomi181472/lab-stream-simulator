import { Eye, ShieldAlert, Cpu, GitBranch, CheckCircle2, ArrowRight } from "lucide-react";

export default function UseCases() {
  const cases = [
    {
      icon: Eye,
      title: "Computer Vision & Edge AI Benchmarking",
      badge: "AI & ML",
      description:
        "Feed genuine H.264 RTSP or MJPEG video streams directly into OpenCV (cv2.VideoCapture), YOLOv8/v10/v11, DeepStream, or TensorRT inference engines. Validate bounding box tracking, frame dropping logic, and latency without physical hardware.",
      points: [
        "Eliminate physical camera lighting variations during CI regression tests",
        "Deterministic loop testing with identical input video frames",
        "Simulate multiple concurrent video streams on a single GPU workstation",
      ],
    },
    {
      icon: ShieldAlert,
      title: "Commercial NVR & VMS Stress Testing",
      badge: "Security & NVR",
      description:
        "Load test commercial Video Management Systems including Milestone XProtect, Synology Surveillance Station, Shinobi, Frigate, and Blue Iris. Emulate dozens of simultaneous cameras transmitting RTSP feeds and ONVIF events.",
      points: [
        "Verify WS-Discovery automatic camera discovery and profile binding",
        "Test NVR storage retention policies and continuous 24/7 recording",
        "Simulate network dropouts and auto-reconnect behaviors",
      ],
    },
    {
      icon: GitBranch,
      title: "Headless CI/CD & Automated QA Pipelines",
      badge: "DevOps & CI/CD",
      description:
        "Spin up containerized StreamLab instances inside GitHub Actions, GitLab CI, or Jenkins runners. Test your media client libraries and streaming microservices with real network traffic rather than brittle mock stubs.",
      points: [
        "100% reproducible test environments with pre-packaged Docker images",
        "Eliminate flakiness caused by external cloud RTSP streams",
        "Run 6-language client verification suites concurrently",
      ],
    },
    {
      icon: Cpu,
      title: "IoT & Smart Home Automation Testing",
      badge: "IoT & Smart Home",
      description:
        "Build integrations for Home Assistant, Apple HomeKit (Scrypted), and custom smart displays. Validate ONVIF Profile S media profile discovery, snapshot fetching, and sub-second WebRTC WHEP streaming.",
      points: [
        "Verify WS-Security digest authentication and nonce cache validation",
        "Test sub-second latency browser viewing via WebRTC and MJPEG",
        "Dynamic camera restart and resolution scaling on the fly",
      ],
    },
  ];

  return (
    <section id="use-cases" className="py-20 relative bg-surface-300/40 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-bold text-cyan-400 mb-3 uppercase tracking-wider">
            <Eye className="w-3.5 h-3.5" />
            <span>Target Scenarios</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Designed for Real Engineering Workflows
          </h2>
          <p className="mt-4 text-base text-slate-300 leading-relaxed">
            From automated CI pipelines to computer vision model evaluation, StreamLab replaces costly physical lab cameras with deterministic, scriptable virtual devices.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {cases.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-8 rounded-2xl glass-panel border border-border hover:border-slate-600 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-surface-200 border border-border flex items-center justify-center text-primary">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-surface-200 text-slate-300 border border-border">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                    {item.description}
                  </p>

                  <ul className="space-y-2.5 pt-4 border-t border-border/60">
                    {item.points.map((pt, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
