'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Camera, getCameras, getRtspStats, StreamStats } from '@/lib/api';

const LiveStreamPlayer = dynamic(
  () => import('@/components/dynamic/LiveStreamPlayer').then(mod => mod.LiveStreamPlayer),
  { ssr: false, loading: () => <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-900 rounded-lg">Loading Video Stream...</div> }
);

export default function RtspPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [stats, setStats] = useState<StreamStats[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const [cams, rtspStats] = await Promise.all([
        getCameras(),
        getRtspStats()
      ]);
      const safeCams = Array.isArray(cams) ? cams : [];
      setCameras(safeCams);

      let streamItems: any[] = [];
      if (Array.isArray(rtspStats)) {
        streamItems = rtspStats;
      } else if (rtspStats && typeof rtspStats === 'object') {
        const pathsList = rtspStats.paths?.items || [];
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
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error('Failed to fetch RTSP diagnostic stats:', err);
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
            <span className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse"></span>
            RTSP MediaMTX Transport Diagnostics
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time RTP over TCP/UDP session monitoring, persistent looping stream pipeline, and H.264 packet delivery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-mono" suppressHydrationWarning>
            Updated: {lastRefreshed ? lastRefreshed.toLocaleTimeString() : 'Connecting...'}
          </span>
          <button
            onClick={fetchStats}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Active Publishers
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {safeStats.filter(s => s.is_publishing).length} / {safeCams.length}
          </div>
          <p className="text-xs text-slate-500 mt-1">FFmpeg persistent ingest streams</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Connected Readers
          </div>
          <div className="text-2xl font-bold text-cyan-400">
            {safeStats.reduce((acc, curr) => acc + (curr.reader_count || 0), 0)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Active client RTP sessions</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            RTSP Server Port
          </div>
          <div className="text-2xl font-bold font-mono text-purple-400">
            8554 TCP/UDP
          </div>
          <p className="text-xs text-slate-500 mt-1">MediaMTX Core Listener</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Transport Modes
          </div>
          <div className="text-sm font-semibold text-slate-200 mt-1">
            TCP Interleaved & UDP
          </div>
          <p className="text-xs text-slate-500 mt-1">Zero dropped frames on loop</p>
        </div>
      </div>

      {/* Camera Selection & Video Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stream Selector & Details */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
            <label htmlFor="cam-selector" className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Select Camera Stream
            </label>
            <select
              id="cam-selector"
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
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
              <h3 className="text-sm font-semibold text-white">Stream Specifications</h3>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-700/40">
                  <span className="text-slate-400">RTSP URL:</span>
                  <button
                    onClick={() => copyToClipboard(selectedCamera.rtsp_url)}
                    className="font-mono text-cyan-400 hover:underline max-w-[180px] truncate"
                    title={selectedCamera.rtsp_url}
                  >
                    {copiedUrl === selectedCamera.rtsp_url ? 'Copied!' : selectedCamera.rtsp_url}
                  </button>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-700/40">
                  <span className="text-slate-400">Resolution:</span>
                  <span className="font-mono text-slate-200">{selectedCamera.resolution}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-700/40">
                  <span className="text-slate-400">Frame Rate:</span>
                  <span className="font-mono text-slate-200">{selectedCamera.fps} fps</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-700/40">
                  <span className="text-slate-400">Bitrate:</span>
                  <span className="font-mono text-slate-200">{selectedCamera.bitrate_kbps} kbps</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-700/40">
                  <span className="text-slate-400">Loop Continuity:</span>
                  <span className="text-emerald-400 font-medium">Persistent Stream Active</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-700/40">
                  <span className="text-slate-400">Overlay:</span>
                  <span className="text-slate-200">
                    {selectedCamera.timestamp_overlay_enabled ? 'Real-time Wall Clock' : 'Disabled'}
                  </span>
                </div>
              </div>

              {/* CLI Probe Commands */}
              <div className="pt-2">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Verification CLI Command
                </div>
                <div className="bg-slate-950 p-2.5 rounded font-mono text-[11px] text-slate-300 break-all select-all">
                  ffprobe -rtsp_transport tcp -v error -show_streams {selectedCamera.rtsp_url}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live Player & Telemetry */}
        <div className="lg:col-span-2">
          {selectedCamera ? (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  Live RTSP Feed ({selectedCamera.name})
                </h3>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-900 text-slate-400 font-mono">
                  Session Token: {selectedCamera.profile_token}
                </span>
              </div>

              <LiveStreamPlayer
                camera={selectedCamera}
                autoPlay={true}
              />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center bg-slate-800/40 border border-slate-700/50 rounded-xl text-slate-400">
              No active camera stream available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
