"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppTopBar from "@/components/AppTopBar";
import Sidebar from "@/components/Sidebar";
import PageTransition from "@/components/PageTransition";
import Toast from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import { useTheme } from "@/lib/theme";
import { useAppStore } from "@/lib/store";
import {
  Sun, Moon, Monitor, Trash2, RotateCcw,
  LayoutGrid, ChevronRight, Cpu, CheckCircle2,
  Key, ShieldCheck, Zap, RefreshCw, Sparkles,
  Layers, Compass, Award, Terminal
} from "lucide-react";

import {
  fetchAIEngineStatus,
  testAIEngine,
  updateGeminiPreferences,
  disconnectGeminiBYOK,
  AIEngineStatusResponse,
} from "@/lib/api-client";

/* ─── Reusable Card Components ─────────────────────────────────────────── */

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
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
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

/* ─── Main Settings Page ─────────────────────────────────────────────────── */

export default function SettingsPage() {
  const router = useRouter();
  const { toasts, toast, dismiss } = useToast();
  const { theme, setTheme } = useTheme();
  const { projects } = useAppStore();

  /* Local prefs */
  const [defaultLanding, setDefaultLanding] = useState<"dashboard" | "landing">(() => {
    if (typeof window === "undefined") return "dashboard";
    return (localStorage.getItem("tessera_default_landing") as "dashboard" | "landing") ?? "dashboard";
  });

  const [clearConfirm, setClearConfirm] = useState<"projects" | "all" | null>(null);

  /* AI Engine State */
  const [engineStatus, setEngineStatus] = useState<AIEngineStatusResponse | null>(null);
  const [loadingEngine, setLoadingEngine] = useState(true);
  const [testingEngine, setTestingEngine] = useState(false);
  const [testResult, setTestResult] = useState<{ status: string; latency_ms: number; message: string } | null>(null);

  const [customKeyOpen, setCustomKeyOpen] = useState(false);
  const [customApiKey, setCustomApiKey] = useState("");
  const [savingKey, setSavingKey] = useState(false);

  /* Load Gemini engine status */
  async function loadEngine() {
    setLoadingEngine(true);
    try {
      const data = await fetchAIEngineStatus();
      setEngineStatus(data);
    } catch (err: any) {
      console.warn("Could not load AI Engine status:", err);
    } finally {
      setLoadingEngine(false);
    }
  }

  useEffect(() => {
    loadEngine();
  }, []);

  async function handleTestEngine() {
    setTestingEngine(true);
    setTestResult(null);
    try {
      const res = await testAIEngine();
      setTestResult(res);
      if (res.status === "success") {
        toast(`Gemini Engine online (${res.latency_ms}ms)`, "success");
      } else {
        toast(`Engine test failed: ${res.message}`, "error");
      }
    } catch (err: any) {
      toast(err.message || "Ping test failed", "error");
    } finally {
      setTestingEngine(false);
    }
  }

  async function handleModelChange(modelId: string) {
    try {
      await updateGeminiPreferences({ selected_model: modelId });
      toast(`Switched model to ${modelId}`, "success");
      await loadEngine();
    } catch (err: any) {
      toast(err.message || "Failed to switch model", "error");
    }
  }

  async function handleSaveCustomKey() {
    if (!customApiKey.trim()) {
      toast("Please enter a valid Gemini API Key", "error");
      return;
    }
    setSavingKey(true);
    try {
      await updateGeminiPreferences({ api_key: customApiKey.trim() });
      toast("Custom Gemini API Key saved & active", "success");
      setCustomApiKey("");
      setCustomKeyOpen(false);
      await loadEngine();
    } catch (err: any) {
      toast(err.message || "Failed to save key", "error");
    } finally {
      setSavingKey(false);
    }
  }

  async function handleResetToDefaultKey() {
    try {
      await disconnectGeminiBYOK();
      toast("Reverted to backend server attached key", "info");
      await loadEngine();
    } catch (err: any) {
      toast(err.message || "Failed to reset key", "error");
    }
  }

  function saveLanding(val: "dashboard" | "landing") {
    setDefaultLanding(val);
    localStorage.setItem("tessera_default_landing", val);
    toast("Preference saved", "success");
  }

  function handleClearAll() {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("tessera_"));
    keys.forEach((k) => localStorage.removeItem(k));
    setClearConfirm(null);
    toast("All local data cleared. Reloading…", "success");
    setTimeout(() => router.push("/"), 1200);
  }

  const isConnected = engineStatus?.connected ?? false;
  const authSource = engineStatus?.auth_source ?? "none";
  const selectedModel = engineStatus?.selected_model ?? "gemini-2.5-flash";

  return (
    <div className="min-h-screen bg-white dark:bg-[#0b0f17] flex flex-col transition-colors">
      <AppTopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto bg-gray-50/40 dark:bg-gray-950/40">
          <PageTransition>
            <div className="max-w-3xl mx-auto px-6 py-10">

              {/* Page header */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-1">
                  <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                    <Sparkles size={18} />
                  </span>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Settings &amp; AI Engine
                  </h1>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure Google Gemini model selection, verify connection health, and adjust workspace preferences.
                </p>
              </div>

              <div className="space-y-6">

                {/* ── Google Gemini Intelligence Engine Card ─────────────── */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
                  
                  {/* Card Header */}
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#1a5c38] to-emerald-400 flex items-center justify-center text-white shadow-sm">
                        <Cpu size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                            Google Gemini Intelligence Engine
                          </h2>
                          {isConnected ? (
                            <span className="flex items-center gap-1 text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                              <CheckCircle2 size={10} /> Active &amp; Ready
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-medium px-2 py-0.5 rounded-full">
                              Connecting...
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Powers Tessera Mind Planning, Code Auditing, and Hackathon Evaluation.
                        </p>
                      </div>
                    </div>

                    {/* Diagnostic Ping Test Button */}
                    <button
                      onClick={handleTestEngine}
                      disabled={testingEngine}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 transition-colors disabled:opacity-50"
                      title="Ping Gemini Engine to test latency"
                    >
                      <Zap size={13} className={testingEngine ? "animate-bounce" : ""} />
                      {testingEngine ? "Pinging..." : "Test Latency"}
                    </button>
                  </div>

                  <div className="p-6 space-y-6">

                    {/* Ping Test Result Banner (if run) */}
                    {testResult && (
                      <div className={`p-3 rounded-lg text-xs flex items-center justify-between border ${
                        testResult.status === "success"
                          ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                          : "bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
                      }`}>
                        <div className="flex items-center gap-2">
                          <Zap size={14} />
                          <span>
                            {testResult.status === "success"
                              ? `Engine responded in ${testResult.latency_ms}ms. All capabilities operational.`
                              : `Ping failed: ${testResult.message}`}
                          </span>
                        </div>
                        <button
                          onClick={() => setTestResult(null)}
                          className="text-[11px] underline opacity-75 hover:opacity-100"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}

                    {/* Connection Info Strip */}
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                          <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
                          <span>
                            {authSource === "byok"
                              ? "Custom Gemini API Key Override (Active)"
                              : "Server Attached GEMINI_API_KEY (Active)"}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {authSource === "byok"
                            ? `Key ending in ${engineStatus?.masked_key}`
                            : "Pre-configured on the backend environment. Ready to analyze repositories out of the box."}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {authSource === "byok" && (
                          <button
                            onClick={handleResetToDefaultKey}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          >
                            Revert to Server Key
                          </button>
                        )}
                        <button
                          onClick={() => setCustomKeyOpen(!customKeyOpen)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
                        >
                          {customKeyOpen ? "Hide Key Field" : authSource === "byok" ? "Update Key" : "Override Key"}
                        </button>
                      </div>
                    </div>

                    {/* Optional Custom Key Drawer */}
                    {customKeyOpen && (
                      <div className="p-4 bg-gray-50/80 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                        <div>
                          <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block mb-1">
                            Custom Gemini API Key Override (Optional)
                          </label>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            By default, Tessera uses the key attached to the backend. Enter your personal key below only if you wish to use your own Google AI Studio quota.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="password"
                            value={customApiKey}
                            onChange={(e) => setCustomApiKey(e.target.value)}
                            placeholder="AIzaSy..."
                            className="flex-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                          />
                          <button
                            onClick={handleSaveCustomKey}
                            disabled={savingKey}
                            className="px-4 py-1.5 bg-[#1a5c38] text-white rounded-lg text-xs font-medium hover:bg-[#14482c] transition-colors disabled:opacity-50 flex-shrink-0"
                          >
                            {savingKey ? "Verifying..." : "Save & Verify"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Model Selection */}
                    <div>
                      <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block mb-2">
                        Active Gemini Model Architecture
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {engineStatus?.available_models.map((m) => {
                          const isSelected = selectedModel === m.id;
                          return (
                            <div
                              key={m.id}
                              onClick={() => handleModelChange(m.id)}
                              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                                isSelected
                                  ? "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-sm"
                                  : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-gray-900 dark:text-white">
                                  {m.name}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                  isSelected
                                    ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                                }`}>
                                  {m.tag}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug line-clamp-2">
                                {m.description}
                              </p>
                              <div className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">
                                Context: {Math.round(m.context_window / 1000000)}M tokens
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* How Gemini Powers Tessera (3 Pillars) */}
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                      <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2.5">
                        Active Tessera Capabilities Powered by Gemini:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg border border-gray-100 dark:border-gray-800">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-white mb-1">
                            <Compass size={13} className="text-emerald-600 dark:text-emerald-400" />
                            <span>Mind Planner</span>
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            Synthesizes ideas into system blueprints, visual DAGs, and sprint roadmaps.
                          </p>
                        </div>

                        <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg border border-gray-100 dark:border-gray-800">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-white mb-1">
                            <Terminal size={13} className="text-blue-600 dark:text-blue-400" />
                            <span>Vibecoder Copilot</span>
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            Explains codebase mental models, flags fake mocks, and guides refactoring.
                          </p>
                        </div>

                        <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg border border-gray-100 dark:border-gray-800">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-white mb-1">
                            <Award size={13} className="text-amber-600 dark:text-amber-400" />
                            <span>Judge Mode</span>
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            60-second executive summaries and objective hackathon rubric evaluation.
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* ── General Preferences ─────────────────────────────────── */}
                <SectionCard
                  title="General Preferences"
                  description="Appearance and interface behavior."
                >
                  <SettingRow
                    label="Appearance"
                    description="Choose between light and dark mode."
                  >
                    <SegmentedControl
                      value={theme}
                      onChange={(v) => {
                        setTheme(v);
                        toast("Theme updated", "success");
                      }}
                      options={[
                        { value: "dark", label: "Dark", icon: <Moon size={13} /> },
                        { value: "light", label: "Light", icon: <Sun size={13} /> },
                      ]}
                    />
                  </SettingRow>

                  <SettingRow
                    label="Default landing page"
                    description="Default view after opening Tessera."
                  >
                    <SegmentedControl
                      value={defaultLanding}
                      onChange={saveLanding}
                      options={[
                        { value: "dashboard", label: "Dashboard", icon: <LayoutGrid size={13} /> },
                        { value: "landing", label: "Home", icon: <Monitor size={13} /> },
                      ]}
                    />
                  </SettingRow>
                </SectionCard>

                {/* ── Danger Zone ────────────────────────────────────── */}
                <SectionCard title="Danger Zone">
                  <SettingRow
                    label="Clear all local data"
                    description="Deletes cached projects and local preferences from browser storage."
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

              </div>

            </div>
          </PageTransition>
        </main>
      </div>

      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
