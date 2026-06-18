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
| **Database** | PostgreSQL 13 + PostGIS 3.4 (Amazon RDS) |
| **Cache/PubSub** | Redis 7 (Socket.IO Adapter for scaling) |
| **ORM** | Prisma 7 (TypeScript-first) |
| **Auth** | Clerk (JWT integrated with Sockets) |
| **Cloud Hosting**| AWS Fargate, ECS, Application Load Balancer |
| **Infrastructure**| AWS Copilot CLI |

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
│   │   ├── middleware/      # Auth (Clerk) + validation
│   │   └── socket/          # Socket.IO logic + Redis Pub/Sub adapter
│   └── Dockerfile           # Multi-stage production build
├── frontend/                # Vite + React SPA
│   ├── src/
│   │   ├── api/             # Typed fetch client
│   │   ├── components/      # UI components (MapView, HangoutCard)
│   │   ├── hooks/           # useGeolocation, useChatSocket, useHangouts
│   │   └── pages/           # Discover, ChatRoom, PostHangout
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

## Production Deployment (AWS Fargate)

Wango is deployed on a highly scalable, serverless container architecture managed by **AWS Copilot**.

### Architecture Overview

- **Frontend (`/`)**: React/Vite SPA hosted on Nginx (Load Balanced Web Service).
- **Backend API (`/api` & `/api/socket.io`)**: Node.js/Express API handling core logic and WebSockets natively routed via the AWS ALB.
- **Database**: Amazon RDS PostgreSQL with PostGIS extension.
- **Cache**: Internal Redis cluster (Backend Service) for Socket.IO scaling.
- **Networking**: AWS Application Load Balancer routing traffic by path.

### Deploying Updates

We use a fully automated CI/CD pipeline. Every push to the `main` branch automatically triggers GitHub Actions to build the Docker containers and deploy them to AWS Copilot.

However, you can still manually manage the environment via the Copilot CLI:

```bash
# View live backend logs
copilot svc logs --name backend --env production

# Force manual deployments
copilot deploy --name backend --env production --force
```

> [!NOTE]
> Database connection strings and Clerk API keys are injected securely at runtime via AWS Systems Manager (SSM) Parameter Store. They are no longer stored in the Copilot manifests.

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
            ├── Install AWS Copilot CLI on GitHub Runner
            ├── copilot deploy --name backend --env production
            └── copilot deploy --name frontend --env production
```

The GitHub Actions runner securely authenticates with AWS using `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` injected via GitHub Secrets.

---

## License

MIT
