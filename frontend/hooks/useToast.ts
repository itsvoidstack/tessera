"use client";

import { useState, useCallback, useRef } from "react";
import type { ToastData } from "@/components/Toast";

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const counter = useRef(0);

  const toast = useCallback((message: string, type: ToastData["type"] = "success") => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, toast, dismiss };
}
