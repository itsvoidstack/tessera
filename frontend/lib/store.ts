"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

import { GitHubRepoMeta } from "./api-client";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface AuditIssue {
  id: string | number;
  title: string;
  description: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  file: string;
  line: number;
  category: string;
  suggestedFix?: string;
}

export interface ArchitectureComponent {
  id: string;
  label: string;
  sublabel: string;
  tech: string;
  type: string;
  color: string;
  x: number;
  y: number;
}

export interface ArchitectureEdge {
  from: string;
  to: string;
  type: "direct" | "indirect";
}

export interface Note {
  id: string;
  title: string;
  preview: string;
  date: string;
  tags: string[];
  content: string;
}

export interface ScanSnapshot {
  scanId: string;
  date: string;
  version: string;
  healthScore: number | null;
  issuesFound: number;
  status: "pending" | "completed" | "failed";
}

export interface ProjectScores {
  architecture: number | null;
  codeQuality: number | null;
  security: number | null;
  testing: number | null;
  documentation: number | null;
  dependencies: number | null;
  maintainability: number | null;
  reliability: number | null;
  performance: number | null;
}

export interface Project {
  id: string;
  name: string;
  repoUrl: string;
  owner: string;
  repo: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  openIssuesCount: number;

  healthScore: number | null;

  lastScan: string;
  issuesCount: number;

  linesOfCode?: number;
  filesCount?: number;
  directories?: number;

  color: string;

  status: "pending" | "analyzing" | "completed" | "failed";

  // Overview
  scanId: string;
  scanDate: string;
  scores: ProjectScores;

  criticalIssues: number;
  warnings: number;
  suggestions: number;

  projectSummary: string;
  lastCommit: string;
  trendData: number[];

  // Audit
  auditIssues: AuditIssue[];

  // Architecture
  architectureComponents: ArchitectureComponent[];
  architectureEdges: ArchitectureEdge[];

  // Scan history
  scanHistory: ScanSnapshot[];

  // Notes
  notes: Note[];

  // Health
  prevScore: number | null;

  // Real backend scan data
  aiAnalysis?: string;
  fileCount?: number;
}

export interface AuthUser {
  name: string;
  email: string;
  avatar: string;
  githubUsername: string;
}

// ─────────────────────────────────────────────
// Store Interface
// ─────────────────────────────────────────────

interface AppStoreValue {
  // Auth
  user: AuthUser | null;
  isAuthed: boolean;

  login: (user: AuthUser) => void;
  logout: () => void;

  // Projects
  projects: Project[];

  addProject: (project: Project) => void;

  createProjectFromMeta: (meta: GitHubRepoMeta) => Project;

  updateProject: (
    id: string,
    updates: Partial<Project>
  ) => void;

  deleteProject: (id: string) => void;

  getProject: (id: string) => Project | undefined;

  // Notes
  addNote: (
    projectId: string,
    note: Note
  ) => void;

  updateNote: (
    projectId: string,
    noteId: string,
    updates: Partial<Note>
  ) => void;

