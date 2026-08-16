"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppTopBar from "@/components/AppTopBar";
import Sidebar from "@/components/Sidebar";
import PageTransition from "@/components/PageTransition";
import {
  Search, ChevronDown, ChevronRight,
  BookOpen, GitBranch, Shield, StickyNote, Map,
  Rocket, HelpCircle, MessageSquare, ExternalLink,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface TopicSection {
  id: string;
  icon: React.ElementType;
  title: string;
  content: React.ReactNode;
}

interface FaqItem {
  q: string;
  a: string;
}

/* ─── Content data ───────────────────────────────────────────────────────── */

const TOPICS: TopicSection[] = [
  {
    id: "getting-started",
    icon: Rocket,
    title: "Getting Started",
    content: (
      <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        <p>
          Tessera is an AI-powered codebase auditor. To begin, paste any public GitHub
          repository in <strong className="text-gray-800 dark:text-gray-100">owner/repository</strong> format
          (e.g. <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">vercel/next.js</code>)
          into the input on the home page and click <strong className="text-gray-800 dark:text-gray-100">Analyze Repository</strong>.
        </p>
        <p>
          Tessera validates that the repository exists on GitHub, then creates a project
          entry in your dashboard. Full analysis (health scores, audit issues, architecture
          diagrams) is populated once the backend agent pipeline is connected.
        </p>
        <ol className="list-decimal list-inside space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
          <li>Enter a public GitHub repository on the home page or dashboard.</li>
          <li>Tessera validates it via the GitHub REST API.</li>
          <li>Your project appears in the dashboard — explore each section from the sidebar.</li>
          <li>Connect the FastAPI backend to unlock AI analysis results.</li>
        </ol>
      </div>
    ),
  },
  {
    id: "how-analysis-works",
    icon: GitBranch,
    title: "How Repository Analysis Works",
    content: (
      <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        <p>
          When connected to the backend, Tessera runs a multi-agent pipeline against the
          repository tree. Each specialist agent focuses on one concern:
        </p>
        <ul className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
          {[
            ["Structure Agent",      "Maps the directory tree and identifies entry points."],
            ["Dependency Agent",     "Builds the import graph and detects circular dependencies."],
            ["Code Quality Agent",   "Detects code smells, complexity hotspots, and duplication."],
            ["Security Agent",       "Flags known vulnerability patterns and insecure constructs."],
            ["Docs & Test Agent",    "Measures documentation coverage and test presence."],
            ["Reviewer Agent",       "Aggregates evidence and computes the overall health score."],
          ].map(([name, desc]) => (
            <li key={name as string} className="flex gap-2">
              <span className="font-semibold text-gray-700 dark:text-gray-200 w-36 flex-shrink-0">{name}</span>
              <span>{desc}</span>
            </li>
          ))}
        </ul>
        <p>
          Results are returned as structured JSON and surfaced across the Overview, Audit,
          Architecture, Health, and Notes tabs.
        </p>
      </div>
    ),
  },
  {
    id: "understanding-audit",
    icon: Shield,
    title: "Understanding Your Audit",
    content: (
      <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        <p>
          The <strong className="text-gray-800 dark:text-gray-100">AI Code Audit</strong> tab
          lists every issue detected by the Security and Code Quality agents, each rated by
          severity:
        </p>
        <ul className="space-y-1.5 text-xs">
          {[
            ["Critical", "text-red-600 dark:text-red-400",    "Security vulnerabilities or crashes — fix immediately."],
            ["High",     "text-orange-600 dark:text-orange-400","Significant risks or bugs with likely impact."],
            ["Medium",   "text-amber-600 dark:text-amber-500",  "Code smells, anti-patterns, maintainability issues."],
            ["Low",      "text-gray-500 dark:text-gray-400",    "Minor style, naming, or documentation gaps."],
          ].map(([level, cls, desc]) => (
            <li key={level as string} className="flex gap-2 items-start">
              <span className={`font-semibold w-16 flex-shrink-0 ${cls}`}>{level}</span>
              <span className="text-gray-500 dark:text-gray-400">{desc}</span>
            </li>
          ))}
        </ul>
        <p>
          Click any row to expand the full description and a suggested fix. Use the tab
          filters to focus on a specific severity, or search by file name or title.
        </p>
      </div>
    ),
  },
  {
    id: "architecture-map",
    icon: Map,
    title: "Architecture Map Guide",
    content: (
      <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        <p>
          The <strong className="text-gray-800 dark:text-gray-100">Architecture</strong> tab renders
          an interactive directed acyclic graph (DAG) of your repository&apos;s module structure.
          Each node represents a module or layer; edges show import dependencies.
        </p>
        <ul className="list-disc list-inside space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
          <li>Click any node to see its tech stack, type, and description in the right panel.</li>
          <li>Hover a node to highlight all its direct connections.</li>
          <li>Use the zoom controls or scroll to navigate large graphs.</li>
          <li>Dashed edges represent indirect (transitive) dependencies.</li>
          <li>Solid edges represent direct imports.</li>
        </ul>
        <p>
          The DAG is generated by the Structure and Dependency agents and is populated after
          the backend completes its analysis pass.
        </p>
      </div>
    ),
  },
  {
    id: "notes-guide",
    icon: StickyNote,
    title: "Notes & Learning Guide",
    content: (
      <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        <p>
          The <strong className="text-gray-800 dark:text-gray-100">Notes</strong> tab has two
          sub-views:
        </p>
        <ul className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
          <li>
            <strong className="text-gray-700 dark:text-gray-200">AI Codebase Notes</strong> —
            student-style explanations of the repository&apos;s architecture, authentication,
            database layer, API surface, and data flow, generated by the Learning Agent.
          </li>
          <li>
            <strong className="text-gray-700 dark:text-gray-200">Personal Notes</strong> —
            a free-form Markdown editor for your own observations. Notes are saved locally
            per project and can be exported as <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">.md</code> files.
          </li>
        </ul>
        <p>
          Use the section sidebar on the left to jump between AI note categories.
          Personal notes support full Markdown syntax and auto-save on every keystroke.
        </p>
      </div>
    ),
  },
];

const FAQS: FaqItem[] = [
  {
    q: "Does Tessera store my code on a server?",
    a: "No. Repository validation uses the GitHub public REST API and only fetches metadata (name, stars, language). Source code is never sent to Tessera's servers. Full analysis runs via the backend you self-host or connect.",
  },
  {
    q: "Why is my health score showing as pending?",
    a: "The health score, audit issues, and architecture diagram are generated by the FastAPI backend agent pipeline. They appear as pending until that backend is connected via the NEXT_PUBLIC_API_URL environment variable.",
  },
  {
    q: "Can I analyze private repositories?",
    a: "This local version supports public repositories. Private repository support and GitHub OAuth are currently disabled.",
  },
  {
    q: "My repository wasn't found — why?",
    a: "Tessera validates against the GitHub public API. Check that the format is owner/repo (e.g. facebook/react) and that the repository is public. If GitHub's API is rate-limiting, a fallback uses the URL format directly.",
  },
  {
    q: "How do I clear my saved projects?",
    a: "Go to Settings → Repository → Clear Saved Projects. To wipe everything including preferences, use Settings → Danger Zone → Clear All Data.",
  },
  {
    q: "Can I export the architecture diagram?",
    a: "SVG export is on the roadmap in the Team Audit plan. Currently you can screenshot the canvas or use browser devtools to copy the SVG source.",
  },
];

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function TopicCard({ topic }: { topic: TopicSection }) {
  const [open, setOpen] = useState(false);
  const Icon = topic.icon;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0">
            <Icon size={15} className="text-[#1a5c38] dark:text-green-400" />
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{topic.title}</span>
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-800 pt-4">
          {topic.content}
        </div>
      )}
    </div>
  );
}

