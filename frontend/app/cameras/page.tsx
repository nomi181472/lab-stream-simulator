"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchCameras,
  fetchVideoSources,
  createCamera,
  updateCamera,
  deleteCamera,
  startCamera,
  stopCamera,
  restartCamera,
} from "@/lib/api";
import { Camera as CameraType } from "@/types";
import {
  Plus,
  Play,
  Square,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Video,
  Shield,
  Edit2,
  Sparkles,
  Info,
} from "lucide-react";

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
}

function isHexId(id: string): boolean {
  return /^cam-[0-9a-f]{6}$/i.test(id) || /^test-cam-[0-9a-f]{6}$/i.test(id);
}

const PRESET_IDS = ["cam-01", "cam-02", "gate-1", "entrance", "lobby-ptz", "dock-01"];

export default function CameraManagerPage() {
  const queryClient = useQueryClient();
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState<CameraType | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [copyNotification, setCopyNotification] = useState<string | null>(null);

  // Provision Form State
  const [name, setName] = useState("");
  const [customId, setCustomId] = useState("");
  const [isCustomIdTouched, setIsCustomIdTouched] = useState(false);
  const [sourceId, setSourceId] = useState("");
  const [resolution, setResolution] = useState("1280x720");
  const [fps, setFps] = useState(25);
  const [bitrate, setBitrate] = useState(2048);
  const [overlayText, setOverlayText] = useState("");
  const [overlayFontSize, setOverlayFontSize] = useState(32);
  const [provisionError, setProvisionError] = useState<string | null>(null);

  // Edit Form State
  const [editName, setEditName] = useState("");
  const [editCustomId, setEditCustomId] = useState("");
  const [editSourceId, setEditSourceId] = useState("");
  const [editResolution, setEditResolution] = useState("1280x720");
  const [editFps, setEditFps] = useState(25);
  const [editBitrate, setEditBitrate] = useState(2048);
  const [editOverlayText, setEditOverlayText] = useState("");
  const [editOverlayFontSize, setEditOverlayFontSize] = useState(32);
  const [editError, setEditError] = useState<string | null>(null);

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
    setProvisionError(null);
    try {
      const [width, height] = resolution.split("x").map(Number);
      await createCamera({
        name,
        id: customId.trim() || undefined,
        video_source_id: sourceId || (sources[0]?.id ?? null),
        resolution_width: width,
        resolution_height: height,
        fps,
        bitrate_kbps: bitrate,
        overlay_enabled: true,
        overlay_custom_text: overlayText,
        overlay_font_size: overlayFontSize,
      });
      setIsProvisionModalOpen(false);
      setName("");
      setCustomId("");
      setIsCustomIdTouched(false);
      setOverlayText("");
      setOverlayFontSize(32);
      queryClient.invalidateQueries({ queryKey: ["cameras"] });
    } catch (err: any) {
      setProvisionError(err.message || "Failed to create camera");
    }
  };

  const openEditModal = (cam: CameraType, suggestedId?: string) => {
    setEditingCamera(cam);
    setEditName(cam.name);
    setEditCustomId(suggestedId || cam.id);
    setEditSourceId(cam.video_source_id || sources[0]?.id || "");
    setEditResolution(`${cam.resolution_width}x${cam.resolution_height}`);
    setEditFps(cam.fps);
    setEditBitrate(cam.bitrate_kbps);
    setEditOverlayText(cam.overlay_custom_text || "");
    setEditOverlayFontSize(cam.overlay_font_size || 32);
    setEditError(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCamera) return;
    setEditError(null);
    try {
      const [width, height] = editResolution.split("x").map(Number);
      await updateCamera(editingCamera.id, {
        id: editCustomId.trim() || editingCamera.id,
        name: editName,
        video_source_id: editSourceId || null,
        resolution_width: width,
        resolution_height: height,
        fps: editFps,
        bitrate_kbps: editBitrate,
        overlay_custom_text: editOverlayText,
        overlay_font_size: editOverlayFontSize,
      });
      setEditingCamera(null);
      queryClient.invalidateQueries({ queryKey: ["cameras"] });
    } catch (err: any) {
      setEditError(err.message || "Failed to update camera");
    }
  };

  const handleCopy = (url: string, label?: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setCopyNotification(`Copied ${label ? `${label} ` : ""}${url}`);
    setTimeout(() => {
      setCopiedUrl(null);
      setCopyNotification(null);
    }, 2500);
  };

  const previewId = customId.trim() || (name ? toSlug(name) : "cam-01");
  const editPreviewId = editCustomId.trim() || (editName ? toSlug(editName) : "cam-01");

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Top Notification Banner for Copied URLs */}
      {copyNotification && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 border border-emerald-500/40 text-emerald-400 px-4 py-2.5 rounded-lg shadow-2xl flex items-center gap-2 text-xs font-mono animate-in fade-in slide-in-from-top-2 duration-200">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate max-w-md">{copyNotification}</span>
        </div>
      )}

      <div className="flex items-center justify-between border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-black text-white">Camera Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure, deploy, and supervise isolated virtual IP camera channels with memorable, human-readable stream IDs.
          </p>
        </div>
        <button
          onClick={() => {
            setName("");
            setCustomId("");
            setIsCustomIdTouched(false);
            setProvisionError(null);
            setIsProvisionModalOpen(true);
          }}
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
          {cameras.map((cam) => {
            const hasHexId = isHexId(cam.id);
            const memorableCandidate = toSlug(cam.name) || "cam-01";
            const wsUrl =
              cam.ws_stream_url ||
              (typeof window !== "undefined"
                ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.hostname}:8000/ws/cameras/${cam.id}/stream`
                : `ws://localhost:8000/ws/cameras/${cam.id}/stream`);

            return (
              <div key={cam.id} className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-base text-white">{cam.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground font-mono">
                          ID: <span className="text-cyan-400 font-bold">{cam.id}</span>
                        </p>
                        {hasHexId && (
                          <button
                            onClick={() => openEditModal(cam, memorableCandidate)}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 transition-colors"
                            title="This camera has an auto-generated hex ID. Click to rename to a memorable ID."
                          >
                            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                            Make Memorable
                          </button>
                        )}
                      </div>
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

                  {/* Protocol URL Box */}
                  <div className="bg-slate-950 p-3 rounded-lg border border-border flex flex-col gap-2 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground shrink-0">RTSP:</span>
                      <button
                        onClick={() => handleCopy(cam.rtsp_url, "RTSP")}
                        className="text-primary hover:underline flex items-center gap-1 max-w-[210px] truncate ml-2"
                        title={cam.rtsp_url}
                      >
                        {copiedUrl === cam.rtsp_url ? (
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                        ) : (
                          <Copy className="w-3 h-3 shrink-0" />
                        )}
                        <span className="truncate">{cam.rtsp_url}</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground shrink-0">RTMP:</span>
                      <button
                        onClick={() => handleCopy(cam.rtmp_url, "RTMP")}
                        className="text-cyan-400 hover:underline flex items-center gap-1 max-w-[210px] truncate ml-2"
                        title={cam.rtmp_url}
                      >
                        {copiedUrl === cam.rtmp_url ? (
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                        ) : (
                          <Copy className="w-3 h-3 shrink-0" />
                        )}
                        <span className="truncate">{cam.rtmp_url}</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground shrink-0">WS:</span>
                      <button
                        onClick={() => handleCopy(wsUrl, "WebSocket")}
                        className="text-emerald-400 hover:underline flex items-center gap-1 max-w-[210px] truncate ml-2"
                        title={wsUrl}
                      >
                        {copiedUrl === wsUrl ? (
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                        ) : (
                          <Copy className="w-3 h-3 shrink-0" />
                        )}
                        <span className="truncate">{wsUrl}</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground shrink-0">Snapshot:</span>
                      <a
                        href={cam.snapshot_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 hover:underline truncate max-w-[210px] ml-2"
                      >
                        {cam.snapshot_url}
                      </a>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground flex items-center justify-between">
                    <span>
                      {cam.resolution_width}x{cam.resolution_height} • {cam.fps} FPS
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                        OSD {cam.overlay_font_size || 32}px
                      </span>
                      <span>{cam.stats?.readers_count || 0} Readers</span>
                    </div>
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

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(cam)}
                      className="p-1.5 text-muted-foreground hover:text-white rounded transition-colors"
                      title="Edit Camera & Rename ID"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
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
              </div>
            );
          })}
        </div>
      )}

      {/* Provision Modal */}
      {isProvisionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg flex flex-col gap-5 shadow-2xl">
            <div>
              <h2 className="text-lg font-bold text-white">Provision Virtual Camera</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Set up a virtual camera with a human-readable, unforgettable stream ID.
              </p>
            </div>

            {provisionError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {provisionError}
              </div>
            )}

            <form onSubmit={handleCreate} className="flex flex-col gap-4 text-xs font-medium">
              <div>
                <label className="block text-muted-foreground mb-1">Camera Name</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!isCustomIdTouched) {
                      setCustomId(toSlug(e.target.value));
                    }
                  }}
                  placeholder="e.g. Front Entrance Surveillance"
                  className="w-full bg-slate-950 border border-border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-muted-foreground">Camera ID / Stream Slug</label>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    {isCustomIdTouched ? "Custom" : "Auto-slug from name"}
                  </span>
                </div>
                <input
                  type="text"
                  value={customId}
                  onChange={(e) => {
                    setIsCustomIdTouched(true);
                    setCustomId(toSlug(e.target.value));
                  }}
                  placeholder="e.g. front-entrance"
                  className="w-full bg-slate-950 border border-border rounded-lg px-3 py-2 text-cyan-300 font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[10px] text-muted-foreground">Presets:</span>
                  {PRESET_IDS.map((pid) => (
                    <button
                      key={pid}
                      type="button"
                      onClick={() => {
                        setIsCustomIdTouched(true);
                        setCustomId(pid);
                      }}
                      className="px-2 py-0.5 rounded text-[10px] bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-mono transition-colors"
                    >
                      {pid}
                    </button>
                  ))}
                  {name && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomIdTouched(false);
                        setCustomId(toSlug(name));
                      }}
                      className="px-2 py-0.5 rounded text-[10px] bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 font-mono transition-colors"
                    >
                      Reset to slug
                    </button>
                  )}
                </div>
              </div>

              {/* Real-time Stream URL Preview */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 flex flex-col gap-1.5 text-[11px] font-mono">
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">
                  <Info className="w-3 h-3 text-cyan-400" />
                  Live Stream Endpoints Preview
                </div>
                <div className="text-slate-400 truncate">
                  <span className="text-slate-500">RTSP: </span>
                  <span className="text-primary font-semibold">
                    rtsp://127.0.0.1:8554/cameras/<span className="text-cyan-400 font-bold underline">{previewId}</span>/main
                  </span>
                </div>
                <div className="text-slate-400 truncate">
                  <span className="text-slate-500">RTMP: </span>
                  <span className="text-amber-400 font-semibold">
                    rtmp://127.0.0.1:1935/cameras/<span className="text-cyan-400 font-bold underline">{previewId}</span>/main
                  </span>
                </div>
                <div className="text-slate-400 truncate">
                  <span className="text-slate-500">WS: </span>
                  <span className="text-emerald-400 font-semibold">
                    ws://localhost:8000/ws/cameras/<span className="text-cyan-400 font-bold underline">{previewId}</span>/stream
                  </span>
                </div>
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

              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-muted-foreground mb-1">OSD Font Size (px)</label>
                  <input
                    type="number"
                    value={overlayFontSize}
                    onChange={(e) => setOverlayFontSize(Number(e.target.value))}
                    min={12}
                    max={72}
                    className="w-full bg-slate-950 border border-border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsProvisionModalOpen(false)}
                  className="px-4 py-2 hover:bg-muted text-muted-foreground rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-all shadow-sm"
                >
                  Create Camera
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit & Rename Modal */}
      {editingCamera && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg flex flex-col gap-5 shadow-2xl">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-primary" /> Edit Camera & Rename ID
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Renaming the ID updates the RTSP, RTMP, and WebSocket stream endpoints immediately.
              </p>
            </div>

            {editError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdate} className="flex flex-col gap-4 text-xs font-medium">
              <div>
                <label className="block text-muted-foreground mb-1">Camera Name</label>
                <input
                  required
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Front Entrance Surveillance"
                  className="w-full bg-slate-950 border border-border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-muted-foreground">Camera ID / Stream Slug</label>
                  <span className="text-[10px] text-amber-400 font-mono">
                    {editCustomId !== editingCamera.id ? "Path will change" : "Current ID"}
                  </span>
                </div>
                <input
                  required
                  type="text"
                  value={editCustomId}
                  onChange={(e) => setEditCustomId(toSlug(e.target.value))}
                  placeholder="e.g. front-entrance"
                  className="w-full bg-slate-950 border border-border rounded-lg px-3 py-2 text-cyan-300 font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[10px] text-muted-foreground">Suggestions:</span>
                  {editName && (
                    <button
                      type="button"
                      onClick={() => setEditCustomId(toSlug(editName))}
                      className="px-2 py-0.5 rounded text-[10px] bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 font-mono transition-colors"
                    >
                      From Name: {toSlug(editName)}
                    </button>
                  )}
                  {PRESET_IDS.map((pid) => (
                    <button
                      key={pid}
                      type="button"
                      onClick={() => setEditCustomId(pid)}
                      className="px-2 py-0.5 rounded text-[10px] bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-mono transition-colors"
                    >
                      {pid}
                    </button>
                  ))}
                </div>
              </div>

              {/* Updated URL Preview */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 flex flex-col gap-1.5 text-[11px] font-mono">
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">
                  <Info className="w-3 h-3 text-cyan-400" />
                  New Stream Endpoints Preview
                </div>
                <div className="text-slate-400 truncate">
                  <span className="text-slate-500">RTSP: </span>
                  <span className="text-primary font-semibold">
                    rtsp://127.0.0.1:8554/cameras/<span className="text-cyan-400 font-bold underline">{editPreviewId}</span>/main
                  </span>
                </div>
                <div className="text-slate-400 truncate">
                  <span className="text-slate-500">RTMP: </span>
                  <span className="text-amber-400 font-semibold">
                    rtmp://127.0.0.1:1935/cameras/<span className="text-cyan-400 font-bold underline">{editPreviewId}</span>/main
                  </span>
                </div>
                <div className="text-slate-400 truncate">
                  <span className="text-slate-500">WS: </span>
                  <span className="text-emerald-400 font-semibold">
                    ws://localhost:8000/ws/cameras/<span className="text-cyan-400 font-bold underline">{editPreviewId}</span>/stream
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Assigned Video Source</label>
                <select
                  value={editSourceId}
                  onChange={(e) => setEditSourceId(e.target.value)}
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
                    value={editResolution}
                    onChange={(e) => setEditResolution(e.target.value)}
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
                    value={editFps}
                    onChange={(e) => setEditFps(Number(e.target.value))}
                    min={1}
                    max={60}
                    className="w-full bg-slate-950 border border-border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-muted-foreground mb-1">Timestamp Custom Text</label>
                  <input
                    type="text"
                    value={editOverlayText}
                    onChange={(e) => setEditOverlayText(e.target.value)}
                    placeholder="e.g. GATE-A | NORTH WING"
                    className="w-full bg-slate-950 border border-border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">OSD Font Size (px)</label>
                  <input
                    type="number"
                    value={editOverlayFontSize}
                    onChange={(e) => setEditOverlayFontSize(Number(e.target.value))}
                    min={12}
                    max={72}
                    className="w-full bg-slate-950 border border-border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingCamera(null)}
                  className="px-4 py-2 hover:bg-muted text-muted-foreground rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-all shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
