# Local Development Setup

Run each service directly with Node.js/TypeScript. Best for development — fast iteration, edit code, restart one service.

## Prerequisites

- Node.js 21+
- Docker (for PostgreSQL and Kafka only)

## Step 1: Start Infrastructure Containers

```bash
# PostgreSQL for auth-service (port 15432)
docker run -d --name local-auth-db \
  -e POSTGRES_DB=db -e POSTGRES_PASSWORD=password -e POSTGRES_USER=admin_user \
  -p 15432:5432 postgres:17

# PostgreSQL for patient-service (port 15433)
docker run -d --name local-patient-db \
  -e POSTGRES_DB=db -e POSTGRES_PASSWORD=password -e POSTGRES_USER=admin_user \
  -p 15433:5432 postgres:17

# Kafka (port 19094)
docker run -d --name local-kafka \
  -e KAFKA_NODE_ID=0 \
  -e KAFKA_PROCESS_ROLES=broker,controller \
  -e KAFKA_CONTROLLER_QUORUM_VOTERS=0@localhost:9093 \
  -e KAFKA_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093,EXTERNAL://:19094 \
  -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092,EXTERNAL://localhost:19094 \
  -e KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,EXTERNAL:PLAINTEXT,PLAINTEXT:PLAINTEXT \
  -e KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER \
  -e CLUSTER_ID=MkU3OEVBNTcwNTJENDM2Qk \
  -p 19094:19094 apache/kafka:3.7.0
```

Wait 5 seconds for containers to be ready.

## Step 2: Install Dependencies (first time only)

```bash
cd auth-service && npm install && cd ..
cd patient-service && npm install && cd ..
cd billing-service && npm install && cd ..
cd analytics-service && npm install && cd ..
cd api-gateway && npm install && cd ..
```

## Step 3: Run Database Migrations (first time only)

```bash
cd auth-service
DATABASE_URL="postgresql://admin_user:password@localhost:15432/db" npx prisma migrate deploy
cd ..

cd patient-service
DATABASE_URL="postgresql://admin_user:password@localhost:15433/db" npx prisma migrate deploy
cd ..
```

On Windows PowerShell, use `$env:DATABASE_URL='...'` instead.

## Step 4: Start Services (each in a separate terminal)

**Terminal 1 — Auth Service (port 4005):**
```bash
cd auth-service
DATABASE_URL="postgresql://admin_user:password@localhost:15432/db" \
JWT_SECRET="Y2hhVEc3aHJnb0hYTzMyZ2ZqVkpiZ1RkZG93YWxrUkM=" \
npx tsx src/index.ts
```

**Terminal 2 — Billing Service (port 4001, gRPC 9001):**
```bash
cd billing-service
npx tsx src/index.ts
```

**Terminal 3 — Patient Service (port 4000):**
```bash
cd patient-service
DATABASE_URL="postgresql://admin_user:password@localhost:15433/db" \
KAFKA_BROKERS="localhost:19094" \
BILLING_SERVICE_ADDRESS="localhost" \
npx tsx src/index.ts
```

**Terminal 4 — API Gateway (port 4004):**
```bash
cd api-gateway
AUTH_SERVICE_URL="http://localhost:4005" \
PATIENT_SERVICE_URL="http://localhost:4000" \
npx tsx src/index.ts
```

**Terminal 5 — Analytics Service (port 4002, optional):**
```bash
cd analytics-service
KAFKA_BROKERS="localhost:19094" \
npx tsx src/index.ts
```

## Step 5: Optional — Custom Domain Name

Add this line to your hosts file (`C:\Windows\System32\drivers\etc\hosts` on Windows, `/etc/hosts` on Mac/Linux):

```
127.0.0.1   patient-management.local
```

Then start nginx as a reverse proxy:

```bash
docker run -d --name local-nginx \
  --add-host=host.docker.internal:host-gateway \
  -p 8888:80 \
  -v "$(pwd)/nginx/nginx-local.conf:/etc/nginx/nginx.conf:ro" \
  nginx:alpine
```

This uses `nginx-local.conf` which points to `host.docker.internal:4004` (your machine) instead of `api-gateway:4004` (Docker network).

Now access the app at: `http://patient-management.local:8888`

## Step 6: Test

```bash
# Login
curl -X POST http://localhost:4004/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@test.com","password":"password123"}'

# Get patients (use token from login response)
curl http://localhost:4004/api/patients \
  -H "Authorization: Bearer <token>"

# Create patient
curl -X POST http://localhost:4004/api/patients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"John Doe","email":"john@test.com","address":"123 St","dateOfBirth":"1990-01-01","registeredDate":"2024-01-01"}'
```

## Cleanup

```bash
docker stop local-auth-db local-patient-db local-kafka local-nginx
docker rm local-auth-db local-patient-db local-kafka local-nginx
```

## Service Ports

| Service | Port |
|---|---|
| Auth Service | 4005 |
| Patient Service | 4000 |
| Billing Service | 4001 (HTTP), 9001 (gRPC) |
| Analytics Service | 4002 |
| API Gateway | 4004 |
| Nginx (optional) | 8888 |
| Auth DB (PostgreSQL) | 15432 |
| Patient DB (PostgreSQL) | 15433 |
| Kafka | 19094 |
