"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useAppStore, type Note } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { generateNoteInsight } from "@/lib/api-client";
import { useRouter } from "next/navigation";

import NotesDashboard from "@/components/notes/NotesDashboard";
import NoteEditor from "@/components/notes/NoteEditor";
import NoteGenerationDialog from "@/components/notes/NoteGenerationDialog";
import NoteDeleteDialog from "@/components/notes/NoteDeleteDialog";

export default function NotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { getProject, addNote, updateNote, deleteNote } = useAppStore();
  const router = useRouter();
  const project = getProject(id);

  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"dashboard" | "editor">("dashboard");

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Real Supabase fetching — strictly no dummy fallback
  const fetchNotes = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Supabase query failed: ${error.message}`);
      }

      if (data) {
        const fetchedNotes: Note[] = data.map((n) => {
          const isAi = n.note_type === "ai_generated" || n.tags?.includes("ai-insight");
          return {
            id: n.id,
            title: n.title || (isAi ? "AI Insight" : "Untitled Personal Note"),
            preview: n.preview || "",
            content: n.content || "",
            date: n.date || n.created_at,
            updatedAt: n.updated_at || n.date || n.created_at,
            tags: n.tags || (isAi ? ["ai-insight"] : ["Personal"]),
            noteType: n.note_type || (isAi ? "ai_generated" : "personal"),
            insightType: n.insight_type || null,
            lastScanId: n.last_scan_id || null,
          };
        });

        setNotes(fetchedNotes);
        fetchedNotes.forEach((n) => addNote(id, n));
      } else {
        setNotes([]);
      }
    } catch (err: any) {
      console.error("Supabase load error:", err);
      setErrorMsg(err?.message || "Unable to load notes from Supabase database. Click Retry to reload.");
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  }, [id, addNote]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-center px-8">
        <div className="text-3xl mb-3">🔍</div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
          Project not found
        </h2>
        <p className="text-xs text-gray-500 mb-4">The requested project ID does not exist in store.</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-4 py-2 bg-[#1a5c38] text-white rounded-lg text-xs font-medium hover:bg-[#145230] transition-colors cursor-pointer"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const repoFullName = project.repoUrl || `${project.owner}/${project.repo}`;

  // Handle Personal Note Creation (Persist to Supabase BEFORE updating UI)
  async function handleCreatePersonalNote() {
    const newId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    const nowIso = new Date().toISOString();

    const newNote: Note = {
      id: newId,
      title: "Untitled Personal Note",
      preview: "Start typing your engineering thoughts...",
      content: "",
      date: nowIso,
      updatedAt: nowIso,
      tags: ["personal"],
      noteType: "personal",
    };

    // 1. Insert into Supabase
    const { data: authData } = await supabase.auth.getUser();
    const { error } = await supabase.from("notes").insert({
      id: newNote.id,
      user_id: authData?.user?.id || null,
      project_id: id,
      title: newNote.title,
      preview: newNote.preview,
      content: newNote.content,
      tags: newNote.tags,
      note_type: "personal",
      updated_at: nowIso,
    });

    if (error) {
      throw new Error(`Failed to create note in Supabase: ${error.message}`);
    }

    // 2. Only update UI & store after Supabase insert succeeds
    setNotes((prev) => [newNote, ...prev]);
    addNote(id, newNote);
    setActiveNoteId(newId);
    setViewMode("editor");
  }

  // Handle Personal Note Save (Persist to Supabase BEFORE updating UI)
  async function handleSaveNote(updates: Partial<Note>) {
    if (!activeNoteId) return;

    const nowIso = new Date().toISOString();

    // 1. Update in Supabase
    const { error } = await supabase
      .from("notes")
      .update({
        title: updates.title,
        content: updates.content,
        preview: updates.preview,
        tags: updates.tags,
        updated_at: nowIso,
      })
      .eq("id", activeNoteId);

    if (error) {
      throw new Error(`Save failed in Supabase: ${error.message}`);
    }

    // 2. Only update local state & store after Supabase update succeeds
    const updatedPayload = { ...updates, updatedAt: nowIso };
    setNotes((prev) =>
      prev.map((n) => (n.id === activeNoteId ? { ...n, ...updatedPayload } : n))
    );
    updateNote(id, activeNoteId, updatedPayload);
  }

  // Handle Delete Confirmation (Persist to Supabase BEFORE updating UI)
  async function handleConfirmDelete() {
    if (!noteToDelete) return;
    setIsDeleting(true);
    try {
      // 1. Delete from Supabase
      const { error } = await supabase.from("notes").delete().eq("id", noteToDelete.id);
      if (error) {
        throw new Error(`Delete failed: ${error.message}`);
      }

      // 2. Only remove from UI state & store after Supabase delete succeeds
      setNotes((prev) => prev.filter((n) => n.id !== noteToDelete.id));
      deleteNote(id, noteToDelete.id);

      if (activeNoteId === noteToDelete.id) {
        setActiveNoteId(null);
        setViewMode("dashboard");
      }
      setNoteToDelete(null);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to delete note from Supabase.");
    } finally {
      setIsDeleting(false);
    }
  }

  // Handle AI Insight Generation (Deduplicate per project + insight_type + scan)
  async function handleGenerateInsight(insightType: string) {
    if (!project) return;

    const response = await generateNoteInsight(
      repoFullName,
      insightType,
      project.scanId,
      project.aiAnalysis,
      project.files
    );

    if (!response || !response.content) {
      throw new Error("Received empty response from AI backend service.");
    }

    const nowIso = new Date().toISOString();
    const cleanInsightType = insightType.toLowerCase().trim();

    // Check if an AI note for this insight type already exists in this project
    const existingAiNote = notes.find(
      (n) => n.noteType === "ai_generated" && n.insightType?.toLowerCase() === cleanInsightType
    );

    if (existingAiNote) {
      // Update existing AI note instead of creating a duplicate
      const updatedPreview = response.content.replace(/#+\s*/g, "").replace(/\n/g, " ").slice(0, 80);
      const updates: Partial<Note> = {
        title: response.title,
        content: response.content,
        preview: updatedPreview,
        updatedAt: nowIso,
        lastScanId: project.scanId || "v1",
      };

      // 1. Persist to Supabase
      const { error } = await supabase
        .from("notes")
        .update({
          title: response.title,
          content: response.content,
          preview: updatedPreview,
          updated_at: nowIso,
          last_scan_id: updates.lastScanId,
        })
        .eq("id", existingAiNote.id);

      if (error) {
        throw new Error(`Failed to update AI note in Supabase: ${error.message}`);
      }

      // 2. Only update UI & store after Supabase succeeds
      setNotes((prev) =>
        prev.map((n) => (n.id === existingAiNote.id ? { ...n, ...updates } : n))
      );
      updateNote(id, existingAiNote.id, updates);
      setActiveNoteId(existingAiNote.id);
    } else {
      // Insert new AI note
      const newId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
      const aiNote: Note = {
        id: newId,
        title: response.title,
        preview: response.content.replace(/#+\s*/g, "").replace(/\n/g, " ").slice(0, 80),
        content: response.content,
        date: nowIso,
        updatedAt: nowIso,
        tags: response.tags || [insightType, "ai-insight"],
        noteType: "ai_generated",
        insightType: cleanInsightType,
        lastScanId: project.scanId || "v1",
      };

      // 1. Persist to Supabase
      const { data: authData } = await supabase.auth.getUser();
      const { error } = await supabase.from("notes").insert({
        id: aiNote.id,
        user_id: authData?.user?.id || null,
        project_id: id,
        title: aiNote.title,
        preview: aiNote.preview,
        content: aiNote.content,
        tags: aiNote.tags,
        note_type: "ai_generated",
        insight_type: cleanInsightType,
        last_scan_id: aiNote.lastScanId,
        updated_at: nowIso,
      });

      if (error) {
        throw new Error(`Failed to save AI note in Supabase: ${error.message}`);
      }

      // 2. Only update UI & store after Supabase succeeds
      setNotes((prev) => [aiNote, ...prev]);
      addNote(id, aiNote);
      setActiveNoteId(newId);
    }
  }

  // Handle Refreshing an Existing AI Note (Preserve previous content if backend/generation fails)
  async function handleRefreshAiNote(targetNote: Note) {
    if (!project) return;
    const insightType = targetNote.insightType || "architecture";

    // 1. Call backend (if it fails, error is thrown and targetNote remains untouched)
    const response = await generateNoteInsight(
      repoFullName,
      insightType,
      project.scanId,
      project.aiAnalysis,
      project.files
    );

    if (!response || !response.content) {
      throw new Error("Generation produced empty content.");
    }

    const nowIso = new Date().toISOString();
    const updatedContent = response.content;
    const updatedPreview = updatedContent.replace(/#+\s*/g, "").replace(/\n/g, " ").slice(0, 80);

    // 2. Persist to Supabase
    const { error } = await supabase
      .from("notes")
      .update({
        content: updatedContent,
        preview: updatedPreview,
        updated_at: nowIso,
        last_scan_id: project.scanId || "v1",
      })
      .eq("id", targetNote.id);

    if (error) {
      throw new Error(`Failed to refresh AI note in Supabase: ${error.message}`);
    }

    // 3. Only update local state after Supabase succeeds
    const updates: Partial<Note> = {
      content: updatedContent,
      preview: updatedPreview,
      updatedAt: nowIso,
      lastScanId: project.scanId || "v1",
    };

    setNotes((prev) =>
      prev.map((n) => (n.id === targetNote.id ? { ...n, ...updates } : n))
    );
    updateNote(id, targetNote.id, updates);
  }

  const activeNote = notes.find((n) => n.id === activeNoteId);

  return (
    <div className="h-full flex flex-col flex-1 min-h-0 bg-white dark:bg-[#0f172a] transition-colors overflow-hidden">

      {viewMode === "editor" && activeNote ? (
        <NoteEditor
          note={activeNote}
          onBack={() => setViewMode("dashboard")}
          onSave={handleSaveNote}
          onDelete={(noteId) => {
            const found = notes.find((n) => n.id === noteId);
            if (found) setNoteToDelete(found);
          }}
          onRefreshAiNote={handleRefreshAiNote}
        />
      ) : (
        <NotesDashboard
          repoName={repoFullName}
          notes={notes}
          isLoading={isLoading}
          error={errorMsg}
          onRetry={fetchNotes}
          onCreatePersonalNote={handleCreatePersonalNote}
          onOpenGenerateDialog={() => setShowGenerateDialog(true)}
          onSelectNote={(note) => {
            setActiveNoteId(note.id);
            setViewMode("editor");
          }}
        />
      )}

      {/* Generate AI Insight Modal */}
      {showGenerateDialog && (
        <NoteGenerationDialog
          repoName={repoFullName}
          onGenerate={handleGenerateInsight}
          onClose={() => setShowGenerateDialog(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {noteToDelete && (
        <NoteDeleteDialog
          noteTitle={noteToDelete.title}
          isDeleting={isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setNoteToDelete(null)}
        />
      )}
    </div>
  );
}
