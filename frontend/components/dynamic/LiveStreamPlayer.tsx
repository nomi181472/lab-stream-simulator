"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Camera } from "@/types";
import { Play, Square, RefreshCw, AlertCircle, Eye } from "lucide-react";

interface LiveStreamPlayerProps {
  camera: Camera;
  autoPlay?: boolean;
  onStart?: () => void;
  onStop?: () => void;
  onRestart?: () => void;
}

export default function LiveStreamPlayer({ camera, onStart, onStop, onRestart }: LiveStreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [snapshotKey, setSnapshotKey] = useState(Date.now());
  const [useHls, setUseHls] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let hls: Hls | null = null;
    let timer: NodeJS.Timeout;

    const resolveHost = (url: string) => {
      if (typeof window === "undefined" || !url) return url;
      return url.replace("://127.0.0.1:", `://${window.location.hostname}:`).replace("://localhost:", `://${window.location.hostname}:`);
    };

    if (camera.status === "running") {
      if (useHls && Hls.isSupported() && videoRef.current) {
        hls = new Hls({ enableWorker: true, lowLatencyMode: true });
        hls.loadSource(resolveHost(camera.hls_url));
        hls.attachMedia(videoRef.current);
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            console.warn("HLS playback error, falling back to snapshot refresh:", data);
            setUseHls(false);
          }
        });
      } else {
        // Fallback: periodic snapshot refresh (1.5s interval)
        timer = setInterval(() => {
          setSnapshotKey(Date.now());
        }, 1500);
      }
    }

    return () => {
      if (hls) hls.destroy();
      clearInterval(timer);
    };
  }, [camera.status, camera.hls_url, useHls]);

  return (
    <div className="relative rounded-lg overflow-hidden bg-black border border-border flex flex-col">
      {/* Video / Snapshot Viewport */}
      <div className="relative aspect-video w-full flex items-center justify-center bg-slate-950">
        {camera.status === "running" ? (
          useHls ? (
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          ) : (
            <img
              src={`${(typeof window !== "undefined" && camera.snapshot_url ? camera.snapshot_url.replace("://127.0.0.1:", `://${window.location.hostname}:`).replace("://localhost:", `://${window.location.hostname}:`) : camera.snapshot_url)}?t=${snapshotKey}`}
              alt={camera.name}
              className="w-full h-full object-cover"
              onError={() => setError("Snapshot stream not yet available")}
            />
          )
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
            <AlertCircle className="w-12 h-12 mb-2 text-muted-foreground opacity-50" />
            <span className="text-sm font-semibold">Camera is Offline</span>
            <span className="text-xs text-muted-foreground/80 mt-1">Start stream to begin broadcasting</span>
          </div>
        )}

        {/* Status Overlay Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded text-xs border border-white/10">
          <span
            className={`w-2 h-2 rounded-full ${
              camera.status === "running" ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
            }`}
          />
          <span className="font-semibold text-white uppercase tracking-wider">{camera.status}</span>
        </div>

        {/* Reader Stats Badge */}
        {camera.status === "running" && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded text-xs border border-white/10 text-white font-mono">
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>{camera.stats?.readers_count || 0} Readers</span>
          </div>
        )}
      </div>

      {/* Control Toolbar */}
      <div className="p-3 bg-card flex items-center justify-between border-t border-border">
        <div>
          <h4 className="text-sm font-bold text-foreground truncate max-w-[200px]">{camera.name}</h4>
          <p className="text-xs text-muted-foreground font-mono">
            {camera.resolution_width}x{camera.resolution_height} • {camera.fps} FPS • {camera.bitrate_kbps} kbps
          </p>
        </div>

        <div className="flex items-center gap-2">
          {camera.status === "running" ? (
            <>
              <button
                onClick={onRestart}
                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
                title="Restart Stream"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={onStop}
                className="flex items-center gap-1 px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-600/30 rounded text-xs font-semibold transition-colors"
              >
                <Square className="w-3.5 h-3.5" /> Stop
              </button>
            </>
          ) : (
            <button
              onClick={onStart}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded text-xs font-semibold transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Start
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export { LiveStreamPlayer };
