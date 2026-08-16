"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import AppTopBar from "@/components/AppTopBar";
import GitHubIcon from "@/components/GitHubIcon";
import PageTransition from "@/components/PageTransition";

import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Star,
  GitFork,
  CheckCircle2,
} from "lucide-react";

import {
  validateGitHubRepo,
  GitHubRepoMeta,
  scanRepository,
  ScanResponse,
} from "@/lib/api-client";

import { useAppStore } from "@/lib/store";

function ScanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    createProjectFromMeta,
    getProject,
    updateProject,
  } = useAppStore();

  const repoParam = searchParams.get("repo") ?? "";
  const projectIdParam = searchParams.get("project") ?? "";

  const [isValidating, setIsValidating] = useState(true);
  const [isScanning, setIsScanning] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [meta, setMeta] = useState<GitHubRepoMeta | null>(null);

  const [scanResult, setScanResult] =
    useState<ScanResponse | null>(null);

  // ============================================================
  // 1. VALIDATE REPOSITORY
  // ============================================================

  useEffect(() => {
    async function runCheck() {
      if (!repoParam && !projectIdParam) {
        router.replace("/dashboard");
        return;
      }

      setIsValidating(true);
      setError(null);

      // Existing project
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
      }

      // New repository
      const target = repoParam || projectIdParam;

      try {
        console.log("Validating GitHub repository:", target);

        const result = await validateGitHubRepo(target);

        console.log("GitHub validation result:", result);

        if (!result.valid || !result.meta) {
          setError(
            result.error ||
              "Repository was not found on GitHub. Check the owner and repository name."
          );

          setIsValidating(false);
          return;
        }

        setMeta(result.meta);
      } catch (err) {
        console.error("Repository validation failed:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to validate the repository."
        );
      } finally {
        setIsValidating(false);
      }
    }

    runCheck();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoParam, projectIdParam]);

  // ============================================================
  // 2. CONNECT FRONTEND → FASTAPI BACKEND
  // ============================================================

  async function handleRegisterAndNavigate() {
    if (!meta) {
      console.error("No repository metadata available.");
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      console.log("");
      console.log("========================================");
      console.log("TESSERA SCAN STARTED");
      console.log("========================================");
      console.log("Repository:", meta.htmlUrl);
      console.log("Sending request to FastAPI...");
      console.log("========================================");

      // --------------------------------------------------------
      // THIS IS THE ACTUAL BACKEND CONNECTION
      //
      // scanRepository() should call:
      //
      // POST http://127.0.0.1:8000/api/scan
      //
      // Body:
      // {
      //   "repo_url": "https://github.com/owner/repo"
      // }
      // --------------------------------------------------------

      const result = await scanRepository(meta.htmlUrl);

      // --------------------------------------------------------
      // BACKEND RESPONSE IS NOW INSIDE "result"
      // --------------------------------------------------------

      console.log("");
      console.log("========================================");
      console.log("TESSERA BACKEND RESPONSE RECEIVED");
      console.log("========================================");
      console.log("FULL RESPONSE:", result);
      console.log("Repository:", result.repository);
      console.log("File count:", result.file_count);
      console.log("AI analysis:", result.ai_analysis);
      console.log("========================================");
      console.log("");

      // Save backend response in component state
      setScanResult(result);

      // ========================================================
      // 3. CREATE PROJECT
      // ========================================================

      const project = createProjectFromMeta(meta);

      console.log("Project created:", project.id);

      // ========================================================
      // 4. SAVE REAL BACKEND RESPONSE TO PROJECT
      // ========================================================

      updateProject(project.id, {
        status: "completed",

        healthScore: result.health_score,

        scores: result.scores,

        // Real AI response from FastAPI
        projectSummary:
          result.ai_analysis ||
          "Repository scanned successfully. AI analysis is available.",

        // Store AI analysis separately too
        aiAnalysis: result.ai_analysis ?? undefined,

        // Real number of files from FastAPI
        fileCount: result.file_count,
        files: result.files,

        auditIssues: result.audit_issues,
        issuesCount: result.audit_issues.length,
        criticalIssues: result.audit_issues.filter((issue) => issue.severity === "Critical").length,
        warnings: result.audit_issues.filter(
          (issue) => issue.severity === "High" || issue.severity === "Medium"
        ).length,
        suggestions: result.audit_issues.filter((issue) => issue.severity === "Low").length,

        lastScan: "Just now",

        scanDate: new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),

        scanId: project.scanId,

        scanHistory: [
          {
            scanId: project.scanId,

            date: new Date().toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            }),

            version: "v1.0.0",

            healthScore: result.health_score,

            issuesFound: 0,

            status: "completed",
          },
        ],
      });

      console.log("Backend data saved to project.");

      // ========================================================
      // 5. GO TO OVERVIEW
      // ========================================================

      setTimeout(() => {
        router.push(`/project/${project.id}/overview`);
      }, 300);
    } catch (err) {
      console.error("");
      console.error("========================================");
      console.error("TESSERA SCAN FAILED");
      console.error("========================================");
      console.error(err);
      console.error("========================================");

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while scanning the repository."
      );

      setIsScanning(false);
    }
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="min-h-screen bg-white dark:bg-[#0b0f17] flex flex-col transition-colors duration-200">

      <AppTopBar />

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">

        <PageTransition>

          {/* ====================================================
              VALIDATING
          ==================================================== */}

          {isValidating ? (

            <div className="flex flex-col items-center justify-center py-20 text-center">

              <Loader2
                size={32}
                className="text-[#1a5c38] dark:text-green-400 animate-spin mb-4"
              />

              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                Validating Repository
              </h1>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                Checking public repository access via GitHub REST API...
              </p>

            </div>

          ) : error ? (

            /* ==================================================
               ERROR
            ================================================== */

            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl p-8 text-center max-w-xl mx-auto my-12">

              <AlertCircle
                size={36}
                className="text-red-500 dark:text-red-400 mx-auto mb-3"
              />

              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Scan Error
              </h2>

              <p className="text-xs text-red-700 dark:text-red-300 mb-6 leading-relaxed">
                {error}
              </p>

              <button
                onClick={() => router.push("/dashboard")}
                className="inline-flex items-center gap-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft size={14} />
                Return to Dashboard
              </button>

            </div>

          ) : meta ? (

            /* ==================================================
               REPOSITORY READY
            ================================================== */

            <div>

              {/* Status */}

              <div className="flex items-center gap-2 mb-6">

                <span
                  className={`w-2 h-2 rounded-full ${
                    isScanning
                      ? "bg-blue-500 animate-pulse"
                      : "bg-green-500"
                  }`}
                />

                <span className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider">

                  {isScanning
                    ? "AI Backend Scanner Running"
                    : "Repository Verified"}

                </span>

              </div>

              {/* Heading */}

              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {meta.fullName}
              </h1>

              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">

                {isScanning
                  ? "Tessera is scanning the repository and running AI analysis..."
                  : "Public GitHub repository verified and ready to scan."}

              </p>

              {/* ==================================================
                  REPOSITORY INFO
              ================================================== */}

              <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-8 bg-gray-50/50 dark:bg-gray-900/60">

                <div className="flex items-start justify-between mb-4">

                  <div className="flex items-center gap-3">

                    <GitHubIcon
                      size={24}
                      className="text-gray-800 dark:text-white"
                    />

                    <div>

                      <div className="font-bold text-gray-900 dark:text-white">
                        {meta.fullName}
                      </div>

                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {meta.description}
                      </div>

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

                {/* Stats */}

                <div className="grid grid-cols-3 gap-3 text-xs bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 rounded-lg p-3">

                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">

                    <Star
                      size={14}
                      className="text-amber-500"
                    />

                    <span>

                      <strong className="text-gray-900 dark:text-white">
                        {meta.stars.toLocaleString()}
                      </strong>{" "}
                      stars

                    </span>

                  </div>

                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">

                    <GitFork
                      size={14}
                      className="text-blue-500"
                    />

                    <span>

                      <strong className="text-gray-900 dark:text-white">
                        {meta.forks.toLocaleString()}
                      </strong>{" "}
                      forks

                    </span>

                  </div>

                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">

                    <AlertCircle
                      size={14}
                      className="text-gray-400 dark:text-gray-500"
                    />

                    <span>

                      <strong className="text-gray-900 dark:text-white">
                        {meta.openIssues.toLocaleString()}
                      </strong>{" "}
                      open issues

                    </span>

                  </div>

                </div>

              </div>

              {/* ==================================================
                  SCANNER
              ================================================== */}

              <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-8 bg-white dark:bg-gray-900">

                <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Tessera AI Scanner
                </h2>

                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-5">
                  Tessera sends this repository to the FastAPI backend.
                  The backend retrieves the repository files and runs
                  the AI engineering analysis.
                </p>

                {/* Pipeline */}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">

                  <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-3">

                    <div className="text-xs font-semibold text-gray-900 dark:text-white mb-1">
                      01. Repository
                    </div>

                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      Fetch GitHub files
                    </div>

                  </div>

                  <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-3">

                    <div className="text-xs font-semibold text-gray-900 dark:text-white mb-1">
                      02. AI Analysis
                    </div>

                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      Analyze architecture & code
                    </div>

                  </div>

                  <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-3">

                    <div className="text-xs font-semibold text-gray-900 dark:text-white mb-1">
                      03. Dashboard
                    </div>

                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      Display engineering insights
                    </div>

                  </div>

                </div>

                {/* ==================================================
                    SUCCESS RESULT
                ================================================== */}

                {scanResult && (

                  <div className="mb-5 rounded-lg border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/20 p-4">

                    <div className="flex items-center gap-2 mb-2">

                      <CheckCircle2
                        size={16}
                        className="text-green-600 dark:text-green-400"
                      />

                      <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                        Repository scanned successfully
                      </span>

                    </div>

                    <div className="text-xs text-green-700/80 dark:text-green-300/80">

                      {scanResult.file_count} files analyzed by the
                      backend AI pipeline.

                    </div>

                  </div>

                )}

                {/* ==================================================
                    BUTTONS
                ================================================== */}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">

                  <button
                    onClick={() => router.push("/dashboard")}
                    disabled={isScanning}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Back to Dashboard
                  </button>

                  <button
                    onClick={handleRegisterAndNavigate}
                    disabled={isScanning}
                    className="flex items-center gap-2 bg-[#1a5c38] hover:bg-[#145230] dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-lg px-5 py-2 text-xs font-medium transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >

                    {isScanning ? (

                      <>
                        <Loader2
                          size={14}
                          className="animate-spin"
                        />

                        Scanning Repository...
                      </>

                    ) : (

                      <>
                        Analyze Repository

                        <ArrowRight
                          size={14}
                        />
                      </>

                    )}

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

// ============================================================
// PAGE
// ============================================================

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white dark:bg-[#0b0f17] flex items-center justify-center transition-colors">

          <div className="text-sm text-gray-400">
            Loading scan status...
          </div>

        </div>
      }
    >
      <ScanContent />
    </Suspense>
  );
}
