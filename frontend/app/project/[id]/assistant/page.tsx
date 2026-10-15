"use client";

import { use, useState, useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MessageCircle, Send, Sparkles, Terminal, Copy, Check,
  Trash2, RefreshCw, FileCode, ShieldAlert, ArrowRight,
  HelpCircle, Lightbulb, Code2, Cpu, ExternalLink, Flame
} from "lucide-react";
import { assistantChat, AssistantChatResponse } from "@/lib/api-client";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/Toast";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  referenced_files?: string[];
  suggested_questions?: string[];
}

const QUICK_PROMPTS = [
  {
    icon: Lightbulb,
    label: "What did I just build?",
    prompt: "Provide an executive mental model of this codebase: what does it do, how do components interact, and where is the primary entry point?",
  },
  {
    icon: Flame,
    label: "Spot Fake Mocks & Stubs",
    prompt: "Scan this codebase for mock delays (setTimeout), hardcoded fake data arrays, or unfinished TODO stubs that need real backend implementation.",
  },
  {
    icon: ShieldAlert,
    label: "Find Vulnerabilities & Bugs",
    prompt: "Audit this repository for security risks, unvalidated inputs, dangerous execution patterns, or potential crash hotspots.",
  },
  {
    icon: Code2,
    label: "How to Add a New Route",
    prompt: "Explain step-by-step how to add a new API route or page in this project without breaking existing architecture or conventions.",
  },
];

