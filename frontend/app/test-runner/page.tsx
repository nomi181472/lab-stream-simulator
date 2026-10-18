'use client';

import React, { useState, useEffect } from 'react';
import { runTest, getTestRuns, getTestRun, TestRun, Camera, getCameras } from '@/lib/api';
import { 
  Play, 
  RotateCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Terminal, 
  Camera as CameraIcon, 
  Network, 
  ShieldCheck, 
  Layers, 
  Sparkles,
  ChevronDown,
  Activity,
  Code2
} from 'lucide-react';

interface LanguageOption {
  id: string;
  name: string;
  runner: string;
  tag: string;
  color: string;
  iconBg: string;
  textColor: string;
  accentBorder: string;
}

const LANGUAGES: LanguageOption[] = [
  {
    id: 'python',
    name: 'Python',
    runner: 'pytest + httpx + websockets',
    tag: 'OFFICIAL SDK',
    color: 'from-amber-500/20 to-blue-500/20',
    iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    textColor: 'text-amber-400',
    accentBorder: 'border-amber-500/50',
  },
  {
    id: 'node',
    name: 'Node.js / TypeScript',
    runner: 'npm + ws + fetch',
    tag: 'ESM / TYPESCRIPT',
    color: 'from-emerald-500/20 to-teal-500/20',
    iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    textColor: 'text-emerald-400',
    accentBorder: 'border-emerald-500/50',
  },
  {
    id: 'golang',
    name: 'Go',
    runner: 'go test + gortsplib',
    tag: 'COMPILED NATIVE',
    color: 'from-cyan-500/20 to-blue-500/20',
    iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    textColor: 'text-cyan-400',
    accentBorder: 'border-cyan-500/50',
  },
  {
    id: 'dart',
    name: 'Dart',
    runner: 'dart test + dart:io',
    tag: 'FLUTTER CORE',
    color: 'from-sky-500/20 to-indigo-500/20',
    iconBg: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    textColor: 'text-sky-400',
    accentBorder: 'border-sky-500/50',
  },
  {
    id: 'dotnet',
    name: 'C# / .NET 8',
    runner: 'dotnet test + SharpRTSP',
    tag: 'ENTERPRISE .NET',
    color: 'from-purple-500/20 to-violet-500/20',
    iconBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    textColor: 'text-purple-400',
    accentBorder: 'border-purple-500/50',
  },
  {
    id: 'kotlin',
    name: 'Kotlin JVM',
    runner: 'gradle test + OkHttp',
    tag: 'JVM ANDROID',
    color: 'from-orange-500/20 to-purple-500/20',
    iconBg: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    textColor: 'text-orange-400',
    accentBorder: 'border-orange-500/50',
  },
];