  deleteNote: (
    projectId: string,
    noteId: string
  ) => void;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

export function repoColor(name: string): string {
  const colors = [
    "#1a5c38",
    "#2563eb",
    "#7c3aed",
    "#d97706",
    "#0891b2",
    "#ea580c",
    "#db2777",
  ];

  let hash = 0;

  for (let i = 0; i < name.length; i++) {
    hash =
      name.charCodeAt(i) +
      ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

export function newScanId(): string {
  return Math.random()
    .toString(36)
    .slice(2, 9);
}

export function relativeTime(iso: string): string {
  const diff =
    Date.now() -
    new Date(iso).getTime();

  const mins = Math.floor(
    diff / 60000
  );

  if (mins < 1) {
    return "just now";
  }

  if (mins < 60) {
    return `${mins} min ago`;
  }

  const hrs = Math.floor(mins / 60);

  if (hrs < 24) {
    return `${hrs} hour${
      hrs > 1 ? "s" : ""
    } ago`;
  }

  const days = Math.floor(
    hrs / 24
  );

  return `${days} day${
    days > 1 ? "s" : ""
  } ago`;
}

export function parseRepo(
  raw: string
): {
  owner: string;
  repo: string;
  name: string;
  repoUrl: string;
} {
  const clean = raw
    .replace(/^https?:\/\//, "")
    .replace(/^github\.com\//, "")
    .replace(/\.git$/, "")
    .trim();

  const parts = clean
    .split("/")
    .filter(Boolean);

  const owner =
    parts[0] ?? "unknown";

  const repo =
    parts[1] ?? "unknown";

  const name = repo
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) =>
      c.toUpperCase()
    );

  return {
    owner,
    repo,
    name,
    repoUrl:
      `github.com/${owner}/${repo}`,
  };
}

// ─────────────────────────────────────────────
// Create Project
// ─────────────────────────────────────────────

export function createProjectEntry(
  meta: GitHubRepoMeta
): Project {
  const projectId =
    `${meta.owner}-${meta.repo}`.toLowerCase();

  const now = new Date();

  const scanDate =
    now.toLocaleDateString(
      "en-US",
      {
        month: "long",
        day: "numeric",
        year: "numeric",
      }
    ) +
    " · " +
    now.toLocaleTimeString(
      "en-US",
      {
        hour: "numeric",
        minute: "2-digit",
      }
    );

  const scanId =
    newScanId();

  return {
    id: projectId,

    name: meta.repo,

    repoUrl: meta.fullName,

    owner: meta.owner,

    repo: meta.repo,

    description:
      meta.description,

    language:
      meta.language,

    stars:
      meta.stars,

    forks:
      meta.forks,

    openIssuesCount:
      meta.openIssues,

    healthScore: null,

    lastScan:
      "Just added",

    issuesCount: 0,

    color:
      repoColor(meta.repo),

    status:
      "pending",

    scanId,

    scanDate,

    scores: {
      architecture: null,
      codeQuality: null,
      security: null,
      testing: null,
      documentation: null,
      dependencies: null,
      maintainability: null,
      reliability: null,
      performance: null,
    },

    criticalIssues: 0,

    warnings: 0,

    suggestions: 0,

    projectSummary:
      `${meta.fullName} — Repository registered. Connect backend API to run automated AI analysis.`,

    lastCommit:
      meta.updatedAt
        ? relativeTime(meta.updatedAt)
        : "Recently",

    trendData: [],

    auditIssues: [],

    architectureComponents: [],

    architectureEdges: [],

    scanHistory: [
      {
        scanId,

        date: scanDate,

        version: "v1.0.0",

        healthScore: null,

        issuesFound: 0,

        status: "pending",
      },
    ],

    notes: [],

    prevScore: null,

    // Real backend scan data
    aiAnalysis: undefined,

    fileCount: undefined,
  };
}

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

const AppStoreContext =
  createContext<AppStoreValue>({
    user: null,

    isAuthed: false,

    login: () => {},

    logout: () => {},

    projects: [],

    addProject: () => {},

    createProjectFromMeta:
      (meta) =>
        createProjectEntry(meta),

    updateProject: () => {},

    deleteProject: () => {},

    getProject: () =>
      undefined,

    addNote: () => {},

    updateNote: () => {},

    deleteNote: () => {},
  });

// ─────────────────────────────────────────────
// Local Storage
// ─────────────────────────────────────────────

const STORAGE_KEY =
  "tessera_store_v3";

interface PersistedState {
  user: AuthUser | null;
  projects: Project[];
}

function saveState(
  state: PersistedState
) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );
  } catch {
    // Ignore storage errors
  }
}

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

