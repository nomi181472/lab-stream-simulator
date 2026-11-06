"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchVideoSources, scanVideoSources, probeVideoSource, uploadVideoSource } from "@/lib/api";
import { VideoSourceProbeResult } from "@/types";
import { formatBytes } from "@/lib/utils";
import {
  Film,
  RefreshCw,
  Upload,
  Search,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  Radio,
  Copy,
  Check,
} from "lucide-react";

export default function VideoSourcesPage() {
  const queryClient = useQueryClient();
  const [scanDirectory, setScanDirectory] = useState("");
  const [scanStatusMessage, setScanStatusMessage] = useState<string | null>(null);
  const [probeInput, setProbeInput] = useState("");
  const [probeResult, setProbeResult] = useState<VideoSourceProbeResult | null>(null);
  const [isProbing, setIsProbing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedWs, setCopiedWs] = useState(false);

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ["videoSources"],
    queryFn: () => fetchVideoSources(),
  });

  const handleScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsScanning(true);
    setActionError(null);
    setScanStatusMessage(null);
    try {
      const dirToScan = scanDirectory.trim() || undefined;
      const res = await scanVideoSources(dirToScan);
      queryClient.invalidateQueries({ queryKey: ["videoSources"] });
      setScanStatusMessage(
        `Scan complete. Total indexed sources: ${res.length} (directory: ${dirToScan || "server 'videos/' folder"})`
      );
      setTimeout(() => setScanStatusMessage(null), 4000);
    } catch (err: any) {
      setActionError(err.message || "Failed to scan directory");
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setActionError(null);
    try {
      await uploadVideoSource(file);
      queryClient.invalidateQueries({ queryKey: ["videoSources"] });
    } catch (err: any) {
      setActionError(err.message || "Failed to upload video");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleProbe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!probeInput) return;
    setIsProbing(true);
    try {
      const res = await probeVideoSource(probeInput);
      setProbeResult(res);
    } finally {
      setIsProbing(false);
    }
  };

  const wsStreamTemplate =
    typeof window !== "undefined"
      ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.hostname}:8000/ws/cameras/{camera_id}/stream`
      : "ws://localhost:8000/ws/cameras/{camera_id}/stream";

  const handleCopyWsTemplate = () => {
    navigator.clipboard.writeText(wsStreamTemplate);
    setCopiedWs(true);
    setTimeout(() => setCopiedWs(false), 2000);
  };

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      {/* Page Title & Ingest Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Video Source Library</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage local video files, CDN URLs, and automated test fixtures inspected with FFprobe.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-sm transition-all cursor-pointer shadow-sm">
            <Upload className={`w-4 h-4 ${isUploading ? "animate-bounce" : ""}`} />
            {isUploading ? "Uploading..." : "Upload Video"}
            <input
              type="file"
              accept=".mp4,.mkv,.mov,.avi"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* User Custom Scan Directory Box */}
      <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Scan Video Directory</h3>
          </div>
          <span className="text-xs text-muted-foreground">
            Default: server <code className="text-indigo-300 font-mono">videos/</code> folder, or specify any directory
          </span>
        </div>

        <form onSubmit={handleScan} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={scanDirectory}
              onChange={(e) => setScanDirectory(e.target.value)}
              placeholder="Enter directory to scan (e.g. videos/ or C:/media or /var/videos - blank defaults to server videos/)"
              className="w-full bg-slate-950 border border-border rounded-lg px-3 py-2 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono pr-16"
            />
            {scanDirectory && (
              <button
                type="button"
                onClick={() => setScanDirectory("")}
                className="absolute right-2 top-2 text-[10px] text-muted-foreground hover:text-white bg-slate-800 px-1.5 py-0.5 rounded"
              >
                Reset
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isScanning}
            className="flex items-center justify-center gap-2 px-5 py-2 bg-secondary hover:bg-muted text-secondary-foreground font-semibold rounded-lg text-xs transition-all border border-border shadow-sm shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`} />
            {isScanning ? "Scanning..." : "Scan Directory"}
          </button>
        </form>

        {scanStatusMessage && (
          <div className="p-2.5 bg-emerald-950/60 border border-emerald-800 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{scanStatusMessage}</span>
          </div>
        )}
      </div>

      {/* Live WebSocket Video Streaming URL Info */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              WebSocket Video Stream Endpoint
            </h4>
            <p className="text-[11px] text-slate-400">
              Simulated cameras provisioned with these video fixtures stream raw binary JPEG frames over WebSocket:
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono gap-2 self-start sm:self-auto max-w-full">
          <span className="text-emerald-400 truncate max-w-[280px] sm:max-w-md">{wsStreamTemplate}</span>
          <button
            onClick={handleCopyWsTemplate}
            className="text-slate-300 hover:text-white shrink-0 flex items-center gap-1 text-[11px] bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded transition-colors"
            title="Copy WebSocket Video Stream Template"
          >
            {copiedWs ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedWs ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-lg text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Error: {actionError}</span>
        </div>
      )}

      {/* FFprobe URL Inspector Card */}
      <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
        <h3 className="text-sm font-bold flex items-center gap-2 text-white">
          <Search className="w-4 h-4 text-primary" /> Live FFprobe Source Inspector
        </h3>
        <form onSubmit={handleProbe} className="flex gap-3">
          <input
            type="text"
            value={probeInput}
            onChange={(e) => setProbeInput(e.target.value)}
            placeholder="Enter file path or URL (e.g. videos/blur_car.mp4 or https://...)"
            className="flex-1 bg-slate-950 border border-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary font-mono"
          />
          <button
            type="submit"
            disabled={isProbing}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg text-xs transition-all"
          >
            {isProbing ? "Probing..." : "Inspect with FFprobe"}
          </button>
        </form>

        {probeResult && (
          <div className="p-3 bg-slate-950 rounded-lg border border-border text-xs font-mono flex items-center justify-between">
            {probeResult.valid ? (
              <div className="flex items-center gap-4 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {probeResult.width}x{probeResult.height} • {probeResult.fps} FPS • {probeResult.video_codec} •{" "}
                  {probeResult.duration_sec.toFixed(1)}s • {formatBytes(probeResult.file_size_bytes)}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-rose-400">
                <AlertCircle className="w-4 h-4" />
                <span>Probe Error: {probeResult.error}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sources Table */}
      <div className="border border-border rounded-xl overflow-hidden bg-card">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-muted-foreground uppercase font-mono border-b border-border">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Type</th>
              <th className="p-4">Codec</th>
              <th className="p-4">Resolution</th>
              <th className="p-4">FPS</th>
              <th className="p-4">Duration</th>
              <th className="p-4">Size</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  Loading video fixtures...
                </td>
              </tr>
            ) : sources.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  No video sources found. Click &quot;Scan Directory&quot; to auto-discover local fixtures.
                </td>
              </tr>
            ) : (
              sources.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-bold text-white flex items-center gap-2">
                    <Film className="w-4 h-4 text-indigo-400" />
                    <span title={s.file_path}>{s.name}</span>
                  </td>
                  <td className="p-4 uppercase font-mono text-muted-foreground">{s.source_type}</td>
                  <td className="p-4 font-mono text-cyan-400 font-semibold">{s.video_codec || "N/A"}</td>
                  <td className="p-4 font-mono text-muted-foreground">
                    {s.width > 0 ? `${s.width}x${s.height}` : "Unknown"}
                  </td>
                  <td className="p-4 font-mono text-muted-foreground">{s.fps > 0 ? `${s.fps} FPS` : "VFR"}</td>
                  <td className="p-4 font-mono text-muted-foreground">{s.duration_sec.toFixed(1)}s</td>
                  <td className="p-4 font-mono text-muted-foreground">{formatBytes(s.file_size_bytes)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
