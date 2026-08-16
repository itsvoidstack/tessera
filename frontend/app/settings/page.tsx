"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppTopBar from "@/components/AppTopBar";
import Sidebar from "@/components/Sidebar";
import PageTransition from "@/components/PageTransition";
import Toast from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import { useTheme } from "@/lib/theme";
import { useAppStore } from "@/lib/store";
import {
  Sun, Moon, Monitor, Trash2, AlertTriangle, RotateCcw,
  LayoutGrid, BookOpen, ChevronRight,
} from "lucide-react";

/* ─── Small reusable primitives ─────────────────────────────────────────── */

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">{children}</div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 px-6 py-4">
      <div className="min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-white">{label}</div>
        {description && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
            {description}
          </div>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

/* Segmented control — 2 or 3 options */
function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg gap-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            value === opt.value
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function SettingsPage() {
  const router = useRouter();
  const { toasts, toast, dismiss } = useToast();
  const { theme, setTheme } = useTheme();
  const { projects } = useAppStore();

  /* local prefs — persisted in localStorage */
  const [defaultLanding, setDefaultLanding] = useState<"dashboard" | "landing">(() => {
    if (typeof window === "undefined") return "dashboard";
    return (localStorage.getItem("tessera_default_landing") as "dashboard" | "landing") ?? "dashboard";
  });

  const [motion, setMotion] = useState<"on" | "reduced">(() => {
    if (typeof window === "undefined") return "on";
    return (localStorage.getItem("tessera_motion") as "on" | "reduced") ?? "on";
  });

  const [defaultBranch, setDefaultBranch] = useState<"main" | "master" | "auto">(() => {
    if (typeof window === "undefined") return "auto";
    return (localStorage.getItem("tessera_default_branch") as "main" | "master" | "auto") ?? "auto";
  });

  const [clearConfirm, setClearConfirm] = useState<"projects" | "all" | null>(null);

  function saveLanding(val: "dashboard" | "landing") {
    setDefaultLanding(val);
    localStorage.setItem("tessera_default_landing", val);
    toast("Preference saved", "success");
  }

  function saveMotion(val: "on" | "reduced") {
    setMotion(val);
    localStorage.setItem("tessera_motion", val);
    toast("Preference saved", "success");
  }

  function saveBranch(val: "main" | "master" | "auto") {
    setDefaultBranch(val);
    localStorage.setItem("tessera_default_branch", val);
    toast("Preference saved", "success");
  }

  function handleClearProjects() {
    // Remove all projects from the persisted store key
    try {
      const raw = localStorage.getItem("tessera_store_v3");
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.projects = [];
        localStorage.setItem("tessera_store_v3", JSON.stringify(parsed));
      }
    } catch {
      // silent
    }
    setClearConfirm(null);
    toast("Saved projects cleared. Reload to see changes.", "success");
  }

  function handleClearAll() {
    // Wipe every tessera_ key
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("tessera_"));
    keys.forEach((k) => localStorage.removeItem(k));
    setClearConfirm(null);
    toast("All local data cleared. Reloading…", "success");
    setTimeout(() => router.push("/"), 1200);
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0b0f17] flex flex-col transition-colors">
      <AppTopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto bg-gray-50/40 dark:bg-gray-950/40">
          <PageTransition>
            <div className="max-w-2xl mx-auto px-6 py-10">

              {/* Page header */}
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Manage your preferences and local data.
                </p>
              </div>

              <div className="space-y-6">

                {/* ── General ────────────────────────────────────────── */}
                <SectionCard
                  title="General"
                  description="Appearance and interface preferences."
                >
                  {/* Appearance */}
                  <SettingRow
                    label="Appearance"
                    description="Choose between light and dark mode. Dark is the default."
                  >
                    <SegmentedControl
                      value={theme}
                      onChange={(v) => {
                        setTheme(v);
                        toast("Theme updated", "success");
                      }}
                      options={[
                        { value: "dark",  label: "Dark",  icon: <Moon  size={13} /> },
                        { value: "light", label: "Light", icon: <Sun   size={13} /> },
                      ]}
                    />
                  </SettingRow>

                  {/* Default landing page */}
                  <SettingRow
                    label="Default landing page"
                    description="Where you land after opening Tessera in a new tab."
                  >
                    <SegmentedControl
                      value={defaultLanding}
                      onChange={saveLanding}
                      options={[
                        { value: "dashboard", label: "Dashboard", icon: <LayoutGrid size={13} /> },
                        { value: "landing",   label: "Home",      icon: <Monitor    size={13} /> },
                      ]}
                    />
                  </SettingRow>

                  {/* Motion */}
                  <SettingRow
                    label="Motion"
                    description="Reduce animations for a calmer experience or if you prefer less movement."
                  >
                    <SegmentedControl
                      value={motion}
                      onChange={saveMotion}
                      options={[
                        { value: "on",      label: "On"      },
                        { value: "reduced", label: "Reduced" },
                      ]}
                    />
                  </SettingRow>
                </SectionCard>

                {/* ── Repository ─────────────────────────────────────── */}
                <SectionCard
                  title="Repository"
                  description="Defaults applied when adding or scanning repositories."
                >
                  {/* Default branch */}
                  <SettingRow
                    label="Default branch hint"
                    description="Used when the backend cannot detect the default branch automatically."
                  >
                    <SegmentedControl
                      value={defaultBranch}
                      onChange={saveBranch}
                      options={[
                        { value: "auto",   label: "Auto"   },
                        { value: "main",   label: "main"   },
                        { value: "master", label: "master" },
                      ]}
                    />
                  </SettingRow>

                  {/* Clear saved projects */}
                  <SettingRow
                    label="Clear saved projects"
                    description={`Remove all ${projects.length} locally saved project${projects.length !== 1 ? "s" : ""} from this browser. Analysis data cannot be recovered.`}
                  >
                    <button
                      onClick={() => setClearConfirm("projects")}
                      disabled={projects.length === 0}
                      className="flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                    >
                      <RotateCcw size={13} />
                      Clear Projects
                    </button>
                  </SettingRow>
                </SectionCard>

                {/* ── Danger Zone ────────────────────────────────────── */}
                <SectionCard title="Danger Zone">
                  <SettingRow
                    label="Clear all local data"
                    description="Deletes all Tessera data stored in this browser — projects, preferences, and session state. You will be redirected to the home page."
                  >
                    <button
                      onClick={() => setClearConfirm("all")}
                      className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/60 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                      Clear All Data
                    </button>
                  </SettingRow>
                </SectionCard>

                {/* Help link */}
                <div className="flex items-center justify-between px-1 pt-1">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Need help? Visit the{" "}
                    <button
                      onClick={() => router.push("/help")}
                      className="text-[#1a5c38] dark:text-green-400 hover:underline cursor-pointer"
                    >
                      Help &amp; Support
                    </button>{" "}
                    page.
                  </p>
                  <button
                    onClick={() => router.push("/help")}
                    className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <BookOpen size={13} />
                    Help &amp; Support
                    <ChevronRight size={12} />
                  </button>
                </div>

              </div>
            </div>
          </PageTransition>
        </main>
      </div>

      {/* ── Confirmation Modals ──────────────────────────────────────────── */}
      {clearConfirm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          onClick={() => setClearConfirm(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={17} className="text-red-500 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {clearConfirm === "projects" ? "Clear saved projects?" : "Clear all local data?"}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  {clearConfirm === "projects"
                    ? "All saved project data will be removed from this browser. This cannot be undone."
                    : "Every Tessera setting and project will be erased from this browser. You will be returned to the home page."}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setClearConfirm(null)}
                className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={clearConfirm === "projects" ? handleClearProjects : handleClearAll}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 text-xs font-medium transition-colors"
              >
                {clearConfirm === "projects" ? "Clear Projects" : "Clear Everything"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
