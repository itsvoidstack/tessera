"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppTopBar from "@/components/AppTopBar";
import Sidebar from "@/components/Sidebar";
import Toast from "@/components/Toast";
import PageTransition from "@/components/PageTransition";
import { useToast } from "@/hooks/useToast";
import { useAppStore, Project } from "@/lib/store";
import { validateGitHubRepo } from "@/lib/api-client";
import {
  Plus, Search, MoreHorizontal, ArrowRight, LayoutGrid, List,
  ExternalLink, Trash2, RefreshCw, X, GitBranch, AlertCircle, Loader2, Star, GitFork,
} from "lucide-react";
import GitHubIcon from "@/components/GitHubIcon";

type SortKey = "lastScan" | "health" | "name";
type ViewMode = "grid" | "list";

export default function DashboardPage() {
  const router = useRouter();
  const { toasts, toast, dismiss } = useToast();
  const { projects, deleteProject } = useAppStore();

  const [search, setSearch]               = useState("");
  const [sort, setSort]                   = useState<SortKey>("lastScan");
  const [view, setView]                   = useState<ViewMode>("grid");
  const [showAddModal, setShowAddModal]   = useState(false);
  const [newRepoInput, setNewRepoInput]   = useState("");
  const [isValidating, setIsValidating]   = useState(false);
  const [modalError, setModalError]       = useState<string | null>(null);
  const [menuOpen, setMenuOpen]           = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = projects.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.repoUrl.toLowerCase().includes(search.toLowerCase())
    );
    if (sort === "health") list = [...list].sort((a, b) => (b.healthScore ?? 0) - (a.healthScore ?? 0));
    if (sort === "name")   list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [projects, search, sort]);

  async function handleAddRepository() {
    const raw = newRepoInput.trim();
    if (!raw) {
      setModalError("Please enter a GitHub repository URL or owner/repository.");
      return;
    }

    setModalError(null);
    setIsValidating(true);

    try {
      const res = await validateGitHubRepo(raw);
      if (!res.valid || !res.meta) {
        setModalError(res.error || "Repository not found on GitHub. Please check spelling.");
        setIsValidating(false);
        return;
      }

      setIsValidating(false);
      setShowAddModal(false);
      setNewRepoInput("");
      router.push(`/scan?repo=${encodeURIComponent(res.meta.htmlUrl)}`);
    } catch {
      setModalError("Failed to validate repository.");
      setIsValidating(false);
    }
  }

  function handleDelete(id: string) {
    deleteProject(id);
    setDeleteConfirm(null);
    setMenuOpen(null);
    toast("Project removed.", "success");
  }

  function handleRescan(id: string) {
    setMenuOpen(null);
    router.push(`/scan?project=${id}`);
  }

  // ── Grid Card ─────────────────────────────────────────────────────────────
  const ProjectCard = ({ project: p }: { project: Project }) => (
    <div
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5 hover-card-lift transition-all relative flex flex-col justify-between"
      onClick={(e) => e.stopPropagation()}
    >
      <div>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: p.color }}
            >
              {p.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{p.name}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{p.repoUrl}</div>
            </div>
          </div>
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === p.id ? null : p.id); }}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 cursor-pointer active:scale-[0.98] transition-transform"
            >
              <MoreHorizontal size={16} />
            </button>
            {menuOpen === p.id && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg z-20 overflow-hidden">
                <Link
                  href={`/project/${p.id}/overview`}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => setMenuOpen(null)}
                >
                  <ArrowRight size={13} /> Open Project
                </Link>
                <button
                  onClick={() => handleRescan(p.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-left"
                >
                  <RefreshCw size={13} /> Rescan Repo
                </button>
                <a
                  href={`https://github.com/${p.owner}/${p.repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <ExternalLink size={13} /> GitHub Page
                </a>
                <div className="border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => { setDeleteConfirm(p.id); setMenuOpen(null); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-left"
                  >
                    <Trash2 size={13} /> Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed line-clamp-2 min-h-[32px]">
          {p.description || "GitHub repository."}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4 text-xs bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-md p-2.5">
          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
            <Star size={13} className="text-amber-500" />
            <span className="font-semibold text-gray-900 dark:text-white">{p.stars.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
            <GitFork size={13} className="text-blue-500" />
            <span className="font-semibold text-gray-900 dark:text-white">{p.forks.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
            <AlertCircle size={13} className="text-gray-400" />
            <span className="font-semibold text-gray-900 dark:text-white">{p.openIssuesCount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <span className="text-[11px] text-gray-400 dark:text-gray-500">
          {p.healthScore !== null ? `Health: ${p.healthScore}/100` : "Analysis Pending"}
        </span>
        <Link
          href={`/project/${p.id}/overview`}
          className="flex items-center gap-1.5 text-xs font-medium text-[#1a5c38] dark:text-green-400 hover:underline"
        >
          View Overview <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );

  // ── List Row ─────────────────────────────────────────────────────────────
  const ProjectRow = ({ project: p }: { project: Project }) => (
    <div className="flex items-center gap-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-5 py-3.5 hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
        style={{ backgroundColor: p.color }}
      >
        {p.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-gray-900 dark:text-white">{p.name}</div>
        <div className="text-xs text-gray-400 dark:text-gray-500">{p.repoUrl}</div>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 w-24 font-mono">
        {p.language || "Codebase"}
      </div>
      <div className="text-xs text-gray-400 dark:text-gray-500 w-28 text-center">
        {p.healthScore !== null ? `${p.healthScore}/100` : "Pending"}
      </div>
      <Link
        href={`/project/${p.id}/overview`}
        className="flex items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.98] transition-all"
      >
        Open <ArrowRight size={12} />
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-[#0b0f17] text-gray-900 dark:text-gray-100 flex flex-col transition-colors" onClick={() => setMenuOpen(null)}>
      <AppTopBar showBell />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isDashboard />

        <main className="flex-1 overflow-y-auto bg-gray-50/40 dark:bg-gray-950/40">
          <PageTransition>
          <div className="max-w-6xl mx-auto px-8 py-8">

            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Dashboard
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Manage and audit your GitHub repositories.
                </p>
              </div>
              <button
                onClick={() => { setShowAddModal(true); setModalError(null); setNewRepoInput(""); }}
                className="flex items-center gap-2 bg-[#1a5c38] hover:bg-[#145230] dark:bg-green-600 dark:hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-2xs cursor-pointer active:scale-[0.98]"
              >
                <Plus size={16} /> Analyze New Repository
              </button>
            </div>

            {/* Toolbar */}
            {projects.length > 0 && (
              <div className="flex items-center gap-3 mb-5">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white flex-1">Your Repositories</h2>
                <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-sm">
                  <Search size={14} className="text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search repos…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="outline-none bg-transparent text-xs text-gray-700 dark:text-gray-200 placeholder-gray-400 w-36"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="text-gray-300 hover:text-gray-500">
                      <X size={13} />
                    </button>
                  )}
                </div>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 outline-none cursor-pointer"
                >
                  <option value="lastScan">Last Added</option>
                  <option value="name">Name</option>
                </select>
                <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
                  <button
                    onClick={() => setView("grid")}
                    className={`p-1.5 transition-colors ${view === "grid" ? "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white" : "text-gray-400 hover:text-gray-600"}`}
                  >
                    <LayoutGrid size={15} />
                  </button>
                  <button
                    onClick={() => setView("list")}
                    className={`p-1.5 border-l border-gray-200 dark:border-gray-700 transition-colors ${view === "list" ? "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white" : "text-gray-400 hover:text-gray-600"}`}
                  >
                    <List size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* Empty state */}
            {projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-center p-8">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center mb-4">
                  <GitBranch size={24} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No repositories added yet</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 max-w-sm leading-relaxed">
                  Enter a public GitHub repository (e.g., owner/repo) to analyze its architecture and code quality.
                </p>
                <button
                  onClick={() => { setShowAddModal(true); setModalError(null); setNewRepoInput(""); }}
                  className="flex items-center gap-2 bg-[#1a5c38] hover:bg-[#145230] dark:bg-green-600 dark:hover:bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer active:scale-[0.98]"
                >
                  <Plus size={16} /> Analyze Your First Repository
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-400 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
                <Search size={24} className="mx-auto mb-2 opacity-40" />
                <div className="text-sm text-gray-600 dark:text-gray-300">No repositories match &ldquo;{search}&rdquo;</div>
                <button onClick={() => setSearch("")} className="mt-2 text-xs text-[#1a5c38] dark:text-green-400 hover:underline">
                  Clear search
                </button>
              </div>
            ) : view === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((p) => <ProjectCard key={p.id} project={p} />)}
                {/* Add Card */}
                <div
                  onClick={() => { setShowAddModal(true); setModalError(null); setNewRepoInput(""); }}
                  className="bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg p-5 flex flex-col items-center justify-center text-center min-h-[190px] hover:border-[#1a5c38] dark:hover:border-green-500 transition-all cursor-pointer group hover-card-lift"
                >
                  <div className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 group-hover:border-[#1a5c38] dark:group-hover:border-green-500 flex items-center justify-center mb-2 transition-colors">
                    <Plus size={16} className="text-gray-400 group-hover:text-[#1a5c38] dark:group-hover:text-green-400" />
                  </div>
                  <div className="text-xs font-semibold text-[#1a5c38] dark:text-green-400">Add Repository</div>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                    Analyze another GitHub repository
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((p) => <ProjectRow key={p.id} project={p} />)}
              </div>
            )}
          </div>
          </PageTransition>
        </main>
      </div>

      {/* Add Repository Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Analyze New Repository</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Enter a public GitHub repository format (e.g. <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">owner/repo</span> or full URL).
            </p>

            <div className="mb-4">
              <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 focus-within:border-[#1a5c38] dark:focus-within:border-green-500 transition-colors">
                <GitHubIcon size={16} className="text-gray-400 flex-shrink-0" />
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. vercel/next.js"
                  value={newRepoInput}
                  onChange={(e) => {
                    setNewRepoInput(e.target.value);
                    if (modalError) setModalError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && !isValidating && handleAddRepository()}
                  disabled={isValidating}
                  className="flex-1 text-xs outline-none text-gray-900 dark:text-white placeholder-gray-400 bg-transparent disabled:opacity-50"
                />
                {newRepoInput && (
                  <button onClick={() => setNewRepoInput("")} className="text-gray-300 hover:text-gray-500">
                    <X size={13} />
                  </button>
                )}
              </div>

              {modalError && (
                <div className="mt-2 flex items-start gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 rounded-md p-2.5">
                  <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowAddModal(false); setNewRepoInput(""); }}
                className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRepository}
                disabled={isValidating || !newRepoInput.trim()}
                className="flex-1 bg-[#1a5c38] hover:bg-[#145230] dark:bg-green-600 dark:hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
              >
                {isValidating ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Validating…
                  </>
                ) : (
                  "Add Repository"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Remove Repository?</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
              Are you sure you want to remove this project from your dashboard?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 text-xs font-medium transition-colors active:scale-[0.98]"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
