"use client";

import { use } from "react";
import { useAppStore } from "@/lib/store";
import ScoreRing from "@/components/ScoreRing";
import HealthBar from "@/components/HealthBar";
import {
  GitBranch, Terminal, Star, GitFork, AlertCircle, ExternalLink, RefreshCw, Shield, StickyNote, Activity,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const SCORE_LABELS = [
  { key: "architecture"  as const, label: "Architecture" },
  { key: "codeQuality"   as const, label: "Code Quality" },
  { key: "security"      as const, label: "Security" },
  { key: "testing"       as const, label: "Testing" },
  { key: "documentation" as const, label: "Documentation" },
  { key: "dependencies"  as const, label: "Dependencies" },
] as const;

export default function OverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { getProject } = useAppStore();
  const router = useRouter();
  const project = getProject(id);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-center px-8">
        <div className="text-3xl mb-3">🔍</div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Project not found</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
          This project doesn&apos;t exist or was removed.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-4 py-2 bg-[#1a5c38] text-white rounded-lg text-xs font-medium hover:bg-[#145230] transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const isPending = project.healthScore === null;

  return (
    <div className="p-8 max-w-6xl mx-auto page-enter">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
            <a
              href={`https://github.com/${project.owner}/${project.repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1 transition-colors"
            >
              <ExternalLink size={12} />
              GitHub
            </a>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{project.description || "Public GitHub Repository"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/scan?project=${project.id}`}
            className="flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw size={13} /> Trigger Rescan
          </Link>
        </div>
      </div>

      {/* Real GitHub Metadata Strip */}
      <div className="grid grid-cols-4 gap-4 mb-6 section-enter stagger-1">
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <Star size={14} className="text-amber-500" />
            <span>Stars</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">{project.stars.toLocaleString()}</div>
        </div>

        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <GitFork size={14} className="text-blue-500" />
            <span>Forks</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">{project.forks.toLocaleString()}</div>
        </div>

        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <AlertCircle size={14} className="text-gray-400 dark:text-gray-500" />
            <span>Open Issues</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">{project.openIssuesCount.toLocaleString()}</div>
        </div>

        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <Terminal size={14} className="text-[#1a5c38] dark:text-green-400" />
            <span>Primary Language</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white truncate">{project.language || "Codebase"}</div>
        </div>
      </div>

      {/* Main Health / Backend Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 section-enter stagger-2">
        {/* Health Score Card */}
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-5 bg-white dark:bg-gray-900">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
            Overall Health Score
          </div>

          {isPending ? (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center mb-3">
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">--</span>
              </div>
              <span className="inline-block bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-full px-3 py-1 text-xs font-medium mb-2">
                Analysis Pending
              </span>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 max-w-[200px]">
                Health score will compute automatically when FastAPI backend runs analysis.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <ScoreRing score={project.healthScore!} size={80} />
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white leading-none mb-1">
                  {project.healthScore}
                </div>
                <div className="text-xs font-semibold text-[#1a5c38] dark:text-green-400">
                  {project.healthScore! >= 80 ? "Good" : project.healthScore! >= 60 ? "Fair" : "Needs Work"}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Category Breakdown Card */}
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-5 bg-white dark:bg-gray-900">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Category Breakdown
          </div>
          <div className="space-y-3">
            {SCORE_LABELS.map(({ key, label }) => {
              const val = project.scores[key];
              return (
                <div key={key} className="flex items-center gap-3">
                  <div className="text-xs text-gray-600 dark:text-gray-300 w-24 flex-shrink-0">{label}</div>
                  <div className="flex-1">
                    <HealthBar score={val ?? 0} height={5} />
                  </div>
                  <div className="text-xs font-medium text-gray-400 dark:text-gray-500 w-8 text-right">
                    {val !== null ? val : "--"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary Card */}
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-5 bg-white dark:bg-gray-900 flex flex-col justify-between">
          <div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Project Status
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              {project.projectSummary}
            </p>
          </div>

          <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex justify-between">
              <span>Owner:</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">{project.owner}</span>
            </div>
            <div className="flex justify-between">
              <span>Repository:</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">{project.repo}</span>
            </div>
            <div className="flex justify-between">
              <span>Last Commit:</span>
              <span className="text-gray-700 dark:text-gray-300">{project.lastCommit}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 section-enter stagger-3">
        {[
          { label: "Architecture Map", desc: "View module DAG",        href: `/project/${id}/architecture`, Icon: GitBranch },
          { label: "AI Code Audit",   desc: "View detected issues",   href: `/project/${id}/audit`,        Icon: Shield    },
          { label: "Codebase Notes",  desc: "Student learning notes", href: `/project/${id}/notes`,        Icon: StickyNote },
          { label: "Health Report",   desc: "Full category evidence", href: `/project/${id}/health`,       Icon: Activity  },
        ].map((nav) => (
          <Link
            key={nav.label}
            href={nav.href}
            className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 bg-white dark:bg-gray-900 hover:border-[#1a5c38] dark:hover:border-green-500 hover:shadow-sm transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center mb-3 group-hover:bg-green-50 dark:group-hover:bg-green-950/40 transition-colors">
              <nav.Icon size={16} className="text-gray-700 dark:text-gray-300 group-hover:text-[#1a5c38] dark:group-hover:text-green-400 transition-colors" />
            </div>
            <div className="text-xs font-semibold text-gray-900 dark:text-white mb-0.5 group-hover:text-[#1a5c38] dark:group-hover:text-green-400 transition-colors">
              {nav.label}
            </div>
            <div className="text-[11px] text-gray-400 dark:text-gray-500">{nav.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
