# Stage 1: Build
FROM node:21-alpine AS builder
WORKDIR /app
COPY billing-service/package*.json ./
RUN npm ci
COPY billing-service/ .
COPY proto ./proto
RUN npm run build

# Stage 2: Run
FROM node:21-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/proto ./proto
EXPOSE 4001 9001
ENTRYPOINT ["node", "dist/index.js"]