function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden"
        >
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-900 dark:text-white pr-4">{item.q}</span>
            <ChevronDown
              size={15}
              className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                open === i ? "rotate-180 text-[#1a5c38] dark:text-green-400" : ""
              }`}
            />
          </button>
          {open === i && (
            <div className="px-5 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function HelpPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filteredTopics = TOPICS.filter(
    (t) =>
      !search ||
      t.title.toLowerCase().includes(search.toLowerCase())
  );

  const filteredFaqs = FAQS.filter(
    (f) =>
      !search ||
      f.q.toLowerCase().includes(search.toLowerCase()) ||
      f.a.toLowerCase().includes(search.toLowerCase())
  );

  const hasResults = filteredTopics.length > 0 || filteredFaqs.length > 0;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0b0f17] flex flex-col transition-colors">
      <AppTopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto bg-gray-50/40 dark:bg-gray-950/40">
          <PageTransition>
            <div className="max-w-2xl mx-auto px-6 py-10">

              {/* Page header */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Help &amp; Support</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Guides, answers, and ways to get in touch.
                </p>
              </div>

              {/* Search */}
              <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 bg-white dark:bg-gray-900 mb-8 focus-within:border-[#1a5c38] dark:focus-within:border-green-500 transition-colors">
                <Search size={15} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search help topics…"
                  className="flex-1 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none bg-transparent"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors text-xs"
                  >
                    Clear
                  </button>
                )}
              </div>

              {!hasResults && (
                <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                  <HelpCircle size={28} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No results for &ldquo;{search}&rdquo;</p>
                  <button
                    onClick={() => setSearch("")}
                    className="mt-2 text-xs text-[#1a5c38] dark:text-green-400 hover:underline"
                  >
                    Clear search
                  </button>
                </div>
              )}

              {/* ── Topic sections ─────────────────────────────────── */}
              {filteredTopics.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                    Guides
                  </h2>
                  <div className="space-y-2">
                    {filteredTopics.map((topic) => (
                      <TopicCard key={topic.id} topic={topic} />
                    ))}
                  </div>
                </div>
              )}

              {/* ── FAQ ────────────────────────────────────────────── */}
              {filteredFaqs.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                    Frequently Asked Questions
                  </h2>
                  <FaqAccordion items={filteredFaqs} />
                </div>
              )}

              {/* ── Contact / Report ───────────────────────────────── */}
              {!search && (
                <div className="mb-2">
                  <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                    Get Help
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Report a problem */}
                    <a
                      href="https://github.com/tessera-ai/tessera/issues/new?template=bug_report.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 hover:border-gray-300 dark:hover:border-gray-700 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0">
                        <MessageSquare size={15} className="text-gray-500 dark:text-gray-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                          Report a Problem
                          <ExternalLink size={11} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                          Open a GitHub issue with steps to reproduce.
                        </p>
                      </div>
                    </a>

                    {/* GitHub discussions */}
                    <a
                      href="https://github.com/tessera-ai/tessera/discussions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 hover:border-gray-300 dark:hover:border-gray-700 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0">
                        <BookOpen size={15} className="text-gray-500 dark:text-gray-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                          GitHub Discussions
                          <ExternalLink size={11} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                          Ask questions or share feedback with the community.
                        </p>
                      </div>
                    </a>
                  </div>
                </div>
              )}

              {/* Settings shortcut */}
              {!search && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800 mt-6">
                  <button
                    onClick={() => router.push("/settings")}
                    className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    Looking for preferences?
                    <span className="text-[#1a5c38] dark:text-green-400 font-medium">Go to Settings</span>
                    <ChevronRight size={12} />
                  </button>
                </div>
              )}

            </div>
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
