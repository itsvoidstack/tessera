"use client";

import React, { useState, useEffect, useRef } from "react";
import { type Note } from "@/lib/store";
import {
  ArrowLeft, Save, Trash2, Check, AlertCircle, RefreshCw,
  Sparkles, User, Tag, Plus, X, Eye, Edit3, Clock
} from "lucide-react";

interface NoteEditorProps {
  note: Note;
  onBack: () => void;
  onSave: (updates: Partial<Note>) => Promise<void>;
  onDelete: (noteId: string) => void;
  onRefreshAiNote?: (note: Note) => Promise<void>;
}

export default function NoteEditor({
  note,
  onBack,
  onSave,
  onDelete,
  onRefreshAiNote,
}: NoteEditorProps) {
  const isAi = note.noteType === "ai_generated" || note.tags?.includes("ai-insight");

  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tags, setTags] = useState<string[]>(note.tags || []);
  const [newTagInput, setNewTagInput] = useState("");
  const [showAddTag, setShowAddTag] = useState(false);

  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [viewMode, setViewMode] = useState<"edit" | "preview">(isAi ? "preview" : "edit");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state when active note changes
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setTags(note.tags || []);
    setSaveState("idle");
    setViewMode(isAi ? "preview" : "edit");
  }, [note.id, note.title, note.content, note.tags, isAi]);

  // Debounced Autosave for personal notes
  function handleContentChange(val: string) {
    setContent(val);
    if (isAi) return;

    setSaveState("saving");
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = setTimeout(async () => {
      try {
        const preview = val.replace(/#+\s*/g, "").replace(/\n/g, " ").slice(0, 80) || "Empty note";
        await onSave({ content: val, preview, updatedAt: new Date().toISOString() });
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 1000);
  }

  async function handleManualSave() {
    if (isAi) return;
    setSaveState("saving");
    try {
      const cleanTitle = title.trim() || "Untitled Personal Note";
      const preview = content.replace(/#+\s*/g, "").replace(/\n/g, " ").slice(0, 80) || "Empty note";
      await onSave({
        title: cleanTitle,
        content,
        preview,
        tags,
        updatedAt: new Date().toISOString(),
      });
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  async function handleAddTag() {
    const clean = newTagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (clean && !tags.includes(clean)) {
      const updated = [...tags, clean];
      setTags(updated);
      if (!isAi) {
        setSaveState("saving");
        try {
          await onSave({ tags: updated });
          setSaveState("saved");
        } catch {
          setSaveState("error");
        }
      }
    }
    setNewTagInput("");
    setShowAddTag(false);
  }

  async function handleRemoveTag(tagToRemove: string) {
    const updated = tags.filter((t) => t !== tagToRemove);
    setTags(updated);
    if (!isAi) {
      setSaveState("saving");
      try {
        await onSave({ tags: updated });
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }
  }


  async function handleRefresh() {
    if (!onRefreshAiNote) return;
    setIsRefreshing(true);
    try {
      await onRefreshAiNote(note);
    } catch {
      // Handled by parent
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0f172a] transition-colors overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Notes
          </button>

          {/* Badge */}
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isAi
                ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
            }`}
          >
            {isAi ? (
              <>
                <Sparkles size={12} className="text-emerald-600 dark:text-emerald-400" />
                <span>✨ AI Insight</span>
              </>
            ) : (
              <>
                <User size={12} className="text-gray-500 dark:text-gray-400" />
                <span>Personal Note</span>
              </>
            )}
          </span>
        </div>

        {/* Actions & Status */}
        <div className="flex items-center gap-3">
          {/* Autosave state indicator */}
          {!isAi && (
            <div className="text-xs font-medium flex items-center gap-1.5">
              {saveState === "saving" && (
                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <RefreshCw size={12} className="animate-spin" /> Saving...
                </span>
              )}
              {saveState === "saved" && (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check size={13} /> Saved
                </span>
              )}
              {saveState === "error" && (
                <button
                  onClick={handleManualSave}
                  className="text-red-600 dark:text-red-400 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <AlertCircle size={13} /> Save failed · Retry
                </button>
              )}
            </div>
          )}

          {/* View mode toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg">
            <button
              onClick={() => setViewMode("edit")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                viewMode === "edit"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Edit3 size={12} /> Edit
            </button>
            <button
              onClick={() => setViewMode("preview")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                viewMode === "preview"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Eye size={12} /> Preview
            </button>
          </div>

          {/* Refresh AI Note button */}
          {isAi && onRefreshAiNote && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-semibold hover:bg-emerald-100/50 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
              {isRefreshing ? "Refreshing..." : "Refresh Insight"}
            </button>
          )}

          {/* Save Personal Note Button */}
          {!isAi && (
            <button
              onClick={handleManualSave}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1a5c38] hover:bg-[#145230] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Save size={13} /> Save
            </button>
          )}

          {/* Delete Button */}
          <button
            onClick={() => onDelete(note.id)}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
            title="Delete note"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl w-full mx-auto">
        {/* Title Input or Heading */}
        <div className="mb-4">
          {!isAi && viewMode === "edit" ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleManualSave}
              placeholder="Note title..."
              className="w-full text-2xl font-bold text-gray-900 dark:text-white bg-transparent border-b border-transparent focus:border-[#1a5c38] dark:focus:border-green-500 outline-none pb-1 transition-colors"
            />
          ) : (
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {title || "Untitled Note"}
            </h1>
          )}

          {/* Meta Information Subtitle */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 dark:text-gray-500 mt-2">
            {isAi && (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <Sparkles size={12} /> Generated from repository analysis
              </span>
            )}
            {note.updatedAt && (
              <span className="flex items-center gap-1">
                <Clock size={11} /> Updated: {new Date(note.updatedAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Tags Section */}
        <div className="flex flex-wrap items-center gap-1.5 mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <Tag size={13} className="text-gray-400 mr-1" />
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg"
            >
              {tag}
              {!isAi && (
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-red-500 transition-colors ml-0.5"
                >
                  <X size={11} />
                </button>
              )}
            </span>
          ))}

          {!isAi && (
            showAddTag ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  autoFocus
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddTag();
                    if (e.key === "Escape") setShowAddTag(false);
                  }}
                  placeholder="tag-name"
                  className="px-2 py-0.5 text-xs bg-gray-50 dark:bg-gray-800 border border-[#1a5c38] dark:border-green-500 rounded-md outline-none text-gray-900 dark:text-white"
                />
                <button onClick={handleAddTag} className="text-[#1a5c38] dark:text-green-400 text-xs font-bold px-1">
                  Add
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddTag(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-xs rounded-lg hover:border-gray-400 transition-colors cursor-pointer"
              >
                <Plus size={12} /> Tag
              </button>
            )
          )}
        </div>

        {/* Content Area */}
        {viewMode === "edit" && !isAi ? (
          <div className="min-h-[400px]">
            <textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Write your engineering notes, debugging observations, or architecture ideas..."
              className="w-full h-[500px] text-sm text-gray-800 dark:text-gray-200 leading-relaxed outline-none resize-y bg-transparent placeholder-gray-400 font-mono p-2"
            />
          </div>
        ) : (
          /* Formatted Preview Mode */
          <div className="prose dark:prose-invert max-w-none text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-sans space-y-4 bg-gray-50/50 dark:bg-gray-900/40 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
            <SimpleMarkdownRenderer content={content} />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Lightweight, zero-dependency Markdown Formatter for Notes
 */
function SimpleMarkdownRenderer({ content }: { content: string }) {
  if (!content) {
    return <p className="text-xs text-gray-400 italic">Empty note content.</p>;
  }

  const lines = content.split("\n");
  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        if (line.startsWith("# ")) {
          return (
            <h1 key={idx} className="text-xl font-bold text-gray-900 dark:text-white pt-2 pb-1 border-b border-gray-200 dark:border-gray-800">
              {line.replace("# ", "")}
            </h1>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h2 key={idx} className="text-base font-bold text-gray-900 dark:text-white pt-3 pb-0.5">
              {line.replace("## ", "")}
            </h2>
          );
        }
        if (line.startsWith("### ")) {
          return (
            <h3 key={idx} className="text-sm font-bold text-gray-800 dark:text-gray-200 pt-2">
              {line.replace("### ", "")}
            </h3>
          );
        }
        if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
          return (
            <li key={idx} className="ml-4 text-xs text-gray-700 dark:text-gray-300 list-disc">
              {line.trim().slice(2)}
            </li>
          );
        }
        if (line.startsWith("```")) {
          return null; // Code block fence
        }
        if (!line.trim()) {
          return <div key={idx} className="h-2" />;
        }
        return (
          <p key={idx} className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-sans">
            {line}
          </p>
        );
      })}
    </div>
  );
}
