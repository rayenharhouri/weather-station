# syntax=docker/dockerfile:1.7

# ── Stage 1: install all deps (incl. dev) ─────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# ── Stage 2: build the TypeScript output ──────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
ENV NODE_ENV=development

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── Stage 3: production deps only ─────────────────────────────────────
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund --omit=dev

# ── Stage 4: final runtime image ──────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

# Non-root runtime. The official Node image already has a `node` user/group
# at uid 1000 — reuse it instead of creating our own.
ENV NODE_ENV=production
ENV PORT=3001

# Copy compiled code, prod-only node_modules, and the static config files
# the runtime reads on boot (env loaded by dotenv at process start).
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

# tsconfig-paths is only needed for the ts-node-based CLI scripts (provision,
# seed, backup). It's a prod dep so it's already in node_modules; nothing
# extra to copy.

USER node
EXPOSE 3001

# Use `node dist/main` directly so PID 1 forwards signals cleanly (no npm
# wrapper). This is the same target that `npm run start:prod` uses.
CMD ["node", "dist/main.js"]
