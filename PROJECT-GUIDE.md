# Patient Management System — Complete Project Guide

## Project Overview

A microservices-based patient management system built with Node.js/TypeScript. Replicated 1:1 from a Java/Spring Boot project. Covers REST APIs, gRPC inter-service communication, Kafka event streaming, JWT authentication, and API Gateway routing.

## Architecture

```
                    ┌─────────────────────┐
                    │   Client / Browser  │
                    └─────────┬───────────┘
                              │
                    ┌─────────▼───────────┐
                    │    API Gateway       │
                    │    Port: 4004        │
                    │    Routes + JWT      │
                    └──┬──────┬───────────┘
                       │      │
           ┌───────────▼┐  ┌──▼──────────────┐
           │ Auth Svc    │  │ Patient Svc      │
           │ Port: 4005  │  │ Port: 4000       │
           │ JWT + Login │  │ CRUD + gRPC +    │
           │             │  │ Kafka Producer   │
           └──────┬──────┘  └──┬─────┬────────┘
                  │            │     │
           ┌──────▼──────┐    │  ┌──▼──────────┐
           │ Auth DB     │    │  │ Patient DB   │
           │ PostgreSQL  │    │  │ PostgreSQL   │
           └─────────────┘    │  └──────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
     ┌────────▼──────┐  ┌────▼─────┐  ┌──────▼───────┐
     │ Billing Svc   │  │  Kafka   │  │ Analytics Svc│
     │ HTTP: 4001    │  │  Broker  │  │ Port: 4002   │
     │ gRPC: 9001    │  │          │  │ Kafka        │
     │ Hardcoded resp│  │          │  │ Consumer     │
     └───────────────┘  └──────────┘  └──────────────┘
```

## Services

### Auth Service (Port 4005)
Handles user authentication and JWT token management.
- Technology: Express, Prisma, jsonwebtoken, bcryptjs
- Database: PostgreSQL (table: users)

### Patient Service (Port 4000)
Full CRUD for patient records. Calls Billing Service via gRPC on create. Publishes Kafka events on create.
- Technology: Express, Prisma, express-validator, @grpc/grpc-js, kafkajs, protobufjs
- Database: PostgreSQL (table: patient)

### Billing Service (HTTP 4001, gRPC 9001)
gRPC server that creates billing accounts. Returns hardcoded response (demo).
- Technology: Express, @grpc/grpc-js, @grpc/proto-loader

### Analytics Service (Port 4002)
Kafka consumer that listens to patient creation events and logs them.
- Technology: Express, kafkajs, protobufjs

### API Gateway (Port 4004)
Single entry point. Routes requests, validates JWT tokens by calling Auth Service.
- Technology: Express, axios

## API Endpoints

### Auth Endpoints (via Gateway)

| Method | Path | Auth | Request Body | Response | Status |
|--------|------|------|-------------|----------|--------|
| POST | /auth/login | No | `{"email":"...","password":"..."}` | `{"token":"jwt..."}` | 200 |
| POST | /auth/login | No | Invalid credentials | Empty | 401 |
| GET | /auth/validate | Bearer token | None | Empty | 200/401 |

### Patient Endpoints (via Gateway, all require JWT)

| Method | Path | Request Body | Response | Status |
|--------|------|-------------|----------|--------|
| GET | /api/patients | None | `[{id,name,email,address,dateOfBirth},...]` | 200 |
| POST | /api/patients | `{name,email,address,dateOfBirth,registeredDate}` | `{id,name,email,address,dateOfBirth}` | 200 |
| PUT | /api/patients/:id | `{name,email,address,dateOfBirth}` | `{id,name,email,address,dateOfBirth}` | 200 |
| DELETE | /api/patients/:id | None | Empty | 204 |

### Error Responses

| Scenario | Status | Body |
|----------|--------|------|
| Validation error (missing/invalid fields) | 400 | `{"fieldName":"error message",...}` |
| Duplicate email on create/update | 400 | `{"message":"Email address already exists"}` |
| Patient not found on update | 400 | `{"message":"Patient not found"}` |
| No Authorization header | 401 | Empty |
| Invalid/expired JWT token | 401 | Empty |

### Swagger/OpenAPI

