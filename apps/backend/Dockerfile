FROM node:22-slim AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/package.json

RUN npm install --workspace=apps/backend --include-workspace-root \
    && mkdir -p apps/backend/node_modules

FROM oven/bun:1 AS base
WORKDIR /app

FROM oven/bun:1
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY package.json package-lock.json ./
COPY apps/backend ./apps/backend

WORKDIR /app/apps/backend
ENV NODE_ENV=production
RUN chmod +x entrypoint.sh

EXPOSE 3000
CMD ["./entrypoint.sh"]
