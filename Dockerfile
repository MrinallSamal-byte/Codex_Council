# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS base
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl tini \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid 1001 nextjs \
  && mkdir -p /var/lib/repocouncil/workspaces /var/lib/repocouncil/exports \
  && chown -R nextjs:nodejs /var/lib/repocouncil /app

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/deployment ./deployment

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD ["node", "deployment/scripts/healthcheck.mjs"]

ENTRYPOINT ["tini", "--"]
CMD ["sh", "deployment/scripts/start.sh"]
