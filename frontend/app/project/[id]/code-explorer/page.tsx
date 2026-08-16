"use client";

import { use } from "react";
import { useAppStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { FolderOpen, Layers, Terminal, ExternalLink } from "lucide-react";

export default function CodeExplorerPage({ params }: { params: Promise<{ id: string }> }) {
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

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0f172a] transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Code Explorer</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Explore repository source code files, entry points, and directory structure.
          </p>
        </div>
        <a
          href={`https://github.com/${project.owner}/${project.repo}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <ExternalLink size={13} /> View on GitHub
        </a>
      </div>

      {/* Main Empty / Pending State */}
      <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full flex flex-col items-center justify-center page-enter">
        <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center bg-gray-50/40 dark:bg-gray-900/40 w-full my-6">
          <div className="w-14 h-14 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <FolderOpen size={24} className="text-[#1a5c38] dark:text-green-400" />
          </div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
            Repository structure will appear here
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6 leading-relaxed">
            Connect the backend to explore files and source code from this repository.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-xl mx-auto text-left">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
              <div className="text-[10px] text-gray-400 dark:text-gray-500">Target Repo</div>
              <div className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">
                {project.owner}/{project.repo}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
              <div className="text-[10px] text-gray-400 dark:text-gray-500">Primary Language</div>
              <div className="text-xs font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-1">
                <Terminal size={12} className="text-[#1a5c38] dark:text-green-400" />
                <span>{project.language || "Codebase"}</span>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
              <div className="text-[10px] text-gray-400 dark:text-gray-500">Scanner Status</div>
              <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Layers size={12} />
                <span>Pending Backend</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
