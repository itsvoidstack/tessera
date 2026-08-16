"use client";

import React from "react";
import { type Note } from "@/lib/store";
import { Sparkles, User, Tag, Calendar, Clock } from "lucide-react";

interface NoteCardProps {
  note: Note;
  onClick: () => void;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function NoteCard({ note, onClick }: NoteCardProps) {
  const isAi = note.noteType === "ai_generated" || note.tags?.includes("ai-insight");
  const displayDate = formatDate(note.updatedAt || note.date);

  const categoryLabels: Record<string, string> = {
    overall: "Overall Reference",
    architecture: "Architecture",
    quality: "Code Quality",
    security: "Security",
    files: "Important Files",
    onboarding: "Onboarding",
    changes: "Changes Summary",
  };


  const categoryName = note.insightType ? categoryLabels[note.insightType.toLowerCase()] || note.insightType : null;

  return (
    <div
      onClick={onClick}
      className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:shadow-md hover:border-[#1a5c38]/40 dark:hover:border-green-500/40 transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
              isAi
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
            }`}
          >
            {isAi ? (
              <>
                <Sparkles size={11} className="text-emerald-600 dark:text-emerald-400" />
                <span>✨ AI Insight</span>
              </>
            ) : (
              <>
                <User size={11} className="text-gray-500 dark:text-gray-400" />
                <span>Personal</span>
              </>
            )}
          </span>

          {categoryName && (
            <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500">
              {categoryName}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-[#1a5c38] dark:group-hover:text-green-400 transition-colors line-clamp-1 mb-1.5">
          {note.title || "Untitled Note"}
        </h3>

        {/* Preview */}
        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed mb-4">
          {note.preview || note.content?.slice(0, 120) || "Empty note content..."}
        </p>
      </div>

      {/* Footer Meta & Tags */}
      <div>
        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {note.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-medium rounded border border-gray-100 dark:border-gray-800"
              >
                <Tag size={9} className="text-gray-400" />
                {tag}
              </span>
            ))}
            {note.tags.length > 3 && (
              <span className="text-[10px] text-gray-400 self-center">
                +{note.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Timestamp */}
        <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-50 dark:border-gray-800/80">
          <span className="flex items-center gap-1">
            <Calendar size={11} />
            {displayDate}
          </span>
          {note.updatedAt && (
            <span className="flex items-center gap-1 text-[10px]" title="Updated date">
              <Clock size={10} /> Updated
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
