"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppTopBar from "@/components/AppTopBar";
import GitHubIcon from "@/components/GitHubIcon";
import PageTransition from "@/components/PageTransition";
import { Loader2, AlertCircle, ArrowLeft, ArrowRight, Star, GitFork } from "lucide-react";
import { validateGitHubRepo, GitHubRepoMeta } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";

function ScanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { createProjectFromMeta, getProject } = useAppStore();

  const repoParam = searchParams.get("repo") ?? "";
  const projectIdParam = searchParams.get("project") ?? "";

  const [isValidating, setIsValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<GitHubRepoMeta | null>(null);

  useEffect(() => {
    async function runCheck() {
      if (!repoParam && !projectIdParam) {
        router.replace("/dashboard");
        return;
      }

      setIsValidating(true);
      setError(null);

      // If ?project=<id> is given, the project is already in the store.
      // Look it up directly so we don't pass an ID like "facebook-react"
      // to validateGitHubRepo which expects "owner/repo" format.
      if (projectIdParam && !repoParam) {
        const existing = getProject(projectIdParam);
        if (existing) {
          setMeta({
            owner: existing.owner,
            repo: existing.repo,
            fullName: existing.repoUrl,
            description: existing.description,
            language: existing.language,
            stars: existing.stars,
            forks: existing.forks,
            openIssues: existing.openIssuesCount,
            defaultBranch: "main",
            avatarUrl: `https://github.com/${existing.owner}.png`,
            htmlUrl: `https://github.com/${existing.owner}/${existing.repo}`,
            updatedAt: new Date().toISOString(),
          });
          setIsValidating(false);
          return;
        }
        // Project ID not in store — fall through to GitHub validation using
        // the raw param as a potential owner/repo string.
      }

      const target = repoParam || projectIdParam;
      const result = await validateGitHubRepo(target);

      if (!result.valid || !result.meta) {
        setError(result.error || "Repository was not found on GitHub. Check owner and repository name.");
        setIsValidating(false);
        return;
      }

      setMeta(result.meta);
      setIsValidating(false);
    }

    runCheck();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoParam, projectIdParam]);

  function handleRegisterAndNavigate() {
    if (!meta) return;
    const p = createProjectFromMeta(meta);
    router.push(`/project/${p.id}/overview`);
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0b0f17] flex flex-col transition-colors duration-200">
      <AppTopBar />

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
        <PageTransition>
        {isValidating ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Loader2 size={32} className="text-[#1a5c38] dark:text-green-400 animate-spin mb-4" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Validating Repository</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Checking public repository access via GitHub REST API…</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl p-8 text-center max-w-xl mx-auto my-12">
            <AlertCircle size={36} className="text-red-500 dark:text-red-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Invalid Repository</h2>
            <p className="text-xs text-red-700 dark:text-red-300 mb-6 leading-relaxed">{error}</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="inline-flex items-center gap-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft size={14} /> Return to Dashboard
            </button>
          </div>
        ) : meta ? (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                Backend Agent Integration Ready
              </span>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {meta.fullName}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
              Public GitHub repository verified. Ready for FastAPI backend analysis.
            </p>

            {/* Repo Info Card */}
            <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-8 bg-gray-50/50 dark:bg-gray-900/60">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <GitHubIcon size={24} className="text-gray-800 dark:text-white" />
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">{meta.fullName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{meta.description}</div>
                  </div>
                </div>
                <a
                  href={meta.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs border border-gray-200 dark:border-gray-700 rounded-md px-3 py-1.5 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium transition-colors"
                >
                  View on GitHub
                </a>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <Star size={14} className="text-amber-500" />
                  <span><strong className="text-gray-900 dark:text-white">{meta.stars.toLocaleString()}</strong> stars</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <GitFork size={14} className="text-blue-500" />
                  <span><strong className="text-gray-900 dark:text-white">{meta.forks.toLocaleString()}</strong> forks</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <AlertCircle size={14} className="text-gray-400 dark:text-gray-500" />
                  <span><strong className="text-gray-900 dark:text-white">{meta.openIssues.toLocaleString()}</strong> open issues</span>
                </div>
              </div>
            </div>

            {/* Backend Integration Note */}
            <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-8 bg-white dark:bg-gray-900">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Backend Scanner Workflow</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                When connected to the FastAPI backend server (<code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">NEXT_PUBLIC_API_URL</code>), the multi-agent pipeline (Structure Agent, Dependency Agent, Code Quality Agent, Security Agent, Docs &amp; Test Agent, Reviewer Agent) will process the repository tree to compute health scores and DAGs.
              </p>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Back to Dashboard
                </button>
                <button
                  onClick={handleRegisterAndNavigate}
                  className="flex items-center gap-2 bg-[#1a5c38] hover:bg-[#145230] dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-lg px-5 py-2 text-xs font-medium transition-colors cursor-pointer"
                >
                  Open Project Overview <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        ) : null}
        </PageTransition>
      </main>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white dark:bg-[#0b0f17] flex items-center justify-center transition-colors">
          <div className="text-sm text-gray-400">Loading scan status…</div>
        </div>
      }
    >
      <ScanContent />
    </Suspense>
  );
}
