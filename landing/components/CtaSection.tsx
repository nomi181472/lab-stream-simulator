"use client";

import { useState } from "react";
import { Terminal, Github, ArrowRight, Download, Check, Copy, Sparkles } from "lucide-react";

export default function CtaSection() {
  const [copied, setCopied] = useState(false);
  const gitCommand = "git clone https://github.com/nomi181472/lab-stream-simulator.git && cd lab-stream-simulator";

  const handleCopy = () => {
    navigator.clipboard.writeText(gitCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background radial gradient */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent opacity-60 pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="rounded-3xl glass-panel-glow p-8 sm:p-14 text-center border border-primary/30 relative overflow-hidden">
          {/* Subtle grid in card */}
          <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-xs font-bold text-primary mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Free &amp; Open Source (MIT)</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Ready to Eliminate Physical Camera Bottlenecks?
            </h2>

            <p className="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed">
              Start streaming enterprise-grade RTSP, RTMP, and ONVIF test feeds today. Spin up virtual cameras across Windows, Linux, macOS, or Docker in seconds.
            </p>

            {/* Quick Clone Snippet */}
            <div className="mt-8 max-w-xl mx-auto">
              <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-surface-300 border border-border">
                <span className="text-xs font-mono text-slate-300 px-3 overflow-x-auto whitespace-nowrap">
                  <span className="text-primary font-bold mr-2">$</span>
                  {gitCommand}
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-100 hover:bg-surface-50 text-white border border-border flex-shrink-0"
                  aria-label="Copy Git Clone Command"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <a
                href="#quickstart"
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold bg-primary text-background hover:bg-primary-hover shadow-glow-cyan transition-all"
              >
                <Terminal className="w-4 h-4" />
                <span>Quickstart Guide</span>
              </a>

              <a
                href="https://github.com/nomi181472/lab-stream-simulator"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold bg-surface-100 hover:bg-surface-50 text-white border border-border transition-all"
              >
                <Github className="w-4 h-4" />
                <span>View GitHub Repository</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </a>

              <a
                href="https://github.com/nomi181472/lab-stream-simulator/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white bg-transparent hover:bg-surface-200 border border-transparent hover:border-border transition-all"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Download Windows &amp; Linux</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
