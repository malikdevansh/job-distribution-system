FROM node:20-bookworm-slim AS builder

WORKDIR /app
COPY package.json ./
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/backend-api/ ./apps/backend-api/

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

RUN rm -rf package-lock.json node_modules packages/*/node_modules apps/*/node_modules
RUN npm install
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma
RUN npm run build -w @jobqueue/database && npm run build -w @jobqueue/backend-api

FROM node:20-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/backend-api/dist ./apps/backend-api/dist
COPY --from=builder /app/apps/backend-api/package.json ./apps/backend-api/

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "run", "start:api"]
