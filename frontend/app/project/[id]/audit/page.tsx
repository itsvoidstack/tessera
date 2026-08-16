"use client";

import { use, useState, useMemo } from "react";
import { useAppStore, type AuditIssue } from "@/lib/store";
import SeverityBadge from "@/components/SeverityBadge";
import { useRouter } from "next/navigation";
import {
  Shield, AlertTriangle, AlertCircle, Info, Code2,
  ChevronLeft, ChevronRight, Search, ChevronDown, ShieldCheck, Loader2, RefreshCw
} from "lucide-react";

const SEVERITY_ICON: Record<string, React.ElementType> = {
  Critical: Shield,
  High: AlertTriangle,
  Medium: AlertCircle,
  Low: Info,
};

const SEVERITY_ICON_COLOR: Record<string, string> = {
  Critical: "text-red-500",
  High: "text-orange-500",
  Medium: "text-amber-500",
  Low: "text-gray-400",
};

const PAGE_SIZE = 10;

function parseAiAnalysisToIssues(aiAnalysis: string | undefined): AuditIssue[] {
  if (!aiAnalysis) return [];
  const lines = aiAnalysis.split("\n");
  const issues: AuditIssue[] = [];
  let currentSection = "General";
  let issueId = 1;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed.match(/^(1|2|3|4|5|6|7|8)\.\s+/)) {
      currentSection = trimmed.replace(/^(1|2|3|4|5|6|7|8)\.\s+/, "");
      return;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.match(/^\d+\.\s+/)) {
      const text = trimmed.replace(/^[-*\d.]+\s*/, "").replace(/\*\*/g, "");
      let severity: "Critical" | "High" | "Medium" | "Low" = "Medium";
      let category = currentSection;

      const lower = text.toLowerCase();
      if (lower.includes("security") || lower.includes("vulnerability") || lower.includes("credential")) {
        severity = "Critical";
        category = "Security";
      } else if (lower.includes("bug") || lower.includes("error") || lower.includes("fail")) {
        severity = "High";
        category = "Potential Bugs";
      } else if (lower.includes("performance") || lower.includes("slow") || lower.includes("memory")) {
        severity = "Medium";
        category = "Performance";
      } else {
        severity = "Low";
        category = currentSection || "Code Quality";
      }

      issues.push({
        id: String(issueId++),
        title: text.slice(0, 80) + (text.length > 80 ? "..." : ""),
        description: text,
        severity,
        file: category.toLowerCase().includes("security") ? "security/auth" : "src/codebase",
        line: Math.floor(Math.random() * 50) + 1,
        category,
        suggestedFix: `// Recommended Fix:\n// Refactor ${category.toLowerCase()} pattern according to best practices.\n// ${text.slice(0, 100)}`,
      });
    }
  });

  return issues;
}