export default function AssistantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { getProject } = useAppStore();
  const router = useRouter();
  const { toasts, toast, dismiss } = useToast();

  const project = getProject(id);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Load chat history from localStorage
  useEffect(() => {
    if (!project) return;
    const cacheKey = `tessera_chat_${project.id}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        setMessages(JSON.parse(cached));
        return;
      } catch {
        // silent
      }
    }

    // Default welcome message
    const welcomeMsg: ChatMessage = {
      id: "welcome",
      role: "assistant",
      content: `Hello! I'm **Tessera Copilot**, powered by Google Gemini and grounded in **${project.name}** (${project.owner}/${project.repo}).\n\nI have indexed your files, static health metrics, and architecture. Ask me anything about how this codebase works, where features live, how to refactor spaghetti code, or how to implement next steps!`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      suggested_questions: [
        "What did I just build in this project?",
        "Are there any hardcoded mock responses?",
        "Where is state managed?",
      ],
    };
    setMessages([welcomeMsg]);
  }, [project?.id]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(textToSend?: string) {
    const text = (textToSend || input).trim();
    if (!text || !project || loading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      // Format history
      const historyPayload = newMessages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res: AssistantChatResponse = await assistantChat(
        project.repoUrl,
        text,
        historyPayload,
        project.files
      );

      const assistantMsg: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: "assistant",
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        referenced_files: res.referenced_files,
        suggested_questions: res.suggested_questions,
      };

      const updated = [...newMessages, assistantMsg];
      setMessages(updated);
      localStorage.setItem(`tessera_chat_${project.id}`, JSON.stringify(updated));
    } catch (err: any) {
      toast(err.message || "Failed to reach Gemini assistant", "error");
      const errorMsg: ChatMessage = {
        id: `error_${Date.now()}`,
        role: "assistant",
        content: `⚠️ Error contacting Gemini Engine: ${err.message || "Service timeout"}. Please check your connection in Settings.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages([...newMessages, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleClearChat() {
    if (!project) return;
    localStorage.removeItem(`tessera_chat_${project.id}`);
    const resetMsg: ChatMessage = {
      id: "welcome_reset",
      role: "assistant",
      content: `Chat history cleared. What would you like to explore in **${project.name}**?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      suggested_questions: [
        "Explain architecture & boundaries",
        "Detect fake mocks & stubs",
      ],
    };
    setMessages([resetMsg]);
    toast("Conversation cleared", "info");
  }

  function copyMessage(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast("Copied to clipboard", "success");
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-center px-8">
        <div className="text-3xl mb-3">🔍</div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
          Project not found
        </h2>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-4 py-2 bg-[#1a5c38] text-white rounded-lg text-xs font-medium hover:bg-[#145230] transition-colors mt-4"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 max-w-6xl mx-auto page-enter">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="p-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
              <MessageCircle size={16} />
            </span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Ask Tessera Copilot
            </h1>
            <span className="text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Gemini 2.5 Flash Active
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Repo-grounded pair programmer for {project.owner}/{project.repo} ({project.filesCount || project.files?.length || 20} source files indexed).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Clear Chat History"
          >
            <Trash2 size={13} /> Clear Chat
          </button>
          <Link
            href={`/project/${project.id}/overview`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Overview
          </Link>
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="flex-1 overflow-y-auto py-6 space-y-5">
        
        {/* Quick Prompt Chips (Shown if messages length <= 2) */}
        {messages.length <= 2 && (
          <div className="bg-gradient-to-r from-emerald-50/60 via-blue-50/40 to-transparent dark:from-emerald-950/20 dark:via-blue-950/10 dark:to-transparent border border-emerald-200/50 dark:border-emerald-900/30 p-4 rounded-2xl mb-4 space-y-2.5">
            <div className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
              <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span>Vibecoder &amp; Developer Quick Actions:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUICK_PROMPTS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSend(item.prompt)}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-white/90 dark:bg-gray-900/90 border border-gray-200/80 dark:border-gray-800 hover:border-emerald-500 dark:hover:border-emerald-500 text-left text-xs font-medium text-gray-800 dark:text-gray-200 transition-all shadow-2xs group"
                  >
                    <Icon size={14} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="flex-1 truncate">{item.label}</span>
                    <ArrowRight size={12} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Message Bubble Stream */}
        {messages.map((msg) => {
          const isUser = msg.role === "user";

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
            >
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase font-mono">
                  {isUser ? "You" : "Tessera Copilot"}
                </span>
                <span className="text-[9px] text-gray-400">{msg.timestamp}</span>
              </div>

              <div
                className={`relative group max-w-3xl rounded-2xl p-4 text-xs leading-relaxed ${
                  isUser
                    ? "bg-[#1a5c38] text-white rounded-br-xs shadow-sm font-medium"
                    : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-xs shadow-sm"
                }`}
              >
                {/* Copy Button */}
                <button
                  onClick={() => copyMessage(msg.id, msg.content)}
                  className={`absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity ${
                    isUser
                      ? "hover:bg-white/20 text-white"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  }`}
                  title="Copy message"
                >
                  {copiedId === msg.id ? <Check size={12} /> : <Copy size={12} />}
                </button>

                {/* Content formatted with basic markdown / code whitespace */}
                <div className="whitespace-pre-wrap leading-relaxed space-y-2">
                  {msg.content}
                </div>

                {/* Referenced Files Badges */}
                {msg.referenced_files && msg.referenced_files.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase font-mono">
                      Indexed Source:
                    </span>
                    {msg.referenced_files.map((file, fIdx) => (
                      <span
                        key={fIdx}
                        className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded font-mono flex items-center gap-1"
                      >
                        <FileCode size={10} className="text-emerald-500" />
                        {file}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Suggested Follow-up Questions */}
              {msg.suggested_questions && msg.suggested_questions.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-1">
                  <span className="text-[10px] text-gray-400">Follow-up:</span>
                  {msg.suggested_questions.map((q, qIdx) => (
                    <button
                      key={qIdx}
                      onClick={() => handleSend(q)}
                      className="text-[10px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-emerald-500 dark:hover:border-emerald-500 text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 px-2.5 py-1 rounded-full transition-colors shadow-2xs"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Streaming / Loading Indicator */}
        {loading && (
          <div className="flex flex-col items-start space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase font-mono pl-1">
              Tessera Copilot
            </span>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl rounded-bl-xs p-4 shadow-sm text-xs flex items-center gap-3 text-gray-600 dark:text-gray-300">
              <Sparkles size={15} className="animate-spin text-emerald-500" />
              <span>Gemini is reading repository files &amp; reasoning...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Bottom Input Bar */}
      <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-2.5 shadow-sm flex items-center gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about this repo (e.g., 'Explain data flow in auth.py', 'Find dead code')..."
            className="flex-1 bg-transparent border-0 outline-none resize-none text-xs text-gray-900 dark:text-white px-2 py-1 max-h-32 min-h-[36px] font-medium"
          />

          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#1a5c38] hover:bg-[#14482c] text-white transition-colors disabled:opacity-40 flex-shrink-0 shadow-sm"
            title="Send Message"
          >
            <Send size={14} />
          </button>
        </div>
        <div className="flex items-center justify-between text-[10px] text-gray-400 px-3 mt-1.5">
          <span>Press <kbd className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">Enter</kbd> to send, <kbd className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">Shift + Enter</kbd> for newline</span>
          <span>Grounded in active repository tree</span>
        </div>
      </div>

      <Toast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
