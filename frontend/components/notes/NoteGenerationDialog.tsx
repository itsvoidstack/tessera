"use client";

import React, { useState } from "react";
import { Sparkles, Layers, ShieldAlert, GitBranch, UserCheck, RefreshCw, X, AlertCircle } from "lucide-react";

interface NoteGenerationDialogProps {
  onGenerate: (insightType: string) => Promise<void>;
  onClose: () => void;
  repoName: string;
}

const INSIGHT_OPTIONS = [
  {
    id: "architecture",
    title: "Architecture Insight",
    desc: "Analyzes system entry points, core modules, boundaries, state patterns, and key architecture concerns.",
    icon: Layers,
    badge: "System Design",
  },
  {
    id: "quality",
    title: "Code Quality & Tech Debt",
    desc: "Identifies complex code hotspots, technical debt, consistency concerns, and refactoring opportunities.",
    icon: RefreshCw,
    badge: "Code Health",
  },
  {
    id: "security",
    title: "Security Insight",
    desc: "Evaluates security risks, severity ratings, validation patterns, and actionable remediation steps.",
    icon: ShieldAlert,
    badge: "Audit & Risk",
  },
  {
    id: "files",
    title: "Important Files Reference",
    desc: "Highlights the 5-10 most critical files in the codebase, their purpose, and key dependencies.",
    icon: GitBranch,
    badge: "Structure",
  },
  {
    id: "onboarding",
    title: "Developer Onboarding Guide",
    desc: "Explains how the codebase works, entry points, auth flow, DB access, and rules before contributing.",
    icon: UserCheck,
    badge: "Onboarding",
  },
  {
    id: "changes",
    title: "Changes Since Last Scan",
    desc: "Summarizes active modules, structural updates, and maintainability notes for codebase tracking.",
    icon: RefreshCw,
    badge: "Evolution",
  },
];

export default function NoteGenerationDialog({
  onGenerate,
  onClose,
  repoName,
}: NoteGenerationDialogProps) {
  const [selectedType, setSelectedType] = useState<string>("architecture");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleConfirm() {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      await onGenerate(selectedType);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Unable to generate insight. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 px-4 py-6 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl w-full max-w-xl p-6 relative animate-fade-in my-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-[#1a5c38]/10 dark:bg-green-500/10 text-[#1a5c38] dark:text-green-400 flex items-center justify-center">
                <Sparkles size={16} />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Generate Repository Insight
              </h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Select an engineering insight category for <strong className="text-gray-700 dark:text-gray-200">{repoName}</strong>.
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={isGenerating}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl flex items-start gap-2 text-xs text-red-700 dark:text-red-300">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {/* Insight Options List */}
        <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1 mb-6">
          {INSIGHT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = selectedType === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => !isGenerating && setSelectedType(opt.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                  isSelected
                    ? "bg-[#1a5c38]/5 dark:bg-green-950/30 border-[#1a5c38] dark:border-green-500 shadow-xs"
                    : "bg-white dark:bg-gray-800/40 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isSelected
                      ? "bg-[#1a5c38] text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  <Icon size={16} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                      {opt.title}
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium">
                      {opt.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                    {opt.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isGenerating}
            className="px-5 py-2 bg-[#1a5c38] hover:bg-[#145230] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Analyzing repository...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Generate Insight</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
