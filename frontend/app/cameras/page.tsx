"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCameras, fetchVideoSources, createCamera, deleteCamera, startCamera, stopCamera, restartCamera } from "@/lib/api";
import { Camera as CameraType } from "@/types";
import { Plus, Play, Square, RefreshCw, Trash2, Copy, Check, Video, Shield } from "lucide-react";

export default function CameraManagerPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [resolution, setResolution] = useState("1280x720");
  const [fps, setFps] = useState(25);
  const [bitrate, setBitrate] = useState(2048);
  const [overlayText, setOverlayText] = useState("");

  const { data: cameras = [], isLoading } = useQuery({
    queryKey: ["cameras"],
    queryFn: fetchCameras,
  });

  const { data: sources = [] } = useQuery({
    queryKey: ["videoSources"],
    queryFn: fetchVideoSources,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const [width, height] = resolution.split("x").map(Number);
    await createCamera({
      name,
      video_source_id: sourceId || (sources[0]?.id ?? null),
      resolution_width: width,
      resolution_height: height,
      fps,
      bitrate_kbps: bitrate,
      overlay_enabled: true,
      overlay_custom_text: overlayText,
    });
    setIsModalOpen(false);
    setName("");
    setOverlayText("");
    queryClient.invalidateQueries({ queryKey: ["cameras"] });
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-black text-white">Camera Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure, deploy, and supervise isolated virtual IP camera channels.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg text-sm transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" /> Provision Camera
        </button>
      </div>

      {/* Camera Grid Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-48 bg-card rounded-xl animate-pulse border border-border" />
          <div className="h-48 bg-card rounded-xl animate-pulse border border-border" />
        </div>
      ) : cameras.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          No virtual cameras currently provisioned. Click &quot;Provision Camera&quot; to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cameras.map((cam) => (
            <div key={cam.id} className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-base text-white">{cam.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">
                      ID: {cam.id} • {cam.model}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                      cam.status === "running"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    {cam.status}
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-border flex flex-col gap-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">RTSP:</span>
                    <button
                      onClick={() => handleCopy(cam.rtsp_url)}
                      className="text-primary hover:underline flex items-center gap-1 max-w-[200px] truncate"
                    >
                      {copiedUrl === cam.rtsp_url ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span className="truncate">{cam.rtsp_url}</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">RTMP:</span>
                    <button
                      onClick={() => handleCopy(cam.rtmp_url)}
                      className="text-cyan-400 hover:underline flex items-center gap-1 max-w-[200px] truncate"
                    >
                      {copiedUrl === cam.rtmp_url ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span className="truncate">{cam.rtmp_url}</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Snapshot:</span>
                    <a
                      href={cam.snapshot_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-400 hover:underline truncate max-w-[200px]"
                    >
                      {cam.snapshot_url}
                    </a>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>
                    {cam.resolution_width}x{cam.resolution_height} • {cam.fps} FPS
                  </span>
                  <span>{cam.stats?.readers_count || 0} Readers</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  {cam.status === "running" ? (
                    <>
                      <button
                        onClick={async () => {
                          await stopCamera(cam.id);
                          queryClient.invalidateQueries({ queryKey: ["cameras"] });
                        }}
                        className="px-3 py-1.5 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 rounded text-xs font-semibold flex items-center gap-1 transition-all"
                      >
                        <Square className="w-3.5 h-3.5" /> Stop
                      </button>
                      <button
                        onClick={async () => {
                          await restartCamera(cam.id);
                          queryClient.invalidateQueries({ queryKey: ["cameras"] });
                        }}
                        className="p-1.5 hover:bg-muted text-muted-foreground rounded transition-all"
                        title="Restart"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={async () => {
                        await startCamera(cam.id);
                        queryClient.invalidateQueries({ queryKey: ["cameras"] });
                      }}
                      className="px-3 py-1.5 bg-primary/20 text-primary hover:bg-primary/30 rounded text-xs font-semibold flex items-center gap-1 transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Start
                    </button>
                  )}
                </div>

                <button
                  onClick={async () => {
                    if (confirm(`Delete camera ${cam.name}?`)) {
                      await deleteCamera(cam.id);
                      queryClient.invalidateQueries({ queryKey: ["cameras"] });
                    }
                  }}
                  className="p-1.5 text-muted-foreground hover:text-rose-400 rounded transition-colors"
                  title="Delete Camera"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Provision Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md flex flex-col gap-5 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Provision Virtual Camera</h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-4 text-xs font-medium">
              <div>
                <label className="block text-muted-foreground mb-1">Camera Name</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Loading Bay Camera"
                  className="w-full bg-slate-950 border border-border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Assigned Video Source</label>
                <select
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  className="w-full bg-slate-950 border border-border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.video_codec} - {s.width}x{s.height})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">Resolution</label>
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="w-full bg-slate-950 border border-border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="1920x1080">1080p (1920x1080)</option>
                    <option value="1280x720">720p (1280x720)</option>
                    <option value="640x360">360p (640x360)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Frame Rate (FPS)</label>
                  <input
                    type="number"
                    value={fps}
                    onChange={(e) => setFps(Number(e.target.value))}
                    min={1}
                    max={60}
                    className="w-full bg-slate-950 border border-border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Timestamp Custom Text</label>
                <input
                  type="text"
                  value={overlayText}
                  onChange={(e) => setOverlayText(e.target.value)}
                  placeholder="e.g. GATE-A | NORTH WING"
                  className="w-full bg-slate-950 border border-border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 hover:bg-muted text-muted-foreground rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-all"
                >
                  Create Camera
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
