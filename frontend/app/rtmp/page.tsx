'use client';

import React, { useState, useEffect } from 'react';
import { Camera, getCameras, getRtmpStats, StreamStats } from '@/lib/api';

export default function RtmpPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [stats, setStats] = useState<StreamStats[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const [cams, rtmpStats] = await Promise.all([
        getCameras(),
        getRtmpStats()
      ]);
      const safeCams = Array.isArray(cams) ? cams : [];
      setCameras(safeCams);

      let streamItems: any[] = [];
      if (Array.isArray(rtmpStats)) {
        streamItems = rtmpStats;
      } else if (rtmpStats && typeof rtmpStats === 'object') {
        const pathsList = rtmpStats.paths?.items || [];
        streamItems = pathsList.map((p: any) => ({
          path: p.name || '',
          camera_id: (p.name || '').split('/')[1] || p.name || '',
          is_publishing: Boolean(p.ready),
          reader_count: (p.readers || []).length,
          bytes_received: p.bytesReceived || 0,
          bytes_sent: p.bytesSent || 0,
        }));
      }
      setStats(streamItems);

      if (!selectedCameraId && safeCams.length > 0) {
        setSelectedCameraId(safeCams[0].id);
      }
    } catch (err: any) {
      console.error('Failed to fetch RTMP stats:', err);
      setStats([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [selectedCameraId]);

  const safeCams = Array.isArray(cameras) ? cameras : [];
  const safeStats = Array.isArray(stats) ? stats : [];
  const selectedCamera = safeCams.find(c => c.id === selectedCameraId);
  const selectedStat = safeStats.find(s => s.camera_id === selectedCameraId || (s.path && s.path.includes(selectedCameraId)));

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(text);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse"></span>
            RTMP Media Ingest & Relay Station
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            MediaMTX RTMP 1935 ingestion, relay multiplexing, and cross-protocol playback distribution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs text-slate-300 flex items-center gap-2">
            <span className="text-slate-400">RTMP Port:</span>
            <span className="font-mono font-medium text-amber-400">1935 TCP</span>
          </div>
          <button
            onClick={fetchStats}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Active RTMP Streams
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {safeStats.filter(s => s.is_publishing).length}
          </div>
          <p className="text-xs text-slate-500 mt-1">Live ingest pipelines</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Codec Support
          </div>
          <div className="text-xl font-bold text-slate-200">
            H.264 / AAC
          </div>
          <p className="text-xs text-slate-500 mt-1">Standard surveillance FLV/RTMP</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Total Readers
          </div>
          <div className="text-2xl font-bold text-cyan-400">
            {safeStats.reduce((acc, curr) => acc + (curr.reader_count || 0), 0)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Live RTMP subscribers</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Relay Mode
          </div>
          <div className="text-sm font-semibold text-emerald-400 mt-1">
            Auto RTSP &lt;-&gt; RTMP
          </div>
          <p className="text-xs text-slate-500 mt-1">MediaMTX zero-transcode remux</p>
        </div>
      </div>

      {/* Camera Selection & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
            <label htmlFor="rtmp-cam-selector" className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Select Camera
            </label>
            <select
              id="rtmp-cam-selector"
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
            >
              {safeCams.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.id}) - {c.status}
                </option>
              ))}
            </select>
          </div>

          {selectedCamera && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white">RTMP URLs</h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">Subscriber / Playback URL:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={selectedCamera.rtmp_url}
                      className="w-full bg-slate-950 border border-slate-700/60 rounded px-2.5 py-1.5 font-mono text-amber-300 text-[11px]"
                    />
                    <button
                      onClick={() => copyToClipboard(selectedCamera.rtmp_url)}
                      className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 whitespace-nowrap"
                    >
                      {copiedUrl === selectedCamera.rtmp_url ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block mb-1">External Ingest URL:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`rtmp://127.0.0.1:1935/live/${selectedCamera.id}`}
                      className="w-full bg-slate-950 border border-slate-700/60 rounded px-2.5 py-1.5 font-mono text-cyan-300 text-[11px]"
                    />
                    <button
                      onClick={() => copyToClipboard(`rtmp://127.0.0.1:1935/live/${selectedCamera.id}`)}
                      className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 whitespace-nowrap"
                    >
                      {copiedUrl === `rtmp://127.0.0.1:1935/live/${selectedCamera.id}` ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-700/40 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Stream Status:</span>
                    <span className={`font-medium ${selectedCamera.status === 'RUNNING' ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {selectedCamera.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ingest Bitrate:</span>
                    <span className="font-mono text-slate-200">{selectedCamera.bitrate_kbps} kbps</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">FPS:</span>
                    <span className="font-mono text-slate-200">{selectedCamera.fps}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Diagnostic Testing Terminal */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-2">
              Cross-Platform RTMP Verification Recipes
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Real command line utilities for testing genuine RTMP ingest and playback without web browser limitations.
            </p>

            <div className="space-y-4 text-xs font-mono">
              <div className="space-y-1">
                <div className="text-slate-400 font-sans font-medium text-[11px]">
                  1. Inspect RTMP Media Streams (FFprobe):
                </div>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-slate-300 break-all select-all">
                  ffprobe -v error -show_format -show_streams &quot;{selectedCamera?.rtmp_url || 'rtmp://127.0.0.1:1935/cameras/cam-001/main'}&quot;
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-slate-400 font-sans font-medium text-[11px]">
                  2. Play RTMP Stream via FFplay:
                </div>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-slate-300 break-all select-all">
                  ffplay -fflags nobuffer -flags low_delay &quot;{selectedCamera?.rtmp_url || 'rtmp://127.0.0.1:1935/cameras/cam-001/main'}&quot;
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-slate-400 font-sans font-medium text-[11px]">
                  3. Ingest Test Video to StreamLab RTMP Endpoint:
                </div>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-slate-300 break-all select-all">
                  ffmpeg -re -i sample.mp4 -c:v libx264 -preset ultrafast -c:a aac -f flv &quot;rtmp://127.0.0.1:1935/live/{selectedCamera?.id || 'cam-001'}&quot;
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
