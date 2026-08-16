"use client";

import { use, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  CheckCircle2,
  GitBranch,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { scanRepository } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";

export default function RescanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { getProject, updateProject } = useAppStore();
  const project = getProject(id);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [previousScore, setPreviousScore] = useState<number | null>(null);

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 py-24 text-center">
        <div className="mb-3 text-3xl">🔍</div>
        <h2 className="mb-1 text-base font-semibold text-gray-900 dark:text-white">
          Project not found
        </h2>
        <button
          onClick={() => router.push("/dashboard")}
          className="rounded-lg bg-[#1a5c38] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#145230]"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const currentProject = project;

  async function handleTriggerRescan() {
    setIsScanning(true);
    setError(null);
    setCompleted(false);

    const scoreBeforeScan = currentProject.healthScore;

    try {
      const result = await scanRepository(
        `https://github.com/${currentProject.owner}/${currentProject.repo}`
      );
      const scanId = `scan-${Date.now()}`;
      const scanDate = new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      updateProject(currentProject.id, {
        status: "completed",
        healthScore: result.health_score,
        scores: result.scores,
        projectSummary:
          result.ai_analysis || "Repository rescanned successfully.",
        aiAnalysis: result.ai_analysis ?? undefined,
        fileCount: result.file_count,
        lastScan: "Just now",
        scanDate,
        scanId,
        prevScore: scoreBeforeScan,
        scanHistory: [
          ...currentProject.scanHistory,
          {
            scanId,
            date: scanDate,
            version: `v${currentProject.scanHistory.length + 1}.0.0`,
            healthScore: result.health_score,
            issuesFound: 0,
            status: "completed",
          },
        ],
      });

      setPreviousScore(scoreBeforeScan);
      setCompleted(true);
    } catch (scanError) {
      setError(
        scanError instanceof Error
          ? scanError.message
          : "Unable to rescan this repository."
      );
    } finally {
      setIsScanning(false);
    }
  }

  const scoreDelta =
    completed && previousScore !== null && project.healthScore !== null
      ? project.healthScore - previousScore
      : null;

  return (
    <div className="flex h-full flex-col bg-white transition-colors dark:bg-[#0f172a]">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-8 py-5 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Rescan &amp; Compare
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Compare scan snapshots after refactoring to verify health score and issue improvements.
          </p>
        </div>
        <button
          onClick={handleTriggerRescan}
          disabled={isScanning}
          className="flex items-center gap-2 rounded-lg bg-[#1a5c38] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#145230] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-green-600 dark:hover:bg-green-700"
        >
          {isScanning ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {isScanning ? "Rescanning…" : "Trigger Rescan"}
        </button>
      </div>

      <div className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto p-8 page-enter">
        {isScanning ? (
          <StatusPanel
            icon={<Loader2 size={32} className="animate-spin" />}
            title="Rescanning repository…"
            body="Tessera is retrieving the latest source files and recalculating your codebase health metrics."
          />
        ) : completed ? (
          <div className="my-6 space-y-5">
            <div className="rounded-xl border border-green-200 bg-green-50/60 p-6 text-center dark:border-green-900/60 dark:bg-green-950/20">
              <CheckCircle2 size={28} className="mx-auto mb-2 text-green-600 dark:text-green-400" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Rescan complete</h2>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                Updated metrics for <strong>{project.owner}/{project.repo}</strong> are saved below.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Metric label="Previous health" value={previousScore === null ? "First scan" : `${previousScore}/100`} />
              <Metric label="Current health" value={project.healthScore === null ? "—" : `${project.healthScore}/100`} />
              <Metric
                label="Health change"
                value={scoreDelta === null ? "Baseline created" : `${scoreDelta >= 0 ? "+" : ""}${scoreDelta}`}
                trend={scoreDelta}
              />
            </div>
          </div>
        ) : (
          <StatusPanel
            icon={<ArrowLeftRight size={22} />}
            title="Rescan & Comparative Metrics"
            body={
              <>
                Click <strong>Trigger Rescan</strong> to analyze the latest version of this repository. Tessera saves a new snapshot and shows the health-score change here.
              </>
            }
          />
        )}

        {error && (
          <div className="my-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="my-6 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            <GitBranch size={14} className="text-gray-400" />
            <span>Target Repository: <strong>{project.owner}/{project.repo}</strong></span>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-900 dark:text-white">
            Comparison workflow
          </h3>
          <div className="grid grid-cols-1 gap-3 text-xs text-gray-600 md:grid-cols-3 dark:text-gray-300">
            <InfoCard number="1" title="Previous Scan" body="Keeps the health score from the last completed scan." />
            <InfoCard number="2" title="New Scan" body="Retrieves the latest public source files and recalculates category scores." />
            <InfoCard number="3" title="Score Comparison" body="Shows the before-and-after health score as soon as the rescan finishes." />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPanel({ icon, title, body }: { icon: ReactNode; title: string; body: ReactNode }) {
  return (
    <div className="my-6 rounded-xl border border-gray-200 bg-gray-50/40 p-12 text-center dark:border-gray-800 dark:bg-gray-900/40">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-white text-[#1a5c38] shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-green-400">
        {icon}
      </div>
      <h2 className="mb-1 text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
      <p className="mx-auto max-w-md text-xs leading-relaxed text-gray-500 dark:text-gray-400">{body}</p>
    </div>
  );
}

function Metric({ label, value, trend }: { label: string; value: string; trend?: number | null }) {
  const improving = trend !== undefined && trend !== null && trend >= 0;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 text-center dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-2 text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className="flex items-center justify-center gap-1 text-2xl font-bold text-gray-900 dark:text-white">
        {trend !== undefined && trend !== null && (improving ? <TrendingUp size={18} className="text-green-600" /> : <TrendingDown size={18} className="text-red-500" />)}
        {value}
      </div>
    </div>
  );
}

function InfoCard({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-1 font-semibold text-gray-900 dark:text-white">{number}. {title}</div>
      <div className="text-gray-500 dark:text-gray-400">{body}</div>
    </div>
  );
}
