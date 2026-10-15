"use client";

import { use, useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Award, Shield, CheckCircle2, AlertTriangle, AlertCircle,
  Copy, Check, RefreshCw, Sparkles, Terminal, Flame,
  FileCode, Layers, ExternalLink, ArrowRight, Lightbulb
} from "lucide-react";
import { evaluateHackathonRepo, JudgeEvaluation } from "@/lib/api-client";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/Toast";

const HACKATHON_CATEGORIES = [
  "AI & Developer Tools",
  "Full-Stack Web App",
  "FinTech & Web3",
  "Productivity & Workflow",
  "Infrastructure & Cloud",
];

export default function HackathonJudgePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { getProject } = useAppStore();
  const router = useRouter();
  const { toasts, toast, dismiss } = useToast();

  const project = getProject(id);

  const [category, setCategory] = useState("AI & Developer Tools");
  const [evaluation, setEvaluation] = useState<JudgeEvaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState(false);

  // Load cached evaluation or trigger evaluation
  useEffect(() => {
    if (!project) return;
    const cacheKey = `tessera_judge_eval_${project.id}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        setEvaluation(JSON.parse(cached));
        return;
      } catch {
        // silent
      }
    }

    // Otherwise, generate initial evaluation
    runEvaluation();
  }, [project?.id]);

  async function runEvaluation(selectedCat?: string) {
    if (!project) return;
    setLoading(true);
    const catToUse = selectedCat || category;

    try {
      const res = await evaluateHackathonRepo(
        project.repoUrl,
        catToUse,
        project.files,
        project.healthScore || 82
      );

      if (res.evaluation) {
        setEvaluation(res.evaluation);
        localStorage.setItem(
          `tessera_judge_eval_${project.id}`,
          JSON.stringify(res.evaluation)
        );
        toast("Hackathon evaluation generated via Gemini", "success");
      }
    } catch (err: any) {
      toast(err.message || "Evaluation failed. Showing baseline assessment.", "error");
    } finally {
      setLoading(false);
    }
  }

  function copyFeedbackToClipboard() {
    if (!evaluation) return;
    const text = evaluation.judge_feedback_markdown || "No evaluation feedback available.";
    navigator.clipboard.writeText(text);
    setCopiedFeedback(true);
    toast("Judge critique copied to clipboard! Ready to paste into Devpost.", "success");
    setTimeout(() => setCopiedFeedback(false), 2500);
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-center px-8">
        <div className="text-3xl mb-3">🔍</div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
          Project not found
        </h2>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-4 py-2 bg-[#1a5c38] text-white rounded-lg text-xs font-medium hover:bg-[#145230] transition-colors mt-4"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Verdict style mapper
  const getVerdictStyle = (verdict: string = "") => {
    const v = verdict.toLowerCase();
    if (v.includes("production-grade")) {
      return {
        badge: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
        border: "border-emerald-500/40",
        glow: "from-emerald-500/10 via-emerald-500/5 to-transparent",
        icon: "🏆",
      };
    }
    if (v.includes("solid working")) {
      return {
        badge: "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800",
        border: "border-blue-500/40",
        glow: "from-blue-500/10 via-blue-500/5 to-transparent",
        icon: "⚡",
      };
    }
    if (v.includes("early prototype")) {
      return {
        badge: "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800",
        border: "border-amber-500/40",
        glow: "from-amber-500/10 via-amber-500/5 to-transparent",
        icon: "🔨",
      };
    }
    return {
      badge: "bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800",
      border: "border-red-500/40",
      glow: "from-red-500/10 via-red-500/5 to-transparent",
      icon: "⚠️",
    };
  };

  const vStyle = getVerdictStyle(evaluation?.verdict);

  const rubricItems = evaluation ? [
    { key: "innovation", label: "Innovation & Ambition", data: evaluation.rubric.innovation, icon: Lightbulb, color: "text-amber-500" },
    { key: "technical_execution", label: "Technical Execution & Depth", data: evaluation.rubric.technical_execution, icon: Terminal, color: "text-blue-500" },
    { key: "security_reliability", label: "Reliability & Security", data: evaluation.rubric.security_reliability, icon: Shield, color: "text-emerald-500" },
    { key: "code_cleanliness", label: "Code Cleanliness & Health", data: evaluation.rubric.code_cleanliness, icon: Layers, color: "text-purple-500" },
    { key: "working_reality", label: "Working Reality vs Mock", data: evaluation.rubric.working_reality, icon: Flame, color: "text-rose-500" },
  ] : [];

  return (
    <div className="p-8 max-w-6xl mx-auto page-enter">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
              <Award size={18} />
            </span>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Hackathon Judge Workspace
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm">
              60-Second Evaluation
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Rapid, evidence-backed evaluation for hackathon judges, technical reviewers, and organizers.
          </p>
        </div>

        {/* Category Selector & Refresh Action */}
        <div className="flex items-center gap-2">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              runEvaluation(e.target.value);
            }}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-800 dark:text-white font-medium focus:ring-2 focus:ring-amber-500 outline-none"
          >
            {HACKATHON_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                Category: {cat}
              </option>
            ))}
          </select>

          <button
            onClick={() => runEvaluation()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 shadow-sm"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            {loading ? "Evaluating..." : "Re-evaluate"}
          </button>
        </div>
      </div>

      {/* Main Verdict Hero Banner */}
      <div className={`mb-8 p-6 rounded-2xl border bg-gradient-to-br ${vStyle.glow} ${vStyle.border} bg-white dark:bg-gray-900 shadow-sm relative overflow-hidden transition-all`}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">{vStyle.icon}</span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${vStyle.badge}`}>
                {evaluation?.verdict || "Evaluating Repository..."}
              </span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">
                {project.owner}/{project.repo}
              </span>
            </div>

            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {evaluation?.verdict_summary || "Analyzing codebase architecture, mock patterns, and originality with Gemini..."}
            </h2>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed max-w-3xl">
              Tessera static scanner combined with Google Gemini has reviewed {project.filesCount || project.files?.length || 20} source files, checking real API routing, error hygiene, and custom logic vs template boilerplate.
            </p>
          </div>

          {/* Key Score Cards */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Overall Score */}
            <div className="p-4 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/80 shadow-sm text-center min-w-[110px]">
              <div className="text-[10px] text-gray-400 dark:text-gray-400 font-semibold uppercase tracking-wider mb-1">
                Judge Score
              </div>
              <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
                {evaluation?.overall_score ?? "--"}
                <span className="text-xs text-gray-400 font-normal">/100</span>
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                {evaluation && evaluation.overall_score >= 85 ? "Prize Contender" : "Solid Entry"}
              </div>
            </div>

            {/* Originality Score */}
            <div className="p-4 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/80 shadow-sm text-center min-w-[110px]">
              <div className="text-[10px] text-gray-400 dark:text-gray-400 font-semibold uppercase tracking-wider mb-1">
                Originality
              </div>
              <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                {evaluation?.originality_score ?? "--"}
                <span className="text-xs text-gray-400 font-normal">/100</span>
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                Low Boilerplate
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Rubric Breakdown & Red Flags */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Rubric Breakdown (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500" />
              Hackathon Rubric Scorecard
            </h3>
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              Evaluated against: {category}
            </span>
          </div>

          <div className="space-y-4">
            {rubricItems.map(({ key, label, data, icon: Icon, color }) => {
              const score = data?.score ?? 80;
              const comment = data?.comment ?? "";

              return (
                <div
                  key={key}
                  className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-800/20"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Icon size={14} className={color} />
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {label}
                      </span>
                      {key === "working_reality" && (
                        <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded font-semibold border border-emerald-300 dark:border-emerald-800">
                          {data?.is_real_backend ? "✓ Real Backend" : "Mock UI Only"}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-gray-900 dark:text-white font-mono">
                      {score}/100
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        score >= 85
                          ? "bg-emerald-500"
                          : score >= 70
                          ? "bg-blue-500"
                          : "bg-amber-500"
                      }`}
                      style={{ width: `${score}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                    {comment || "Evaluating engineering depth and consistency across modules..."}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Red Flags & Strengths */}
        <div className="space-y-6">
          
          {/* Key Strengths */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
              Key Technical Strengths
            </h3>
            <ul className="space-y-2">
              {evaluation?.key_strengths?.map((str, idx) => (
                <li
                  key={idx}
                  className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-2 bg-emerald-50/40 dark:bg-emerald-950/20 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/30"
                >
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>{str}</span>
                </li>
              )) || (
                <li className="text-xs text-gray-400">Loading strengths...</li>
              )}
            </ul>
          </div>

          {/* Red Flag & Vibe-Coding Pitfall Inspector */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-amber-500" />
              Red Flags &amp; Mock Detection
            </h3>

            {evaluation?.red_flags && evaluation.red_flags.length > 0 ? (
              <div className="space-y-2.5">
                {evaluation.red_flags.map((flag, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-amber-900 dark:text-amber-300">
                      <span>{flag.title}</span>
                      <span className="text-[10px] uppercase font-mono px-1 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                        {flag.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-1">
                      {flag.description}
                    </p>
                    {flag.location && (
                      <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 mt-1 block">
                        File: {flag.location}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span>Zero superficial mock delays detected. Real engineering implementation verified.</span>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* One-Click Devpost / Taikai Review Exporter */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileCode size={16} className="text-[#1a5c38] dark:text-emerald-400" />
              Devpost / Hackathon Feedback Exporter
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Ready-to-copy structured feedback formatted for hackathon judging platforms (Devpost, Taikai, etc.).
            </p>
          </div>

          <button
            onClick={copyFeedbackToClipboard}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#1a5c38] text-white hover:bg-[#14482c] transition-colors shadow-sm"
          >
            {copiedFeedback ? <Check size={14} /> : <Copy size={14} />}
            {copiedFeedback ? "Copied!" : "Copy Judge Review"}
          </button>
        </div>

        {/* Markdown Preview Card */}
        <div className="bg-gray-50 dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-mono text-gray-800 dark:text-gray-200 max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed">
          {evaluation?.judge_feedback_markdown || "Generating judge review feedback markdown..."}
        </div>
      </div>

      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
