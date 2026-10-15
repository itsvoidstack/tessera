from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from urllib.parse import urlparse
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from contextlib import asynccontextmanager

import requests
import os
import base64
import asyncio
import logging
import time
import re
import json
from typing import Optional, List, Dict, Any

from ai.gateway import ai_gateway
from ai.base import GenerateRequest


# -----------------------------------------
# Logging & Startup state
# -----------------------------------------

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tessera_backend")
START_TIME = time.time()


# -----------------------------------------
# Self-Ping Healthcheck Task (Keeps Backend Awake)
# -----------------------------------------

async def self_ping_loop():
    """
    Background worker that runs every 10 minutes (600s) to keep
    the backend service active and prevent free-tier hosting (e.g. Render/Railway) from sleeping.
    """
    await asyncio.sleep(5)
    interval = int(os.getenv("HEALTHCHECK_INTERVAL_SECONDS", "600"))
    logger.info(f"Automated healthcheck loop started (Interval: {interval} seconds / {interval // 60} minutes).")

    while True:
        try:
            default_url = os.getenv("RENDER_EXTERNAL_URL", "https://tessera-backend-n7ey.onrender.com").rstrip("/") + "/health"
            ping_url = os.getenv("SELF_PING_URL", default_url)
            logger.info(f"[Keep-Alive Healthcheck] Ping sent to: {ping_url}")
            
            def ping():
                return requests.get(ping_url, timeout=10)

            loop = asyncio.get_running_loop()
            res = await loop.run_in_executor(None, ping)
            logger.info(f"[Keep-Alive Healthcheck] Status: {res.status_code}")
        except Exception as e:
            logger.warning(f"[Keep-Alive Healthcheck] Ping failed: {e}")
        
        await asyncio.sleep(interval)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing backend services...")
    ping_task = asyncio.create_task(self_ping_loop())
    yield
    # Shutdown
    logger.info("Shutting down backend services...")
    ping_task.cancel()
    try:
        await ping_task
    except asyncio.CancelledError:
        pass


# -----------------------------------------
# Load environment variables
# -----------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


# -----------------------------------------
# Gemini client
# -----------------------------------------

if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY is not set.")

gemini_client = None

if GEMINI_API_KEY:
    gemini_client = genai.Client(
        api_key=GEMINI_API_KEY
    )


# -----------------------------------------
# FastAPI
# -----------------------------------------

