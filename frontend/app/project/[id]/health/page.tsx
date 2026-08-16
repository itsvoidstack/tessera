"use client";

import { use } from "react";
import { useAppStore } from "@/lib/store";
import ScoreRing from "@/components/ScoreRing";
import HealthBar from "@/components/HealthBar";
import { useRouter } from "next/navigation";
import {
  Shield, Code2, Layers, CheckCircle2, AlertTriangle,
} from "lucide-react";

export default function HealthPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { getProject } = useAppStore();
  const router = useRouter();
  const project = getProject(id);

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

  const isPending = project.healthScore === null;

  const categories = [
    { label: "Code Quality",    score: project.scores.codeQuality,    Icon: Code2         },
    { label: "Security",        score: project.scores.security,       Icon: Shield        },
    { label: "Maintainability", score: project.scores.maintainability,Icon: Layers        },
    { label: "Reliability",     score: project.scores.reliability,    Icon: CheckCircle2  },
    { label: "Performance",     score: project.scores.performance,    Icon: AlertTriangle },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-full page-enter">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Health Report</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Category evidence breakdown for {project.owner}/{project.repo}.
          </p>
        </div>
      </div>

      {isPending ? (
        /* Pending State */
        <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center bg-gray-50/40 dark:bg-gray-900/40 my-6 section-enter">
          <div className="w-14 h-14 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <CheckCircle2 size={24} className="text-amber-500 dark:text-amber-400" />
          </div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Health Report Pending Analysis</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6 leading-relaxed">
            When connected to the FastAPI backend server, the Reviewer agent will compute category scores
            (Architecture, Maintainability, Security, Testing, Documentation, Dependencies) with evidence logs.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-xl mx-auto text-left">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
              <div className="text-[10px] text-gray-400 dark:text-gray-500">Owner</div>
              <div className="text-xs font-semibold text-gray-800 dark:text-gray-100">{project.owner}</div>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
              <div className="text-[10px] text-gray-400 dark:text-gray-500">Repository</div>
              <div className="text-xs font-semibold text-gray-800 dark:text-gray-100">{project.repo}</div>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
              <div className="text-[10px] text-gray-400 dark:text-gray-500">Language</div>
              <div className="text-xs font-semibold text-gray-800 dark:text-gray-100">{project.language || "Codebase"}</div>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
              <div className="text-[10px] text-gray-400 dark:text-gray-500">Status</div>
              <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">Pending API</div>
            </div>
          </div>
        </div>
      ) : (
        /* Category Score Cards */
        <div className="section-enter">
          <div className="grid grid-cols-6 gap-3 mb-8">
            <div className="col-span-1 border border-gray-200 dark:border-gray-800 rounded-lg p-4 bg-white dark:bg-gray-900 flex flex-col items-center justify-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 text-center">Overall Score</div>
              <ScoreRing score={project.healthScore!} size={80} />
            </div>

            {categories.map(({ label, score, Icon }) => (
              <div
                key={label}
                className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 bg-white dark:bg-gray-900"
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon size={13} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{label}</div>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {score !== null ? score : "--"}
                  <span className="text-xs font-normal text-gray-400 dark:text-gray-500">/100</span>
                </div>
                <HealthBar score={score ?? 0} height={4} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
