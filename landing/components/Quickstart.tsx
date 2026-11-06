"use client";

import { useState } from "react";
import { Terminal, Copy, Check, Download, Box, Play, Laptop, ArrowRight } from "lucide-react";

interface Method {
  id: string;
  name: string;
  tag: string;
  description: string;
  commands: string;
}

const methods: Method[] = [
  {
    id: "docker",
    name: "Docker (Zero Install)",
    tag: "Recommended",
    description: "Launch verified, production-ready pre-built images from Docker Hub. No Python or Node.js required.",
    commands: `# Windows: Double click docker-start.bat
# Linux / macOS:
chmod +x docker-start.sh
./docker-start.sh

# Or run directly via Docker Compose:
docker compose pull
docker compose up -d

# Open browser at http://localhost:3000`,
  },
  {
    id: "installer",
    name: "Windows & Linux Packages",
    tag: "Desktop / Standalone",
    description: "Standalone pre-compiled packages for Windows (.exe setup & zip) and Linux (.deb installer & tar.gz) with zero external dependencies.",
    commands: `# Windows (.EXE Setup or Portable ZIP):
# 1. Download StreamLab-Setup-*.exe or StreamLab-Portable-Windows.zip
# 2. Run the installer wizard (or unzip and run StreamLab.exe)

# Linux Debian / Ubuntu (.DEB Direct Install):
sudo dpkg -i StreamLab-Linux-*-amd64.deb
streamlab

# Linux Universal Portable (.tar.gz):
tar -xzf StreamLab-Linux-*-x86_64.tar.gz
cd StreamLab
./StreamLab

# Releases: https://github.com/nomi181472/lab-stream-simulator/releases`,
  },
  {
    id: "native",
    name: "One-Click Native Launcher",
    tag: "High Performance",
    description: "Run directly on your host operating system for maximum streaming throughput and lowest latency.",
    commands: `# Windows:
double-click start.bat

# Linux / macOS:
chmod +x start.sh
./start.sh

# Starts FastAPI backend on :8000 and Next.js UI on :3000`,
  },
  {
    id: "manual",
    name: "Developer CLI Workflow",
    tag: "Contributors",
    description: "Manual setup for contributors modifying backend routers, MediaMTX configs, or UI features.",
    commands: `# 1. Set up Python virtual environment & start backend
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000

# 2. Start Next.js Mission Control (separate terminal)
cd frontend
npm install
npm run dev`,
  },
];

export default function Quickstart() {
  const [activeMethodId, setActiveMethodId] = useState("docker");
  const [copied, setCopied] = useState(false);

  const activeMethod = methods.find((m) => m.id === activeMethodId) || methods[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeMethod.commands);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="quickstart" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary mb-3 uppercase tracking-wider">
            <Terminal className="w-3.5 h-3.5" />
            <span>Getting Started</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Up and Streaming in Under 60 Seconds
          </h2>
          <p className="mt-4 text-base text-slate-300 leading-relaxed">
            Choose your preferred deployment method. Whether you need an isolated Docker container, a Windows system tray executable, or local native development.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto mb-8">
          {methods.map((method) => {
            const isActive = activeMethodId === method.id;
            return (
              <button
                key={method.id}
                onClick={() => setActiveMethodId(method.id)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  isActive
                    ? "bg-surface-100 border-primary shadow-glow-cyan/30 text-white"
                    : "bg-surface-200/60 border-border text-slate-400 hover:text-white hover:bg-surface-100"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">{method.name.split(" ")[0]}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-bold ${
                      isActive ? "bg-primary text-background" : "bg-surface-300 text-slate-400"
                    }`}
                  >
                    {method.tag}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground line-clamp-1">
                  {method.description}
                </span>
              </button>
            );
          })}
        </div>

        {/* Terminal Window */}
        <div className="max-w-4xl mx-auto rounded-2xl glass-panel border border-border overflow-hidden">
          <div className="px-5 py-3 bg-surface-200/90 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              <span className="text-xs font-mono text-muted-foreground ml-3">
                StreamLab Quickstart — {activeMethod.name}
              </span>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-100 hover:bg-surface-50 border border-slate-700 text-white transition-all"
              aria-label="Copy Command Snippet"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy Instructions"}</span>
            </button>
          </div>

          <div className="p-6 bg-surface-400 overflow-x-auto text-xs sm:text-sm font-mono text-cyan-300 leading-relaxed">
            <pre>
              <code>{activeMethod.commands}</code>
            </pre>
          </div>

          <div className="px-6 py-3.5 bg-surface-300 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              Once started, access Mission Control at{" "}
              <strong className="text-white font-mono">http://localhost:3000</strong>
            </span>
            <span className="text-emerald-400 font-semibold font-mono">Status: Ready to Stream</span>
          </div>
        </div>
      </div>
    </section>
  );
}
