"use client";

import { useRef, useEffect, useState } from "react";
import { Sun, Moon, ChevronDown, Settings, LogOut, User, Bell as BellIcon } from "lucide-react";
import Logo from "./Logo";
import { useAppStore } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { useRouter } from "next/navigation";

interface AppTopBarProps {
  showBell?: boolean;
}

export default function AppTopBar({ showBell = false }: AppTopBarProps) {
  const router = useRouter();
  const { user, logout } = useAppStore();
  const { isDark, toggle } = useTheme();

  const [userOpen, setUserOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const displayName = user?.name || user?.githubUsername || "GitHub User";
  const displayEmail = user?.email || "";
  const avatarUrl = user?.avatar && user.avatar.startsWith("http") ? user.avatar : null;
  const initials = (displayName.charAt(0) || "U").toUpperCase();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleLogout() {
    setUserOpen(false);
    logout();
    router.push("/login");
  }

  return (
    <header className="h-14 border-b border-gray-100 dark:border-gray-800/80 bg-white dark:bg-[#0f172a] flex items-center justify-between px-6 flex-shrink-0 relative z-40 transition-colors duration-200">
      <Logo />

      <div className="flex items-center gap-1.5">
        {/* Bell */}
        {showBell && (
          <div className="relative" ref={bellRef}>
            <button
              onClick={() => setBellOpen((o) => !o)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative cursor-pointer"
              aria-label="Notifications"
            >
              <BellIcon size={17} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>

            {bellOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</span>
                  <button className="text-xs text-[#1a5c38] dark:text-green-400 hover:underline cursor-pointer">Mark all read</button>
                </div>
                {[
                  { title: "Scan completed",    desc: "Your scan finished successfully.",                  time: "just now", unread: true },
                  { title: "New issue detected", desc: "Critical: potential security vulnerability found.", time: "1 hr ago", unread: true },
                  { title: "Health improved",    desc: "Your codebase health score went up.",              time: "Yesterday", unread: false },
                ].map((n) => (
                  <div
                    key={n.title}
                    className={`px-4 py-3 border-b border-gray-50 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors ${
                      n.unread ? "bg-blue-50/30 dark:bg-blue-950/20" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {n.unread && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />}
                      <div className={n.unread ? "" : "ml-3.5"}>
                        <div className="text-xs font-medium text-gray-900 dark:text-white">{n.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{n.desc}</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{n.time}</div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="px-4 py-2.5 text-center">
                  <button className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors cursor-pointer">
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="p-2 rounded-md text-gray-400 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark
            ? <Sun  size={17} className="text-amber-400 transition-transform duration-200 hover:rotate-12" />
            : <Moon size={17} className="text-indigo-500 transition-transform duration-200" />
          }
        </button>

        {/* User dropdown */}
        {user && (
          <div className="relative ml-1" ref={userRef}>
            <button
              onClick={() => setUserOpen((o) => !o)}
              className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer flex-shrink-0"
              aria-label="User menu"
            >
              <div className="w-8 h-8 rounded-full bg-[#1a5c38] dark:bg-green-700 text-white flex items-center justify-center text-xs font-semibold overflow-hidden flex-shrink-0 border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover rounded-full"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <ChevronDown
                size={13}
                className={`text-gray-400 transition-transform duration-200 flex-shrink-0 ${
                  userOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {userOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg overflow-hidden z-50 animate-fade-in">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white leading-snug truncate">
                    {displayName}
                  </div>
                  {displayEmail && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                      {displayEmail}
                    </div>
                  )}
                </div>
                {[
                  { Icon: User, label: "Profile", action: () => setUserOpen(false) },
                  { Icon: Settings, label: "Settings", action: () => setUserOpen(false) },
                ].map(({ Icon, label, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left cursor-pointer"
                  >
                    <Icon size={14} className="text-gray-400 dark:text-gray-500" />
                    {label}
                  </button>
                ))}
                <div className="border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left cursor-pointer"
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
