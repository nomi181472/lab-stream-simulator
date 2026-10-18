'use client';

import React, { useState, useEffect } from 'react';
import { getReadyz, getHealthz } from '@/lib/api';

export default function SettingsPage() {
  const [readyzData, setReadyzData] = useState<any>(null);
  const [healthzData, setHealthzData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const [h, r] = await Promise.all([
        getHealthz(),
        getReadyz().catch(err => ({ status: 'DEGRADED', error: err.message }))
      ]);
      setHealthzData(h);
      setReadyzData(r);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch system diagnostics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-slate-400"></span>
            System Architecture & Runtime Diagnostics
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time readiness probes, subprocess supervisor state, binary versions, and listening endpoints.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          disabled={isLoading}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
        >
          {isLoading ? 'Probing...' : 'Re-Probe System'}
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-300 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Readiness Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Overall Health
          </div>
          <div className="text-xl font-bold flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${healthzData?.status?.toLowerCase() === 'ok' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
            <span className={healthzData?.status?.toLowerCase() === 'ok' ? 'text-emerald-400' : 'text-rose-400'}>
              {healthzData?.status?.toUpperCase() || 'UNKNOWN'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Liveness probe: /healthz</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Media Engine Subsystem
          </div>
          <div className="text-xl font-bold flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${(readyzData?.checks?.mediamtx ?? readyzData?.subprocesses?.mediamtx_running) ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            <span className={(readyzData?.checks?.mediamtx ?? readyzData?.subprocesses?.mediamtx_running) ? 'text-emerald-400' : 'text-amber-400'}>
              {(readyzData?.checks?.mediamtx ?? readyzData?.subprocesses?.mediamtx_running) ? 'RUNNING' : 'STANDBY'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            FFmpeg & MediaMTX core
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Persistence Database
          </div>
          <div className="text-xl font-bold flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${(readyzData?.checks?.database ?? readyzData?.database?.connected) ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
            <span className={(readyzData?.checks?.database ?? readyzData?.database?.connected) ? 'text-emerald-400' : 'text-rose-400'}>
              {(readyzData?.checks?.database ?? readyzData?.database?.connected) ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Engine: SQLite AsyncIO + WAL</p>
        </div>
      </div>

      {/* Network Interface & Port Listeners */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">Active StreamLab Network Ports</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
            <div className="text-slate-400 uppercase text-[10px] font-semibold tracking-wider">FastAPI Core + ONVIF SOAP</div>
            <div className="font-mono text-white text-sm">http://127.0.0.1:8000</div>
            <div className="text-slate-500 text-[11px]">REST API, Device & Media Services, WebSockets</div>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
            <div className="text-slate-400 uppercase text-[10px] font-semibold tracking-wider">WS-Discovery Daemon</div>
            <div className="font-mono text-emerald-400 text-sm">239.255.255.250:3702 UDP</div>
            <div className="text-slate-500 text-[11px]">ONVIF Probe & ProbeMatches Multicast</div>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
            <div className="text-slate-400 uppercase text-[10px] font-semibold tracking-wider">RTSP Streaming Server</div>
            <div className="font-mono text-cyan-400 text-sm">rtsp://127.0.0.1:8554</div>
            <div className="text-slate-500 text-[11px]">TCP Interleaved & UDP RTP sessions</div>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
            <div className="text-slate-400 uppercase text-[10px] font-semibold tracking-wider">RTMP Relay Ingest/Egress</div>
            <div className="font-mono text-amber-400 text-sm">rtmp://127.0.0.1:1935</div>
            <div className="text-slate-500 text-[11px]">Live video ingest & FLV distribution</div>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
            <div className="text-slate-400 uppercase text-[10px] font-semibold tracking-wider">HLS Streaming Delivery</div>
            <div className="font-mono text-purple-400 text-sm">http://127.0.0.1:8888</div>
            <div className="text-slate-500 text-[11px]">Low latency TS/fMP4 chunks for browsers</div>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
            <div className="text-slate-400 uppercase text-[10px] font-semibold tracking-wider">WebRTC (WHEP) Egress</div>
            <div className="font-mono text-indigo-400 text-sm">http://127.0.0.1:8889</div>
            <div className="text-slate-500 text-[11px]">Sub-500ms browser video playback</div>
          </div>
        </div>
      </div>

      {/* Raw Diagnostic JSON */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Raw Probe Payload (/readyz)
        </h3>
        <pre className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto max-h-64">
          {JSON.stringify(readyzData, null, 2)}
        </pre>
      </div>
    </div>
  );
}
