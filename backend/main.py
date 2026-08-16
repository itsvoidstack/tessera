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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScanRequest(BaseModel):
    repo_url: str


def parse_github_repository(repo_url: str) -> tuple[str, str]:
    """Accept either an owner/repository value or a full GitHub URL."""
    value = repo_url.strip()
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
        return {"valid": False, "error": "GitHub repository not found."}
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

        if extension not in allowed_extensions:
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

        "ai_analysis": ai_analysis
    }
