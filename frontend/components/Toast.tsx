"use client";

import { CheckCircle2, XCircle, X } from "lucide-react";

export type ToastData = { id: number; message: string; type: "success" | "error" | "info" };

interface ToastProps {
  toasts: ToastData[];
  onDismiss: (id: number) => void;
}

export default function Toast({ toasts, onDismiss }: ToastProps) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2.5 border rounded-lg px-4 py-3 shadow-md text-sm pointer-events-auto min-w-[260px] max-w-xs bg-white ${
            t.type === "success" ? "border-green-200 text-green-700" :
            t.type === "error"   ? "border-red-200 text-red-700" :
                                    "border-gray-200 text-gray-700"
          }`}
        >
          {t.type === "success" ? <CheckCircle2 size={15} className="flex-shrink-0" /> :
           t.type === "error"   ? <XCircle size={15} className="flex-shrink-0" /> :
                                  <CheckCircle2 size={15} className="flex-shrink-0 text-gray-400" />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="opacity-40 hover:opacity-70">
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
