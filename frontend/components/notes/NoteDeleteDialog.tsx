"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

interface NoteDeleteDialogProps {
  noteTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export default function NoteDeleteDialog({
  noteTitle,
  onConfirm,
  onCancel,
  isDeleting = false,
}: NoteDeleteDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl p-6 w-full max-w-md animate-fade-in">
        <div className="flex items-center gap-3 mb-3 text-red-600 dark:text-red-400">
          <div className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-950/50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} />
          </div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Delete Note?</h2>
        </div>

        <p className="text-xs text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
          &ldquo;<strong className="text-gray-900 dark:text-white">{noteTitle}</strong>&rdquo; will be permanently deleted. This action cannot be undone.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete Note"}
          </button>
        </div>
      </div>
    </div>
  );
}
