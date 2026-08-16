"use client";

import React, { useState, useMemo } from "react";
import { type Note } from "@/lib/store";
import NoteCard from "./NoteCard";
import {
  Plus, Sparkles, Search, Tag, ArrowUpDown, RefreshCw, AlertCircle, BookOpen, Filter, X
} from "lucide-react";

interface NotesDashboardProps {
  repoName: string;
  notes: Note[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onCreatePersonalNote: () => void;
  onOpenGenerateDialog: () => void;
  onSelectNote: (note: Note) => void;
}

export default function NotesDashboard({
  repoName,
  notes,
  isLoading,
  error,
  onRetry,
  onCreatePersonalNote,
  onOpenGenerateDialog,
  onSelectNote,
}: NotesDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"updated" | "created_desc" | "created_asc">("updated");

  // Extract unique tags from existing notes
  const allTags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => n.tags?.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [notes]);

  // Filter and sort notes
  const filteredNotes = useMemo(() => {
    return notes
      .filter((n) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = n.title?.toLowerCase().includes(q);
          const matchContent = n.content?.toLowerCase().includes(q);
          if (!matchTitle && !matchContent) return false;
        }

        // Tag filter
        if (selectedTag) {
          if (!n.tags?.includes(selectedTag)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "updated") {
          const dateA = new Date(a.updatedAt || a.date).getTime();
          const dateB = new Date(b.updatedAt || b.date).getTime();
          return dateB - dateA;
        }
        if (sortBy === "created_desc") {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA;
        }
        if (sortBy === "created_asc") {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateA - dateB;
        }
        return 0;
      });
  }, [notes, searchQuery, selectedTag, sortBy]);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0f172a] transition-colors overflow-hidden">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 bg-white/60 dark:bg-[#0f172a]/60 backdrop-blur-xs">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notes</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Engineering knowledge & repository insights for <strong className="text-gray-700 dark:text-gray-200">{repoName}</strong>
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenGenerateDialog}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100/50 dark:hover:bg-emerald-900/50 transition-colors shadow-2xs cursor-pointer"
          >
            <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span>Generate Insight</span>
          </button>

          <button
            onClick={onCreatePersonalNote}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1a5c38] hover:bg-[#145230] text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
          >
            <Plus size={14} />
            <span>Create Note</span>
          </button>
        </div>
      </div>

      {/* Toolbar: Search, Filters, Sort */}
      <div className="px-8 py-4 border-b border-gray-100 dark:border-gray-800/80 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 bg-gray-50/50 dark:bg-gray-900/40">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes by title or content..."
            className="w-full pl-9 pr-4 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-[#1a5c38] dark:focus:border-green-500 transition-colors shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Right Controls: Sort & Clear Filter */}
        <div className="flex items-center gap-2">
          {/* Active Tag Indicator / Clear */}
          {selectedTag && (
            <button
              onClick={() => setSelectedTag(null)}
              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs rounded-lg font-medium hover:bg-emerald-200 transition-colors cursor-pointer"
            >
              <Filter size={11} />
              <span>Tag: {selectedTag}</span>
              <X size={11} className="ml-1" />
            </button>
          )}

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 shadow-2xs">
            <ArrowUpDown size={13} className="text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent outline-none cursor-pointer font-medium"
            >
              <option value="updated">Recently Updated</option>
              <option value="created_desc">Newest First</option>
              <option value="created_asc">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tag Pills Bar */}
      {allTags.length > 0 && (
        <div className="px-8 py-2.5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2 overflow-x-auto flex-shrink-0 bg-white dark:bg-[#0f172a]">
          <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1 flex-shrink-0">
            <Tag size={11} /> Filter by tag:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex-shrink-0 ${
                selectedTag === null
                  ? "bg-[#1a5c38] text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              All Tags
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex-shrink-0 ${
                  selectedTag === tag
                    ? "bg-[#1a5c38] text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-center justify-between text-xs text-red-700 dark:text-red-300">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
            <button
              onClick={onRetry}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1"
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-44 bg-gray-100 dark:bg-gray-800/60 rounded-xl animate-pulse p-5 flex flex-col justify-between border border-gray-200/50 dark:border-gray-800"
              >
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : filteredNotes.length === 0 ? (
          /* Empty State */
          <div className="border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center bg-gray-50/40 dark:bg-gray-900/40 max-w-xl mx-auto my-12">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto mb-4 text-[#1a5c38] dark:text-green-400 shadow-xs">
              <BookOpen size={24} />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">
              No notes found
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed max-w-md mx-auto">
              Capture important architecture decisions, debugging thoughts, security observations, and repository insights here.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={onCreatePersonalNote}
                className="px-4 py-2 bg-[#1a5c38] hover:bg-[#145230] text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> Create Note
              </button>
              <button
                onClick={onOpenGenerateDialog}
                className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold hover:bg-emerald-100/50 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles size={14} /> Generate Repository Insight
              </button>
            </div>
          </div>
        ) : (
          /* Notes Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onClick={() => onSelectNote(note)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
