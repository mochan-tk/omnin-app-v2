# ---- Base image version ----
ARG NODE_VERSION=20.15.1

# 1) Install dependencies (dev) for building
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
# Recommended for Next.js native binaries on Alpine
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci

# 2) Build the app
FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3) Install production-only dependencies
FROM node:${NODE_VERSION}-alpine AS prod-deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# 4) Runtime
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Default port and backend URL (override at runtime as needed)
ENV PORT=3000
ENV BACKEND_URL=http://localhost:8000

# Run as non-root
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nextjs -u 1001

# Minimal files required at runtime
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

USER 1001

EXPOSE 3000
CMD ["npm", "run", "start"]