export default function TestRunnerPage() {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('python');
  const [selectedProtocol, setSelectedProtocol] = useState<string>('all');
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [activeTestRun, setActiveTestRun] = useState<TestRun | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recentRuns, setRecentRuns] = useState<TestRun[]>([]);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);

  useEffect(() => {
    async function init() {
      try {
        const [cams, runs] = await Promise.all([
          getCameras().catch(() => []),
          getTestRuns().catch(() => [])
        ]);
        const safeCams = Array.isArray(cams) ? cams : [];
        const safeRuns = Array.isArray(runs) ? runs : [];
        setCameras(safeCams);
        if (safeCams.length > 0) {
          setSelectedCameraId(safeCams[0].id);
        } else {
          setSelectedCameraId('101');
        }
        setRecentRuns(safeRuns.slice(0, 6));
      } catch (err: any) {
        console.error('Failed to init test runner data:', err);
      } finally {
        setLoadingInitial(false);
      }
    }
    init();
  }, []);

  // Poll active run if running
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const isStatusRunning = activeTestRun && (
      activeTestRun.status?.toUpperCase() === 'RUNNING' ||
      activeTestRun.status?.toLowerCase() === 'running' ||
      activeTestRun.status?.toLowerCase() === 'pending'
    );
    if (isStatusRunning) {
      interval = setInterval(async () => {
        try {
          const updated = await getTestRun(activeTestRun.id);
          setActiveTestRun(updated);
          const stillRunning = (
            updated.status?.toUpperCase() === 'RUNNING' ||
            updated.status?.toLowerCase() === 'running' ||
            updated.status?.toLowerCase() === 'pending'
          );
          if (!stillRunning) {
            setIsRunning(false);
            const runs = await getTestRuns().catch(() => []);
            setRecentRuns(Array.isArray(runs) ? runs.slice(0, 6) : []);
          }
        } catch (err) {
          console.error('Failed to poll test run:', err);
        }
      }, 1400);
    }
    return () => clearInterval(interval);
  }, [activeTestRun]);

  const handleLaunchTest = async () => {
    try {
      setIsRunning(true);
      setErrorMsg(null);
      const run = await runTest({
        language: selectedLanguage,
        protocol: selectedProtocol,
        camera_id: selectedCameraId || undefined,
      });
      setActiveTestRun(run);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch test suite');
      setIsRunning(false);
    }
  };

  const currentLang = LANGUAGES.find((l) => l.id === selectedLanguage) || LANGUAGES[0];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 border border-slate-800/80 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
              </span>
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-400">
                Cross-Language Interoperability Station
              </span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Multi-Language Compliance Lab
            </h1>

            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              Dispatch genuine protocol assertion suites across <span className="text-slate-200 font-semibold">6 independent programming languages</span>. 
              Zero simulated responses—every test verifies actual SOAP 1.2 XML, RTSP/RTP packets, RTMP delivery, and WebSocket telemetry.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex flex-col items-end px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-right">
              <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Test Suite Standard</span>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> 100% Genuine Stacks
              </span>
            </div>
            <div className="flex flex-col items-end px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-right">
              <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Language Support</span>
              <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> 6 Verified SDKs
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Control Panel + Right Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Test Configuration (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-6 shadow-xl backdrop-blur-xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  1. Select Client Language Suite
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {selectedLanguage.toUpperCase()} Active
              </span>
            </div>

            {/* Language Selection Radio Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {LANGUAGES.map((lang) => {
                const isSelected = selectedLanguage === lang.id;
                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => setSelectedLanguage(lang.id)}
                    className={`group relative text-left p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                      isSelected
                        ? `bg-gradient-to-br from-indigo-950/60 via-slate-900/90 to-slate-900 border-indigo-500/80 shadow-lg shadow-indigo-600/15 ring-1 ring-indigo-500/30`
                        : `bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60`
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold tracking-wider ${
                        isSelected ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}>
                        {lang.tag}
                      </span>
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${
                        isSelected ? 'border-cyan-400 bg-cyan-400/20' : 'border-slate-700 group-hover:border-slate-600'
                      }`}>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {lang.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {lang.runner}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Target Protocol Selector */}
            <div className="space-y-2 pt-2">
              <label htmlFor="protocol-target" className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <Network className="w-3.5 h-3.5 text-cyan-400" />
                <span>2. Target Protocol Scope</span>
              </label>

              <div className="relative">
                <select
                  id="protocol-target"
                  value={selectedProtocol}
                  onChange={(e) => setSelectedProtocol(e.target.value)}
                  className="w-full appearance-none bg-slate-950/90 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 text-xs text-slate-200 transition-all font-medium pr-10 cursor-pointer shadow-inner"
                >
                  <option value="all">ALL Protocols (Full Compliance Matrix)</option>
                  <option value="onvif">ONVIF (WS-Discovery Probe + SOAP 1.2 Device & Media)</option>
                  <option value="rtsp">RTSP (MediaMTX Real-time RTP Stream over TCP/UDP)</option>
                  <option value="rtmp">RTMP (FLV Ingest & Distribution Station)</option>
                  <option value="websocket">WebSocket (Telemetry Events & Heartbeats)</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Target Camera Selector */}
            <div className="space-y-2">
              <label htmlFor="target-camera-selector" className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <CameraIcon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>3. Target Camera Stream Node</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono normal-case">
                  {cameras.length > 0 ? `${cameras.length} Active Feeds` : 'Auto-Provisioned'}
                </span>
              </label>

              <div className="relative">
                <select
                  id="target-camera-selector"
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                  className="w-full appearance-none bg-slate-950/90 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 text-xs text-slate-200 transition-all font-mono pr-10 cursor-pointer shadow-inner"
                >
                  <option value="">Auto-Provision Isolated Fixture (Recommended)</option>
                  {cameras.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — [{c.id}] ({c.status.toUpperCase()})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="p-3.5 bg-rose-950/80 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-snug">{errorMsg}</div>
              </div>
            )}

            {/* Launch Button */}
            <button
              onClick={handleLaunchTest}
              disabled={isRunning}
              className={`w-full py-3.5 px-6 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2.5 shadow-xl ${
                isRunning
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-indigo-600/25 hover:shadow-indigo-500/40 hover:scale-[1.01] active:scale-[0.98]'
              }`}
            >
              {isRunning ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Dispatching & Executing Test Suite...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white text-white" />
                  <span>Launch {currentLang.name} Interop Test Suite</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Live Terminal & Execution Matrix (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col h-full overflow-hidden">
            {/* Terminal Window Header Bar */}
            <div className="px-5 py-4 bg-slate-950/90 border-b border-slate-800/90 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Mac-style Window Controls */}
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80 border border-rose-600/40 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-600/40 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-600/40 inline-block" />
                </div>
                <div className="h-4 w-px bg-slate-800" />
                <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  <span>interop@streamlab:~# runner --suite={selectedLanguage}</span>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                {activeTestRun ? (
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                      activeTestRun.status?.toUpperCase() === 'PASSED' || activeTestRun.status?.toUpperCase() === 'COMPLETED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : activeTestRun.status?.toUpperCase() === 'FAILED'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                    }`}>
                      {activeTestRun.status?.toUpperCase()}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {((activeTestRun.duration_seconds ?? ((activeTestRun.duration_ms || 0) / 1000))).toFixed(2)}s
                    </span>
                  </div>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold text-slate-400 bg-slate-900 border border-slate-800">
                    AWAITING TRIGGER
                  </span>
                )}
              </div>
            </div>

            {/* Quick Metrics Strip */}
            {activeTestRun && (
              <div className="grid grid-cols-4 border-b border-slate-800/80 bg-slate-950/40 divide-x divide-slate-800/80">
                <div className="p-3 text-center">
                  <div className="text-[10px] font-mono uppercase text-slate-400">Total Asserts</div>
                  <div className="text-lg font-bold text-white font-mono mt-0.5">{activeTestRun.total_tests}</div>
                </div>
                <div className="p-3 text-center">
                  <div className="text-[10px] font-mono uppercase text-slate-400">Passed</div>
                  <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{activeTestRun.passed_tests}</span>
                  </div>
                </div>
                <div className="p-3 text-center">
                  <div className="text-[10px] font-mono uppercase text-slate-400">Failed</div>
                  <div className={`text-lg font-bold font-mono mt-0.5 flex items-center justify-center gap-1 ${
                    activeTestRun.failed_tests > 0 ? 'text-rose-400' : 'text-slate-500'
                  }`}>
                    {activeTestRun.failed_tests > 0 && <XCircle className="w-3.5 h-3.5" />}
                    <span>{activeTestRun.failed_tests}</span>
                  </div>
                </div>
                <div className="p-3 text-center">
                  <div className="text-[10px] font-mono uppercase text-slate-400">Compliance</div>
                  <div className="text-lg font-bold text-cyan-400 font-mono mt-0.5">
                    {activeTestRun.total_tests > 0
                      ? `${Math.round((activeTestRun.passed_tests / activeTestRun.total_tests) * 100)}%`
                      : '100%'}
                  </div>
                </div>
              </div>
            )}

            {/* Terminal Screen Body */}
            <div className="p-5 font-mono text-[12px] bg-[#050811] overflow-y-auto max-h-[460px] min-h-[380px] leading-relaxed text-slate-300">
              {activeTestRun ? (
                activeTestRun.stdout_log ? (
                  <pre className="whitespace-pre-wrap font-mono select-all text-slate-200">
                    {activeTestRun.stdout_log}
                  </pre>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
                    <RotateCw className="w-6 h-6 animate-spin text-indigo-400" />
                    <span className="font-semibold text-white">Spawning process and executing test suite...</span>
                    <span className="text-xs text-slate-500">Connecting to MediaMTX & ONVIF endpoints</span>
                  </div>
                )
              ) : (
                /* Sleek Blueprint Empty State */
                <div className="h-full flex flex-col justify-between py-4 space-y-6">
                  <div className="space-y-3">
                    <div className="text-indigo-400 font-bold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <span>StreamLab Test Automation Engine Initialized</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">
                      Select a language on the left and click <strong className="text-white">&quot;Launch Interop Test Suite&quot;</strong>. 
                      The backend runner will provision an isolated surveillance camera, start real-time H.264 video encoding, and execute all 4 protocol verification suites:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                      <div className="text-cyan-400 font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> ONVIF Device & Media
                      </div>
                      <div className="text-slate-400 font-sans text-[11px]">
                        SOAP 1.2 GetDeviceInformation & GetStreamUri resolution
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                      <div className="text-indigo-400 font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> RTSP Media Transport
                      </div>
                      <div className="text-slate-400 font-sans text-[11px]">
                        TCP socket OPTIONS, DESCRIBE, and SDP H.264 track probing
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                      <div className="text-amber-400 font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> RTMP Multiplex Ingest
                      </div>
                      <div className="text-slate-400 font-sans text-[11px]">
                        FLV container delivery and zero-latency RTMP relay egress
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                      <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> WebSocket Telemetry
                      </div>
                      <div className="text-slate-400 font-sans text-[11px]">
                        Bidirectional camera lifecycle event broadcasting
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 text-center text-xs text-slate-500 font-sans">
                    Ready to execute. Click the launch button on the left to begin live test run.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Historical Runs Bar */}
      {recentRuns.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg backdrop-blur-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Recent Test Executions</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-500">Showing last {recentRuns.length} runs</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {recentRuns.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setActiveTestRun(r)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  activeTestRun?.id === r.id
                    ? 'border-indigo-500 bg-indigo-950/40 text-white shadow-md'
                    : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
                    {(r.language || r.target_language || 'TEST').toUpperCase()}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${
                    r.status?.toUpperCase() === 'PASSED' || r.status?.toUpperCase() === 'COMPLETED'
                      ? 'bg-emerald-400'
                      : r.status?.toUpperCase() === 'FAILED'
                      ? 'bg-rose-400'
                      : 'bg-amber-400'
                  }`} />
                </div>
                <div className="text-xs font-bold truncate text-white">{r.id}</div>
                <div className="text-[10px] text-slate-400 font-mono mt-1">
                  {((r.duration_seconds ?? ((r.duration_ms || 0) / 1000))).toFixed(1)}s • {r.passed_tests}/{r.total_tests} pass
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
