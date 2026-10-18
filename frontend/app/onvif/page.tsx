'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Camera, getCameras } from '@/lib/api';

const ProtocolInspector = dynamic(
  () => import('@/components/dynamic/ProtocolInspector').then(mod => mod.ProtocolInspector),
  { ssr: false, loading: () => <div className="p-8 text-center text-slate-400">Loading ONVIF Protocol Inspector...</div> }
);

export default function OnvifPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [discoveryStatus, setDiscoveryStatus] = useState<string>('Ready');

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const data = await getCameras();
        const safeCams = Array.isArray(data) ? data : [];
        setCameras(safeCams);
        if (safeCams.length > 0) {
          setSelectedCameraId(safeCams[0].id);
        }
      } catch (err: any) {
        console.error('Failed to load cameras for ONVIF view:', err);
        setCameras([]);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const safeCams = Array.isArray(cameras) ? cameras : [];
  const selectedCamera = safeCams.find(c => c.id === selectedCameraId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            ONVIF Protocol Lab & WS-Discovery
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Genuine WS-Discovery UDP 3702 multicast responder and WSDL-compliant SOAP 1.2 Device & Media services.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs text-slate-300 flex items-center gap-2">
            <span className="text-slate-400">WS-Discovery Port:</span>
            <span className="font-mono font-medium text-emerald-400">3702 UDP</span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs text-slate-300 flex items-center gap-2">
            <span className="text-slate-400">SOAP Spec:</span>
            <span className="font-mono font-medium text-blue-400">ONVIF Core 24.12</span>
          </div>
        </div>
      </div>

      {/* Discovery & Scope Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Active ONVIF Nodes
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {cameras.length}
          </div>
          <p className="text-xs text-slate-400">
            {cameras.filter(c => c.is_enabled).length} responding to WS-Discovery probes
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Advertised Scopes
          </div>
          <div className="text-xs font-mono text-emerald-400 space-y-1">
            <div>• onvif://www.onvif.org/type/video_encoder</div>
            <div>• onvif://www.onvif.org/hardware/StreamLab-Sim</div>
            <div>• onvif://www.onvif.org/location/VirtualLab</div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Service Endpoints
          </div>
          <div className="text-xs font-mono text-slate-300 space-y-1">
            <div>Device: <span className="text-indigo-400">/onvif/device_service</span></div>
            <div>Media: <span className="text-indigo-400">/onvif/media_service</span></div>
            <div>Discovery: <span className="text-emerald-400">239.255.255.250:3702</span></div>
          </div>
        </div>
      </div>

      {/* Target Camera Selector */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label htmlFor="cam-select" className="text-sm font-medium text-slate-300">
            Target Camera:
          </label>
          <select
            id="cam-select"
            value={selectedCameraId}
            onChange={(e) => setSelectedCameraId(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            disabled={isLoading || cameras.length === 0}
          >
            {cameras.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.id}) - {c.status}
              </option>
            ))}
          </select>
        </div>

        {selectedCamera && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="bg-slate-900/60 border border-slate-700/60 rounded px-2.5 py-1">
              Profile: <span className="font-mono text-indigo-300">{selectedCamera.profile_token}</span>
            </span>
            <span className="bg-slate-900/60 border border-slate-700/60 rounded px-2.5 py-1">
              Auth: <span className="text-slate-300">{selectedCamera.auth_required ? 'WS-Security Digest' : 'None'}</span>
            </span>
            <span className="bg-slate-900/60 border border-slate-700/60 rounded px-2.5 py-1">
              RTSP Port: <span className="font-mono text-emerald-400">{selectedCamera.rtsp_port}</span>
            </span>
          </div>
        )}
      </div>

      {/* Interactive SOAP Console */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-200">
            Interactive SOAP 1.2 Inspection Console
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Send live SOAP/XML requests directly to the Python backend endpoint. Zero mock responses—every test returns genuine WSDL-valid XML.
          </p>
        </div>

        <ProtocolInspector 
          cameraId={selectedCameraId}
          profileToken={selectedCamera?.profile_token || 'PROFILE_MAIN_001'}
        />
      </div>
    </div>
  );
}
