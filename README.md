# Wango 🗺️

> Find your people. Near you.

A real-time, location-based social discovery app that helps you find people nearby to hangout with — cricket matches, go-karting groups, gaming sessions, and more.

[![CI](https://github.com/artorias-66/Wango/actions/workflows/ci.yml/badge.svg)](https://github.com/artorias-66/Wango/actions/workflows/ci.yml)
[![CD](https://github.com/artorias-66/Wango/actions/workflows/cd.yml/badge.svg)](https://github.com/artorias-66/Wango/actions/workflows/cd.yml)

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, TypeScript, Leaflet, Socket.IO Client |
| **Backend** | Node.js, Express 5, TypeScript, Socket.IO |
| **Database** | PostgreSQL 13 + PostGIS 3.4 (spatial queries) |
| **Cache/PubSub** | Redis 7 (Socket.IO Adapter for scaling) |
| **ORM** | Prisma 7 (TypeScript-first) |
| **Auth** | Clerk (JWT integrated with Sockets) |
| **Container** | Docker + Nginx |
| **CI/CD** | GitHub Actions → GHCR |

---

## Project Structure

```
Wango/
├── backend/                 # Express API
│   ├── prisma/              # Schema + migrations
│   ├── src/
│   │   ├── controllers/     # HTTP handlers
│   │   ├── services/        # Business logic + PostGIS queries
│   │   ├── routes/          # Endpoint definitions + Zod validation
│   │   └── middleware/      # Auth (Clerk) + validation
│   └── Dockerfile           # Multi-stage production build
├── frontend/                # Vite + React SPA
│   ├── src/
│   │   ├── api/             # Typed fetch client
│   │   ├── components/      # UI components
│   │   ├── hooks/           # useGeolocation, useHangouts, useSyncUser
│   │   └── pages/           # Discover, PostHangout, Onboarding
│   ├── nginx.conf           # Production Nginx config
│   └── Dockerfile           # Multi-stage build → Nginx
├── docker-compose.yml       # Development
├── docker-compose.prod.yml  # Production
├── Makefile                 # Convenience commands
└── .github/workflows/       # CI + CD pipelines
```

---

## Key Architecture Highlights

* **Real-time Chat with Horizontal Scaling**: Live chatrooms powered by Socket.IO. We use a Redis Pub/Sub adapter to ensure messages seamlessly broadcast across multiple backend instances if scaled out.
* **Secure WebSockets**: Custom socket handshakes that cryptographically verify Clerk JWTs before allowing connections, ensuring private chats remain strictly private.
* **Complex Spatial Queries**: The Discover map uses highly optimized PostGIS queries with raw SQL and `LEFT JOIN`s. Instead of cascading ORM queries, we fetch spatial locations, distance calculations, and real-time user join statuses (Unjoined, Pending, Accepted) in a single lightning-fast database round trip.

---

## Local Development

### Prerequisites
- Docker Desktop
- Node.js 20+
- A [Clerk](https://clerk.com) account (free tier works)

### 1. Clone & configure

```bash
git clone https://github.com/artorias-66/Wango.git
cd Wango
cp .env.example .env
```

Edit `.env` with your real values:

| Variable | Description |
|---|---|
| `POSTGRES_PASSWORD` | Any secure password |
| `DATABASE_URL` | `postgresql://postgres:<password>@localhost:5433/wango_db?schema=public` |
| `CLERK_PUBLISHABLE_KEY` | From [Clerk Dashboard](https://dashboard.clerk.com) → API Keys |
| `CLERK_SECRET_KEY` | From Clerk Dashboard → API Keys |
| `VITE_CLERK_PUBLISHABLE_KEY` | Same publishable key, for the frontend |

Set the same `CLERK_PUBLISHABLE_KEY` in `frontend/.env`:
```
VITE_API_URL=http://localhost:3001
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### 2. Start the database

```bash
make db
# or: docker compose up -d db
```

### 3. Run migrations

```bash
make migrate-dev
# or: cd backend && npx prisma migrate dev
```

### 4. Start the servers

```bash
# Terminal 1 — backend
make backend

# Terminal 2 — frontend
make frontend
```

Open **http://localhost:5173** 🚀

---

## Production Deployment

### Requirements on the server
- Docker + Docker Compose plugin
- Ports 80 and 443 open
- A `.env` file with production secrets

### Deploy with GHCR images

```bash
# 1. Copy .env.example to .env and fill in production values
cp .env.example .env
nano .env

# 2. Pull and start production stack
IMAGE_TAG=latest docker compose -f docker-compose.prod.yml up -d

# 3. Run database migrations (first deploy only)
make migrate
```

The app will be live on **port 80**.

### GitHub Secrets

Add these at `Settings → Secrets → Actions`:

| Secret | Required | Description |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | ✅ | Baked into the frontend image at build time |
| `DEPLOY_HOOK_URL` | Optional | Webhook URL to auto-deploy on push to main |

> [!NOTE]
> `GITHUB_TOKEN` is automatic — GHCR push works without any extra setup.

---

## API Reference

All routes are prefixed `/api`.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/users/sync` | ✅ | Upsert user profile + location |
| `GET` | `/users/me` | ✅ | Get current user |
| `GET` | `/hangouts/discover` | — | Find hangouts near `?lat&lng&radius&category` |
| `POST` | `/hangouts` | ✅ | Create a hangout post |
| `GET` | `/hangouts/:id` | — | Get hangout detail + join requests |
| `POST` | `/hangouts/:id/join` | ✅ | Request to join a hangout |
| `PATCH` | `/hangouts/joins/:joinId` | ✅ | Accept / decline a join request |

---

## CI/CD Pipeline

```
Push to main
    │
    ├─► CI (.github/workflows/ci.yml)
    │       ├── Typecheck backend (tsc --noEmit)
    │       ├── Typecheck + lint frontend
    │       └── Validate Docker builds
    │
    └─► CD (.github/workflows/cd.yml)
            ├── Build backend image → ghcr.io/artorias-66/wango-backend:latest
            ├── Build frontend image → ghcr.io/artorias-66/wango-frontend:latest
            └── Trigger deploy webhook (if DEPLOY_HOOK_URL set)
```

Images are also tagged with `sha-<commit>` for rollbacks:
```bash
IMAGE_TAG=sha-abc1234 docker compose -f docker-compose.prod.yml up -d
```

---

## License

MIT