export function AppStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] =
    useState<AuthUser | null>(
      () => {
        if (
          typeof window ===
          "undefined"
        ) {
          return null;
        }

        try {
          const raw =
            localStorage.getItem(
              STORAGE_KEY
            );

          if (!raw) {
            return null;
          }

          return (
            JSON.parse(
              raw
            ) as PersistedState
          ).user ?? null;
        } catch {
          return null;
        }
      }
    );

  const [projects, setProjects] =
    useState<Project[]>(
      () => {
        if (
          typeof window ===
          "undefined"
        ) {
          return [];
        }

        try {
          const raw =
            localStorage.getItem(
              STORAGE_KEY
            );

          if (!raw) {
            return [];
          }

          return (
            JSON.parse(
              raw
            ) as PersistedState
          ).projects ?? [];
        } catch {
          return [];
        }
      }
    );

  useEffect(() => {
    saveState({
      user,
      projects,
    });
  }, [user, projects]);

  // ─────────────────────────────────────
  // Auth
  // ─────────────────────────────────────

  const login =
    useCallback(
      (u: AuthUser) => {
        setUser(u);
      },
      []
    );

  const logout =
    useCallback(() => {
      setUser(null);

      localStorage.removeItem(
        "tessera_authed"
      );
    }, []);

  // ─────────────────────────────────────
  // Projects
  // ─────────────────────────────────────

  const addProject =
    useCallback(
      (p: Project) => {
        setProjects(
          (prev) => {
            const exists =
              prev.findIndex(
                (x) =>
                  x.id === p.id
              );

            if (exists >= 0) {
              const next = [
                ...prev,
              ];

              next[exists] = p;

              return next;
            }

            return [
              p,
              ...prev,
            ];
          }
        );
      },
      []
    );

  const createProjectFromMeta =
    useCallback(
      (
        meta: GitHubRepoMeta
      ): Project => {
        const p =
          createProjectEntry(
            meta
          );

        addProject(p);

        return p;
      },
      [addProject]
    );

  const updateProject =
    useCallback(
      (
        id: string,
        updates: Partial<Project>
      ) => {
        setProjects(
          (prev) =>
            prev.map(
              (p) =>
                p.id === id
                  ? {
                      ...p,
                      ...updates,
                    }
                  : p
            )
        );
      },
      []
    );

  const deleteProject =
    useCallback(
      (id: string) => {
        setProjects(
          (prev) =>
            prev.filter(
              (p) =>
                p.id !== id
            )
        );
      },
      []
    );

  const getProject =
    useCallback(
      (id: string) =>
        projects.find(
          (p) =>
            p.id === id
        ),
      [projects]
    );

  // ─────────────────────────────────────
  // Notes
  // ─────────────────────────────────────

  const addNote =
    useCallback(
      (
        projectId: string,
        note: Note
      ) => {
        setProjects(
          (prev) =>
            prev.map(
              (p) =>
                p.id === projectId
                  ? {
                      ...p,
                      notes: [
                        note,
                        ...p.notes,
                      ],
                    }
                  : p
            )
        );
      },
      []
    );

  const updateNote =
    useCallback(
      (
        projectId: string,
        noteId: string,
        updates: Partial<Note>
      ) => {
        setProjects(
          (prev) =>
            prev.map(
              (p) =>
                p.id === projectId
                  ? {
                      ...p,

                      notes:
                        p.notes.map(
                          (n) =>
                            n.id ===
                            noteId
                              ? {
                                  ...n,
                                  ...updates,
                                }
                              : n
                        ),
                    }
                  : p
            )
        );
      },
      []
    );

  const deleteNote =
    useCallback(
      (
        projectId: string,
        noteId: string
      ) => {
        setProjects(
          (prev) =>
            prev.map(
              (p) =>
                p.id === projectId
                  ? {
                      ...p,

                      notes:
                        p.notes.filter(
                          (n) =>
                            n.id !==
                            noteId
                        ),
                    }
                  : p
            )
        );
      },
      []
    );

  // ─────────────────────────────────────
  // Provider
  // ─────────────────────────────────────

  return React.createElement(
    AppStoreContext.Provider,
    {
      value: {
        user,
        isAuthed: !!user,
        login,
        logout,
        projects,
        addProject,
        createProjectFromMeta,
        updateProject,
        deleteProject,
        getProject,
        addNote,
        updateNote,
        deleteNote,
      },
    },
    children
  );
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useAppStore() {
  return useContext(
    AppStoreContext
  );
}
