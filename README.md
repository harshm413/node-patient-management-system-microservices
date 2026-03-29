# Patient Management System - Node.js/TypeScript Microservices

A Node.js/TypeScript replica of the [Java/Spring Boot microservices course](https://github.com/chrisblakely01/java-spring-microservices) by Chris Blakely.

## Services

| Service | Port | Description |
|---|---|---|
| auth-service | 4005 | JWT authentication (login + validate) |
| patient-service | 4000 | Patient CRUD, gRPC billing client, Kafka producer |
| billing-service | 4001 (HTTP), 9001 (gRPC) | gRPC billing account creation |
| analytics-service | 4002 | Kafka consumer for patient events |
| api-gateway | 4004 | Request routing + JWT validation |

## Tech Stack

- **Runtime**: Node.js 21, TypeScript
- **Web Framework**: Express.js
- **ORM**: Prisma (PostgreSQL)
- **Authentication**: jsonwebtoken + bcryptjs
- **gRPC**: @grpc/grpc-js + @grpc/proto-loader
- **Messaging**: KafkaJS + Protocol Buffers
- **API Docs**: swagger-jsdoc + swagger-ui-express
- **API Gateway**: http-proxy-middleware + axios
- **Infrastructure**: AWS CDK (TypeScript), Terraform (HCL)
- **Testing**: Vitest + axios

## Project Structure

```
├── proto/                  # Shared protobuf definitions
├── auth-service/           # Authentication service
├── patient-service/        # Patient CRUD service
├── billing-service/        # Billing gRPC service
├── analytics-service/      # Analytics Kafka consumer
├── api-gateway/            # API Gateway
├── infrastructure/         # AWS CDK stack
├── terraform/              # AWS Terraform stack
├── integration-tests/      # End-to-end tests
├── api-requests/           # HTTP request samples
└── grpc-requests/          # gRPC request samples
```

## Environment Variables

### Auth Service
| Variable | Default | Description |
|---|---|---|
| PORT | 4005 | HTTP server port |
| DATABASE_URL | — | PostgreSQL connection string |
| JWT_SECRET | Y2hhVEc3aHJnb0hYTzMyZ2ZqVkpiZ1RkZG93YWxrUkM= | Base64-encoded HMAC key |

### Patient Service
| Variable | Default | Description |
|---|---|---|
| PORT | 4000 | HTTP server port |
| DATABASE_URL | — | PostgreSQL connection string |
| BILLING_SERVICE_ADDRESS | localhost | Billing gRPC host |
| BILLING_SERVICE_GRPC_PORT | 9001 | Billing gRPC port |
| KAFKA_BROKERS | localhost:9092 | Comma-separated Kafka brokers |

### Billing Service
| Variable | Default | Description |
|---|---|---|
| PORT | 4001 | HTTP server port |
| GRPC_PORT | 9001 | gRPC server port |

### Analytics Service
| Variable | Default | Description |
|---|---|---|
| PORT | 4002 | HTTP server port |
| KAFKA_BROKERS | — | Comma-separated Kafka brokers |

### API Gateway
| Variable | Default | Description |
|---|---|---|
| PORT | 4004 | HTTP server port |
| AUTH_SERVICE_URL | http://localhost:4005 | Auth service URL |
| PATIENT_SERVICE_URL | http://localhost:4000 | Patient service URL |
| PROFILE | — | Set to `prod` for Docker URLs |

## Running a Service Locally

```bash
cd auth-service
npm install
npx prisma generate
npm run dev
```

## Test User

- Email: testuser@test.com
- Password: password123
- Role: ADMIN
