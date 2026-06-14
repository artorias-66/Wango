# ═══════════════════════════════════════════════════════════════
#  Wango Backend — Production Dockerfile (multi-stage)
# ═══════════════════════════════════════════════════════════════

# ─── Stage 1: Production Dependencies ──────────────────────────
# Install only production deps in a clean layer for the final image
FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
COPY prisma/schema.prisma ./prisma/schema.prisma

# Install production deps only (no devDeps in final image)
RUN npm ci --omit=dev

# ─── Stage 2: TypeScript Builder ───────────────────────────────
# Full deps needed to run tsc and prisma generate
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Copy full source
COPY . .

# Generate Prisma client TypeScript source
RUN npx prisma generate --schema=./prisma/schema.prisma

# Compile TypeScript → dist/
# rootDir="./" so src/* → dist/src/* and prisma/* → dist/prisma/*
RUN npx tsc --project tsconfig.json

# ─── Stage 3: Minimal Production Runtime ───────────────────────
FROM node:20-alpine AS production

# Security: run as non-root user
RUN addgroup -g 1001 -S nodejs \
    && adduser -S wango -u 1001 -G nodejs

WORKDIR /app

# Copy production node_modules from deps stage
COPY --from=deps --chown=wango:nodejs /app/node_modules ./node_modules

# Copy compiled application (src + prisma/generated compiled JS)
COPY --from=builder --chown=wango:nodejs /app/dist ./dist

# Copy Prisma schema + migrations (needed for `prisma migrate deploy`)
COPY --from=builder --chown=wango:nodejs /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder --chown=wango:nodejs /app/prisma/migrations ./prisma/migrations

# Copy package.json for metadata
COPY --chown=wango:nodejs package.json ./

USER wango

EXPOSE 3001

# Healthcheck — wget is available on Alpine
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "dist/src/index.js"]