| Path | Description |
|------|-------------|
| /v3/api-docs (on auth-service:4005) | Auth Service OpenAPI JSON |
| /v3/api-docs (on patient-service:4000) | Patient Service OpenAPI JSON |
| /swagger-ui (on auth-service:4005) | Auth Swagger UI |
| /swagger-ui (on patient-service:4000) | Patient Swagger UI |
| /api-docs/auth (via gateway:4004) | Auth OpenAPI via Gateway |
| /api-docs/patients (via gateway:4004) | Patient OpenAPI via Gateway |

## Request Flow Charts

### Login Flow
```
Client → POST /auth/login {email, password}
  → Gateway :4004 (no JWT check for /auth/**)
    → Auth Service :4005
      → Prisma findUnique({where: {email}})
      → bcrypt.compare(password, hash)
      → If match: jwt.sign({sub: email, role}, secret, {exp: 10h})
      → Return {token: "eyJ..."}
    ← 200 {token}
  ← 200 {token}
← Client stores token
```

### Create Patient Flow
```
Client → POST /api/patients {name, email, ...} + Authorization: Bearer <token>
  → Gateway :4004
    → axios.get(auth-service:4005/validate, {Authorization: Bearer <token>})
      → Auth Service validates JWT → 200
    ← JWT valid, proceed
    → axios.post(patient-service:4000/patients, body)
      → Patient Service :4000
        → express-validator validates fields
        → Prisma: check email uniqueness
        → Prisma: INSERT INTO patient
        → gRPC call → billing-service:9001 CreateBillingAccount
          → Billing returns {accountId: "12345", status: "ACTIVE"}
        → Kafka: publish PatientEvent to topic "patient"
          → Analytics Service :4002 consumes event (async)
        → Return {id, name, email, address, dateOfBirth}
      ← 200 PatientResponseDTO
    ← 200 PatientResponseDTO
  ← 200 PatientResponseDTO
← Client displays new patient
```

### Get Patients Flow
```
Client → GET /api/patients + Authorization: Bearer <token>
  → Gateway :4004
    → Validates JWT via auth-service:4005 → 200
    → Forwards to patient-service:4000/patients
      → Prisma: SELECT * FROM patient
      → Map to PatientResponseDTO[] (dateOfBirth as YYYY-MM-DD)
    ← 200 [{id, name, email, address, dateOfBirth}, ...]
  ← 200 array
← Client displays list
```

### Unauthorized Flow
```
Client → GET /api/patients (no Authorization header)
  → Gateway :4004
    → Checks header: missing or no "Bearer " prefix
    → Returns 401 immediately (never reaches patient-service)
  ← 401
← Client shows "Please login"
```

## Inter-Service Communication

| From | To | Protocol | Purpose |
|------|----|----------|---------|
| Gateway → Auth Service | HTTP GET :4005 | REST | JWT validation |
| Gateway → Patient Service | HTTP :4000 | REST | CRUD forwarding |
| Gateway → Auth Service | HTTP POST :4005 | REST | Login forwarding |
| Patient Service → Billing Service | gRPC :9001 | gRPC/Protobuf | Create billing account on patient create |
| Patient Service → Kafka | TCP :9092 | Kafka Producer | Publish PatientEvent on patient create |
| Kafka → Analytics Service | TCP :9092 | Kafka Consumer | Consume PatientEvent |

## Shared Proto Files

Located in `proto/` at project root. Used by patient-service, billing-service, and analytics-service.

**billing_service.proto:**
```protobuf
service BillingService {
  rpc CreateBillingAccount (BillingRequest) returns (BillingResponse);
}
message BillingRequest { string patientId=1; string name=2; string email=3; }
message BillingResponse { string accountId=1; string status=2; }
```

**patient_event.proto:**
```protobuf
package patient.events;
message PatientEvent { string patientId=1; string name=2; string email=3; string event_type=4; }
```

## Database Schemas

### Auth DB — users table
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary key, auto-generated |
| email | VARCHAR(255) | Unique, not null |
| password | VARCHAR(255) | Not null, bcrypt hash |
| role | VARCHAR(50) | Not null |

Seed: 1 user (testuser@test.com / password123 / ADMIN)

### Patient DB — patient table
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary key, auto-generated |
| name | VARCHAR(255) | Not null |
| email | VARCHAR(255) | Unique, not null |
| address | VARCHAR(255) | Not null |
| date_of_birth | DATE | Not null |
| registered_date | DATE | Not null |

Seed: 15 test patients with fixed UUIDs

## Validation Rules

