# Tessera

Tessera is an AI-assisted public GitHub repository analyzer. Enter a repository URL to inspect its metadata and request a codebase analysis from the FastAPI backend.

## Tech stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: FastAPI, Python
- Integrations: GitHub REST API and Google Gemini

## Run locally

Create a root `.env` file:

```env
GEMINI_API_KEY=your_gemini_api_key
GITHUB_TOKEN=optional_github_personal_access_token
```

Start the backend:

```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

In another terminal, start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. No account or GitHub OAuth is required for the local public-repository flow.

## API

- `GET /health` — backend health check
- `GET /api/validate-repo?repo_url=owner/repository` — validates a public GitHub repository
- `POST /api/scan` — scans a repository

Example scan body:

```json
{
  "repo_url": "https://github.com/facebook/react"
}
```

## Deployment

Deploy `backend` and `frontend` separately. Configure these environment variables:

| Service | Variable | Value |
| --- | --- | --- |
| Backend | `GEMINI_API_KEY` | Gemini API key |
| Backend | `GITHUB_TOKEN` | Optional GitHub token for higher rate limits |
| Backend | `FRONTEND_ORIGINS` | Your deployed frontend URL, e.g. `https://your-app.vercel.app` |
| Frontend | `NEXT_PUBLIC_API_URL` | Your deployed backend URL, e.g. `https://your-api.onrender.com` |

Do not use `localhost` or `127.0.0.1` in deployed environment variables.
