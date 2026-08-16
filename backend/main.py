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
    risky_patterns = sum(
        source.count(pattern)
        for pattern in ("eval(", "exec(", "dangerouslysetinnerhtml", "pickle.loads(")
    )
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
        response = requests.get(
            f"https://api.github.com/repos/{owner}/{repo}",
            headers=github_headers(),
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
def scan_repository(request: ScanRequest):

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
        response = requests.get(
            repo_api_url,
            headers=headers,
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
        tree_response = requests.get(
            tree_api_url,
            headers=headers,
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
            content_response = requests.get(
                content_api_url,
                headers=headers,
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
    # 8. Gemini analysis
    # -----------------------------------------

    ai_analysis = None

    if gemini_client and analyzed_files:

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
            gemini_response = gemini_client.models.generate_content(
                model="gemini-3.6-flash",
                contents=prompt
            )

            ai_analysis = gemini_response.text

        except Exception as e:
            ai_analysis = (
                "Gemini analysis failed. "
                f"Error: {str(e)}"
            )

    elif not GEMINI_API_KEY:
        ai_analysis = "Gemini API key is not configured."

    elif not analyzed_files:
        ai_analysis = "No source files were available for AI analysis."

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
def generate_note_insight(request: NoteGenerateRequest):
    if not GEMINI_API_KEY or not gemini_client:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key is not configured on the backend server."
        )

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
        gemini_res = gemini_client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt
        )
        content = gemini_res.text
    except Exception as e:
        logger.error(f"Gemini note generation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate insight via Gemini: {str(e)}"
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

