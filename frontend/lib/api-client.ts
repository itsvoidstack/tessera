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
  scores: {
    architecture: number;
    codeQuality: number;
    security: number;
    testing: number;
    documentation: number;
    dependencies: number;
    maintainability: number;
    reliability: number;
    performance: number;
  };
  health_score: number;
  audit_issues: Array<{
    id: string;
    title: string;
    description: string;
    severity: "Critical" | "High" | "Medium" | "Low";
    file: string;
    line: number;
    category: string;
    suggestedFix: string;
  }>;
  scoring_method: string;
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

export interface GenerateNoteInsightResponse {
  status: string;
  title: string;
  insight_type: string;
  content: string;
  tags: string[];
  scan_id: string;
}

export async function generateNoteInsight(
  repoUrl: string,
  insightType: string,
  scanId?: string,
  existingAnalysis?: string,
  files?: Array<{ path: string; size: number; content: string }>
): Promise<GenerateNoteInsightResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/notes/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        repo_url: repoUrl,
        insight_type: insightType,
        scan_id: scanId,
        existing_analysis: existingAnalysis,
        files: files,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.detail || `Insight generation failed with status ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === "TypeError" || err.message.toLowerCase().includes("fetch")) {
        throw new Error(
          `Unable to connect to Tessera backend API (${API_BASE_URL}). Please verify backend is running.`
        );
      }
      throw err;
    }
    throw new Error("An unexpected error occurred during note insight generation.");
  }
}

// -----------------------------------------
// AI Gateway & Multi-Provider API Client
// -----------------------------------------

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  context_window: number;
  is_default: boolean;
}

export interface ProviderCapability {
  streaming: boolean;
  tool_calling: boolean;
  context_window: number;
  structured_output: boolean;
  vision: boolean;
}

export interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  auth_type: string;
  supports_byok: boolean;
  supported_models: ModelInfo[];
  capabilities: ProviderCapability;
  official_auth_note: string;
}

export interface ProviderConnectionStatus {
  provider_id: string;
  connected: boolean;
  auth_source: string;
  account_email?: string;
  masked_key: string;
  status: string;
  selected_model?: string;
}

export interface AIStatusResponse {
  primary_provider: string;
  fallback_provider?: string;
  provider_models: Record<string, string>;
  providers: Record<string, ProviderConnectionStatus>;
}

export async function fetchAIProviders(): Promise<ProviderInfo[]> {
  const res = await fetch(`${API_BASE_URL}/api/ai/providers`);
  if (!res.ok) throw new Error("Failed to fetch AI providers");
  return await res.json();
}

export async function fetchAIStatus(): Promise<AIStatusResponse> {
  const res = await fetch(`${API_BASE_URL}/api/ai/status`);
  if (!res.ok) throw new Error("Failed to fetch AI gateway status");
  return await res.json();
}

export async function authorizeOAuthProvider(providerId: string) {
  const res = await fetch(`${API_BASE_URL}/api/ai/providers/${providerId}/oauth/authorize`);
  if (!res.ok) throw new Error(`Failed to initiate OAuth for provider ${providerId}`);
  const data = await res.json();
  if (data.auth_url) {
    window.location.href = data.auth_url;
  }
}

export async function connectAIProvider(providerId: string, apiKey: string) {
  const res = await fetch(`${API_BASE_URL}/api/ai/providers/${providerId}/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.detail || `Failed to connect provider ${providerId}`);
  }
  return await res.json();
}

export async function disconnectAIProvider(providerId: string) {
  const res = await fetch(`${API_BASE_URL}/api/ai/providers/${providerId}/disconnect`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Failed to disconnect provider ${providerId}`);
  return await res.json();
}

export async function updateAIPreferences(prefs: {
  primary_provider: string;
  fallback_provider?: string;
  provider_models?: Record<string, string>;
}) {
  const res = await fetch(`${API_BASE_URL}/api/ai/preferences`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(prefs),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.detail || "Failed to update AI preferences");
  }
  return await res.json();
}



