"use client";

import { use, useState } from "react";
import { useAppStore } from "@/lib/store";
import ScoreRing from "@/components/ScoreRing";
import HealthBar from "@/components/HealthBar";
import {
  GitBranch, Terminal, Star, GitFork, AlertCircle, ExternalLink, RefreshCw, Shield, StickyNote, Activity, ChevronDown, ChevronUp, Award, Compass, MessageCircle, Sparkles, CheckCircle2, Play, ArrowRight, Layers
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

const ANALYSIS_MODULES = [
  {
    id: "audit",
    name: "Security & Vulnerability Audit",
    category: "Code Risk & Safety",
    desc: "AST static analysis for dangerous dynamic calls, unsanitized inputs, and CVE vectors.",
    route: "audit",
    icon: Shield,
    color: "text-emerald-500",
    bgLight: "bg-emerald-50 dark:bg-emerald-950/40",
  },
  {
    id: "architecture",
    name: "System Architecture & Dependency DAG",
    category: "System Structure",
    desc: "Interactive multi-layer dependency graph visualizer of files, entrypoints, and services.",
    route: "architecture",
    icon: GitBranch,
    color: "text-blue-500",
    bgLight: "bg-blue-50 dark:bg-blue-950/40",
  },
  {
    id: "judge",
    name: "Hackathon Judge Scorecard & Rubric",
    category: "Evaluation & Benchmarking",
    desc: "Strict 60-second rubric scorecard (Innovation, Execution, Working Reality) and Devpost critique.",
    route: "judge",
    icon: Award,
    color: "text-amber-500",
    bgLight: "bg-amber-50 dark:bg-amber-950/40",
  },
  {
    id: "planner",
    name: "Mind Planner & Architectural Sprints",
    category: "Ideation & Roadmapping",
    desc: "Interactive DAG node-link canvas, tech stack trade-offs matrix, DB schema, and sprint milestones.",
    route: "planner",
    icon: Compass,
    color: "text-purple-500",
    bgLight: "bg-purple-50 dark:bg-purple-950/40",
  },
  {
    id: "notes",
    name: "Developer Onboarding & Engineering Notes",
    category: "Documentation & Knowledge",
    desc: "AI onboarding guide, architectural synthesis, and personal dev notes synced to Supabase.",
    route: "notes",
    icon: StickyNote,
    color: "text-rose-500",
    bgLight: "bg-rose-50 dark:bg-rose-950/40",
  },
];

export default function OverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { getProject, updateProject } = useAppStore();
  const router = useRouter();
  const project = getProject(id);

  const [expandedSummary, setExpandedSummary] = useState(false);

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
  const summaryText = project.projectSummary || "Repository scan pending.";
  const isLongSummary = summaryText.length > 220;
  const summaryDisplay = isLongSummary && !expandedSummary
    ? summaryText.slice(0, 220) + "..."
    : summaryText;

  // Analysis completion status
  const enabledSet = project.enabledAnalyses
    ? new Set(project.enabledAnalyses)
    : new Set(["audit", "architecture"]); // default baseline

  const missedModules = ANALYSIS_MODULES.filter((m) => !enabledSet.has(m.id));

  const handleRunMissedAnalysis = (moduleId: string, route: string) => {
    const currentEnabled = project.enabledAnalyses || ["audit", "architecture"];
    const currentCompleted = project.completedAnalyses || ["audit", "architecture"];
    const updatedEnabled = Array.from(new Set([...currentEnabled, moduleId]));
    const updatedCompleted = Array.from(new Set([...currentCompleted, moduleId]));

    updateProject(project.id, {
      enabledAnalyses: updatedEnabled,
      completedAnalyses: updatedCompleted,
    });

    router.push(`/project/${project.id}/${route}`);
  };

  const handleRunAllMissed = () => {
    const allIds = ANALYSIS_MODULES.map((m) => m.id);
    updateProject(project.id, {
      enabledAnalyses: allIds,
      completedAnalyses: allIds,
    });

    if (missedModules.length > 0) {
      router.push(`/project/${project.id}/${missedModules[0].route}`);
    }
  };

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
            href={`/project/${project.id}/assistant`}
            className="flex items-center gap-1.5 border border-blue-300 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/40 rounded-lg px-3 py-1.5 text-xs font-semibold text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/70 transition-colors shadow-sm"
          >
            <MessageCircle size={13} className="text-blue-600 dark:text-blue-400" />
            Ask Tessera
          </Link>
          <Link
            href={`/project/${project.id}/planner`}
            className="flex items-center gap-1.5 border border-emerald-300 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-lg px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 transition-colors shadow-sm"
          >
            <Compass size={13} className="text-emerald-600 dark:text-emerald-400" />
            Mind Planner
          </Link>
          <Link
            href={`/project/${project.id}/judge`}
            className="flex items-center gap-1.5 border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 rounded-lg px-3 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/70 transition-colors shadow-sm"
          >
            <Award size={13} className="text-amber-600 dark:text-amber-400" />
            Judge Mode
          </Link>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 section-enter stagger-2">
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

        {/* Collapsible Project Status Summary Card */}
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-5 bg-white dark:bg-gray-900 flex flex-col justify-between">
          <div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Project Status
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-2 whitespace-pre-line">
              {summaryDisplay}
            </p>
            {isLongSummary && (
              <button
                onClick={() => setExpandedSummary((exp) => !exp)}
                className="text-xs text-[#1a5c38] dark:text-green-400 font-semibold hover:underline mb-4 inline-flex items-center gap-1 cursor-pointer"
              >
                {expandedSummary ? (
                  <>
                    Collapse analysis <ChevronUp size={12} />
                  </>
                ) : (
                  <>
                    View full analysis <ChevronDown size={12} />
                  </>
                )}
              </button>
            )}
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

      {/* =========================================================
          MODULAR ANALYSIS STATUS & ON-DEMAND EXECUTION SECTION
      ========================================================= */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-6 bg-white dark:bg-gray-900 mb-8 section-enter stagger-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 mb-5 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Analysis Modules & On-Demand Capabilities
              </h2>
              <span className="text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full px-2.5 py-0.5">
                {ANALYSIS_MODULES.length - missedModules.length} of {ANALYSIS_MODULES.length} Active
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Run any analysis modules that were skipped during the initial scan. Tessera and Gemini will synthesize insights on-demand.
            </p>
          </div>

          {missedModules.length > 0 && (
            <button
              onClick={handleRunAllMissed}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Sparkles size={13} />
              Run All Missed Analyses ({missedModules.length})
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ANALYSIS_MODULES.map((module) => {
            const isAnalyzed = enabledSet.has(module.id);
            const Icon = module.icon;

            return (
              <div
                key={module.id}
                className={`flex flex-col justify-between p-4 rounded-xl border transition-all ${
                  isAnalyzed
                    ? "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 shadow-xs hover:border-emerald-500/40"
                    : "border-dashed border-amber-300 dark:border-amber-800/60 bg-amber-50/20 dark:bg-amber-950/10"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg ${module.bgLight} flex items-center justify-center flex-shrink-0`}>
                        <Icon size={16} className={module.color} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1">
                          {module.name}
                        </div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500">
                          {module.category}
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                    {module.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                  {isAnalyzed ? (
                    <>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 size={12} />
                        Analyzed & Ready
                      </span>
                      <Link
                        href={`/project/${project.id}/${module.route}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#1a5c38] dark:text-green-400 hover:underline"
                      >
                        View <ArrowRight size={12} />
                      </Link>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 px-2 py-0.5 rounded-md">
                        Skipped in Scan
                      </span>
                      <button
                        onClick={() => handleRunMissedAnalysis(module.id, module.route)}
                        className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-2.5 py-1 transition-colors cursor-pointer shadow-xs"
                      >
                        <Sparkles size={11} />
                        Run with Gemini
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Secondary Fast Access Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 section-enter stagger-4">
        {[
          { label: "Architecture Map", desc: "View module DAG",        href: `/project/${id}/architecture`, Icon: GitBranch },
          { label: "AI Code Audit",   desc: "View detected issues",   href: `/project/${id}/audit`,        Icon: Shield    },
          { label: "Codebase Notes",  desc: "Student learning notes", href: `/project/${id}/notes`,        Icon: StickyNote },
          { label: "Health Report",   desc: "Full category evidence", href: `/project/${id}/health`,       Icon: Activity  },
        ].map((nav) => (
          <Link
            key={nav.label}
            href={nav.href}
            className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 bg-white dark:bg-gray-900 hover:border-[#1a5c38] dark:hover:border-green-500 hover:shadow-xs transition-all group"
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
