"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutGrid, GitBranch, FolderOpen, Shield, StickyNote,
  Activity, RefreshCw, MessageCircle, BookOpen, Settings,
  HelpCircle, ChevronDown, Menu, X, ChevronRight, Home,
} from "lucide-react";
import { useAppStore } from "@/lib/store";

interface SidebarProps {
  projectId?: string;
  isDashboard?: boolean;
}

export default function Sidebar({ projectId }: SidebarProps) {
  const pathname = usePathname();
  const { getProject, user } = useAppStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const project = projectId ? getProject(projectId) : null;
  const base = projectId ? `/project/${projectId}` : "";

  const projectNav = projectId ? [
    { label: "Overview",         icon: LayoutGrid, href: `${base}/overview` },
    { label: "Architecture",     icon: GitBranch,  href: `${base}/architecture` },
    { label: "Code Explorer",    icon: FolderOpen, href: `${base}/code-explorer` },
    { label: "AI Code Audit",    icon: Shield,     href: `${base}/audit` },
    { label: "Notes",            icon: StickyNote, href: `${base}/notes` },
    { label: "Health Report",    icon: Activity,   href: `${base}/health` },
    { label: "Rescan & Compare", icon: RefreshCw,  href: `${base}/rescan` },
  ] : [
    { label: "Dashboard", icon: Home, href: "/dashboard" },
  ];

  const comingSoon = [
    { label: "Ask Tessera", icon: MessageCircle },
    { label: "Quiz",        icon: BookOpen },
  ];

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  // User display
  const displayName  = user?.name || user?.githubUsername || "GitHub User";
  const displayEmail = user?.email || "";
  const avatarUrl    = user?.avatar && user.avatar.startsWith("http") ? user.avatar : null;
  const initials     = (displayName.charAt(0) || "U").toUpperCase();

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-[#0f172a] transition-colors">
      {/* Collapse toggle — desktop only */}
      <div className={`hidden md:flex items-center pt-3 pb-1 ${collapsed ? "justify-center px-1" : "justify-between px-3"}`}>
        {!collapsed && <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Navigation</span>}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={15} /> : <Menu size={15} />}
        </button>
      </div>

      {/* Top Level Dashboard Link */}
      <div className="px-2 pt-1 pb-2">
        <Link
          href="/dashboard"
          onClick={() => setMobileOpen(false)}
          title="Dashboard (All Projects)"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
            pathname === "/dashboard"
              ? "bg-[#1a5c38]/10 text-[#1a5c38] dark:bg-green-950/40 dark:text-green-400"
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          } ${collapsed ? "justify-center px-0 w-8 h-8 mx-auto" : ""}`}
        >
          <Home size={16} className={pathname === "/dashboard" ? "text-[#1a5c38] dark:text-green-400 flex-shrink-0" : "text-gray-500 dark:text-gray-400 flex-shrink-0"} />
          {!collapsed && <span>Dashboard</span>}
        </Link>
      </div>

      {/* Dynamic Current Project badge */}
      {project && !collapsed && (
        <div className="mx-3 mb-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-100 dark:border-gray-800">
          <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5 font-semibold">Current Project</div>
          <div className="text-xs font-bold text-gray-900 dark:text-white truncate">{project.name}</div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{project.repoUrl}</div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-1 px-2 space-y-0.5 overflow-y-auto">
        {projectNav.map((item) => {
          const Icon   = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                active
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-semibold"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white"
              } ${collapsed ? "justify-center px-0 w-8 h-8 mx-auto" : ""}`}
            >
              <Icon size={16} className={active ? "text-[#1a5c38] dark:text-green-400 flex-shrink-0" : "text-gray-500 dark:text-gray-400 flex-shrink-0"} />
              {!collapsed && item.label}
            </Link>
          );
        })}

        {/* Coming soon */}
        {!collapsed && (
          <div className="pt-2">
            {comingSoon.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-gray-400 dark:text-gray-500 cursor-default"
                >
                  <Icon size={16} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 px-1.5 py-0.5 rounded font-medium">
                    Soon
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </nav>

      {/* Bottom */}
      <div className="border-t border-gray-100 dark:border-gray-800 py-3 px-2 space-y-0.5">
        {[
          { Icon: Settings,   label: "Settings",      href: "/settings" },
          { Icon: HelpCircle, label: "Help & Support", href: "/help"     },
        ].map(({ Icon, label, href }) => (
          <Link
            key={label}
            href={href}
            title={collapsed ? label : undefined}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${
              isActive(href)
                ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-semibold"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
            } ${collapsed ? "justify-center px-0 w-8 h-8 mx-auto" : ""}`}
          >
            <Icon size={15} className={isActive(href) ? "text-[#1a5c38] dark:text-green-400 flex-shrink-0" : "text-gray-400 flex-shrink-0"} />
            {!collapsed && label}
          </Link>
        ))}

        {/* User Profile */}
        {user && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mt-1 cursor-default ${collapsed ? "justify-center px-0" : ""}`}>
            <div className="w-7 h-7 rounded-full bg-[#1a5c38] text-white flex items-center justify-center text-xs font-semibold flex-shrink-0 overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-900 dark:text-white truncate">{displayName}</div>
                {displayEmail && <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{displayEmail}</div>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="md:hidden fixed top-3.5 left-4 z-50 p-2 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm"
        onClick={() => setMobileOpen(true)}
      >
        <Menu size={16} className="text-gray-600 dark:text-gray-300" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute left-0 top-0 bottom-0 w-[220px] bg-white dark:bg-[#0f172a] border-r border-gray-100 dark:border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <span className="font-semibold text-gray-900 dark:text-white text-sm">Menu</span>
              <button onClick={() => setMobileOpen(false)}>
                <X size={16} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col flex-shrink-0 bg-white dark:bg-[#0f172a] border-r border-gray-100 dark:border-gray-800 h-full transition-all duration-200 ${
          collapsed ? "w-[56px]" : "w-[200px]"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
