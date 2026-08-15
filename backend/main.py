from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from urllib.parse import urlparse

app = FastAPI(title="Tessera API")


class ScanRequest(BaseModel):
    repo_url: str


@app.get("/")
def root():
    return {
        "message": "Tessera backend is running 🚀"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


@app.post("/api/scan")
def scan_repository(request: ScanRequest):

    parsed_url = urlparse(request.repo_url)

    # Check whether it is a GitHub URL
    if parsed_url.netloc.lower() != "github.com":
        raise HTTPException(
            status_code=400,
            detail="Please provide a valid GitHub repository URL."
        )

    # Check that the URL contains username and repository
    path_parts = [
        part for part in parsed_url.path.strip("/").split("/")
        if part
    ]

    if len(path_parts) < 2:
        raise HTTPException(
            status_code=400,
            detail="Please provide a valid GitHub repository URL."
        )

    return {
        "status": "valid",
        "repo_url": request.repo_url,
        "message": "GitHub repository URL is valid 🚀"
    }