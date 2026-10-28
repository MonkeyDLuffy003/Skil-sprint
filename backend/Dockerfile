# Stage 1: Build & Production Dockerfile for SkillSprint AI Backend
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci

COPY backend/ ./backend/
RUN npm run build || true

# Production Image
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/backend/dist ./backend/dist || true
COPY backend/migrations/ ./backend/migrations/
COPY backend/src/ ./backend/src/

EXPOSE 4000

CMD ["npx", "tsx", "backend/src/server.ts"]
