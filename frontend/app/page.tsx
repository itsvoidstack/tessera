"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PublicNavbar from "@/components/PublicNavbar";
import {
  GitBranch, Shield, StickyNote, TrendingUp, ArrowRight, AlertCircle, Loader2,
  Cpu, ChevronDown, Check
} from "lucide-react";
import GitHubIcon from "@/components/GitHubIcon";
import HeroDiagram from "@/components/HeroDiagram";
import { validateGitHubRepo } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";

const SAMPLE_REPOS = ["facebook/react", "vercel/next.js", "supabase/supabase"];

const HOW_IT_WORKS_STEPS = [
  {
    step: "01",
    title: "Input Repository",
    desc: "Paste any public GitHub repository link (owner/repo format). Tessera validates repository existence instantly.",
    icon: GitHubIcon,
  },
  {
    step: "02",
    title: "Multi-Agent Pipeline",
    desc: "Specialized AI agents (Structure, Dependency, Security, Quality, Docs & Reviewer) analyze AST & tree output.",
    icon: Cpu,
  },
  {
    step: "03",
    title: "Explore DAG & Audit",
    desc: "Visualize system architecture maps, review severity-rated audit issues, and study codebase notes.",
    icon: GitBranch,
  },
  {
    step: "04",
    title: "Rescan & Compare",
    desc: "Re-run scans after refactoring to track score improvements and verified issue resolutions side-by-side.",
    icon: TrendingUp,
  },
];

const FAQS = [
  {
    q: "Do I need to enter my private GitHub token in the frontend?",
    a: "No. Repository validation queries GitHub's public REST API for public repositories. Authentication for private repos is securely handled on GitHub's authorization page via backend OAuth.",
  },
  {
    q: "How does the Rescan & Compare feature work?",
    a: "After modifying your codebase or fixing issues, trigger a rescan to generate comparative Before vs After metrics, calculating exact score deltas (+Health, -Vulnerabilities).",
  },
  {
    q: "Which programming languages and frameworks are supported?",
    a: "Tessera works with TypeScript, JavaScript, Python, Go, Rust, Java, and multi-language repositories using tree-sitter AST parser models.",
  },
  {
    q: "How do the 6 specialized AI agents operate?",
    a: "The repository is preprocessed so each agent (Structure, Dependency, Code Quality, Security, Docs & Reviewer) receives targeted context without repeating full codebases.",
  },
];

