.PHONY: dev prod build migrate logs down clean help

# ─── Default target ───────────────────────────────────────────
help:
	@echo ""
	@echo "  Wango — Available Commands"
	@echo ""
	@echo "  Development:"
	@echo "    make dev          Start all services in dev mode (with hot-reload)"
	@echo "    make db           Start only the PostGIS database"
	@echo "    make backend      Start only the backend dev server"
	@echo "    make frontend     Start only the frontend dev server"
	@echo ""
	@echo "  Production:"
	@echo "    make build        Build production Docker images locally"
	@echo "    make prod         Start production stack (docker-compose.prod.yml)"
	@echo "    make down         Stop all containers"
	@echo ""
	@echo "  Database:"
	@echo "    make migrate      Run pending Prisma migrations in backend container"
	@echo "    make migrate-dev  Run Prisma migrate dev (local, requires DB on 5433)"
	@echo ""
	@echo "  Maintenance:"
	@echo "    make logs         Tail logs from all services"
	@echo "    make logs-be      Tail backend logs only"
	@echo "    make logs-fe      Tail frontend logs only"
	@echo "    make clean        Remove stopped containers and dangling images"
	@echo "    make ps           Show running containers"
	@echo ""

# ─── Development ──────────────────────────────────────────────
dev:
	docker compose up

db:
	docker compose up -d db

backend:
	cd backend && npm run dev

frontend:
	cd frontend && npm run dev

# ─── Production ───────────────────────────────────────────────
build:
	@echo "Building production images..."
	docker compose -f docker-compose.prod.yml build --no-cache

prod:
	docker compose -f docker-compose.prod.yml up -d

down:
	docker compose down
	docker compose -f docker-compose.prod.yml down 2>/dev/null || true

# ─── Database Migrations ──────────────────────────────────────
migrate:
	@echo "Running migrations in backend container..."
	docker compose exec backend npx prisma migrate deploy --schema=./prisma/schema.prisma

migrate-dev:
	cd backend && npx prisma migrate dev --schema=prisma/schema.prisma

# ─── Logs ─────────────────────────────────────────────────────
logs:
	docker compose logs -f

logs-be:
	docker compose logs -f backend

logs-fe:
	docker compose logs -f frontend

# ─── Maintenance ──────────────────────────────────────────────
ps:
	docker compose ps

clean:
	docker container prune -f
	docker image prune -f
	@echo "Cleanup complete."
