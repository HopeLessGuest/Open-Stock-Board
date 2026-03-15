# Backend (FastAPI + AKShare)

## 中文说明
这个后端为前端股票看板提供 A 股数据 API，并提供统一的 AI 模型接口（当前接入 MiniMax）。

### 功能
- 分层结构：`api` / `services` / `schemas` / `middleware` / `core`
- 行情数据：AKShare 集成（quotes / chart / news / industries）
- AI 接口：通用 provider 架构（当前 `minimax`）
- 轻量安全：
  - 可选 API Key（`X-API-Key` 或 `Authorization: Bearer`）
  - CORS 白名单
  - Trusted Host 校验
  - 内存 IP 限流
  - 安全响应头

### API 列表
基础前缀：`/api/a-share`

数据接口：
- `GET /health`
- `GET /quotes?symbols=600519,000858`
- `GET /chart?range=1d|1w|1m|3m|1y|ytd&symbol=600519`
- `GET /news?limit=20`
- `GET /industries?limit=20`

AI 接口：
- `GET /ai/providers`
- `POST /ai/chat`
- `POST /ai/plan`

### Windows 启动
1. 创建虚拟环境并安装依赖：
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. 复制环境变量模板：
```powershell
Copy-Item .env.example .env
```

3. 启动服务（默认端口 `8790`）：
```powershell
uvicorn app.main:app --host 127.0.0.1 --port 8790 --reload
```

4. 打开文档：
- Swagger: `http://127.0.0.1:8790/docs`
- ReDoc: `http://127.0.0.1:8790/redoc`

### 前端连接配置
在项目根目录 `.env` 设置：
```env
VITE_A_SHARE_API_BASE_URL=http://127.0.0.1:8790/api/a-share/
VITE_A_SHARE_API_TOKEN=
```

如果后端启用了 `BACKEND_API_KEY`，请把同样值填到前端 `VITE_A_SHARE_API_TOKEN`。

### 后端环境变量（关键项）
```env
APP_HOST=127.0.0.1
APP_PORT=8790
API_PREFIX=/api/a-share
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
TRUSTED_HOSTS=127.0.0.1,localhost
BACKEND_API_KEY=
RATE_LIMIT_PER_MINUTE=120

LLM_DEFAULT_PROVIDER=minimax
LLM_TIMEOUT_MS=20000
MINIMAX_API_KEY=
MINIMAX_GROUP_ID=
MINIMAX_BASE_URL=https://api.minimax.chat
MINIMAX_CHAT_PATH=/v1/text/chatcompletion_v2
MINIMAX_MODEL=MiniMax-Text-01
```

## English
This backend serves A-share market APIs for the dashboard and provides a unified AI model API (currently MiniMax).

### Features
- Layered architecture: `api` / `services` / `schemas` / `middleware` / `core`
- Market data via AKShare (`quotes`, `chart`, `news`, `industries`)
- Unified AI provider interface (currently `minimax`)
- Lightweight security:
  - Optional API key (`X-API-Key` or `Authorization: Bearer`)
  - CORS allowlist
  - Trusted host validation
  - In-memory IP rate limiting
  - Security response headers

### API Endpoints
Base prefix: `/api/a-share`

Data endpoints:
- `GET /health`
- `GET /quotes?symbols=600519,000858`
- `GET /chart?range=1d|1w|1m|3m|1y|ytd&symbol=600519`
- `GET /news?limit=20`
- `GET /industries?limit=20`

AI endpoints:
- `GET /ai/providers`
- `POST /ai/chat`
- `POST /ai/plan`

### Run on Windows
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

3. Start server (default port: `8790`):
```powershell
uvicorn app.main:app --host 127.0.0.1 --port 8790 --reload
```

4. Open docs:
- Swagger: `http://127.0.0.1:8790/docs`
- ReDoc: `http://127.0.0.1:8790/redoc`

### Frontend Connection
In project root `.env`:
```env
VITE_A_SHARE_API_BASE_URL=http://127.0.0.1:8790/api/a-share/
VITE_A_SHARE_API_TOKEN=
```

If `BACKEND_API_KEY` is enabled, set the same value in frontend `VITE_A_SHARE_API_TOKEN`.
