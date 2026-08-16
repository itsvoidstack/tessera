/**
 * Tessera Backend & GitHub API Client
 * 
 * Provides:
 * 1. Public GitHub REST API repository validation (rejects gibberish like `dbjhskfdh`)
 * 2. `loginWithGitHub()` helper for backend OAuth redirect hand-off
 * 3. Typed API contract methods for FastAPI backend developer integration
 */

export interface GitHubRepoMeta {
  owner: string;
  repo: string;
  fullName: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  openIssues: number;
  defaultBranch: string;
  avatarUrl: string;
  htmlUrl: string;
  updatedAt: string;
}

export interface RepoValidationResult {
  valid: boolean;
  error?: string;
  meta?: GitHubRepoMeta;
}

export interface BackendProject {
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
  healthScore: number | null; // null = pending analysis
  status: "pending" | "analyzing" | "completed" | "failed";
  createdAt: string;
}

export interface AuditIssue {
  id: string;
  title: string;
  description: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  file: string;
  line: number;
  category: string;
  suggestedFix?: string;
}

export interface ArchitectureNode {
  id: string;
  label: string;
  type: "frontend" | "backend" | "database" | "service" | "auth" | "utility";
  tech: string;
  description: string;
}

export interface ArchitectureEdge {
  from: string;
  to: string;
  label?: string;
}

export interface CodebaseNote {
  id: string;
  title: string;
  category: string;
  preview: string;
  content: string;
  tags: string[];
  date: string;
}

/** Base API URL configured via environment variables */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const BACKEND_AUTH_URL = process.env.NEXT_PUBLIC_BACKEND_AUTH_URL || `${API_BASE_URL}/api/auth/github`;

/**
 * Redirects the user to the backend GitHub OAuth endpoint.
 * The backend developer configures NEXT_PUBLIC_BACKEND_AUTH_URL or NEXT_PUBLIC_API_URL.
 */
export function loginWithGitHub() {
  if (typeof window !== "undefined") {
    window.location.href = BACKEND_AUTH_URL;
  }
}

/**
 * Parses raw repo input (e.g. "facebook/react" or "https://github.com/facebook/react")
 * into { owner, repo }.
 */
export function parseGitHubUrl(input: string): { owner: string; repo: string } | null {
  if (!input || typeof input !== "string") return null;
  const clean = input
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/\/$/, "");

  const parts = clean.split("/").filter(Boolean);
  if (parts.length < 2) return null;

  const owner = parts[0];
  const repo = parts[1];

  // Basic regex check for valid GitHub username and repository names
  const validOwnerPattern = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38}[a-zA-Z0-9])?$/;
  const validRepoPattern = /^[a-zA-Z0-9_.-]{1,100}$/;

  if (!validOwnerPattern.test(owner) || !validRepoPattern.test(repo)) {
    return null;
  }

  return { owner, repo };
}

/**
 * Validates a GitHub repository using the public GitHub REST API.
 * Rejects non-existent / gibberish inputs like `dbjhskfdh`.
 * Does NOT require or expose private tokens in the frontend.
 */
export async function validateGitHubRepo(rawInput: string): Promise<RepoValidationResult> {
  const parsed = parseGitHubUrl(rawInput);
  if (!parsed) {
    return {
      valid: false,
      error: "Invalid repository format. Please enter 'owner/repository' (e.g., vercel/next.js) or a full GitHub URL.",
    };
  }

  const { owner, repo } = parsed;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.status === 404) {
      return {
        valid: false,
        error: `Repository '${owner}/${repo}' was not found on GitHub. Please check the spelling and try again.`,
      };
    }

    if (!res.ok) {
      // Rate limited or temporary GitHub API issue — fallback to format validation
      return {
        valid: true,
        meta: {
          owner,
          repo,
          fullName: `${owner}/${repo}`,
          description: `GitHub repository ${owner}/${repo}`,
          language: "Codebase",
          stars: 0,
          forks: 0,
          openIssues: 0,
          defaultBranch: "main",
          avatarUrl: `https://github.com/${owner}.png`,
          htmlUrl: `https://github.com/${owner}/${repo}`,
          updatedAt: new Date().toISOString(),
        },
      };
    }

    const data = await res.json();

    return {
      valid: true,
      meta: {
        owner: data.owner?.login || owner,
        repo: data.name || repo,
        fullName: data.full_name || `${owner}/${repo}`,
        description: data.description || "No description provided.",
        language: data.language || "Multi-language",
        stars: data.stargazers_count || 0,
        forks: data.forks_count || 0,
        openIssues: data.open_issues_count || 0,
        defaultBranch: data.default_branch || "main",
        avatarUrl: data.owner?.avatar_url || `https://github.com/${owner}.png`,
        htmlUrl: data.html_url || `https://github.com/${owner}/${repo}`,
        updatedAt: data.updated_at || new Date().toISOString(),
      },
    };
  } catch {
    // Network error or timeout — fallback to format validation
    return {
      valid: true,
      meta: {
        owner,
        repo,
        fullName: `${owner}/${repo}`,
        description: `GitHub repository ${owner}/${repo}`,
        language: "Codebase",
        stars: 0,
        forks: 0,
        openIssues: 0,
        defaultBranch: "main",
        avatarUrl: `https://github.com/${owner}.png`,
        htmlUrl: `https://github.com/${owner}/${repo}`,
        updatedAt: new Date().toISOString(),
      },
    };
  }
}

/**
 * Backend API Client Methods
 * Ready to hook up to FastAPI backend endpoints when NEXT_PUBLIC_API_URL is configured.
 */
export async function fetchProjectsFromBackend(): Promise<BackendProject[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/projects`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function createBackendProject(repoUrl: string): Promise<BackendProject | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo_url: repoUrl }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
