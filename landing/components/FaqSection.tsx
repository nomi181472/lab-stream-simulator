"use client";

import { useState } from "react";
import { HelpCircle, ChevronDown } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: "What is StreamLab and why is it called a zero-mock camera simulator?",
    answer:
      "StreamLab is an enterprise-grade virtual IP camera simulator that guarantees Zero Mock Tolerance. Unlike mocks that return fake headers or pre-recorded dummy payloads, StreamLab spawns real FFmpeg encoding pipelines, serves live streams through a MediaMTX media server, delivers WSDL-compliant ONVIF SOAP 1.2 XML responses, and listens on UDP 3702 for genuine WS-Discovery multicast probes.",
  },
  {
    question: "How does StreamLab handle seamless video looping without RTSP client disconnects?",
    answer:
      "StreamLab uses a custom continuous presentation timestamp (PTS) pipeline in FFmpeg coupled with MediaMTX stream session multiplexing. When a test video file reaches EOF, it loops continuously into the existing stream session with monotonically advancing timestamps. Downstream RTSP, RTMP, and WebRTC clients (like VLC, OpenCV, or NVR software) never receive a TEARDOWN or packet discontinuity.",
  },
  {
    question: "Can StreamLab be discovered automatically by NVRs and VMS software like Milestone or Shinobi?",
    answer:
      "Yes. StreamLab features an integrated WS-Discovery UDP multicast daemon listening on 239.255.255.250:3702. When an NVR or ONVIF client broadcasts a Probe message on the local network, StreamLab replies with RFC-compliant ProbeMatch messages containing device UUIDs and endpoint URLs, allowing 1-click automatic discovery.",
  },
  {
    question: "What video transport protocols are supported by StreamLab?",
    answer:
      "StreamLab natively supports RTSP 1.0 (TCP interleaved & UDP RTP), RTMP (egress and external publisher ingest), direct browser MJPEG streams (playable in any browser without plugins), WebRTC WHEP (sub-second browser playback), HLS (HTTP Live Streaming), and WebSocket binary JPEG streaming pipelines.",
  },
  {
    question: "How can I run StreamLab in CI/CD pipelines for automated computer vision testing?",
    answer:
      "StreamLab provides official pre-built Docker containers (botonetics/streamlab-backend and botonetics/streamlab-frontend). You can run them via Docker Compose or directly in GitHub Actions runners to provide live RTSP feeds for automated computer vision inference tests with OpenCV, YOLO, or TensorRT.",
  },
  {
    question: "Which programming languages have verified client libraries in StreamLab?",
    answer:
      "StreamLab includes dedicated end-to-end client verification test suites in six independent programming languages: Python (httpx, websockets, ffprobe), Node.js/TypeScript (ws, net, fetch), Go (net/http, net.Dial), Dart (dart:io), C#/.NET 10 (HttpClient, TcpClient), and Kotlin JVM (HttpClient, Socket).",
  },
  {
    question: "Can I ingest custom video files or live desktop streams into StreamLab?",
    answer:
      "Yes. You can upload any standard MP4, MKV, MOV, or AVI video fixture through the Mission Control UI or specify local disk paths. Additionally, StreamLab exposes an RTMP ingest mountpoint on port 1935, allowing tools like OBS Studio to stream live screen captures or desktop webcams directly into the simulator.",
  },
  {
    question: "Is StreamLab free and open source?",
    answer:
      "Yes. StreamLab is 100% open source and licensed under the permissive MIT License. You are free to use it in commercial test labs, proprietary CI pipelines, research projects, and embedded hardware validation.",
  },
];

export default function FaqSection() {
  const [openIndices, setOpenIndices] = useState<number[]>([0, 1]);

  const toggle = (idx: number) => {
    if (openIndices.includes(idx)) {
      setOpenIndices(openIndices.filter((i) => i !== idx));
    } else {
      setOpenIndices([...openIndices, idx]);
    }
  };

  return (
    <section id="faq" className="py-20 relative bg-surface-300/30 border-t border-border">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary mb-3 uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Frequently Asked Questions</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Everything You Need to Know About StreamLab
          </h2>
          <p className="mt-4 text-base text-slate-300 leading-relaxed">
            Direct answers to technical architecture questions, compliance standards, and automated deployment.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndices.includes(idx);
            return (
              <div
                key={idx}
                className="rounded-xl glass-panel border border-border overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 focus:outline-none hover:bg-surface-200/50 transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="text-base font-bold text-white leading-snug">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
                      isOpen ? "transform rotate-180 text-primary" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-1 text-sm text-slate-300 leading-relaxed border-t border-border/50 animate-in fade-in duration-150">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
