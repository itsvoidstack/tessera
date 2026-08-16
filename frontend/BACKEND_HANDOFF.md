# Tessera — Simplified Backend Handoff Guide

A concise, copy-paste API specification for the FastAPI backend developer to connect with the Tessera Next.js frontend.

---

## 1. Environment Variables

Set in `.env.local` inside `tessera/frontend/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_AUTH_URL=http://localhost:8000/api/auth/github
```

---

## 2. GitHub OAuth Flow

1. User clicks **"Continue with GitHub"** → Frontend redirects browser to `NEXT_PUBLIC_BACKEND_AUTH_URL` (`GET /api/auth/github`).
2. Backend completes OAuth with GitHub → Redirects browser back to `http://localhost:3000/dashboard` with session token/cookie.
3. Frontend calls **`GET /api/auth/me`** to retrieve user profile.

```json
// GET /api/auth/me (200 OK)
{
  "name": "Jane Dev",
  "email": "jane@github.com",
  "githubUsername": "janedev"
}
```

---

## 3. Quick Endpoint Reference

| Route | Method | Purpose |
| :--- | :--- | :--- |
| `/api/auth/github` | `GET` | Initiate GitHub OAuth authorization |
| `/api/auth/me` | `GET` | Return logged-in user profile |
| `/api/v1/projects` | `GET` | List user's analyzed repositories |
| `/api/v1/projects` | `POST` | Register repository URL |
| `/api/v1/projects/{id}` | `DELETE` | Remove repository |
| `/api/v1/projects/{id}/scan` | `POST` | Trigger multi-agent scan pipeline |
| `/api/v1/projects/{id}/scan/status` | `GET` | Poll scan status (`pending` \| `analyzing` \| `completed`) |
| `/api/v1/projects/{id}` | `GET` | Project overview & scores |
| `/api/v1/projects/{id}/architecture` | `GET` | Architecture DAG (nodes & edges) |
| `/api/v1/projects/{id}/audit` | `GET` | Security & quality issues |
| `/api/v1/projects/{id}/notes` | `GET` | AI-generated learning notes |
| `/api/v1/projects/{id}/health` | `GET` | Health report category scores |
| `/api/v1/projects/{id}/rescan/compare` | `GET` | Before vs After scan diffs |

---

## 4. Key JSON Schemas

### 4.1 Dashboard & Register (`/api/v1/projects`)
```json
// POST /api/v1/projects -> Body: { "repo_url": "facebook/react" }
{
  "id": "facebook-react",
  "owner": "facebook",
  "repo": "react",
  "repoUrl": "facebook/react",
  "language": "JavaScript",
  "stars": 224000,
  "forks": 45000,
  "openIssuesCount": 1250,
  "healthScore": null,
  "status": "pending"
}
```

### 4.2 Overview (`GET /api/v1/projects/{id}`)
```json
{
  "id": "facebook-react",
  "healthScore": 84,
  "scores": {
    "architecture": 88,
    "codeQuality": 82,
    "security": 90,
    "testing": 74,
    "documentation": 80,
    "dependencies": 85
  },
  "projectSummary": "Modular UI framework with clean separation."
}
```

### 4.3 Architecture Map (`GET /api/v1/projects/{id}/architecture`)
```json
{
  "components": [
    { "id": "ui", "label": "UI Layer", "type": "Application", "tech": "React", "color": "#1a5c38", "x": 340, "y": 60 }
  ],
  "edges": [
    { "from": "ui", "to": "core", "type": "direct" }
  ]
}
```

### 4.4 AI Code Audit (`GET /api/v1/projects/{id}/audit`)
```json
[
  {
    "id": "iss_1",
    "title": "Unsanitized Query Parameter",
    "description": "SQL injection risk in user handler.",
    "severity": "Critical",
    "file": "src/api/user.py",
    "line": 42,
    "category": "Security"
  }
]
```

### 4.5 AI Codebase Notes (`GET /api/v1/projects/{id}/notes`)
```json
{
  "aiNotes": [
    { "sectionId": "overview", "title": "Project Overview", "content": "React component model overview." }
  ]
}
```

### 4.6 Rescan & Compare (`GET /api/v1/projects/{id}/rescan/compare`)
```json
{
  "previousScore": 71,
  "latestScore": 84,
  "delta": { "scoreDiff": 13, "issuesDiff": -5 }
}
```

---

## 5. Quick Checklist for Backend Dev
1. Set up OAuth redirect at `GET /api/auth/github`.
2. Provide project management CRUD under `/api/v1/projects`.
3. Ingest repo tree, generate DAG & AI review using your 6 agents, and return payloads matching the JSON schemas above.
