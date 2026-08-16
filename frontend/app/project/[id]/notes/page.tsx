"use client";

import { use, useState, useEffect } from "react";
import { useAppStore, type Note } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  Plus, Edit3, Download, Trash2, X, Check,
  Sparkles, BookOpen, Layers, Lock, Database, Code2, GitBranch, Lightbulb, UserCheck,
} from "lucide-react";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

const AI_NOTE_SECTIONS = [
  { id: "overview", title: "Project Overview", icon: BookOpen },
  { id: "architecture", title: "Architecture", icon: Layers },
  { id: "auth", title: "Authentication", icon: Lock },
  { id: "database", title: "Database Layer", icon: Database },
  { id: "api", title: "API Layer", icon: Code2 },
  { id: "files", title: "Important Files", icon: GitBranch },
  { id: "flow", title: "Data Flow", icon: Lightbulb },
  { id: "concepts", title: "Key Concepts", icon: Sparkles },
  { id: "contributing", title: "Things to Know Before Contributing", icon: UserCheck },
];

export default function NotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { getProject, addNote, updateNote, deleteNote } = useAppStore();
  const router = useRouter();
  const project = getProject(id);

  const [activeTab, setActiveTab] = useState<"ai" | "personal">("ai");
  const [selectedAiSection, setSelectedAiSection] = useState("overview");
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Fetch persisted notes from Supabase database on mount
  useEffect(() => {
    async function fetchDatabaseNotes() {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from("notes")
          .select("*")
          .eq("project_id", id)
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          data.forEach((n) => {
            const fetchedNote: Note = {
              id: n.id,
              title: n.title,
              preview: n.preview || "",
              content: n.content || "",
              date: n.date || n.created_at,
              tags: n.tags || ["Personal"],
            };
            addNote(id, fetchedNote);
          });
        }
      } catch {
        // Fallback safely if table doesn't exist yet or offline
      }
    }
    fetchDatabaseNotes();
  }, [id, addNote]);

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

  const personalNotes = project.notes;
  const effectiveActiveId = activeNoteId ?? personalNotes[0]?.id ?? null;
  const activePersonalNote = personalNotes.find((n) => n.id === effectiveActiveId) ?? null;

  async function handleAddPersonalNote() {
    const newNoteId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    const newNote: Note = {
      id: newNoteId,
      title: "Untitled Personal Note",
      preview: "Start writing...",
      date: new Date().toISOString(),
      tags: ["Personal"],
      content: "",
    };

    addNote(id, newNote);
    setActiveNoteId(newNote.id);
    setActiveTab("personal");
    setTitleDraft("Untitled Personal Note");
    setEditingTitle(true);

    // Persist to Supabase database
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("notes").insert({
          id: newNote.id,
          user_id: user.id,
          project_id: id,
          title: newNote.title,
          preview: newNote.preview,
          content: newNote.content,
          tags: newNote.tags,
        });
      }
    } catch {
      // Ignore database offline errors
    }
  }

  async function handleContentChange(content: string) {
    if (!effectiveActiveId) return;
    const preview = content.replace(/#+\s*/g, "").replace(/\n/g, " ").slice(0, 60) || "Empty note";
    const nowIso = new Date().toISOString();
    updateNote(id, effectiveActiveId, {
      content,
      preview,
      date: nowIso,
    });

    // Update in Supabase database
    try {
      await supabase
        .from("notes")
        .update({ content, preview, date: nowIso })
        .eq("id", effectiveActiveId);
    } catch {
      // Ignore database offline errors
    }
  }

  async function commitTitle() {
    if (!effectiveActiveId || !titleDraft.trim()) return;
    const cleanTitle = titleDraft.trim();
    updateNote(id, effectiveActiveId, { title: cleanTitle });
    setEditingTitle(false);

    // Update in Supabase database
    try {
      await supabase
        .from("notes")
        .update({ title: cleanTitle })
        .eq("id", effectiveActiveId);
    } catch {
      // Ignore database offline errors
    }
  }

  async function handleDeleteNote(noteId: string) {
    deleteNote(id, noteId);
    setDeleteConfirm(null);
    if (effectiveActiveId === noteId) {
      const remaining = personalNotes.filter((n) => n.id !== noteId);
      setActiveNoteId(remaining[0]?.id ?? null);
    }

    // Delete from Supabase database
    try {
      await supabase.from("notes").delete().eq("id", noteId);
    } catch {
      // Ignore database offline errors
    }
  }

  function handleExportMarkdown() {
    if (!activePersonalNote) return;
    const blob = new Blob([activePersonalNote.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activePersonalNote.title.replace(/\s+/g, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const currentAiSec = AI_NOTE_SECTIONS.find((s) => s.id === selectedAiSection) ?? AI_NOTE_SECTIONS[0];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0f172a] transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Codebase Notes</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Student-style learning notes automatically compiled from the repository code.
          </p>
        </div>

        {/* Tab switcher + Add Note */}
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("ai")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "ai"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Sparkles size={13} className="text-[#1a5c38] dark:text-green-400" />
              AI Codebase Notes
            </button>
            <button
              onClick={() => setActiveTab("personal")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "personal"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <BookOpen size={13} />
              My Personal Notes ({personalNotes.length})
            </button>
          </div>

          <button
            onClick={handleAddPersonalNote}
            className="flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium transition-colors cursor-pointer"
          >
            <Plus size={14} /> Add Note
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {activeTab === "ai" ? (
          /* AI Notes View */
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar Sections */}
            <div className="w-[240px] flex-shrink-0 border-r border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 p-3 overflow-y-auto">
              <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 mb-2">
                Learning Sections
              </div>
              <div className="space-y-0.5">
                {AI_NOTE_SECTIONS.map((sec) => {
                  const Icon = sec.icon;
                  const active = sec.id === selectedAiSection;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => setSelectedAiSection(sec.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                        active
                          ? "bg-white dark:bg-gray-800 text-[#1a5c38] dark:text-green-400 shadow-sm font-semibold"
                          : "text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      <Icon size={14} className={active ? "text-[#1a5c38] dark:text-green-400" : "text-gray-400 dark:text-gray-500"} />
                      <span>{sec.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI Note Content */}
            <div className="flex-1 overflow-y-auto p-8 max-w-4xl">
              <div className="flex items-center gap-2.5 mb-2">
                <currentAiSec.icon size={20} className="text-[#1a5c38] dark:text-green-400" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{currentAiSec.title}</h2>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                Automated codebase breakdown for <strong className="text-gray-700 dark:text-gray-200">{project.owner}/{project.repo}</strong>.
              </p>

              {project.aiAnalysis ? (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
                  <div className="prose dark:prose-invert text-xs leading-relaxed font-mono whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                    {project.aiAnalysis}
                  </div>
                </div>
              ) : (
                <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-10 text-center bg-gray-50/40 dark:bg-gray-900/40 my-4">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <Sparkles size={20} className="text-[#1a5c38] dark:text-green-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    AI Notes Pending Analysis
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4 leading-relaxed">
                    Run repository scan to generate automated learning notes explaining {currentAiSec.title.toLowerCase()}.
                  </p>
                  <div className="inline-flex items-center gap-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-gray-600 dark:text-gray-300 font-mono">
                    {project.owner}/{project.repo} · {project.language || "Codebase"}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Personal Notes Editor View */
          <div className="flex-1 flex overflow-hidden">
            {/* Notes Sidebar */}
            <div className="w-[220px] flex-shrink-0 border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0f172a] flex flex-col">
              <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                <button
                  onClick={handleAddPersonalNote}
                  className="w-full flex items-center justify-center gap-1.5 border border-gray-200 dark:border-gray-700 rounded-lg py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium transition-colors cursor-pointer"
                >
                  <Plus size={13} /> New Personal Note
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-1">
                {personalNotes.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-gray-400 dark:text-gray-500">
                    No personal notes yet. Click &quot;+ Add Note&quot; to create one.
                  </div>
                ) : (
                  personalNotes.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => setActiveNoteId(note.id)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-50 dark:border-gray-800 transition-colors ${
                        note.id === effectiveActiveId
                          ? "bg-gray-50 dark:bg-gray-800/60"
                          : "hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
                      }`}
                    >
                      <div className={`text-xs truncate mb-0.5 ${
                        note.id === effectiveActiveId
                          ? "text-[#1a5c38] dark:text-green-400 font-bold"
                          : "text-gray-800 dark:text-gray-200"
                      }`}>
                        {note.title}
                      </div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate mb-1">{note.preview}</div>
                      <div className="text-[9px] text-gray-300 dark:text-gray-600">{formatDate(note.date)}</div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Note Editor */}
            {activePersonalNote ? (
              <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#0f172a]">
                <div className="px-8 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  {editingTitle ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        autoFocus
                        value={titleDraft}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitTitle();
                          if (e.key === "Escape") setEditingTitle(false);
                        }}
                        className="text-lg font-bold text-gray-900 dark:text-white outline-none border-b-2 border-[#1a5c38] dark:border-green-400 bg-transparent flex-1"
                      />
                      <button onClick={commitTitle} className="p-1 text-[#1a5c38] dark:text-green-400 cursor-pointer">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setEditingTitle(false)} className="p-1 text-gray-400 dark:text-gray-500 cursor-pointer">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      {activePersonalNote.title}
                      <button
                        onClick={() => { setTitleDraft(activePersonalNote.title); setEditingTitle(true); }}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors cursor-pointer"
                      >
                        <Edit3 size={13} className="text-gray-400 dark:text-gray-500" />
                      </button>
                    </h2>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportMarkdown}
                      className="p-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs flex items-center gap-1 border border-gray-200 dark:border-gray-700 transition-colors cursor-pointer"
                    >
                      <Download size={12} /> Export
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(activePersonalNote.id)}
                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 dark:text-red-400 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-8">
                  <textarea
                    value={activePersonalNote.content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder="Write your custom notes about this repository here..."
                    className="w-full h-full text-sm text-gray-800 dark:text-gray-200 leading-relaxed outline-none resize-none bg-transparent placeholder-gray-300 dark:placeholder-gray-600"
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-xs text-gray-400 dark:text-gray-500">
                Select or create a personal note.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl p-6 w-full max-w-sm animate-fade-in">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Delete Note?</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
              &ldquo;{personalNotes.find((n) => n.id === deleteConfirm)?.title}&rdquo; will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteNote(deleteConfirm)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 text-xs font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
