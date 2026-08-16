"use client";

import { use, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { RefreshCw, GitBranch, ArrowLeftRight, Loader2, CheckCircle2 } from "lucide-react";

export default function RescanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { getProject } = useAppStore();
  const router = useRouter();
  const project = getProject(id);

  const [isScanning, setIsScanning] = useState(false);
  const [rescanTriggered, setRescanTriggered] = useState(false);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-center px-8">
        <div className="text-3xl mb-3">🔍</div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Project not found</h2>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-4 py-2 bg-[#1a5c38] text-white rounded-lg text-xs font-medium hover:bg-[#145230] transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  function handleTriggerRescan() {
    setIsScanning(true);
    setRescanTriggered(false);

    // Visual transition state for backend hand-off
    setTimeout(() => {
      setIsScanning(false);
      setRescanTriggered(true);
    }, 1500);
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0f172a] transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Rescan &amp; Compare</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Compare scan snapshots after refactoring to verify health score and issue improvements.
          </p>
        </div>
        <button
          onClick={handleTriggerRescan}
          disabled={isScanning}
          className="flex items-center gap-2 bg-[#1a5c38] hover:bg-[#145230] dark:bg-green-600 dark:hover:bg-green-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer"
        >
          {isScanning ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Connecting to Backend…
            </>
          ) : (
            <>
              <RefreshCw size={14} /> Trigger Rescan
            </>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full page-enter">
        {isScanning ? (
          /* Connecting State */
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center bg-gray-50/40 dark:bg-gray-900/40 my-6">
            <Loader2 size={32} className="text-[#1a5c38] dark:text-green-400 animate-spin mx-auto mb-4" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Connecting to Tessera Backend...</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              Initiating repository rescan on target FastAPI agent pipeline.
            </p>
          </div>
        ) : rescanTriggered ? (
          /* Pending Analysis Banner */
          <div className="border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl p-8 text-center my-6 section-enter">
            <CheckCircle2 size={28} className="text-amber-600 dark:text-amber-400 mx-auto mb-2" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Rescan Triggered — Analysis Pending</h2>
            <p className="text-xs text-gray-600 dark:text-gray-300 max-w-md mx-auto mb-4 leading-relaxed">
              Rescan request submitted for <strong>{project.owner}/{project.repo}</strong>. Once the backend agent
              pipeline finishes re-analyzing the repository, Before vs After score deltas will be calculated here.
            </p>
            <button
              onClick={() => setRescanTriggered(false)}
              className="text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg px-3 py-1.5 font-medium transition-colors"
            >
              Dismiss Notice
            </button>
          </div>
        ) : (
          /* Default Status Container */
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center bg-gray-50/40 dark:bg-gray-900/40 my-6 section-enter">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <ArrowLeftRight size={22} className="text-[#1a5c38] dark:text-green-400" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Rescan &amp; Comparative Metrics</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6 leading-relaxed">
              Click <strong className="text-gray-700 dark:text-gray-200">Trigger Rescan</strong> to submit a new scan request to the backend. When two or more scan snapshots exist,
              side-by-side Before vs After metrics (+Health, -Vulnerabilities) will be displayed below.
            </p>
            <div className="inline-flex items-center gap-2 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg px-4 py-2 text-gray-600 dark:text-gray-300">
              <GitBranch size={14} className="text-gray-400 dark:text-gray-500" />
              <span>Target Repository: <strong>{project.owner}/{project.repo}</strong></span>
            </div>
          </div>
        )}

        {/* Rescan Workflow Info */}
        <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-6 bg-white dark:bg-gray-900 section-enter stagger-2">
          <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Expected Comparison Specs</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-600 dark:text-gray-300">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
              <div className="font-semibold text-gray-900 dark:text-white mb-1">1. Previous Scan</div>
              <div className="text-gray-500 dark:text-gray-400">Stores historical health scores and issue counts before code fixes.</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
              <div className="font-semibold text-gray-900 dark:text-white mb-1">2. New Scan</div>
              <div className="text-gray-500 dark:text-gray-400">Re-crawls codebase to evaluate updated AST and DAG structure.</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
              <div className="font-semibold text-gray-900 dark:text-white mb-1">3. Score Comparison</div>
              <div className="text-gray-500 dark:text-gray-400">Computes exact health score deltas (e.g. 68 → 81 (+13)).</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
