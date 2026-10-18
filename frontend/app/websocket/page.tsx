'use client';

import React, { useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function WebSocketPage() {
  const { isConnected, events, clearEvents, sendPing } = useWebSocket();
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEventIndex, setSelectedEventIndex] = useState<number | null>(null);

  const filteredEvents = events.filter((e) => {
    if (filterType !== 'ALL') {
      if (filterType === 'LIFECYCLE' && !e.type.startsWith('camera.')) return false;
      if (filterType === 'STREAM' && !e.type.startsWith('stream.')) return false;
      if (filterType === 'HEARTBEAT' && !e.type.startsWith('system.')) return false;
      if (filterType === 'ERROR' && !e.type.includes('error')) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const str = JSON.stringify(e).toLowerCase();
      return str.includes(q);
    }
    return true;
  });

  const exportEvents = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `streamlab-ws-events-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
            Real-Time WebSocket Event Console
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Bi-directional telemetry channel streaming camera lifecycles, loop transitions, and system errors.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs text-slate-300 flex items-center gap-2">
            <span className="text-slate-400">Endpoint:</span>
            <span className="font-mono text-cyan-400">/ws/cameras</span>
          </div>

          <button
            onClick={sendPing}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            Send Heartbeat Ping
          </button>
        </div>
      </div>

      {/* Connection & Counter Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Socket Status
          </div>
          <div className="text-xl font-bold flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
            <span className={isConnected ? 'text-emerald-400' : 'text-rose-400'}>
              {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Backpressure: Bounded 256 Q</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Total Received Events
          </div>
          <div className="text-2xl font-bold text-white">
            {events.length}
          </div>
          <p className="text-xs text-slate-500 mt-1">Live in-memory buffer</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Filtered Events
          </div>
          <div className="text-2xl font-bold text-indigo-400">
            {filteredEvents.length}
          </div>
          <p className="text-xs text-slate-500 mt-1">Active match criteria</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Buffer Actions
          </div>
          <div className="flex gap-2">
            <button
              onClick={clearEvents}
              className="flex-1 px-2.5 py-1 text-xs rounded bg-slate-900 hover:bg-slate-700 text-slate-300 border border-slate-700"
            >
              Clear Buffer
            </button>
            <button
              onClick={exportEvents}
              disabled={events.length === 0}
              className="flex-1 px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 disabled:opacity-50"
            >
              Export JSON
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'LIFECYCLE', 'STREAM', 'ERROR', 'HEARTBEAT'].map((f) => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filterType === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search event content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Events Viewer & Detail Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stream List */}
        <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-xl p-4 max-h-[600px] overflow-y-auto space-y-2">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No WebSocket events received yet. Start or stop cameras to observe live telemetry.
            </div>
          ) : (
            filteredEvents.map((evt, idx) => {
              const isSelected = selectedEventIndex === idx;
              let badgeBg = 'bg-slate-800 text-slate-300';
              if (evt.type.includes('created') || evt.type.includes('started')) badgeBg = 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50';
              if (evt.type.includes('stopped')) badgeBg = 'bg-amber-950/80 text-amber-400 border border-amber-800/50';
              if (evt.type.includes('error')) badgeBg = 'bg-rose-950/80 text-rose-400 border border-rose-800/50';
              if (evt.type.includes('heartbeat')) badgeBg = 'bg-blue-950/80 text-blue-400 border border-blue-800/50';

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedEventIndex(idx)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-950/20'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium ${badgeBg}`}>
                      {evt.type}
                    </span>
                    <span className="font-mono text-slate-500 text-[11px]">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="text-xs font-mono text-slate-300 truncate">
                    {evt.camera_id ? `Camera: ${evt.camera_id} ` : ''}
                    {evt.data ? JSON.stringify(evt.data) : ''}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Event Payload Inspector */}
        <div className="lg:col-span-1 bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-200 mb-2">
            Event Payload Inspector
          </h3>

          {selectedEventIndex !== null && filteredEvents[selectedEventIndex] ? (
            <div className="flex-1 flex flex-col">
              <div className="text-xs text-slate-400 mb-2">
                Type: <span className="text-indigo-400 font-mono">{filteredEvents[selectedEventIndex].type}</span>
              </div>
              <pre className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-[11px] font-mono text-slate-300 overflow-auto max-h-[500px]">
                {JSON.stringify(filteredEvents[selectedEventIndex], null, 2)}
              </pre>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-500 text-center p-6">
              Click on any event from the stream list to view its complete JSON payload and metadata.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