app = FastAPI(title="Tessera API", lifespan=lifespan)
frontend_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
frontend_origins.extend(
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGINS", "").split(",")
    if origin.strip()
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_origin_regex=r"https://.*\.netlify\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScanRequest(BaseModel):
    repo_url: str


def parse_github_repository(repo_url: str) -> tuple[str, str]:
    """Accept either an owner/repository value or a full GitHub URL."""
    value = repo_url.strip()
    if value.startswith(("github.com/", "www.github.com/")):
        value = f"https://{value}"
    if "://" not in value:
        value = f"https://github.com/{value.lstrip('/')}"

    parsed_url = urlparse(value)
    if parsed_url.netloc.lower() not in {"github.com", "www.github.com"}:
        raise HTTPException(
            status_code=400,
            detail="Please provide a valid GitHub repository URL or owner/repository.",
        )

    path_parts = [part for part in parsed_url.path.strip("/").split("/") if part]
    if len(path_parts) < 2:
        raise HTTPException(
            status_code=400,
            detail="Please provide a valid GitHub repository URL or owner/repository.",
        )

    return path_parts[0], path_parts[1].removesuffix(".git")


def github_headers() -> dict[str, str]:
    headers = {"Accept": "application/vnd.github+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return headers


def github_request(url: str, timeout: int = 10, params: dict = None) -> requests.Response:
    """Make a request to GitHub API, with fallback for invalid/expired GITHUB_TOKEN."""
    headers = github_headers()
    res = requests.get(url, headers=headers, timeout=timeout, params=params)
    if res.status_code == 401 and GITHUB_TOKEN:
        unauth_headers = {"Accept": "application/vnd.github+json"}
        res = requests.get(url, headers=unauth_headers, timeout=timeout, params=params)
    return res


def security_audit_issues(analyzed_files: list[dict]) -> list[dict]:
    """Find executable security risks while ignoring comments and string literals."""
    checks = (
        ("eval(", "High", "Dynamic code execution", "Avoid eval(); parse or validate expected input instead."),
        ("exec(", "High", "Dynamic code execution", "Avoid exec(); use a fixed command or safe function dispatch."),
        ("pickle.loads(", "High", "Unsafe deserialization", "Do not deserialize untrusted pickle data; use a safe format such as JSON."),
        ("dangerouslysetinnerhtml", "Medium", "Unsafe HTML rendering", "Sanitize HTML before rendering, or render trusted structured content instead."),
    )
    findings = []

    for file in analyzed_files:
        file_path = file.get("path", "analyzed-source")
        for line_number, raw_line in enumerate(file["content"].splitlines(), start=1):
            code = raw_line.split("#", 1)[0].split("//", 1)[0]
            code = re.sub(r"(['\"])(?:\\.|(?!\1).)*\1", "", code).lower()

            for pattern, severity, title, suggested_fix in checks:
                if pattern in code:
                    findings.append({
                        "id": f"security-{len(findings) + 1}",
                        "title": title,
                        "description": f"{title} detected in {file_path}.",
                        "severity": severity,
                        "file": file_path,
                        "line": line_number,
                        "category": "Security",
                        "suggestedFix": suggested_fix,
                    })

    return findings


def static_scores(tree_data: dict, analyzed_files: list[dict]) -> tuple[dict, int]:
    """Produce explainable baseline scores from repository structure and source."""
    paths = [item.get("path", "").lower() for item in tree_data.get("tree", [])]
    source = "\n".join(file["content"].lower() for file in analyzed_files)
    source_count = len(analyzed_files)

    has_tests = any(
        part in path for path in paths for part in ("/test/", "/tests/", ".test.", ".spec.")
    )
    has_docs = any(Path(path).name in {"readme.md", "readme.rst", "readme.txt"} for path in paths)
    has_manifest = any(
        Path(path).name in {"package.json", "requirements.txt", "pyproject.toml", "pom.xml", "go.mod", "cargo.toml"}
        for path in paths
    )
    top_level_directories = {Path(path).parts[0] for path in paths if len(Path(path).parts) > 1}
    todo_count = source.count("todo") + source.count("fixme")
    risky_patterns = len(security_audit_issues(analyzed_files))
    performance_patterns = source.count("for ") + source.count("while ")

    def bounded(score: int) -> int:
        return max(25, min(95, score))

    code_quality = bounded(76 + min(source_count, 10) - min(todo_count * 2, 20))
    security = bounded(90 - min(risky_patterns * 8, 40))
    testing = 85 if has_tests else 45
    documentation = 85 if has_docs else 55
    dependencies = 86 if has_manifest else 60
    architecture = bounded(65 + min(len(top_level_directories) * 3, 15) + (5 if has_manifest else 0))
    maintainability = bounded((code_quality + documentation + testing) // 3)
    reliability = bounded((code_quality + security + testing) // 3)
    performance = bounded(82 - min(max(performance_patterns - 30, 0), 15))

    scores = {
        "architecture": architecture,
        "codeQuality": code_quality,
        "security": security,
        "testing": testing,
        "documentation": documentation,
        "dependencies": dependencies,
        "maintainability": maintainability,
        "reliability": reliability,
        "performance": performance,
    }
    health_score = round(sum(scores.values()) / len(scores))
    return scores, health_score


# -----------------------------------------
# Basic routes
# -----------------------------------------

@app.get("/")
def root():
    return {
        "message": "Tessera backend is running 🚀"
    }


@app.get("/health")
def health():
    uptime_seconds = round(time.time() - START_TIME, 2)
    return {
        "status": "healthy",
        "uptime_seconds": uptime_seconds,
        "message": "Tessera backend is active and keep-alive is active 🚀",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
    }


@app.get("/api/validate-repo")
def validate_repository(repo_url: str):
    owner, repo = parse_github_repository(repo_url)

    try:
        response = github_request(
            f"https://api.github.com/repos/{owner}/{repo}",
            timeout=10,
        )
    except requests.RequestException:
        raise HTTPException(status_code=503, detail="Unable to connect to GitHub.")

    if response.status_code == 404:
        return {
            "valid": False,
            "error": "GitHub repository not found or it is private. Check the URL or make the repository public.",
        }
    if response.status_code == 403:
        raise HTTPException(status_code=429, detail="GitHub API rate limit exceeded.")
    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"GitHub API returned status {response.status_code}.",
        )

    data = response.json()
    return {
        "valid": True,
        "meta": {
            "owner": data["owner"]["login"],
            "repo": data["name"],
            "fullName": data["full_name"],
            "description": data.get("description") or "",
            "language": data.get("language") or "Unknown",
            "stars": data.get("stargazers_count", 0),
            "forks": data.get("forks_count", 0),
            "openIssues": data.get("open_issues_count", 0),
            "defaultBranch": data.get("default_branch", "main"),
            "avatarUrl": data["owner"].get("avatar_url", ""),
            "htmlUrl": data["html_url"],
            "updatedAt": data.get("updated_at", ""),
        },
    }


# -----------------------------------------
# Scan repository
# -----------------------------------------

@app.post("/api/scan")
async def scan_repository(request: ScanRequest):

    # -----------------------------------------
    # 1. Validate GitHub URL
    # -----------------------------------------

    owner, repo = parse_github_repository(request.repo_url)

    # -----------------------------------------
    # 2. GitHub API headers
    # -----------------------------------------

    headers = github_headers()

    # -----------------------------------------
    # 3. Get repository information
    # -----------------------------------------

    repo_api_url = (
        f"https://api.github.com/repos/{owner}/{repo}"
    )

    try:
        response = github_request(
            repo_api_url,
            timeout=10
        )

    except requests.RequestException:
        raise HTTPException(
            status_code=503,
            detail="Unable to connect to GitHub."
        )

    if response.status_code == 404:
        raise HTTPException(
            status_code=404,
            detail="GitHub repository not found."
        )

    if response.status_code == 403:
        raise HTTPException(
            status_code=429,
            detail="GitHub API rate limit exceeded."
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"GitHub API returned status {response.status_code}."
        )

    repo_data = response.json()

    # -----------------------------------------
    # 4. Get repository file tree
    # -----------------------------------------

    branch = repo_data.get("default_branch", "main")

    tree_api_url = (
        f"https://api.github.com/repos/"
        f"{owner}/{repo}/git/trees/{branch}"
        f"?recursive=1"
    )

    try:
        tree_response = github_request(
            tree_api_url,
            timeout=15
        )

    except requests.RequestException:
        raise HTTPException(
            status_code=503,
            detail="Unable to retrieve repository files."
        )

    if tree_response.status_code == 403:
        raise HTTPException(
            status_code=429,
            detail="GitHub API rate limit exceeded while retrieving files."
        )

    if tree_response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve repository file tree."
        )

    tree_data = tree_response.json()

    # -----------------------------------------
    # 5. Select important source files
    # -----------------------------------------

    allowed_extensions = {
        ".py",
        ".js",
        ".jsx",
        ".ts",
        ".tsx",
        ".html",
        ".css",
        ".java",
        ".c",
        ".cpp",
        ".h",
        ".hpp",
        ".go",
        ".rs",
        ".php",
        ".rb",
        ".sql"
    }

    ignored_directories = {
        "node_modules",
        "venv",
        ".venv",
        ".git",
        "__pycache__",
        "dist",
        "build",
        "docs",
        "tests",
        "test",
        "assets",
        "static",
        "css",
        "images"
    }

    priority_files = {
        "main.py",
        "app.py",
        "server.py",
        "index.py",
        "main.js",
        "app.js",
        "server.js",
        "index.js",
        "main.ts",
        "app.ts",
        "server.ts",
        "index.ts",
        "package.json",
        "requirements.txt"
    }

    source_files = []

    for item in tree_data.get("tree", []):

        if item.get("type") != "blob":
            continue

        file_path = item.get("path", "")
        path_parts_file = Path(file_path).parts

        if any(
            directory.lower() in ignored_directories
            for directory in path_parts_file
        ):
            continue

        extension = Path(file_path).suffix.lower()

        if extension not in allowed_extensions and Path(file_path).name.lower() not in {
            name.lower() for name in priority_files
        }:
            continue

        file_name = Path(file_path).name

        if file_name.lower() in {
            name.lower() for name in priority_files
        }:
            priority = 0

        elif extension in {
            ".py",
            ".js",
            ".ts",
            ".jsx",
            ".tsx"
        }:
            priority = 1

        elif extension in {
            ".java",
            ".c",
            ".cpp",
            ".go",
            ".rs"
        }:
            priority = 2

        else:
            priority = 3

        source_files.append({
            "path": file_path,
            "size": item.get("size", 0),
            "priority": priority
        })

    source_files.sort(
        key=lambda file: (
            file["priority"],
            file["path"].lower()
        )
    )

    # -----------------------------------------
    # 6. Limit files for MVP
    # -----------------------------------------

    MAX_FILES = 20

    source_files = source_files[:MAX_FILES]

    # -----------------------------------------
    # 7. Fetch actual file contents
    # -----------------------------------------

    analyzed_files = []

    for file in source_files:

        file_path = file["path"]

        content_api_url = (
            f"https://api.github.com/repos/"
            f"{owner}/{repo}/contents/{file_path}"
            f"?ref={branch}"
        )

        try:
            content_response = github_request(
                content_api_url,
                timeout=10
            )

        except requests.RequestException:
            continue

        if content_response.status_code != 200:
            continue

        content_data = content_response.json()

        encoded_content = content_data.get("content")

        if not encoded_content:
            continue

        try:
            decoded_content = base64.b64decode(
                encoded_content
            ).decode(
                "utf-8",
                errors="ignore"
            )

        except Exception:
            continue

        MAX_FILE_SIZE = 50000

        if len(decoded_content) > MAX_FILE_SIZE:
            decoded_content = decoded_content[:MAX_FILE_SIZE]

        analyzed_files.append({
            "path": file_path,
            "size": file["size"],
            "content": decoded_content
        })

    scores, health_score = static_scores(tree_data, analyzed_files)

    # -----------------------------------------
    # 8. AI analysis (via AI Gateway)
    # -----------------------------------------

    ai_analysis = None

    if analyzed_files:
        files_for_ai = ""

        for file in analyzed_files:
            files_for_ai += (
                f"\n\n--- FILE: {file['path']} ---\n"
                f"{file['content']}"
            )

        prompt = f"""
You are Tessera, an AI-powered GitHub repository analyzer.

Analyze the following repository.

Repository:
{repo_data.get("full_name")}

Description:
{repo_data.get("description")}

Primary language:
{repo_data.get("language")}

Source files:
{files_for_ai}

Provide a concise but useful engineering analysis with these sections:

1. Project Overview
2. Code Quality
3. Architecture
4. Potential Bugs
5. Security Concerns
6. Performance Concerns
7. Maintainability
8. Top 5 Recommendations

Be specific. Base your analysis only on the provided repository information and source code.
"""

        try:
            ai_res = await ai_gateway.generate(GenerateRequest(prompt=prompt))
            ai_analysis = ai_res.text
        except Exception as e:
            logger.error(f"AI Gateway scan analysis failed: {e}")
            ai_analysis = f"AI analysis failed. Error: {str(e)}"

    elif not analyzed_files:
        ai_analysis = "No source files were available for AI analysis."

    audit_issues = security_audit_issues(analyzed_files)

    # -----------------------------------------
    # 9. Return scan result
    # -----------------------------------------

    return {
        "status": "success",

        "repository": {
            "name": repo_data.get("name"),
            "full_name": repo_data.get("full_name"),
            "description": repo_data.get("description"),
            "language": repo_data.get("language"),
            "stars": repo_data.get("stargazers_count"),
            "forks": repo_data.get("forks_count"),
            "default_branch": branch,
            "url": repo_data.get("html_url")
        },

        "file_count": len(source_files),

        "files": analyzed_files,

        "ai_analysis": ai_analysis,

        "scores": scores,

        "health_score": health_score,

        "audit_issues": audit_issues,

        "scoring_method": "static repository analysis"
    }


# -----------------------------------------
# Generate Note Insight Endpoint
# -----------------------------------------

class NoteGenerateRequest(BaseModel):
    repo_url: str
    insight_type: str
    scan_id: str | None = None
    existing_analysis: str | None = None
    files: list[dict] | None = None


@app.post("/api/notes/generate")
async def generate_note_insight(request: NoteGenerateRequest):
    owner, repo = parse_github_repository(request.repo_url)
    analyzed_files = request.files or []

    if not analyzed_files:
        headers = github_headers()
        repo_api_url = f"https://api.github.com/repos/{owner}/{repo}"
        try:
            res = requests.get(repo_api_url, headers=headers, timeout=10)
            if res.status_code != 200:
                raise HTTPException(status_code=res.status_code, detail="GitHub repository unreachable.")
            repo_data = res.json()
            branch = repo_data.get("default_branch", "main")
            tree_res = requests.get(
                f"https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1",
                headers=headers,
                timeout=15
            )
            if tree_res.status_code == 200:
                tree_data = tree_res.json()
                allowed_extensions = {
                    ".py", ".js", ".jsx", ".ts", ".tsx", ".html", ".css",
                    ".java", ".c", ".cpp", ".go", ".rs", ".sql"
                }
                ignored_directories = {
                    "node_modules", "venv", ".venv", ".git", "__pycache__", "dist", "build"
                }
                source_files = []
                for item in tree_data.get("tree", []):
                    if item.get("type") != "blob":
                        continue
                    fp = item.get("path", "")
                    if any(d in Path(fp).parts for d in ignored_directories):
                        continue
                    if Path(fp).suffix.lower() in allowed_extensions:
                        source_files.append({"path": fp, "size": item.get("size", 0)})

                source_files = source_files[:15]
                for file in source_files:
                    fp = file["path"]
                    c_res = requests.get(
                        f"https://api.github.com/repos/{owner}/{repo}/contents/{fp}?ref={branch}",
                        headers=headers,
                        timeout=10
                    )
                    if c_res.status_code == 200:
                        c_data = c_res.json()
                        enc = c_data.get("content")
                        if enc:
                            decoded = base64.b64decode(enc).decode("utf-8", errors="ignore")[:30000]
                            analyzed_files.append({"path": fp, "size": file["size"], "content": decoded})
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Error retrieving repository files for note generation: {e}")

    files_text = ""
    for f in analyzed_files:
        files_text += f"\n\n--- FILE: {f['path']} ---\n{f.get('content', '')}"

    if not files_text and request.existing_analysis:
        files_text = f"\n\n--- PREVIOUS ANALYSIS SUMMARY ---\n{request.existing_analysis}"

    insight = request.insight_type.lower().strip()

    prompts = {
        "architecture": f"""You are an expert software architect analyzing the repository {owner}/{repo}.
Based ONLY on the actual source code and files below:
{files_text}

Write a detailed, structured Architecture Insight note for developers.
Cover:
- Core System Modules & Entry Points
- UI / Service / Storage Layers & Boundaries
- State & Data Flow Patterns
- Critical Dependencies & Integration Points
- Key Architectural Patterns & Concerns

Format in clean markdown with headers, bullet points, and code identifiers.""",

        "quality": f"""You are a principal engineer analyzing code quality for {owner}/{repo}.
Based ONLY on the actual source code and files below:
{files_text}

Write a detailed Code Quality & Technical Debt note.
Cover:
- Fragile or Complex Code Areas (with exact file paths where evidence exists)
- Technical Debt & Maintenance Hotspots
- Code Duplication & Consistency Concerns
- Suggested Refactoring & Code Quality Improvements

Be specific and ground all claims in the provided source files. Do not fabricate issues.""",

        "security": f"""You are a security expert auditing {owner}/{repo}.
Based ONLY on the actual source code below:
{files_text}

Write a Security & Risk Insight note.
Cover:
- Identified Security & Validation Risks (with file locations where evidence exists)
- Severity Rating (Critical/High/Medium/Low) for each finding
- Why it matters for safety and data protection
- Actionable Remediation Guidance

Do not fabricate vulnerabilities. Only list risks evidenced by the code.""",

        "files": f"""You are a senior developer analyzing file structure in {owner}/{repo}.
Based ONLY on the actual source code below:
{files_text}

Write an Important Files Reference note.
For each key file identified:
- File path & primary responsibility
- Why it is critical to the application
- What other files or modules depend on it

List 5 to 10 most important files with brief, precise explanations.""",

        "onboarding": f"""You are a tech lead onboarding a new developer to {owner}/{repo}.
Based ONLY on the actual source code below:
{files_text}

Write a Developer Onboarding Guide note.
Answer:
1. What is this project and what does it do?
2. Where does execution start (frontend & backend entry points)?
3. How is authentication, database access, or API interaction structured?
4. Which key files should a new developer read first?
5. What conventions or rules should they know before submitting code?

Make it practical, welcoming, and clear.""",

        "changes": f"""You are an engineering observer analyzing repository evolution in {owner}/{repo}.
Based on the available repository files and analysis below:
{files_text}

Write a Repository Change & Evolution Note.
Cover:
- Summary of repository structure and key components
- Core architectural modules currently active
- Maintainability & structural status
- Meaningful observations for codebase tracking

Keep it clear, professional, and actionable.""",

        "overall": f"""You are a principal engineer creating a comprehensive engineering reference note for {owner}/{repo}.
Based ONLY on the actual source code and files below:
{files_text}

Synthesize a single, highly useful, structured engineering knowledge document.
Include these exact sections:
1. What This Project Is & Core Purpose
2. Architecture & System Boundaries
3. How It Works & Key Data Flows
4. Important Files & Components
5. Security & Risk Assessment
6. Technical Debt & Code Quality
7. Developer Onboarding & How to Get Started
8. Recent Evolution & Changes (if relevant evidence exists)

Format in clean markdown with clear headers, bullet points, and code backticks for identifiers. Ground all claims strictly in the provided files. Do not fabricate facts."""
    }

    prompt = prompts.get(insight, prompts["overall"])

    try:
        ai_res = await ai_gateway.generate(GenerateRequest(prompt=prompt))
        content = ai_res.text
    except Exception as e:
        logger.error(f"AI Gateway note generation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate insight via AI Gateway: {str(e)}"
        )

    titles = {
        "overall": "Overall Repository Insight",
        "architecture": "Architecture Insight",
        "quality": "Code Quality & Technical Debt",
        "security": "Security & Vulnerability Insight",
        "files": "Important Files & Core Components",
        "onboarding": "Developer Onboarding Guide",
        "changes": "Repository Evolution & Changes"
    }

    tags_map = {
        "overall": ["overall", "comprehensive", "ai-insight"],
        "architecture": ["architecture", "design", "ai-insight"],
        "quality": ["code-quality", "tech-debt", "ai-insight"],
        "security": ["security", "audit", "ai-insight"],
        "files": ["important-files", "structure", "ai-insight"],
        "onboarding": ["onboarding", "guide", "ai-insight"],
        "changes": ["rescan", "changes", "ai-insight"]
    }


    return {
        "status": "success",
        "title": titles.get(insight, "Repository Insight"),
        "insight_type": insight,
        "content": content,
        "tags": tags_map.get(insight, ["ai-insight"]),
        "scan_id": request.scan_id or "latest"
    }


# -----------------------------------------
# Streamlined Gemini Intelligence Engine Routes
# -----------------------------------------

class ConnectProviderRequest(BaseModel):
    api_key: str


class AIPreferencesRequest(BaseModel):
    primary_provider: Optional[str] = "gemini"
    fallback_provider: Optional[str] = None
    provider_models: Optional[dict[str, str]] = None
    api_key: Optional[str] = None


@app.get("/api/ai/engine-status")
def get_ai_engine_status():
    server_key = os.getenv("GEMINI_API_KEY")
    byok_key = ai_gateway.store.get_decrypted_key("gemini")
    is_connected = bool(server_key or byok_key)
    auth_source = "byok" if byok_key else ("server_env" if server_key else "none")
    selected_model = ai_gateway.store.provider_models.get("gemini", "gemini-2.5-flash")

    return {
        "engine": "Google Gemini",
        "provider_id": "gemini",
        "connected": is_connected,
        "auth_source": auth_source,
        "selected_model": selected_model,
        "masked_key": f"...{byok_key[-4:]}" if byok_key else ("(Server Attached Key)" if server_key else "None"),
        "available_models": [
            {
                "id": "gemini-2.5-flash",
                "name": "Gemini 2.5 Flash",
                "tag": "Recommended",
                "description": "Ultra-fast, highly optimized model for code analysis, architecture planning, and real-time insights.",
                "context_window": 1000000,
            },
            {
                "id": "gemini-1.5-pro",
                "name": "Gemini 1.5 Pro",
                "tag": "Deep Reasoning",
                "description": "Reasoning-intensive model for deep codebase comprehension and complex architectural audits.",
                "context_window": 2000000,
            },
            {
                "id": "gemini-1.5-flash",
                "name": "Gemini 1.5 Flash",
                "tag": "High Throughput",
                "description": "Fast standard model for high-throughput repository scanning and automated checks.",
                "context_window": 1000000,
            },
            {
                "id": "gemini-2.0-flash",
                "name": "Gemini 2.0 Flash",
                "tag": "Next Gen",
                "description": "Next-generation multimodal model.",
                "context_window": 1000000,
            },
        ],
        "server_key_present": bool(server_key),
    }


@app.post("/api/ai/engine-test")
async def test_ai_engine():
    start_t = time.time()
    try:
        res = await ai_gateway.generate(
            GenerateRequest(
                prompt="Respond in exactly 6 words confirming that Tessera Gemini Intelligence Engine is operational."
            ),
            preferred_provider="gemini",
        )
        latency_ms = round((time.time() - start_t) * 1000)
        return {
            "status": "success",
            "message": "Gemini Engine test succeeded",
            "latency_ms": latency_ms,
            "model": res.model,
            "response": res.text.strip(),
        }
    except Exception as e:
        latency_ms = round((time.time() - start_t) * 1000)
        logger.error(f"Gemini test failed: {e}")
        return {
            "status": "error",
            "message": str(e),
            "latency_ms": latency_ms,
        }


@app.get("/api/ai/status")
def get_ai_status():
    return ai_gateway.get_status()


@app.get("/api/ai/providers")
def list_ai_providers():
    return [info.model_dump() for info in ai_gateway.list_providers()]


@app.post("/api/ai/providers/{provider_id}/connect")
async def connect_ai_provider(provider_id: str, request: ConnectProviderRequest):
    if provider_id not in ai_gateway.providers:
        raise HTTPException(status_code=404, detail=f"Provider '{provider_id}' is not supported.")

    provider = ai_gateway.get_provider(provider_id)
    is_valid = await provider.validate_connection(api_key=request.api_key)
    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid API Key or connection test failed for provider '{provider.name}'."
        )

    ai_gateway.store.set_byok_connection(provider_id, request.api_key)
    return {
        "status": "success",
        "message": f"Successfully connected {provider.name} API key.",
        "connection": ai_gateway.store.get_connection_status(provider_id),
    }


@app.post("/api/ai/providers/{provider_id}/disconnect")
def disconnect_ai_provider(provider_id: str):
    if provider_id not in ai_gateway.providers:
        raise HTTPException(status_code=404, detail=f"Provider '{provider_id}' not found.")

    ai_gateway.store.disconnect(provider_id)
    return {"status": "success", "message": f"Reverted {provider_id} to server default configuration."}


@app.post("/api/ai/preferences")
def update_ai_preferences(request: AIPreferencesRequest):
    primary = request.primary_provider or "gemini"
    ai_gateway.store.primary_provider = primary
    ai_gateway.store.fallback_provider = None

    if request.provider_models:
        ai_gateway.store.provider_models.update(request.provider_models)

    if request.api_key:
        ai_gateway.store.set_byok_connection("gemini", request.api_key)

    ai_gateway.store.save()
    return {
        "status": "success",
        "message": "AI settings updated successfully.",
        "ai_status": get_ai_engine_status(),
    }


# -----------------------------------------
# Utility: Robust JSON extractor for LLMs
# -----------------------------------------

def extract_json_safely(text: str) -> dict:
    """Safely extracts a JSON object from model output that may include markdown fences."""
    clean = text.strip()
    if clean.startswith("```"):
        clean = re.sub(r"^```(?:json)?\s*", "", clean, flags=re.MULTILINE)
        clean = re.sub(r"\s*```$", "", clean, flags=re.MULTILINE)

    start = clean.find("{")
    end = clean.rfind("}")
    if start != -1 and end != -1:
        clean = clean[start : end + 1]

    return json.loads(clean)


# -----------------------------------------
# Tessera Mind Planner Endpoint
# -----------------------------------------

class PlanGenerateRequest(BaseModel):
    prompt: str
    repo_url: Optional[str] = None
    existing_repo_context: Optional[str] = None
    files: Optional[list] = None


@app.post("/api/planner/generate")
async def generate_mind_plan(request: PlanGenerateRequest):
    """
    Turns an idea prompt or existing repository into a complete engineering architecture blueprint:
    - Node-link visual mindmap (Components & Dataflow Edges)
    - Tech Stack Decision Matrix with trade-offs
    - Entity / Database Schemas
    - Phased Implementation Sprint Roadmap (MVP -> Hardening -> Production)
    - File Tree Skeleton
    """
    context_str = ""
    if request.files:
        context_str = "\n".join([f"File: {f.get('path')}" for f in request.files[:15]])
    elif request.existing_repo_context:
        context_str = request.existing_repo_context

    system_prompt = """You are Tessera Mind Planner, a world-class principal software architect and system designer.
Your task is to take an idea prompt (and any codebase context) and generate a comprehensive, production-grade system blueprint.

You MUST respond strictly with a valid JSON object without surrounding prose.
The JSON must follow this exact schema:
{
  "title": "Clear System Title",
  "tagline": "One punchy sentence summarizing the core value",
  "overview": "2-3 paragraphs describing the architecture, entry flows, and key abstractions",
  "nodes": [
    {
      "id": "unique_node_id_e.g_client_web",
      "label": "Short Component Name",
      "sublabel": "e.g. Next.js 15 App Router",
      "tech": "Framework / Tool",
      "type": "entry | core | ui | data | service",
      "color": "hex color like #1a5c38, #2563eb, #d97706, #7c3aed, #0891b2",
      "x": integer (between 50 and 850),
      "y": integer (between 50 and 500)
    }
  ],
  "edges": [
    {
      "from": "node_id_source",
      "to": "node_id_target",
      "type": "direct | indirect"
    }
  ],
  "tech_stack": [
    {
      "layer": "Frontend / API Gateway / Background Workers / Database / Cache",
      "technology": "Selected Tool",
      "rationale": "Why this tool is chosen",
      "trade_off": "Key limitation or operational challenge to monitor"
    }
  ],
  "database_schema": [
    {
      "table": "table_name",
      "fields": ["id: UUID PRIMARY KEY", "created_at: TIMESTAMP", "..."],
      "relations": "e.g. Belongs to User, Has many Projects"
    }
  ],
  "roadmap": [
    {
      "phase": "Phase 1: Hackathon MVP (Hours 1-24)",
      "time_estimate": "24 Hours",
      "focus": "Core User Loop & Demo Flow",
      "deliverables": ["Feature A", "Feature B", "Feature C"]
    },
    {
      "phase": "Phase 2: Polish & Security (Hours 24-36)",
      "time_estimate": "12 Hours",
      "focus": "Error boundaries, Auth, and Edge Cases",
      "deliverables": ["Input sanitization", "Loading states", "Audit fixes"]
    },
    {
      "phase": "Phase 3: Production Readiness",
      "time_estimate": "Post-Hackathon",
      "focus": "Scalability, Caching, and Observability",
      "deliverables": ["Redis caching", "Rate limiting", "CI/CD automated tests"]
    }
  ],
  "file_tree": [
    "frontend/app/page.tsx",
    "frontend/components/Canvas.tsx",
    "backend/main.py",
    "backend/services/ai_engine.py",
    "backend/db/models.py"
  ]
}
Ensure there are at least 5-8 well-spaced nodes across realistic layers (Entry, Core API, Services, Database, Cache/Workers).
"""

    user_prompt = f"""Generate an architecture blueprint for:
{request.prompt}

Codebase context (if any):
{context_str or "New Greenfield Project / Architecture Redesign"}
"""

    try:
        ai_res = await ai_gateway.generate(
            GenerateRequest(
                prompt=user_prompt,
                system_instruction=system_prompt,
                model="gemini-2.5-flash",
            )
        )
        plan_data = extract_json_safely(ai_res.text)
        return {
            "status": "success",
            "plan": plan_data,
        }
    except Exception as e:
        logger.error(f"Mind Planner generation failed: {e}")
        # Provide resilient default fallback blueprint
        return {
            "status": "partial_fallback",
            "error": str(e),
            "plan": {
                "title": f"Architecture Blueprint: {request.prompt[:40]}",
                "tagline": "Modular full-stack architecture generated with Tessera Gemini Engine",
                "overview": f"System architecture blueprint designed for '{request.prompt}'. Features a clean decoupled frontend UI, asynchronous API layer, relational storage, and AI processing service.",
                "nodes": [
                    {"id": "client_web", "label": "Web Client", "sublabel": "Next.js / React", "tech": "TypeScript", "type": "entry", "color": "#1a5c38", "x": 80, "y": 200},
                    {"id": "api_gateway", "label": "API Gateway", "sublabel": "FastAPI REST Server", "tech": "Python / Pydantic", "type": "core", "color": "#2563eb", "x": 320, "y": 200},
                    {"id": "ai_worker", "label": "Gemini Engine Worker", "sublabel": "Async AI Processor", "tech": "Google GenAI SDK", "type": "service", "color": "#7c3aed", "x": 580, "y": 100},
                    {"id": "primary_db", "label": "Primary Database", "sublabel": "PostgreSQL / Supabase", "tech": "SQL", "type": "data", "color": "#d97706", "x": 580, "y": 300},
                    {"id": "cache_store", "label": "Redis Cache", "sublabel": "Session & Rate Limit Store", "tech": "In-Memory Key/Value", "type": "data", "color": "#0891b2", "x": 800, "y": 200},
                ],
                "edges": [
                    {"from": "client_web", "to": "api_gateway", "type": "direct"},
                    {"from": "api_gateway", "to": "ai_worker", "type": "direct"},
                    {"from": "api_gateway", "to": "primary_db", "type": "direct"},
                    {"from": "api_gateway", "to": "cache_store", "type": "indirect"},
                ],
                "tech_stack": [
                    {"layer": "Frontend", "technology": "Next.js 15 (App Router)", "rationale": "High-performance SSR, typed routing, responsive design", "trade_off": "Requires Node.js runtime or static export"},
                    {"layer": "API Layer", "technology": "FastAPI (Python)", "rationale": "Native async, automatic OpenAPI docs, fast Pydantic serialization", "trade_off": "Need ASGI worker management in production"},
                    {"layer": "AI Intelligence", "technology": "Google Gemini (2.5 Flash / 1.5 Pro)", "rationale": "1M+ token context window, multimodal speed, reliable code intelligence", "trade_off": "External API dependency; rate limits apply"},
                    {"layer": "Data Layer", "technology": "PostgreSQL & Supabase", "rationale": "ACID compliance, relational integrity, row-level security", "trade_off": "Schema migrations require discipline"},
                ],
                "database_schema": [
                    {"table": "projects", "fields": ["id: UUID PRIMARY KEY", "name: VARCHAR", "repo_url: VARCHAR", "created_at: TIMESTAMP"], "relations": "Has many Scans and Notes"},
                    {"table": "scans", "fields": ["id: UUID PRIMARY KEY", "project_id: UUID REFERENCES projects(id)", "health_score: INT", "summary: TEXT"], "relations": "Belongs to Project"},
                ],
                "roadmap": [
                    {"phase": "Phase 1: Hackathon MVP (Hours 1-24)", "time_estimate": "24 Hours", "focus": "Core working user flow", "deliverables": ["Interactive frontend UI", "Core API routes", "Gemini AI connection"]},
                    {"phase": "Phase 2: Polish & Hardening (Hours 24-36)", "time_estimate": "12 Hours", "focus": "Error handling and edge cases", "deliverables": ["Input validation", "Loading skeletons", "Security audit"]},
                    {"phase": "Phase 3: Production Scale", "time_estimate": "Post-Hackathon", "focus": "Observability & Performance", "deliverables": ["Redis caching", "Automated test suite", "Continuous deployment"]},
                ],
                "file_tree": [
                    "frontend/app/planner/page.tsx",
                    "frontend/components/Canvas.tsx",
                    "backend/main.py",
                    "backend/ai/gemini_provider.py",
                ]
            }
        }


# -----------------------------------------
# Tessera Hackathon Judge Evaluation Endpoint
# -----------------------------------------

class JudgeEvaluateRequest(BaseModel):
    repo_url: str
    hackathon_category: Optional[str] = "General / AI & Developer Tools"
    files: Optional[list] = None
    existing_scores: Optional[dict] = None
    health_score: Optional[int] = None


@app.post("/api/judge/evaluate")
async def evaluate_for_hackathon_judges(request: JudgeEvaluateRequest):
    """
    Evaluates a repository from a Hackathon Judge perspective:
    - 60-Second Executive Verdict (Production-Grade, Working Prototype, Superficial Mock, Boilerplate Fork)
    - Objective Rubric (Innovation, Technical Execution, Security, Cleanliness, Working Reality vs Mock)
    - Originality & Effort estimate
    - Red flag detector (fake mocks, empty functions, template leftovers)
    - Devpost ready-to-copy Markdown review
    """
    owner, repo = parse_github_repository(request.repo_url)
    analyzed_files = request.files or []

    # If no files provided, fetch sample from repo
    if not analyzed_files:
        try:
            headers = github_headers()
            repo_res = requests.get(f"https://api.github.com/repos/{owner}/{repo}", headers=headers, timeout=10)
            if repo_res.status_code == 200:
                repo_info = repo_res.json()
                branch = repo_info.get("default_branch", "main")
                tree_res = requests.get(
                    f"https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1",
                    headers=headers,
                    timeout=15,
                )
                if tree_res.status_code == 200:
                    tree_data = tree_res.json()
                    for item in tree_data.get("tree", [])[:15]:
                        if item.get("type") == "blob" and item.get("path", "").endswith((".py", ".ts", ".tsx", ".js")):
                            analyzed_files.append({"path": item.get("path"), "size": item.get("size", 0), "content": ""})
        except Exception as e:
            logger.warning(f"Judge evaluation file fetch warning: {e}")

    # Inspect code for mock patterns vs real implementation & project type
    detected_red_flags = []
    has_real_backend = False
    has_real_api_call = False
    is_portfolio_or_static = False

    # Check repository name / description for portfolio indicators
    repo_name_lower = repo.lower()
    description_lower = (repo_info.get("description") or "").lower() if 'repo_info' in locals() and repo_info else ""
    if any(k in repo_name_lower for k in ["portfolio", "resume", "cv", "personal", "bio", "showcase"]) or \
       any(k in description_lower for k in ["portfolio", "resume", "personal website", "cv"]):
        is_portfolio_or_static = True

    file_summary = ""
    backend_file_count = 0
    total_lines_approx = 0

    for f in analyzed_files:
        p = f.get("path", "").lower()
        c = f.get("content", "")
        total_lines_approx += len(c.splitlines())
        file_summary += f"\nFile: {f.get('path')} ({len(c)} chars)"

        # Check for mock indicators
        if "settimeout(" in c.lower() and any(k in c.lower() for k in ["mock", "fake", "dummy", "sample"]):
            detected_red_flags.append({
                "severity": "Medium",
                "title": "Simulated Delay / Mock Pattern Detected",
                "description": f"Found simulated delay timer in {f.get('path')} mimicking API latency.",
                "location": f.get("path")
            })

        if "fetch(" in c or "axios." in c or "requests." in c:
            has_real_api_call = True

        if any(p.endswith(ext) for ext in [".py", ".go", ".rs", ".java", ".cpp", ".c", ".php", ".rb"]) or \
           "server" in p or "api/" in p or "routes/" in p or "controllers/" in p:
            has_real_backend = True
            backend_file_count += 1

        if "todo" in c.lower() or "fixme" in c.lower():
            todo_count = c.lower().count("todo")
            if todo_count > 3:
                detected_red_flags.append({
                    "severity": "Low",
                    "title": f"Unfinished Stubs ({todo_count} TODOs)",
                    "description": f"Found {todo_count} unfinished stubs in {f.get('path')}.",
                    "location": f.get("path")
                })

    # If repository has only static files (html, css, basic jsx/tsx with no server or api routes)
    if backend_file_count == 0 and not has_real_api_call:
        is_portfolio_or_static = True

    # Adjust default category if detected as portfolio/static
    effective_category = request.hackathon_category
    if is_portfolio_or_static and ("AI" in effective_category or "Developer Tools" in effective_category):
        effective_category = "Static Website / Personal Showcase"

    system_prompt = f"""You are a senior, highly demanding and uncompromising Hackathon Judge evaluating submissions for major competitive prizes.
Your evaluation must be STRICT, RIGOROUS, EVIDENCE-GROUNDED, and UNBIASED.

CRITICAL JUDGING RULES (DO NOT INFLATE SCORES):
1. IF THIS IS A PORTFOLIO WEBSITE, PERSONAL SITE, RESUME, SIMPLE LANDING PAGE, OR STATIC FRONTEND:
   - Innovation score MUST be between 30 and 55. A personal portfolio or landing page is not an innovative breakthrough.
   - Technical Execution score MUST be between 35 and 55. Static UI without complex state or backend services lacks depth.
   - Working Reality score MUST be between 35 and 55, and 'is_real_backend' MUST BE FALSE.
   - Overall Score MUST reflect a standard static presentation (40 to 58).
   - Verdict MUST be 'Static Portfolio / Frontend Showcase' or 'Superficial Mock / Template'.
   - DO NOT claim it has 'decoupled service boundaries' or 'typed server routes' if none exist!

2. ONLY AWARD 80+ SCORES IF:
   - The repository implements genuine, original, and working full-stack engineering, non-trivial algorithmic pipelines, custom backend services, or novel AI integration.

Respond ONLY with a valid JSON object matching this schema:
{{
  "verdict": "Production-Grade Engineering | Solid Working Prototype | Early Prototype with Stubs | Static Portfolio / Frontend Showcase | Superficial Mock / Template",
  "verdict_summary": "2 crisp sentences summarizing the honest technical impression for judges.",
  "overall_score": integer (0 to 100),
  "originality_score": integer (0 to 100, measuring custom engineering vs standard boilerplate/templates),
  "rubric": {{
    "innovation": {{
      "score": integer (0 to 100),
      "comment": "Rigorous critique of concept novelty and ambition"
    }},
    "technical_execution": {{
      "score": integer (0 to 100),
      "comment": "Critique of architecture, backend depth, and state complexity"
    }},
    "security_reliability": {{
      "score": integer (0 to 100),
      "comment": "Input validation, error handling, secret hygiene"
    }},
    "code_cleanliness": {{
      "score": integer (0 to 100),
      "comment": "Code organization, readability, modularity"
    }},
    "working_reality": {{
      "score": integer (0 to 100),
      "is_real_backend": boolean,
      "comment": "Honest assessment of real working backend/API vs static UI or mock"
    }}
  }},
  "key_strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "judge_feedback_markdown": "Full Markdown feedback formatted with sections: '### 🏆 Overall Impression', '### 💡 Innovation & Concept', '### ⚙️ Technical Depth', '### 🚩 Identified Risks & Suggestions for Next Version'."
}}
"""

    prompt = f"""Evaluate repository {owner}/{repo}.
Declared Category: {effective_category}
Detected As Portfolio / Static Showcase: {is_portfolio_or_static}
Has Real Backend Detected: {has_real_backend} (Backend files: {backend_file_count})
Has Real Network Calls: {has_real_api_call}
Pre-scanned red flags: {json.dumps(detected_red_flags)}

Analyzed Source Structure:
{file_summary[:12000]}
"""

    try:
        ai_res = await ai_gateway.generate(
            GenerateRequest(
                prompt=prompt,
                system_instruction=system_prompt,
                model="gemini-2.5-flash",
            )
        )
        judge_data = extract_json_safely(ai_res.text)

        # Merge pre-scanned flags if any
        if detected_red_flags:
            judge_data["red_flags"] = detected_red_flags + judge_data.get("red_flags", [])

        return {
            "status": "success",
            "evaluation": judge_data,
        }
    except Exception as e:
        logger.error(f"Hackathon Judge evaluation failed: {e}")

        # Realistic, evidence-based dynamic fallback
        if is_portfolio_or_static:
            return {
                "status": "partial_fallback",
                "error": str(e),
                "evaluation": {
                    "verdict": "Static Portfolio / Frontend Showcase",
                    "verdict_summary": f"{owner}/{repo} is a client-side personal portfolio showcase. It presents clean visual styling but lacks server-side architectural complexity or distributed data pipelines.",
                    "overall_score": 54,
                    "originality_score": 48,
                    "rubric": {
                        "innovation": {"score": 45, "comment": "Standard personal portfolio format; limited novelty or algorithmic innovation."},
                        "technical_execution": {"score": 52, "comment": "Static frontend presentation without backend microservices, database transactions, or distributed logic."},
                        "security_reliability": {"score": 75, "comment": "Low attack surface due to lack of backend ingestion or user authentication endpoints."},
                        "code_cleanliness": {"score": 72, "comment": "Readable component structure and static assets layout."},
                        "working_reality": {"score": 50, "is_real_backend": False, "comment": "Static client deployment only. No server backend or dynamic API services detected."}
                    },
                    "key_strengths": [
                        "Clean visual presentation and frontend layout",
                        "Low operational overhead with static hosting compatibility",
                        "Cohesive presentation of personal projects and bio"
                    ],
                    "red_flags": [
                        {
                            "severity": "Medium",
                            "title": "No Server-Side Backend Detected",
                            "description": "Repository consists primarily of static client-side views without API routes or database integration.",
                            "location": "repository root"
                        }
                    ],
                    "judge_feedback_markdown": f"### 🏆 Overall Impression\n\n**{owner}/{repo}** serves well as a personal portfolio and frontend presentation. However, from a competitive hackathon judging lens, it lacks the technical depth, backend services, and novelty expected of winning engineering projects.\n\n### 💡 Innovation & Concept\nStandard personal showcase website. While functional for personal branding, it does not introduce new developer paradigms or algorithmic advances.\n\n### ⚙️ Technical Depth\nPurely client-side UI. Missing persistent databases, async background workers, or authenticated API routes.\n\n### 🚩 Recommendations\n- Introduce dynamic features (e.g., interactive live demos, headless CMS integration, server-side analytics)\n- Build full-stack capabilities with real database persistence."
                }
            }

        return {
            "status": "partial_fallback",
            "error": str(e),
            "evaluation": {
                "verdict": "Solid Working Prototype" if has_real_backend else "Early Prototype with Stubs",
                "verdict_summary": f"{owner}/{repo} demonstrates a functional implementation with {len(analyzed_files)} source files reviewed.",
                "overall_score": 74 if has_real_backend else 60,
                "originality_score": 70 if has_real_backend else 55,
                "rubric": {
                    "innovation": {"score": 68, "comment": "Practical project utility; follows established architectural conventions."},
                    "technical_execution": {"score": 72 if has_real_backend else 58, "comment": "Core logic present; can benefit from expanded error boundaries and test coverage."},
                    "security_reliability": {"score": 70, "comment": "Baseline sanitization present; review unhandled edge cases."},
                    "code_cleanliness": {"score": 76, "comment": "Modular directory structure with clear file naming."},
                    "working_reality": {"score": 75 if has_real_backend else 55, "is_real_backend": has_real_backend, "comment": "Functional client and server endpoints." if has_real_backend else "Lacks verified server backend."}
                },
                "key_strengths": [
                    "Modular structure separating client and logic layers",
                    "Typed component structure",
                    "Straightforward setup and deployment path"
                ],
                "red_flags": detected_red_flags,
                "judge_feedback_markdown": f"### 🏆 Overall Impression\n\n**{owner}/{repo}** demonstrates a solid working prototype with room for architectural hardening.\n\n### 💡 Innovation & Concept\nAddresses a defined use case with clean modularity.\n\n### ⚙️ Technical Depth\nCore functionality is established. Ensure error boundaries handle server timeouts gracefully."
            }
        }


# -----------------------------------------
# Tessera Developer & Vibecoder Assistant Chat
# -----------------------------------------

class AssistantChatRequest(BaseModel):
    repo_url: str
    message: str
    history: Optional[List[Dict[str, str]]] = []
    files: Optional[List[Dict[str, Any]]] = None


@app.post("/api/assistant/chat")
async def assistant_chat(request: AssistantChatRequest):
    """
    Context-aware interactive AI assistant for developers and vibecoders:
    - Explains complex code and architecture flows
    - Recommends clean code diffs and fixes
    - Helps add new features and tests
    - Answers questions grounded strictly in the repository's files
    """
    owner, repo = parse_github_repository(request.repo_url)

    file_context = ""
    file_names = []
    if request.files:
        for f in request.files[:12]:
            fp = f.get("path", "")
            file_names.append(fp)
            c = f.get("content", "")[:6000]
            file_context += f"\n\n--- FILE: {fp} ---\n{c}"

    system_prompt = f"""You are Tessera Assistant, an expert AI pair programmer and engineering copilot for {owner}/{repo}.
You assist developers, vibecoders, and judges in understanding, debugging, and improving this specific repository.

Repository: {owner}/{repo}
Known Files: {', '.join(file_names) if file_names else 'Scanned source files'}

Guidelines:
1. Ground your answers strictly in the actual code and architecture provided.
2. If suggesting code modifications, provide clean, idiomatic code snippets with exact filenames.
3. Be concise, direct, and authoritative. Help vibecoders demystify what their code actually does.
4. If a question asks about missing features, explain the cleanest way to implement them without breaking existing flows.
"""

    # Build conversation context
    history_text = ""
    if request.history:
        for turn in request.history[-4:]:
            role = turn.get("role", "user")
            content = turn.get("content", "")
            history_text += f"{role.upper()}: {content}\n"

    full_prompt = f"""Codebase Files:
{file_context}

Conversation History:
{history_text}

USER: {request.message}
ASSISTANT:"""

    try:
        ai_res = await ai_gateway.generate(
            GenerateRequest(
                prompt=full_prompt,
                system_instruction=system_prompt,
                model="gemini-2.5-flash",
            )
        )

        # Generate 2 relevant follow-up questions
        followup_prompt = f"""Given the question '{request.message}' and answer, suggest 2 brief logical follow-up questions the developer might want to ask next about {owner}/{repo}. Return them separated by a pipe character '|'."""
        followups = ["Where is state managed?", "How can I write tests for this?"]
        try:
            f_res = await ai_gateway.generate(GenerateRequest(prompt=followup_prompt, max_tokens=60))
            parts = [p.strip() for p in f_res.text.split("|") if p.strip()]
            if len(parts) >= 2:
                followups = parts[:2]
        except Exception:
            pass

        return {
            "status": "success",
            "reply": ai_res.text,
            "referenced_files": [f for f in file_names if f.lower() in ai_res.text.lower()][:5],
            "suggested_questions": followups,
        }
    except Exception as e:
        logger.error(f"Assistant chat failed: {e}")
        return {
            "status": "error",
            "reply": f"Unable to generate response from Gemini Engine: {str(e)}",
            "referenced_files": [],
            "suggested_questions": ["Check Gemini API key in Settings", "Try asking a simpler question"],
        }




