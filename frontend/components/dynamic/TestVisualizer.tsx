"use client";

import { useState } from "react";
import { TestRun, TestResultItem } from "@/types";
import { CheckCircle2, XCircle, AlertTriangle, MinusCircle, ShieldCheck, Clock } from "lucide-react";

interface TestVisualizerProps {
  run: TestRun;
}

export default function TestVisualizer({ run }: TestVisualizerProps) {
  const [selectedLang, setSelectedLang] = useState<string>("all");

  const filtered = (run.results || []).filter(
    (r) => selectedLang === "all" || r.language.toLowerCase() === selectedLang.toLowerCase()
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PASSED":
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case "FAILED":
        return <XCircle className="w-4 h-4 text-rose-400" />;
      case "UNSUPPORTED":
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      default:
        return <MinusCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  const passPct = run.total_tests > 0 ? Math.round((run.passed_tests / run.total_tests) * 100) : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-6">
      {/* Header and Summary Cards */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" /> Test Run: {run.id}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
            Target: {(run.target_language || run.language || 'ALL').toUpperCase()} • Started: {run.started_at ? new Date(run.started_at).toLocaleString() : (run.created_at ? new Date(run.created_at).toLocaleString() : 'N/A')}
          </p>
        </div>

        <div className="flex items-center gap-4 text-sm font-semibold">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" /> {run.passed_tests} Passed
          </div>
          <div className="flex items-center gap-1.5 text-rose-400">
            <XCircle className="w-4 h-4" /> {run.failed_tests} Failed
          </div>
          <div className="flex items-center gap-1.5 text-amber-400">
            <AlertTriangle className="w-4 h-4" /> {run.skipped_tests || 0} Skipped
          </div>
          <div className="flex items-center gap-1 text-muted-foreground font-mono text-xs">
            <Clock className="w-3.5 h-3.5" /> {((run.duration_ms || (run.duration_seconds ? run.duration_seconds * 1000 : 0)) / 1000).toFixed(2)}s
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden flex">
        <div className="bg-emerald-500 h-full" style={{ width: `${passPct}%` }} />
        <div
          className="bg-rose-500 h-full"
          style={{ width: `${run.total_tests > 0 ? (run.failed_tests / run.total_tests) * 100 : 0}%` }}
        />
        <div
          className="bg-amber-500 h-full"
          style={{ width: `${run.total_tests > 0 ? ((run.skipped_tests || 0) / run.total_tests) * 100 : 0}%` }}
        />
      </div>

      {/* Language Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {["all", "python", "node", "golang", "dart", "dotnet", "kotlin"].map((lang) => (
          <button
            key={lang}
            onClick={() => setSelectedLang(lang)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize border transition-all ${
              selectedLang === lang
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-secondary-foreground border-border hover:bg-muted"
            }`}
          >
            {lang}
          </button>
        ))}
      </div>

      {/* Test Results Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-950 text-muted-foreground uppercase border-b border-border">
            <tr>
              <th className="p-3">Status</th>
              <th className="p-3">Language</th>
              <th className="p-3">Protocol</th>
              <th className="p-3">Test Scenario</th>
              <th className="p-3">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground italic">
                  No tests matching the selected filter.
                </td>
              </tr>
            ) : (
              filtered.map((item, idx) => (
                <tr key={idx} className="hover:bg-muted/40 transition-colors">
                  <td className="p-3 flex items-center gap-1.5 font-bold">
                    {getStatusIcon(item.status)}
                    <span>{item.status}</span>
                  </td>
                  <td className="p-3 capitalize">{item.language}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-white/5 font-semibold text-cyan-400">
                      {item.protocol}
                    </span>
                  </td>
                  <td className="p-3 font-medium text-foreground">
                    {item.test_name}
                    {item.error_message && (
                      <div className="text-[11px] text-rose-400 mt-1 font-sans">{item.error_message}</div>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground">{item.duration_ms}ms</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { TestVisualizer };
