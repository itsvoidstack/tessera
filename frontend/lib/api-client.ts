const RAW_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://tessera-backend-n7ey.onrender.com";

export const API_BASE_URL = RAW_API_BASE_URL.replace(/\/+$/, "");

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

export interface ValidateRepoResponse {
  valid: boolean;
  meta?: GitHubRepoMeta;
  error?: string;
}

export interface ScanResponse {
  repository: {
    name: string;
    full_name: string;
    description: string | null;
    language: string | null;
    stars: number;
    forks: number;
    default_branch: string;
    url: string;
  };
  file_count: number;
  files: Array<{ path: string; size: number; content: string }>;
  ai_analysis: string | null;
}

export async function validateGitHubRepo(
  repoUrl: string
): Promise<ValidateRepoResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/validate-repo?repo_url=${encodeURIComponent(
        repoUrl
      )}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.detail || "Failed to validate repository.");
    }

    return await response.json();
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === "TypeError" || err.message.toLowerCase().includes("fetch")) {
        throw new Error(
          `Unable to connect to the backend service (${API_BASE_URL}). The server may be waking up or unreachable. Please try again in a few seconds.`
        );
      }
      throw err;
    }
    throw new Error("An unexpected error occurred while validating the repository.");
  }
}

export async function scanRepository(
  repoUrl: string
): Promise<ScanResponse> {
  console.log("Sending repository to backend:", repoUrl);

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/scan`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          repo_url: repoUrl,
        }),
      }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.detail || `Backend scan failed with status ${response.status}`);
    }

    const result = await response.json();
    console.log("Backend response:", result);
    return result;
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === "TypeError" || err.message.toLowerCase().includes("fetch")) {
        throw new Error(
          `Unable to connect to Tessera backend API (${API_BASE_URL}). The service may be waking up from free-tier sleep or unreachable.`
        );
      }
      throw err;
    }
    throw new Error("An unexpected error occurred during repository analysis.");
  }
}
