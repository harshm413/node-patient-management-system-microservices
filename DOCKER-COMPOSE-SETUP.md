# Docker Compose Setup

Run the entire microservices stack with one command. All services, databases, Kafka, and nginx run as containers.

## Prerequisites

- Docker Desktop
- Docker Compose (included with Docker Desktop)

## Step 1: Custom Domain (optional but recommended)

Add this line to your hosts file (`C:\Windows\System32\drivers\etc\hosts` on Windows, `/etc/hosts` on Mac/Linux):

```
127.0.0.1   patient-management.local
```

## Step 2: Start Everything

```bash
cd node-patient-management-system-microservices
docker compose up --build
```

First build takes 3-5 minutes. Subsequent starts are faster (cached layers).

To run in background (detached):
```bash
docker compose up --build -d
```

## Step 3: Wait for Services

All 9 containers will start in order:
1. auth-service-db (PostgreSQL) — starts first
2. patient-service-db (PostgreSQL) — starts first
3. kafka — starts first, waits for health check
4. billing-service — starts immediately
5. auth-service — waits for auth-service-db to be healthy, runs migrations
6. patient-service — waits for patient-service-db + kafka + billing-service
7. analytics-service — waits for kafka
8. api-gateway — waits for auth-service + patient-service
9. nginx — waits for api-gateway

Total startup time: ~30-60 seconds after build.

## Step 4: Test

With custom domain:
```bash
# Login
curl -X POST http://patient-management.local:8888/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@test.com","password":"password123"}'

# Get patients
curl http://patient-management.local:8888/api/patients \
  -H "Authorization: Bearer <token>"

# Create patient
curl -X POST http://patient-management.local:8888/api/patients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Docker Test","email":"docker@test.com","address":"Container St","dateOfBirth":"1990-01-01","registeredDate":"2024-01-01"}'
```

Without custom domain (use localhost):
```bash
curl -X POST http://localhost:4004/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@test.com","password":"password123"}'
```

## Step 5: View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f patient-service
docker compose logs -f auth-service
docker compose logs -f billing-service
```

## Step 6: Stop Everything

```bash
docker compose down
```

To also remove database volumes (fresh start next time):
```bash
docker compose down -v
```

## Architecture

```
http://patient-management.local:8888
  → nginx (container, port 80)
    → api-gateway (container, port 4004)
      → auth-service (container, port 4005)
        → auth-service-db (PostgreSQL, port 5432)
      → patient-service (container, port 4000)
        → patient-service-db (PostgreSQL, port 5432)
        → billing-service (gRPC, port 9001)
        → kafka (port 9092)
          → analytics-service (consumer, port 4002)
```

All containers communicate by service name on Docker's internal network. No localhost, no IPs.

## Exposed Ports (accessible from your machine)

| Service | Host Port | Container Port |
|---|---|---|
| nginx | 8888 | 80 |
| API Gateway | 4004 | 4004 |
| Auth Service | 4005 | 4005 |
| Patient Service | 4000 | 4000 |
| Billing Service | 4001, 9001 | 4001, 9001 |
| Analytics Service | 4002 | 4002 |
| Auth DB | 15432 | 5432 |
| Patient DB | 15433 | 5432 |
| Kafka | 19092 | 9092 |

## Swagger UI

- Auth Service: http://localhost:4005/swagger-ui
- Patient Service: http://localhost:4000/swagger-ui
- Via Gateway: http://localhost:4004/api-docs/patients
- Via Gateway: http://localhost:4004/api-docs/auth

## Rebuild After Code Changes

```bash
docker compose up --build
```

Or rebuild a single service:
```bash
docker compose build patient-service
docker compose up -d patient-service
```

## Test User

- Email: testuser@test.com
- Password: password123
- Role: ADMIN

## Seed Data

- Auth DB: 1 test user (auto-seeded on startup)
- Patient DB: 15 test patients (auto-seeded on startup)
