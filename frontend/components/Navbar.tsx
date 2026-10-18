"use client";

import { Activity, Radio, Video, ExternalLink, ShieldCheck, Terminal } from "lucide-react";
import Link from "next/link";

export default function Navbar() {
  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-50 flex items-center justify-between px-6 transition-all">
      {/* Brand & Version */}
      <Link href="/" className="flex items-center gap-3.5 group">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 via-violet-500/10 to-cyan-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:border-indigo-400/60 group-hover:scale-105 shadow-lg shadow-indigo-500/10 transition-all duration-200">
          <Video className="w-5 h-5 text-indigo-400 group-hover:text-cyan-300 transition-colors" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg tracking-tight text-white flex items-center">
              Stream<span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">Lab</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider font-semibold">
              v1.0 Virtual IP Lab
            </span>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">Multi-Protocol IP Camera Simulator & Interop Testbed</span>
        </div>
      </Link>

      {/* Protocol Listeners & Realtime Status */}
      <div className="flex items-center gap-3">
        {/* Protocol Hub Status Badges */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-mono bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300 shadow-inner">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-[11px]">ONVIF :3702</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-semibold text-[11px]">RTSP :8554</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-semibold text-[11px]">RTMP :1935</span>
          </div>
        </div>

        {/* Swagger Docs Shortcut */}
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-all shadow-sm"
        >
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          <span>API Swagger</span>
          <ExternalLink className="w-3 h-3 text-slate-500" />
        </a>

        {/* System Online Indicator */}
        <div className="flex items-center gap-2 text-xs font-mono bg-emerald-950/40 text-emerald-300 border border-emerald-800/60 px-3 py-1.5 rounded-lg shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold hidden sm:inline">Engine Online</span>
        </div>
      </div>
    </header>
  );
}
