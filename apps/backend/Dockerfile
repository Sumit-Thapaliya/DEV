FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
RUN apk update && apk add --no-cache libc6-compat
WORKDIR /app
RUN pnpm install -g turbo
COPY . .
RUN turbo prune @jobdev/backend --docker

FROM base AS installer
RUN apk update && apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install dependencies based on pruned lockfile
COPY --from=builder /app/out/json/ .
RUN pnpm install

# Copy source files and build backend
COPY --from=builder /app/out/full/ .
RUN pnpm --filter @jobdev/backend build

FROM base AS runner
RUN apk update && apk add --no-cache openssl
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs
USER expressjs

COPY --from=installer --chown=expressjs:nodejs /app .

WORKDIR /app/apps/backend

EXPOSE 4000
ENV PORT=4000
ENV NODE_ENV=production

CMD ["node", "dist/src/server.js"]

