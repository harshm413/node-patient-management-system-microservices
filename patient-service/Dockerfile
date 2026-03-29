# Stage 1: Build
FROM node:21-alpine AS builder
WORKDIR /app
COPY patient-service/package*.json ./
RUN npm ci
COPY patient-service/ .
COPY proto ./proto
RUN npx prisma generate
RUN npm run build

# Stage 2: Run
FROM node:21-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/proto ./proto
EXPOSE 4000
ENTRYPOINT ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
