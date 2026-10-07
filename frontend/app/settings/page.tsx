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
  Sun, Moon, Monitor, Trash2, AlertTriangle, RotateCcw,
  LayoutGrid, ChevronRight, Cpu, CheckCircle2, XCircle,
  Key, ShieldCheck, Zap, RefreshCw, Layers
} from "lucide-react";

import {
  fetchAIProviders,
  fetchAIStatus,
  connectAIProvider,
  disconnectAIProvider,
  updateAIPreferences,
  authorizeOAuthProvider,
  ProviderInfo,
  AIStatusResponse,
} from "@/lib/api-client";

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

  const [motion, setMotion] = useState<"on" | "reduced">(() => {
    if (typeof window === "undefined") return "on";
    return (localStorage.getItem("tessera_motion") as "on" | "reduced") ?? "on";
  });

  const [clearConfirm, setClearConfirm] = useState<"projects" | "all" | null>(null);

  /* AI Gateway State */
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [aiStatus, setAiStatus] = useState<AIStatusResponse | null>(null);
  const [loadingAI, setLoadingAI] = useState(true);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [inputApiKey, setInputApiKey] = useState("");
  const [submittingKey, setSubmittingKey] = useState(false);

  /* Load AI providers & status */
  async function loadAISettings() {
    setLoadingAI(true);
    try {
      const [provList, statusData] = await Promise.all([
        fetchAIProviders(),
        fetchAIStatus(),
      ]);
      setProviders(provList);
      setAiStatus(statusData);
    } catch (err) {
      console.warn("Could not load AI Gateway settings from backend:", err);
    } finally {
      setLoadingAI(false);
    }
  }

  useEffect(() => {
    loadAISettings();
  }, []);

  async function handleConnectKey(providerId: string) {
    if (!inputApiKey.trim()) {
      toast("Please enter an API Key", "error");
      return;
    }
    setSubmittingKey(true);
    try {
      await connectAIProvider(providerId, inputApiKey.trim());
      toast(`Successfully connected ${providerId} API Key`, "success");
      setInputApiKey("");
      setConnectingProvider(null);
      await loadAISettings();
    } catch (err: any) {
      toast(err.message || "Connection failed", "error");
    } finally {
      setSubmittingKey(false);
    }
  }

  async function handleDisconnect(providerId: string) {
    try {
      await disconnectAIProvider(providerId);
      toast(`Disconnected ${providerId}`, "info");
      await loadAISettings();
    } catch (err: any) {
      toast(err.message || "Failed to disconnect", "error");
    }
  }

  async function handleUpdatePreferences(primary: string, fallback?: string, models?: Record<string, string>) {
    try {
      await updateAIPreferences({
        primary_provider: primary,
        fallback_provider: fallback,
        provider_models: models,
      });
      toast("AI Gateway preferences updated", "success");
      await loadAISettings();
    } catch (err: any) {
      toast(err.message || "Failed to update preferences", "error");
    }
  }

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

  function handleClearProjects() {
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
            <div className="max-w-3xl mx-auto px-6 py-10">

              {/* Page header */}
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Cpu className="text-[#1a5c38] dark:text-green-400" size={24} />
                  Settings &amp; AI Gateway
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Configure multi-provider AI model routing, account connections, and interface preferences.
                </p>
              </div>

              <div className="space-y-6">

                {/* ── Multi-Provider AI Gateway Section ──────────────────── */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Layers size={16} className="text-[#1a5c38] dark:text-green-400" />
                        AI Provider Connection &amp; Routing
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Tessera provides repository tools, agents, and prompts. Connect your preferred AI model provider below.
                      </p>
                    </div>
                    <button
                      onClick={loadAISettings}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      title="Refresh AI Status"
                    >
                      <RefreshCw size={14} className={loadingAI ? "animate-spin text-green-500" : ""} />
                    </button>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Informative Explanation Banner */}
                    <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-lg text-xs text-blue-900 dark:text-blue-300 leading-relaxed">
                      <p className="font-semibold mb-0.5">Tessera Intelligence Architecture</p>
                      <p>
                        Tessera provides the repository analysis, agents, tools, and workflows. Your selected AI provider supplies the model generation. Usage and rate limits depend on your connected provider key/account.
                      </p>
                    </div>

                    {/* Routing Preferences (Primary & Fallback) */}
                    {aiStatus && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                        <div>
                          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                            Primary AI Provider
                          </label>
                          <select
                            value={aiStatus.primary_provider}
                            onChange={(e) => handleUpdatePreferences(e.target.value, aiStatus.fallback_provider)}
                            className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-3 py-1.5 text-xs text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-green-500 outline-none"
                          >
                            <option value="gemini">Google Gemini (Default)</option>
                            <option value="openai">OpenAI (GPT-4o)</option>
                            <option value="claude">Anthropic Claude (Claude 3.5)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                            Fallback AI Provider (Optional)
                          </label>
                          <select
                            value={aiStatus.fallback_provider || "none"}
                            onChange={(e) => handleUpdatePreferences(aiStatus.primary_provider, e.target.value === "none" ? undefined : e.target.value)}
                            className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-3 py-1.5 text-xs text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-green-500 outline-none"
                          >
                            <option value="none">Disabled (No Fallback)</option>
                            <option value="gemini">Google Gemini</option>
                            <option value="openai">OpenAI</option>
                            <option value="claude">Anthropic Claude</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Provider Cards List */}
                    <div className="space-y-4">
                      {providers.map((prov) => {
                        const status = aiStatus?.providers[prov.id];
                        const isConnected = status?.connected;
                        const authSource = status?.auth_source;
                        const isPrimary = aiStatus?.primary_provider === prov.id;
                        const isConnecting = connectingProvider === prov.id;

                        return (
                          <div
                            key={prov.id}
                            className={`p-4 rounded-xl border transition-all ${
                              isPrimary
                                ? "border-green-500/50 bg-green-50/20 dark:bg-green-950/10"
                                : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3">
                                <div className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 mt-0.5">
                                  <Zap size={18} className={isPrimary ? "text-green-600 dark:text-green-400" : ""} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                      {prov.name}
                                    </h3>
                                    {isPrimary && (
                                      <span className="text-[10px] bg-green-100 dark:bg-green-900/60 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-semibold">
                                        Primary AI
                                      </span>
                                    )}
                                    {isConnected ? (
                                      <span className="flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium border border-emerald-200 dark:border-emerald-800">
                                        <CheckCircle2 size={10} />
                                        {authSource === "server_default"
                                          ? "Connected (Server Default Key)"
                                          : "Connected (API Key)"}
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full font-medium">
                                        <XCircle size={10} /> Not Connected
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {prov.description}
                                  </p>

                                  {/* Official Auth Note */}
                                  <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5 flex items-center gap-1.5">
                                    <ShieldCheck size={12} className="text-gray-400 flex-shrink-0" />
                                    <span>{prov.official_auth_note}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {authSource === "user_byok" && (
                                  <button
                                    onClick={() => handleDisconnect(prov.id)}
                                    className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-medium transition-colors"
                                  >
                                    Disconnect
                                  </button>
                                )}

                                <button
                                  onClick={() => setConnectingProvider(isConnecting ? null : prov.id)}
                                  className="px-3 py-1.5 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
                                >
                                  <Key size={13} />
                                  {authSource === "user_byok" ? "Update API Key" : "Connect API Key"}
                                </button>
                              </div>
                            </div>

                            {/* Model Selector & Capabilities */}
                            {isConnected && (
                              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500 dark:text-gray-400 font-medium">Active Model:</span>
                                  <select
                                    value={status?.selected_model || prov.supported_models[0]?.id}
                                    onChange={(e) => {
                                      const newModels = { ...aiStatus?.provider_models, [prov.id]: e.target.value };
                                      handleUpdatePreferences(aiStatus?.primary_provider || "gemini", aiStatus?.fallback_provider, newModels);
                                    }}
                                    className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-xs text-gray-900 dark:text-white font-medium"
                                  >
                                    {prov.supported_models.map((m) => (
                                      <option key={m.id} value={m.id}>
                                        {m.name} ({Math.round(m.context_window / 1000)}k ctx)
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500">
                                  <span>Context: {prov.capabilities.context_window.toLocaleString()} tokens</span>
                                  <span>•</span>
                                  <span>BYOK Supported ✓</span>
                                </div>
                              </div>
                            )}

                            {/* Key Connection Input Drawer */}
                            {isConnecting && (
                              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block">
                                  Enter {prov.name} API Key
                                </label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="password"
                                    value={inputApiKey}
                                    onChange={(e) => setInputApiKey(e.target.value)}
                                    placeholder={`e.g. ${prov.id === "gemini" ? "AIzaSy..." : prov.id === "openai" ? "sk-proj-..." : "sk-ant-..."}`}
                                    className="flex-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-green-500"
                                  />
                                  <button
                                    onClick={() => handleConnectKey(prov.id)}
                                    disabled={submittingKey}
                                    className="px-4 py-1.5 bg-[#1a5c38] text-white rounded-lg text-xs font-medium hover:bg-[#14482c] transition-colors disabled:opacity-50"
                                  >
                                    {submittingKey ? "Verifying..." : "Save & Verify"}
                                  </button>
                                  <button
                                    onClick={() => setConnectingProvider(null)}
                                    className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
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
                    description="Default view after logging into Tessera."
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
                    description="Deletes all local storage data including projects and cached preferences."
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