### Create Patient
| Field | Rules |
|-------|-------|
| name | Required, max 100 characters |
| email | Required, valid email format |
| address | Required |
| dateOfBirth | Required |
| registeredDate | Required (only on create) |

### Update Patient
Same as create but registeredDate is NOT required.

## Environment Variables

| Service | Variable | Default | Description |
|---------|----------|---------|-------------|
| Auth | PORT | 4005 | HTTP port |
| Auth | DATABASE_URL | — | PostgreSQL connection |
| Auth | JWT_SECRET | Y2hhVEc3...UkM= | Base64 HMAC key |
| Patient | PORT | 4000 | HTTP port |
| Patient | DATABASE_URL | — | PostgreSQL connection |
| Patient | BILLING_SERVICE_ADDRESS | localhost | Billing gRPC host |
| Patient | BILLING_SERVICE_GRPC_PORT | 9001 | Billing gRPC port |
| Patient | KAFKA_BROKERS | — | Comma-separated brokers |
| Billing | PORT | 4001 | HTTP port |
| Billing | GRPC_PORT | 9001 | gRPC port |
| Analytics | PORT | 4002 | HTTP port |
| Analytics | KAFKA_BROKERS | — | Comma-separated brokers |
| Gateway | PORT | 4004 | HTTP port |
| Gateway | AUTH_SERVICE_URL | http://auth-service:4005 | Auth base URL |
| Gateway | PATIENT_SERVICE_URL | http://patient-service:4000 | Patient base URL |

## Project Structure

```
node-patient-management-system-microservices/
├── proto/                          # Shared protobuf definitions
│   ├── billing_service.proto
│   └── patient_event.proto
├── auth-service/                   # Authentication service
│   ├── src/
│   │   ├── index.ts                # Entry point + Swagger + seed
│   │   ├── controllers/auth.controller.ts
│   │   ├── services/auth.service.ts
│   │   ├── services/user.service.ts
│   │   ├── utils/jwt.util.ts
│   │   ├── middleware/error.middleware.ts
│   │   └── prisma/client.ts
│   ├── prisma/schema.prisma + seed.ts + migrations/
│   ├── package.json, tsconfig.json, Dockerfile
├── patient-service/                # Patient CRUD service
│   ├── src/
│   │   ├── index.ts
│   │   ├── controllers/patient.controller.ts
│   │   ├── services/patient.service.ts
│   │   ├── grpc/billing-client.ts
│   │   ├── kafka/producer.ts
│   │   ├── utils/validators.ts
│   │   ├── errors/errors.ts
│   │   └── middleware/error.middleware.ts
│   ├── prisma/schema.prisma + seed.ts + migrations/
│   ├── package.json, tsconfig.json, Dockerfile
├── billing-service/                # Billing gRPC service
│   ├── src/
│   │   ├── index.ts
│   │   └── grpc/billing.service.ts
│   ├── package.json, tsconfig.json, Dockerfile
├── analytics-service/              # Kafka consumer service
│   ├── src/
│   │   ├── index.ts
│   │   └── kafka/consumer.ts
│   ├── package.json, tsconfig.json, Dockerfile
├── api-gateway/                    # API Gateway
│   ├── src/
│   │   ├── index.ts
│   │   └── middleware/jwt-validation.middleware.ts
│   ├── package.json, tsconfig.json, Dockerfile
├── nginx/                          # Reverse proxy configs
│   ├── nginx.conf                  # For Docker Compose
│   └── nginx-local.conf           # For local dev
├── k8s/                            # Kubernetes manifests
│   ├── namespace.yaml
│   ├── auth-service.yaml
│   ├── billing-service.yaml
│   ├── patient-service.yaml
│   ├── analytics-service.yaml
│   ├── api-gateway.yaml
│   └── ingress.yaml
├── api-requests/                   # HTTP request samples
├── grpc-requests/                  # gRPC request samples
├── integration-tests/              # End-to-end tests
├── infrastructure/                 # AWS CDK stack (TypeScript)
├── terraform/                      # AWS Terraform stack (HCL)
├── docker-compose.yml
├── .gitignore, .dockerignore
├── README.md
├── LOCAL-SETUP.md
├── DOCKER-COMPOSE-SETUP.md
└── PROJECT-GUIDE.md (this file)
```

## Test User

- Email: testuser@test.com
- Password: password123
- Role: ADMIN
