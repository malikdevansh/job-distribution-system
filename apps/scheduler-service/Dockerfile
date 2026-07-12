FROM node:20-bookworm-slim AS builder

WORKDIR /app
COPY package.json ./
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/scheduler-service/ ./apps/scheduler-service/

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

RUN rm -rf package-lock.json node_modules packages/*/node_modules apps/*/node_modules
RUN npm install
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma
RUN npm run build -w @jobqueue/database && npm run build -w @jobqueue/scheduler-service

FROM node:20-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/scheduler-service/dist ./apps/scheduler-service/dist
COPY --from=builder /app/apps/scheduler-service/package.json ./apps/scheduler-service/

ENV NODE_ENV=production

CMD ["npm", "run", "start:scheduler"]
