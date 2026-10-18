"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Camera,
  Film,
  Radio,
  Network,
  Video,
  Activity,
  PlaySquare,
  FileCheck,
  Settings,
  ShieldCheck,
  Cpu
} from "lucide-react";

interface NavGroup {
  title: string;
  items: {
    label: string;
    href: string;
    icon: any;
    badge?: string;
  }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Mission Control",
    items: [
      { label: "Overview", href: "/", icon: LayoutDashboard },
      { label: "Camera Manager", href: "/cameras", icon: Camera },
      { label: "Video Source Library", href: "/video-sources", icon: Film },
    ],
  },
  {
    title: "Protocol Stations",
    items: [
      { label: "ONVIF Discovery & SOAP", href: "/onvif", icon: Radio, badge: "3702" },
      { label: "RTSP Transport Diagnostics", href: "/rtsp", icon: Network, badge: "8554" },
      { label: "RTMP Media Station", href: "/rtmp", icon: Video, badge: "1935" },
      { label: "WebSocket Telemetry", href: "/websocket", icon: Activity, badge: "Live" },
    ],
  },
  {
    title: "Interoperability & Audit",
    items: [
      { label: "Cross-Language Tests", href: "/test-runner", icon: PlaySquare, badge: "6 SDKs" },
      { label: "Compliance Reports", href: "/test-reports", icon: FileCheck },
      { label: "Settings & Probes", href: "/settings", icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-slate-950/60 backdrop-blur-xl flex flex-col justify-between p-4 shrink-0 overflow-y-auto">
      <nav className="flex flex-col gap-5">
        {NAV_GROUPS.map((group, groupIdx) => (
          <div key={groupIdx} className="flex flex-col gap-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1 flex items-center justify-between">
              <span>{group.title}</span>
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-gradient-to-r from-indigo-600/90 to-violet-600/90 text-white shadow-lg shadow-indigo-600/20 font-semibold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                  }`}
                >
                  {/* Left indicator bar on active */}
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-cyan-400" />
                  )}

                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 transition-colors ${isActive ? "text-cyan-300" : "text-slate-400 group-hover:text-indigo-400"}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                      isActive 
                        ? "bg-white/20 text-white" 
                        : "bg-slate-900 text-slate-400 border border-slate-800 group-hover:border-slate-700"
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* System Hardware / Engine Card */}
      <div className="mt-6 p-3.5 bg-gradient-to-b from-slate-900/90 to-slate-950/90 rounded-xl border border-slate-800/80 shadow-inner flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs font-bold text-white">StreamLab Core</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <div className="text-[11px] text-slate-400 font-mono flex flex-col gap-0.5">
          <div className="flex justify-between">
            <span>Engine:</span>
            <span className="text-slate-300">MediaMTX + FFmpeg</span>
          </div>
          <div className="flex justify-between">
            <span>Transport:</span>
            <span className="text-cyan-400">RTSP/RTMP/HLS</span>
          </div>
          <div className="flex justify-between">
            <span>Database:</span>
            <span className="text-slate-300">Async SQLite WAL</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
