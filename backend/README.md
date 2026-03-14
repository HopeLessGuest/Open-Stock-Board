# Backend (FastAPI + AKShare)

This backend provides A-share RESTful APIs for the frontend dashboard.

## Features

- Layered structure (`api`, `services`, `schemas`, `middleware`, `core`)
- AKShare data integration
- Lightweight security:
  - Optional API key (`X-API-Key`)
  - CORS allowlist
  - Trusted host check
  - In-memory IP rate limiting
  - Security response headers

## Endpoints

Base prefix: `/api/a-share`

- `GET /health`
- `GET /quotes?symbols=600519,000858`
- `GET /chart?range=1d|1w|1m|3m|1y|ytd&symbol=600519`
- `GET /news?limit=20`
- `GET /industries?limit=20`

## Run on Windows

1. Create venv and install dependencies:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Create env file:

```powershell
Copy-Item .env.example .env
```

3. Start server:

```powershell
uvicorn app.main:app --host 127.0.0.1 --port 8787 --reload
```

4. Open docs:

- `http://127.0.0.1:8787/docs`

## Frontend connection

Set frontend env (`.env`) in project root:

```env
VITE_A_SHARE_API_BASE_URL=http://127.0.0.1:8787/api/a-share/
VITE_A_SHARE_API_TOKEN=
```

If backend enables `BACKEND_API_KEY`, pass the same value to frontend `VITE_A_SHARE_API_TOKEN`.