export default function LandingPage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const router = useRouter();

  const { isAuthed, isLoadingAuth } = useAppStore();

  useEffect(() => {
    if (!isLoadingAuth && isAuthed) {
      router.replace("/dashboard");
    }
  }, [isAuthed, isLoadingAuth, router]);

  async function handleAnalyze(urlInput?: string) {
    if (!isAuthed) {
      router.push("/login");
      return;
    }

    const val = (urlInput ?? repoUrl).trim();
    if (!val) {
      setValidationError("Please enter a GitHub repository URL or owner/repo.");
      return;
    }

    setValidationError(null);
    setIsValidating(true);

    try {
      const result = await validateGitHubRepo(val);

      if (!result.valid || !result.meta) {
        setValidationError(
          result.error || "Repository was not found on GitHub. Check owner and repository name."
        );
        setIsValidating(false);
        return;
      }

      setIsValidating(false);
      router.push(`/scan?repo=${encodeURIComponent(result.meta.htmlUrl)}`);
    } catch {
      setValidationError("Failed to validate repository. Please check your internet connection.");
      setIsValidating(false);
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0b0f17] text-gray-900 dark:text-gray-100 flex flex-col transition-colors">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="pt-28 pb-20 px-6 flex-1 flex flex-col justify-center border-b border-gray-100 dark:border-gray-800/80 section-enter">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full">
          {/* Left Column */}
          <div className="max-w-xl stagger-1">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-full px-3.5 py-1.5 mb-8">
              <span className="text-[#1a5c38] dark:text-green-400 font-bold">✦</span>
              AI Codebase Auditor &amp; Learning Assistant
            </div>

            <h1 className="text-5xl font-bold tracking-tight leading-[1.1] mb-6">
              Understand any<br />codebase instantly.
            </h1>

            <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed mb-8 max-w-lg">
              Tessera analyzes any GitHub repository to visualize architecture,
              detect issues, and generate learning notes so you can onboard
              faster and build better.
            </p>

            {/* URL input box */}
            <div className="mb-3">
              <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900 shadow-sm max-w-lg focus-within:border-[#1a5c38] dark:focus-within:border-green-500 transition-colors">
                <div className="pl-4 pr-3 flex items-center text-gray-400 dark:text-gray-500">
                  <GitHubIcon size={18} />
                </div>
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => {
                    setRepoUrl(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && !isValidating && handleAnalyze()}
                  placeholder="Enter owner/repository (e.g. vercel/next.js)"
                  disabled={isValidating}
                  className="flex-1 py-3.5 pr-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none bg-transparent disabled:opacity-50"
                />
                <button
                  onClick={() => handleAnalyze()}
                  disabled={isValidating}
                  className="flex items-center gap-2 bg-[#1a5c38] hover:bg-[#145230] dark:bg-green-600 dark:hover:bg-green-700 text-white px-5 py-3.5 text-sm font-medium transition-colors whitespace-nowrap disabled:opacity-50 cursor-pointer"
                >
                  {isValidating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Validating…
                    </>
                  ) : (
                    <>
                      Analyze Repository
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </div>

              {/* Validation Error Badge */}
              {validationError && (
                <div className="mt-2.5 flex items-start gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 rounded-lg p-3 max-w-lg">
                  <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}
            </div>

            {/* Sample Repos */}
            <div className="flex items-center gap-2 mt-4">
              <span className="text-xs text-gray-400 dark:text-gray-500">Try a sample:</span>
              {SAMPLE_REPOS.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRepoUrl(r);
                    handleAnalyze(r);
                  }}
                  disabled={isValidating}
                  className="text-xs text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-full px-3 py-1 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Right Column — Interactive Diagram Visual */}
          <div className="hidden lg:block stagger-2">
            <HeroDiagram />
          </div>
        </div>
      </section>

      {/* Feature Strip */}
      <section className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40 py-16 px-6 section-enter stagger-1" id="features">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-2xl font-bold mb-2">Built for Developers &amp; Hackathons</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Everything you need to audit, understand, and improve code quality.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: GitBranch,
                title: "Architecture Map",
                desc: "Visualizes frontend/backend modules, entry points, and internal dependency flows.",
                delay: "stagger-1",
              },
              {
                icon: Shield,
                title: "AI Code Audit",
                desc: "Detects security vulnerabilities, code smells, and technical debt with severity tags.",
                delay: "stagger-2",
              },
              {
                icon: StickyNote,
                title: "Codebase Notes",
                desc: "Compiles student-style notes explaining concepts, database layers, and data flow.",
                delay: "stagger-3",
              },
              {
                icon: TrendingUp,
                title: "Rescan & Compare",
                desc: "Re-run scans after refactoring to track Before vs After score deltas side-by-side.",
                delay: "stagger-4",
              },
            ].map((f) => (
              <div key={f.title} className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover-card-lift section-enter ${f.delay}`}>
                <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center mb-4">
                  <f.icon size={20} className="text-[#1a5c38] dark:text-green-400" />
                </div>
                <h3 className="text-base font-semibold mb-1.5">{f.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0b0f17] section-enter stagger-2" id="how-it-works">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-16">
            <span className="text-xs font-semibold text-[#1a5c38] dark:text-green-400 uppercase tracking-wider">Workflow</span>
            <h2 className="text-3xl font-bold mt-1 mb-3">How Tessera Works</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Transform raw GitHub repositories into interactive architecture and learning experiences in 4 steps.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {HOW_IT_WORKS_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const delays = ["stagger-1", "stagger-2", "stagger-3", "stagger-4"];
              return (
                <div key={step.step} className={`relative bg-gray-50/60 dark:bg-gray-900/50 border border-gray-200/80 dark:border-gray-800 rounded-xl p-6 flex flex-col justify-between hover-card-lift section-enter ${delays[idx]}`}>
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-mono font-bold text-[#1a5c38] dark:text-green-400 bg-green-50 dark:bg-green-950/60 border border-green-200 dark:border-green-800 rounded px-2 py-0.5">
                        {step.step}
                      </span>
                      <Icon size={18} className="text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-base font-bold mb-2">{step.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-900/30 section-enter stagger-3" id="pricing">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-16">
            <span className="text-xs font-semibold text-[#1a5c38] dark:text-green-400 uppercase tracking-wider">Access</span>
            <h2 className="text-3xl font-bold mt-1 mb-3">Simple Plans for Developers</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Open source and hackathon-focused. Audit your repos effortlessly.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Hackathon Tier */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold mb-1">Hackathon Edition</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">For developers building and submitting projects.</p>
                <div className="text-3xl font-bold mb-6">$0 <span className="text-xs font-normal text-gray-400">/ forever</span></div>

                <div className="space-y-3 text-xs text-gray-600 dark:text-gray-300 mb-8">
                  <div className="flex items-center gap-2"><Check size={14} className="text-[#1a5c38] dark:text-green-400" /> Unlimited Public Repo Scans</div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-[#1a5c38] dark:text-green-400" /> Architecture Map DAG</div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-[#1a5c38] dark:text-green-400" /> Code Quality &amp; Security Audit</div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-[#1a5c38] dark:text-green-400" /> Rescan &amp; Compare Diffing</div>
                </div>
              </div>

              <button
                onClick={() => {
                  if (isAuthed) {
                    router.push("/dashboard");
                  } else {
                    router.push("/login");
                  }
                }}
                className="w-full bg-[#1a5c38] hover:bg-[#145230] dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-lg py-2.5 text-xs font-semibold transition-colors cursor-pointer"
              >
                Get Started Free
              </button>
            </div>

            {/* Pro Edition */}
            <div className="bg-white dark:bg-gray-900 border-2 border-[#1a5c38] dark:border-green-500 rounded-xl p-8 flex flex-col justify-between relative shadow-sm">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1a5c38] dark:bg-green-500 text-white text-[10px] uppercase font-bold tracking-wider px-3 py-0.5 rounded-full">
                Popular
              </span>
              <div>
                <h3 className="text-lg font-bold mb-1">Developer Pro</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">For engineers working with private repositories.</p>
                <div className="text-3xl font-bold mb-6">$12 <span className="text-xs font-normal text-gray-400">/ month</span></div>

                <div className="space-y-3 text-xs text-gray-600 dark:text-gray-300 mb-8">
                  <div className="flex items-center gap-2"><Check size={14} className="text-[#1a5c38] dark:text-green-400" /> Everything in Free</div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-[#1a5c38] dark:text-green-400" /> Public repository analysis</div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-[#1a5c38] dark:text-green-400" /> Advanced Multi-Agent LLM Insights</div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-[#1a5c38] dark:text-green-400" /> Priority Processing Pipeline</div>
                </div>
              </div>

              <button
                disabled
                className="w-full bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 rounded-lg py-2.5 text-xs font-semibold cursor-not-allowed text-center"
              >
                Coming Soon
              </button>
            </div>

            {/* Team Edition */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold mb-1">Team Audit</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">For engineering teams &amp; code reviewers.</p>
                <div className="text-3xl font-bold mb-6">$49 <span className="text-xs font-normal text-gray-400">/ month</span></div>

                <div className="space-y-3 text-xs text-gray-600 dark:text-gray-300 mb-8">
                  <div className="flex items-center gap-2"><Check size={14} className="text-[#1a5c38] dark:text-green-400" /> Everything in Pro</div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-[#1a5c38] dark:text-green-400" /> Team Workspace Collaboration</div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-[#1a5c38] dark:text-green-400" /> Custom Architecture DAG Export</div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-[#1a5c38] dark:text-green-400" /> Automated CI/CD Webhook Scans</div>
                </div>
              </div>

              <button
                disabled
                className="w-full bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 rounded-lg py-2.5 text-xs font-semibold cursor-not-allowed text-center"
              >
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section className="py-20 px-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0b0f17] section-enter stagger-4" id="faq">
        <div className="max-w-4xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-16">
            <span className="text-xs font-semibold text-[#1a5c38] dark:text-green-400 uppercase tracking-wider">FAQ</span>
            <h2 className="text-3xl font-bold mt-1 mb-3">Frequently Asked Questions</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Everything you need to know about Tessera.</p>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-900 transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left text-sm font-semibold text-gray-900 dark:text-white cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={16}
                      className={`text-gray-400 transition-transform ${isOpen ? "rotate-180 text-[#1a5c38] dark:text-green-400" : ""}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-800/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-white dark:bg-[#0b0f17] transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between text-xs text-gray-400 dark:text-gray-500 gap-4">
          <div className="flex items-center gap-2">
            <span>© 2025 Tessera. AI Codebase Auditor &amp; Learning Assistant.</span>
          </div>
          <div className="flex gap-6">
            <a href="#features" className="hover:text-gray-600 dark:hover:text-gray-300">Features</a>
            <a href="#how-it-works" className="hover:text-gray-600 dark:hover:text-gray-300">How it works</a>
            <a href="#pricing" className="hover:text-gray-600 dark:hover:text-gray-300">Pricing</a>
            <a href="#faq" className="hover:text-gray-600 dark:hover:text-gray-300">FAQ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
