"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { fetchCameras, fetchVideoSources, startCamera, stopCamera, restartCamera } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Camera, Film, Radio, Video, Activity, Users } from "lucide-react";

// Dynamic client components for heavy UI sections
const LiveStreamPlayer = dynamic(() => import("@/components/dynamic/LiveStreamPlayer"), {
  ssr: false,
  loading: () => (
    <div className="aspect-video w-full bg-slate-900 rounded-lg animate-pulse flex items-center justify-center text-muted-foreground text-xs">
      Loading Media Player...
    </div>
  ),
});

const LiveEventFeed = dynamic(() => import("@/components/dynamic/LiveEventFeed"), {
  ssr: false,
  loading: () => <div className="h-64 bg-slate-900 rounded-xl animate-pulse" />,
});

export default function OverviewPage() {
  const { data: cameras = [], refetch: refetchCameras } = useQuery({
    queryKey: ["cameras"],
    queryFn: fetchCameras,
  });

  const { data: videoSources = [] } = useQuery({
    queryKey: ["videoSources"],
    queryFn: fetchVideoSources,
  });

  const { events, isConnected } = useWebSocket();

  const onlineCameras = cameras.filter((c) => c.status === "running").length;
  const totalReaders = cameras.reduce((acc, c) => acc + (c.stats?.readers_count || 0), 0);

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white">StreamLab Mission Control</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Multi-protocol IP camera simulation station, real-time media pipeline, and cross-language lab.
        </p>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Cameras</span>
            <h3 className="text-2xl font-black mt-1 text-white">{cameras.length}</h3>
            <span className="text-xs text-primary font-medium">{onlineCameras} active streams</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Camera className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Connected Readers</span>
            <h3 className="text-2xl font-black mt-1 text-white">{totalReaders}</h3>
            <span className="text-xs text-emerald-400 font-medium">RTSP / RTMP / HLS</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Video Fixtures</span>
            <h3 className="text-2xl font-black mt-1 text-white">{videoSources.length}</h3>
            <span className="text-xs text-indigo-400 font-medium">H.264 / AAC Sources</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Film className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">ONVIF Service</span>
            <h3 className="text-2xl font-black mt-1 text-white">Active</h3>
            <span className="text-xs text-cyan-400 font-medium">WS-Discovery UDP 3702</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Radio className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Live Video Feeds & WebSocket Event Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" /> Active Camera Feeds
            </h2>
            <span className="text-xs text-muted-foreground font-mono">
              Real-time persistent looping with burned timestamp
            </span>
          </div>

          {cameras.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
              No cameras configured yet. Head to the Camera Manager to provision one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cameras.map((camera) => (
                <LiveStreamPlayer
                  key={camera.id}
                  camera={camera}
                  onStart={async () => {
                    await startCamera(camera.id);
                    refetchCameras();
                  }}
                  onStop={async () => {
                    await stopCamera(camera.id);
                    refetchCameras();
                  }}
                  onRestart={async () => {
                    await restartCamera(camera.id);
                    refetchCameras();
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Telemetry Stream */}
        <div className="flex flex-col gap-4">
          <LiveEventFeed events={events} isConnected={isConnected} />
        </div>
      </div>
    </div>
  );
}
