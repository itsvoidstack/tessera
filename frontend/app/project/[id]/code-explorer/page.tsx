"use client";

import { use, useState, useMemo, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FolderOpen, FileText, Folder, ChevronRight, ChevronDown, Search, ExternalLink, Code2, Copy, Check
} from "lucide-react";

interface FileItem {
  path: string;
  size: number;
  content: string;
}

export default function CodeExplorerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { getProject } = useAppStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileParam = searchParams.get("file");
  const project = getProject(id);

  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(fileParam);
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (fileParam) {
      setSelectedFilePath(fileParam);
    }
  }, [fileParam]);

  const files = useMemo(() => project?.files ?? [], [project]);

  const activeFile = useMemo(() => {
    if (!files || files.length === 0) return null;
    if (selectedFilePath) {
      const match = files.find((f) => f.path === selectedFilePath);
      if (match) return match;
    }
    return files[0];
  }, [files, selectedFilePath]);

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;
    return files.filter((f) => f.path.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [files, searchQuery]);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-center px-8">
        <div className="text-3xl mb-3">🔍</div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
          Project not found
        </h2>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-4 py-2 bg-[#1a5c38] text-white rounded-lg text-xs font-medium hover:bg-[#145230] transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  function handleCopyCode() {
    if (!activeFile?.content) return;
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0f172a] transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Code Explorer</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Browse source code and inspect files from <strong>{project.owner}/{project.repo}</strong>.
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

      <div className="flex-1 flex overflow-hidden">
        {files.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-gray-50/40 dark:bg-gray-900/40">
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center mb-4 shadow-sm">
              <FolderOpen size={24} className="text-[#1a5c38] dark:text-green-400" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              No Files Analyzed Yet
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mb-6 leading-relaxed">
              Run repository analysis to retrieve source code files from GitHub.
            </p>
          </div>
        ) : (
          <>
            {/* Left Sidebar: File Tree */}
            <div className="w-[280px] border-r border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex flex-col flex-shrink-0">
              <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-900">
                  <Search size={13} className="text-gray-400" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search files..."
                    className="text-xs outline-none bg-transparent w-full text-gray-800 dark:text-gray-200 placeholder-gray-400"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {filteredFiles.map((file) => {
                  const isSelected = activeFile?.path === file.path;
                  const parts = file.path.split("/");
                  const filename = parts.pop() || file.path;
                  const dir = parts.join("/");

                  return (
                    <button
                      key={file.path}
                      onClick={() => setSelectedFilePath(file.path)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-colors flex items-center gap-2.5 cursor-pointer ${
                        isSelected
                          ? "bg-white dark:bg-gray-800 text-[#1a5c38] dark:text-green-400 font-semibold shadow-2xs border border-gray-200/60 dark:border-gray-700/60"
                          : "text-gray-700 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-800/40"
                      }`}
                    >
                      <FileText
                        size={14}
                        className={
                          isSelected
                            ? "text-[#1a5c38] dark:text-green-400 flex-shrink-0"
                            : "text-gray-400 flex-shrink-0"
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{filename}</div>
                        {dir && (
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 font-sans truncate">
                            {dir}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Main Panel: File Content Viewer */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#0f172a]">
              {activeFile ? (
                <>
                  {/* File Header */}
                  <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 flex-shrink-0">
                    <div className="flex items-center gap-2 text-xs font-mono text-gray-800 dark:text-gray-200 truncate">
                      <Code2 size={14} className="text-[#1a5c38] dark:text-green-400 flex-shrink-0" />
                      <span className="font-semibold">{activeFile.path}</span>
                      <span className="text-[11px] text-gray-400 font-sans">
                        ({(activeFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>

                    <button
                      onClick={handleCopyCode}
                      className="flex items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check size={12} className="text-green-500" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={12} /> Copy Code
                        </>
                      )}
                    </button>
                  </div>

                  {/* Code View */}
                  <div className="flex-1 overflow-auto bg-gray-900 text-gray-100 p-4 font-mono text-xs leading-relaxed border-t border-gray-800">
                    <pre className="whitespace-pre">
                      <code>{activeFile.content}</code>
                    </pre>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-gray-400">
                  Select a file from the sidebar to view content.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
