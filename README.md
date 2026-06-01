# Patient Management System — Node.js/TypeScript Microservices

A 5-service microservices system demonstrating three inter-service communication patterns: REST (HTTP), gRPC (synchronous RPC), and Kafka (async event streaming).

## Architecture

```
┌──────────┐     HTTP      ┌──────────────┐    HTTP     ┌─────────────────┐
│  Client  │──────────────▶│  API Gateway │────────────▶│ Patient Service │
└──────────┘               │   (4004)     │             │     (4000)      │
                           └──────┬───────┘             └───┬─────────┬───┘
                                  │                         │         │
                           HTTP (validate)              gRPC │     Kafka│
                                  │                         │         │
                           ┌──────▼───────┐         ┌──────▼──┐  ┌───▼──────────┐
                           │ Auth Service │         │ Billing  │  │  Analytics   │
                           │   (4005)     │         │ (9001)   │  │   (4002)     │
                           └──────────────┘         └──────────┘  └──────────────┘
```

## Communication Patterns

| Pattern | Between | Why |
|---------|---------|-----|
| REST/HTTP | Gateway → Auth (validate JWT) | Simple request-response for auth checks |
| gRPC + Protobuf | Patient → Billing | Low-latency synchronous call, type-safe contract |
| Kafka + Protobuf | Patient → Analytics | Async event streaming, no immediate response needed |

## Services

| Service | Port(s) | Database | Role |
|---------|---------|----------|------|
| API Gateway | 4004 | None | Routes requests, validates JWT via Auth Service |
| Auth Service | 4005 | PostgreSQL (Prisma) | Login, JWT token generation and validation |
| Patient Service | 4000 | PostgreSQL (Prisma) | Patient CRUD, calls Billing via gRPC, publishes to Kafka |
| Billing Service | 4001 (HTTP) + 9001 (gRPC) | None | gRPC server, creates billing accounts |
| Analytics Service | 4002 | None | Kafka consumer, processes patient events |

## Tech Stack

- **Runtime**: Node.js, TypeScript
- **Framework**: Express.js
- **ORM**: Prisma (PostgreSQL)
- **gRPC**: @grpc/grpc-js, @grpc/proto-loader, Protocol Buffers
- **Messaging**: KafkaJS with Protobuf serialization
- **Auth**: jsonwebtoken, bcryptjs
- **Testing**: Vitest (integration tests)
- **API Docs**: Swagger/OpenAPI (swagger-jsdoc + swagger-ui-express)
- **Deployment**: Docker (multi-stage builds), Docker Compose, Kubernetes (k3d), Nginx

## Running Locally

```bash
# Start all services with Docker Compose
docker-compose up --build

# Services available at:
# Gateway:   http://localhost:4004
# Auth:      http://localhost:4005
# Patient:   http://localhost:4000
# Billing:   http://localhost:4001
# Analytics: http://localhost:4002
```

## Key Design Decisions

- **Database-per-service**: Each service owns its data, no shared databases
- **Protobuf for both gRPC and Kafka**: Type-safe contracts and efficient binary serialization
- **API Gateway pattern**: Single entry point, centralized auth validation
- **Multi-stage Docker builds**: Small production images, non-root users
- **Nginx reverse proxy**: Single entry point with security headers

## Python Duplication

This entire project was also fully replicated in Python (FastAPI, SQLAlchemy, Alembic, grpcio, kafka-python) — same architecture, same APIs, same deployment. See [python-patient-management-system-microservices](https://github.com/harshm413/python-patient-management-system-microservices).
