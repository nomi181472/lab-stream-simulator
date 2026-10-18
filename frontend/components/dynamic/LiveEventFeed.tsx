"use client";

import { WebSocketEvent } from "@/types";
import { Activity, Radio, ArrowUpRight, Clock } from "lucide-react";

interface LiveEventFeedProps {
  events: WebSocketEvent[];
  isConnected: boolean;
}

export default function LiveEventFeed({ events, isConnected }: LiveEventFeedProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-400" />
          <h3 className="font-bold text-sm">Live WebSocket Telemetry</h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
            }`}
          />
          <span className="text-muted-foreground font-mono">
            {isConnected ? "Connected (ws://...)" : "Disconnected"}
          </span>
        </div>
      </div>

      <div className="h-64 overflow-y-auto flex flex-col gap-2 font-mono text-xs pr-1">
        {events.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground italic">
            Waiting for live telemetry events...
          </div>
        ) : (
          events.map((ev, i) => (
            <div
              key={i}
              className="p-2.5 rounded bg-slate-950 border border-white/5 flex flex-col gap-1 hover:border-border transition-colors"
            >
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-cyan-400 font-semibold">{ev.type}</span>
                <span className="flex items-center gap-1 text-[10px]">
                  <Clock className="w-3 h-3" />
                  {new Date(ev.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-slate-300 truncate">
                Camera: <span className="text-white font-bold">{ev.camera_id}</span>
                {ev.status && <span> • Status: <span className="text-emerald-400">{ev.status}</span></span>}
                {ev.loop_count !== undefined && <span> • Loop #{ev.loop_count}</span>}
                {ev.exit_code !== undefined && <span> • Exit code {ev.exit_code}</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export { LiveEventFeed };