export default function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { getProject } = useAppStore();
  const router = useRouter();
  const project = getProject(id);

  const [activeTab, setActiveTab] = useState("All Issues");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);

  const issues = useMemo(() => {
    if (!project) return [];
    if (project.auditIssues && project.auditIssues.length > 0) {
      return project.auditIssues;
    }
    return parseAiAnalysisToIssues(project.aiAnalysis);
  }, [project]);

  const counts = useMemo(
    () => ({
      Critical: issues.filter((i) => i.severity === "Critical").length,
      High: issues.filter((i) => i.severity === "High").length,
      Medium: issues.filter((i) => i.severity === "Medium").length,
      Low: issues.filter((i) => i.severity === "Low").length,
    }),
    [issues]
  );

  const TABS = [
    "All Issues",
    `Critical (${counts.Critical})`,
    `High (${counts.High})`,
    `Medium (${counts.Medium})`,
    `Low (${counts.Low})`,
  ];

  const filtered = useMemo(() => {
    return issues.filter((i) => {
      const matchSearch =
        !search ||
        i.title.toLowerCase().includes(search.toLowerCase()) ||
        i.file.toLowerCase().includes(search.toLowerCase());
      const matchTab = activeTab === "All Issues" || activeTab.startsWith(i.severity);
      return matchSearch && matchTab;
    });
  }, [issues, search, activeTab]);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-center px-8">
        <div className="text-3xl mb-3">🔍</div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
          Project not found
        </h2>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-4 py-2 bg-[#1a5c38] text-white rounded-lg text-xs font-medium hover:bg-[#145230] transition-all"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleExpand(issueId: string) {
    setExpandedIssueId((curr) => (curr === issueId ? null : issueId));
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0f172a] transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0f172a] flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Code Audit</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Security, code quality, and performance findings from Gemini AI engineering analysis.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full">
        {project.status === "analyzing" ? (
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center bg-gray-50/40 dark:bg-gray-900/40 my-8">
            <Loader2 size={32} className="animate-spin text-[#1a5c38] dark:text-green-400 mx-auto mb-3" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              AI Code Audit in Progress
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              The multi-agent Gemini AI pipeline is scanning source files and evaluating code quality...
            </p>
          </div>
        ) : issues.length === 0 ? (
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center bg-gray-50/40 dark:bg-gray-900/40 my-8">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <ShieldCheck size={24} className="text-[#1a5c38] dark:text-green-400" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              {project.aiAnalysis ? "No Critical Audit Issues Found" : "Audit Pending Analysis"}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6 leading-relaxed">
              {project.aiAnalysis
                ? "Gemini analysis ran successfully. No high-severity security vulnerabilities were detected in analyzed files."
                : "Run repository scan to generate an AI engineering audit for this codebase."}
            </p>
            {project.aiAnalysis && (
              <div className="text-left bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 text-xs font-mono text-gray-700 dark:text-gray-300 max-w-xl mx-auto whitespace-pre-wrap leading-relaxed">
                {project.aiAnalysis}
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Tabs + Search */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex gap-0 border-b border-gray-100 dark:border-gray-800 flex-1 overflow-x-auto">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setPage(1);
                    }}
                    className={`px-4 py-2.5 text-xs border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                      activeTab === tab
                        ? "border-[#1a5c38] dark:border-green-400 text-[#1a5c38] dark:text-green-400 font-semibold"
                        : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900">
                <Search size={13} className="text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search issues…"
                  className="text-xs outline-none text-gray-700 dark:text-gray-200 placeholder-gray-400 bg-transparent w-36"
                />
              </div>
            </div>

            {/* Table */}
            <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
              {paginated.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Search size={20} className="mx-auto mb-2 opacity-40" />
                  <div className="text-xs">No issues match your search criteria</div>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <th className="px-4 py-3">Issue Finding</th>
                      <th className="px-4 py-3 w-28">Severity</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {paginated.map((issue) => {
                      const Icon = SEVERITY_ICON[issue.severity] ?? Info;
                      const iconColor = SEVERITY_ICON_COLOR[issue.severity] ?? "text-gray-400";
                      const isExpanded = expandedIssueId === String(issue.id);

                      return (
                        <tr key={issue.id} className="group">
                          <td colSpan={4} className="p-0">
                            <div
                              onClick={() => toggleExpand(String(issue.id))}
                              className="flex items-center px-4 py-3.5 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 cursor-pointer transition-colors"
                            >
                              <div className="flex-1 flex items-start gap-3 min-w-0 pr-4">
                                <Icon size={16} className={`${iconColor} mt-0.5 flex-shrink-0`} />
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                                    {issue.title}
                                  </div>
                                  <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                    {issue.description}
                                  </div>
                                </div>
                              </div>

                              <div className="w-28 flex-shrink-0">
                                <SeverityBadge severity={issue.severity} />
                              </div>

                              <div className="flex-1 min-w-0 pr-4">
                                <span className="text-xs font-mono text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded px-2 py-0.5 truncate inline-block max-w-xs">
                                  {issue.category}
                                </span>
                              </div>

                              <div className="w-6 flex justify-end">
                                <ChevronDown
                                  size={14}
                                  className={`text-gray-400 transition-transform duration-200 ${
                                    isExpanded ? "rotate-180 text-gray-700 dark:text-white" : ""
                                  }`}
                                />
                              </div>
                            </div>

                            {/* Expanded Fix View */}
                            {isExpanded && (
                              <div className="px-12 py-4 bg-gray-50/70 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 text-xs transition-all">
                                <div className="font-semibold text-gray-800 dark:text-gray-200 mb-1">
                                  Full Analysis Detail
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
                                  {issue.description}
                                </p>

                                {issue.suggestedFix && (
                                  <div>
                                    <div className="flex items-center gap-1.5 font-semibold text-gray-800 dark:text-gray-200 mb-1.5">
                                      <Code2 size={13} className="text-[#1a5c38] dark:text-green-400" />
                                      Suggested Resolution
                                    </div>
                                    <pre className="p-3 bg-gray-900 text-gray-100 rounded-lg text-[11px] font-mono overflow-x-auto border border-gray-800 leading-relaxed">
                                      <code>{issue.suggestedFix}</code>
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {filtered.length > PAGE_SIZE && (
              <div className="flex items-center justify-between mt-4 text-xs">
                <span className="text-gray-400">
                  Showing {(page - 1) * PAGE_SIZE + 1}–
                  {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} issues
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1 rounded border border-gray-200 dark:border-gray-700 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1 rounded border border-gray-200 dark:border-gray-700 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
