# ═══════════════════════════════════════════════════════════════
#  Wango Frontend — Production Dockerfile (multi-stage)
# ═══════════════════════════════════════════════════════════════

# ─── Stage 1: Vite Builder ─────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Declare build-time env vars
# VITE_API_URL is empty in production — Nginx proxies /api/* to backend
ARG VITE_API_URL=""
ARG VITE_CLERK_PUBLISHABLE_KEY

# Expose args as env vars for Vite build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY

COPY package*.json ./
RUN npm ci

COPY . .

# Build the static SPA bundle
RUN npm run build

# ─── Stage 2: Nginx Production Server ──────────────────────────
FROM nginx:1.27-alpine AS production

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built SPA
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx runs as root (port 80), but the worker processes drop to nginx user
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost/index.html || exit 1

CMD ["nginx", "-g", "daemon off;"]
