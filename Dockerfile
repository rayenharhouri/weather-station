# syntax=docker/dockerfile:1.7

# ── Stage 1: install all deps (incl. dev) ─────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# ── Stage 2: build the standalone Next.js output ──────────────────────
FROM node:22-alpine AS build
WORKDIR /app
ENV NODE_ENV=production
# `output: 'standalone'` in next.config.ts produces `.next/standalone/`
# which we copy verbatim into the runtime stage.

# Build-time arg so the public env baked into the JS bundle points at the
# right backend on first boot. Override at build time with --build-arg.
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ARG NEXT_PUBLIC_WH_MODE=production
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WH_MODE=$NEXT_PUBLIC_WH_MODE

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── Stage 3: runtime image (no node_modules — standalone has its own) ─
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# `.next/standalone` already contains a minimal `node_modules/`. We add the
# `public/` + `.next/static/` directories on top so static assets are served
# from the same image.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

USER node
EXPOSE 3000

# Standalone's server entry is `server.js` at the standalone root.
CMD ["node", "server.js"]
