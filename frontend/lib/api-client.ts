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

export interface GeminiModelOption {
  id: string;
  name: string;
  tag: string;
  description: string;
  context_window: number;
}

export interface AIEngineStatusResponse {
  engine: string;
  provider_id: string;
  connected: boolean;
  auth_source: "server_env" | "byok" | "none";
  selected_model: string;
  masked_key: string;
  available_models: GeminiModelOption[];
  server_key_present: boolean;
}

export interface AIEngineTestResponse {
  status: "success" | "error";
  message: string;
  latency_ms: number;
  model?: string;
  response?: string;
}

export async function fetchAIEngineStatus(): Promise<AIEngineStatusResponse> {
  const res = await fetch(`${API_BASE_URL}/api/ai/engine-status`);
  if (!res.ok) throw new Error("Failed to fetch AI Engine status");
  return await res.json();
}

export async function testAIEngine(): Promise<AIEngineTestResponse> {
  const res = await fetch(`${API_BASE_URL}/api/ai/engine-test`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to ping AI Engine");
  return await res.json();
}

export async function updateGeminiPreferences(prefs: {
  selected_model?: string;
  api_key?: string;
}): Promise<any> {
  const payload: any = { primary_provider: "gemini" };
  if (prefs.selected_model) {
    payload.provider_models = { gemini: prefs.selected_model };
  }
  if (prefs.api_key) {
    payload.api_key = prefs.api_key;
  }
  const res = await fetch(`${API_BASE_URL}/api/ai/preferences`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update AI Engine preferences");
  return await res.json();
}

export async function disconnectGeminiBYOK(): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/ai/providers/gemini/disconnect`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to reset Gemini key configuration");
  return await res.json();
}

// -----------------------------------------
// Tessera Mind Planner API
// -----------------------------------------

export interface MindPlanNode {
  id: string;
  label: string;
  sublabel: string;
  tech: string;
  type: string;
  color: string;
  x: number;
  y: number;
}

export interface MindPlanEdge {
  from: string;
  to: string;
  type: "direct" | "indirect";
}

export interface MindPlanTechStack {
  layer: string;
  technology: string;
  rationale: string;
  trade_off: string;
}

export interface MindPlanSchema {
  table: string;
  fields: string[];
  relations: string;
}

export interface MindPlanRoadmapPhase {
  phase: string;
  time_estimate: string;
  focus: string;
  deliverables: string[];
}

export interface MindPlan {
  title: string;
  tagline: string;
  overview: string;
  nodes: MindPlanNode[];
  edges: MindPlanEdge[];
  tech_stack: MindPlanTechStack[];
  database_schema: MindPlanSchema[];
  roadmap: MindPlanRoadmapPhase[];
  file_tree: string[];
}

export interface MindPlanResponse {
  status: string;
  plan: MindPlan;
  error?: string;
}

export async function generateMindPlan(
  prompt: string,
  repoUrl?: string,
  existingRepoContext?: string,
  files?: Array<{ path: string; size: number; content: string }>
): Promise<MindPlanResponse> {
  const res = await fetch(`${API_BASE_URL}/api/planner/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      repo_url: repoUrl,
      existing_repo_context: existingRepoContext,
      files,
    }),
  });
  if (!res.ok) throw new Error("Failed to generate mind plan");
  return await res.json();
}

// -----------------------------------------
// Tessera Hackathon Judge Evaluation API
// -----------------------------------------

export interface JudgeRubricCategory {
  score: number;
  comment: string;
  is_real_backend?: boolean;
}

export interface JudgeRedFlag {
  severity: "High" | "Medium" | "Low";
  title: string;
  description: string;
  location: string;
}

export interface JudgeEvaluation {
  verdict: string;
  verdict_summary: string;
  overall_score: number;
  originality_score: number;
  rubric: {
    innovation: JudgeRubricCategory;
    technical_execution: JudgeRubricCategory;
    security_reliability: JudgeRubricCategory;
    code_cleanliness: JudgeRubricCategory;
    working_reality: JudgeRubricCategory;
  };
  key_strengths: string[];
  red_flags: JudgeRedFlag[];
  judge_feedback_markdown: string;
}

export interface JudgeEvaluationResponse {
  status: string;
  evaluation: JudgeEvaluation;
  error?: string;
}

export async function evaluateHackathonRepo(
  repoUrl: string,
  hackathonCategory?: string,
  files?: Array<{ path: string; size: number; content: string }>,
  healthScore?: number
): Promise<JudgeEvaluationResponse> {
  const res = await fetch(`${API_BASE_URL}/api/judge/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      repo_url: repoUrl,
      hackathon_category: hackathonCategory,
      files,
      health_score: healthScore,
    }),
  });
  if (!res.ok) throw new Error("Failed to evaluate repository for judges");
  return await res.json();
}

// -----------------------------------------
// Tessera Developer & Vibecoder Assistant API
// -----------------------------------------

export interface AssistantChatResponse {
  status: string;
  reply: string;
  referenced_files: string[];
  suggested_questions: string[];
}

export async function assistantChat(
  repoUrl: string,
  message: string,
  history?: Array<{ role: string; content: string }>,
  files?: Array<{ path: string; size: number; content: string }>
): Promise<AssistantChatResponse> {
  const res = await fetch(`${API_BASE_URL}/api/assistant/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      repo_url: repoUrl,
      message,
      history,
      files,
    }),
  });
  if (!res.ok) throw new Error("Failed to communicate with Tessera Assistant");
  return await res.json();
}

// Backwards-compatibility aliases
export async function fetchAIProviders(): Promise<ProviderInfo[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/ai/providers`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchAIStatus(): Promise<AIStatusResponse> {
  const res = await fetch(`${API_BASE_URL}/api/ai/status`);
  if (!res.ok) throw new Error("Failed to fetch AI gateway status");
  return await res.json();
}

export async function connectAIProvider(providerId: string, apiKey: string) {
  return await updateGeminiPreferences({ api_key: apiKey });
}

export async function disconnectAIProvider(providerId: string) {
  return await disconnectGeminiBYOK();
}

export async function updateAIPreferences(prefs: any) {
  return await updateGeminiPreferences(prefs);
}




