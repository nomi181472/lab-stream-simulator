'use client';

import React, { useState, useEffect } from 'react';
import { getTestRuns, getTestRun, TestRun } from '@/lib/api';

export default function TestReportsPage() {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [langFilter, setLangFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchRuns = async () => {
    try {
      setIsLoading(true);
      const data = await getTestRuns();
      setRuns(data);
      if (data.length > 0 && !selectedRun) {
        setSelectedRun(data[0]);
      }
    } catch (err: any) {
      console.error('Failed to load test runs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleSelectRun = async (runId: string) => {
    try {
      const detailed = await getTestRun(runId);
      setSelectedRun(detailed);
    } catch (err) {
      console.error('Failed to fetch run details:', err);
    }
  };

  const safeRuns = Array.isArray(runs) ? runs : [];
  const filteredRuns = safeRuns.filter((r) => {
    const lang = (r.language || r.target_language || '').toLowerCase();
    if (langFilter !== 'all' && lang !== langFilter.toLowerCase()) return false;
    const status = (r.status || '').toUpperCase();
    if (statusFilter !== 'all' && status !== statusFilter.toUpperCase()) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></span>
            Compliance Matrix & Historical Test Reports
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Historical audit logs of all client test suite runs with stdout logs and assertion results.
          </p>
        </div>

        <button
          onClick={fetchRuns}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
        >
          Refresh Reports
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="filter-lang" className="text-xs font-medium text-slate-400">Language:</label>
            <select
              id="filter-lang"
              value={langFilter}
              onChange={(e) => setLangFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200"
            >
              <option value="all">All Languages</option>
              <option value="python">Python</option>
              <option value="node">Node.js</option>
              <option value="golang">Go</option>
              <option value="dart">Dart</option>
              <option value="dotnet">.NET</option>
              <option value="kotlin">Kotlin</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="filter-status" className="text-xs font-medium text-slate-400">Status:</label>
            <select
              id="filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200"
            >
              <option value="all">All Statuses</option>
              <option value="PASSED">Passed</option>
              <option value="FAILED">Failed</option>
              <option value="RUNNING">Running</option>
            </select>
          </div>
        </div>

        <span className="text-xs text-slate-400">
          Showing <span className="text-white font-medium">{filteredRuns.length}</span> of {runs.length} test runs
        </span>
      </div>

      {/* Runs Table & Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Runs List Table */}
        <div className="lg:col-span-1 bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden max-h-[600px] flex flex-col">
          <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Test Execution Runs
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-slate-800">
            {filteredRuns.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No matching test reports found.
              </div>
            ) : (
              filteredRuns.map((run) => {
                const isSelected = selectedRun?.id === run.id;
                return (
                  <div
                    key={run.id}
                    onClick={() => handleSelectRun(run.id)}
                    className={`p-3.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-950/30 border-l-4 border-blue-500'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-semibold text-white capitalize">
                        {run.language || run.target_language || 'Suite'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        run.status?.toUpperCase() === 'PASSED' || run.status?.toUpperCase() === 'COMPLETED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                        run.status?.toUpperCase() === 'FAILED' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                        'bg-amber-950 text-amber-400'
                      }`}>
                        {run.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{run.passed_tests}/{run.total_tests} passed</span>
                      <span>{((run.duration_seconds ?? ((run.duration_ms || 0) / 1000))).toFixed(2)}s</span>
                    </div>

                    <div className="text-[10px] text-slate-500 mt-1 font-mono">
                      {run.created_at || run.started_at ? new Date(run.created_at || run.started_at || '').toLocaleString() : 'N/A'}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Run Details Console */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col h-[600px]">
          {selectedRun ? (
            <div className="flex flex-col h-full space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white capitalize flex items-center gap-2">
                    {selectedRun.language || selectedRun.target_language || 'Suite'} Test Report
                    <span className="text-xs font-normal text-slate-400 font-mono">
                      ({selectedRun.id})
                    </span>
                  </h3>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Protocol: <span className="font-mono text-indigo-300 uppercase">{selectedRun.protocol || 'ALL'}</span> | 
                    Duration: <span className="font-mono text-slate-300">{((selectedRun.duration_seconds ?? ((selectedRun.duration_ms || 0) / 1000))).toFixed(2)}s</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded text-xs font-mono font-bold ${
                    selectedRun.status === 'PASSED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                    selectedRun.status === 'FAILED' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                    'bg-amber-950 text-amber-400'
                  }`}>
                    {selectedRun.status}
                  </span>
                </div>
              </div>

              {/* Test Breakdown Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-500 uppercase">Passed Asserts</div>
                  <div className="text-lg font-bold text-emerald-400">{selectedRun.passed_tests}</div>
                </div>
                <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-500 uppercase">Failed Asserts</div>
                  <div className="text-lg font-bold text-rose-400">{selectedRun.failed_tests}</div>
                </div>
                <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-500 uppercase">Total Tests</div>
                  <div className="text-lg font-bold text-slate-200">{selectedRun.total_tests}</div>
                </div>
              </div>

              {/* Stdout / Stderr Terminal */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Execution Output & Assertion Logs
                </div>
                <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3.5 font-mono text-[11px] text-slate-300 overflow-y-auto whitespace-pre-wrap select-all">
                  {selectedRun.stdout_log || 'No output recorded.'}
                  {selectedRun.stderr_log && (
                    <div className="mt-4 pt-4 border-t border-rose-900/40 text-rose-400">
                      [STDERR]:
                      {selectedRun.stderr_log}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              Select a test run from the list to view its execution logs and assertions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
