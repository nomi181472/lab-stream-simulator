"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchVideoSources, scanVideoSources, probeVideoSource, uploadVideoSource } from "@/lib/api";
import { VideoSourceProbeResult } from "@/types";
import { formatBytes } from "@/lib/utils";
import { Film, RefreshCw, Upload, Search, CheckCircle2, AlertCircle } from "lucide-react";

export default function VideoSourcesPage() {
  const queryClient = useQueryClient();
  const [probeInput, setProbeInput] = useState("");
  const [probeResult, setProbeResult] = useState<VideoSourceProbeResult | null>(null);
  const [isProbing, setIsProbing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ["videoSources"],
    queryFn: fetchVideoSources,
  });

  const handleScan = async () => {
    setIsScanning(true);
    try {
      await scanVideoSources();
      queryClient.invalidateQueries({ queryKey: ["videoSources"] });
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      await uploadVideoSource(file);
      queryClient.invalidateQueries({ queryKey: ["videoSources"] });
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload video");
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

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between border-b border-border pb-5">
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
          <button
            onClick={handleScan}
            disabled={isScanning}
            className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-muted text-secondary-foreground font-semibold rounded-lg text-sm transition-all border border-border shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? "animate-spin" : ""}`} />
            Scan Directory
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-lg text-xs text-rose-300">
          Upload Error: {uploadError}
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
                  No video sources found. Click &quot;Scan videos/ Directory&quot; to auto-discover local fixtures.
                </td>
              </tr>
            ) : (
              sources.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-bold text-white flex items-center gap-2">
                    <Film className="w-4 h-4 text-indigo-400" />
                    <span>{s.name}</span>
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
