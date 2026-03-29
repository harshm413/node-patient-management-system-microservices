# Kubernetes Deployment (k3d — Local Production Simulation)

Deploy the full microservices stack to a local Kubernetes cluster using k3d. Simulates real-world production deployment with Ingress, multiple replicas, and external databases.

## Architecture

```
http://patient-management.local:8888
  → k3d Load Balancer (port 80)
    → Traefik Ingress Controller (built-in)
      → api-gateway Pods (2 replicas)
        → auth-service Pods (2 replicas) → External PostgreSQL
        → patient-service Pods (2 replicas) → External PostgreSQL
          → billing-service Pods (2 replicas, gRPC)
          → External Kafka → analytics-service Pod (1 replica)

External (Docker containers, simulating managed services):
  - PostgreSQL for auth-service (port 15432)
  - PostgreSQL for patient-service (port 15433)
  - Kafka (port 19094)

Inside k3d cluster (3 nodes: 1 server + 2 agents):
  - 9 Pods total across 5 Deployments
  - 5 K8s Services for internal DNS
  - 1 Ingress for external access
```

## Prerequisites

- Docker Desktop
- k3d (`winget install k3d-io.k3d` or download from https://k3d.io)
- kubectl (auto-downloaded by k3d if missing)

## Step 1: Start External Infrastructure

These simulate AWS RDS and MSK — managed services that live outside the cluster.

```bash
# PostgreSQL for auth-service
docker run -d --name k8s-auth-db \
  -e POSTGRES_DB=db -e POSTGRES_PASSWORD=password -e POSTGRES_USER=admin_user \
  -p 15432:5432 postgres:17

# PostgreSQL for patient-service
docker run -d --name k8s-patient-db \
  -e POSTGRES_DB=db -e POSTGRES_PASSWORD=password -e POSTGRES_USER=admin_user \
  -p 15433:5432 postgres:17

# Kafka
docker run -d --name k8s-kafka \
  -e KAFKA_NODE_ID=0 -e KAFKA_PROCESS_ROLES=broker,controller \
  -e KAFKA_CONTROLLER_QUORUM_VOTERS=0@localhost:9093 \
  -e KAFKA_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093,EXTERNAL://:19094 \
  -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092,EXTERNAL://localhost:19094 \
  -e KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,EXTERNAL:PLAINTEXT,PLAINTEXT:PLAINTEXT \
  -e KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER \
  -e CLUSTER_ID=MkU3OEVBNTcwNTJENDM2Qk \
  -p 19094:19094 apache/kafka:3.7.0
```

## Step 2: Run Database Migrations

```bash
cd auth-service
DATABASE_URL="postgresql://admin_user:password@localhost:15432/db" npx prisma migrate deploy
cd ..

cd patient-service
DATABASE_URL="postgresql://admin_user:password@localhost:15433/db" npx prisma migrate deploy
cd ..
```

## Step 3: Create k3d Cluster

```bash
k3d cluster create patient-mgmt --port "8888:80@loadbalancer" --agents 2
```

This creates:
- 1 server node (control plane)
- 2 agent nodes (workers)
- 1 load balancer mapping host:8888 → cluster:80

## Step 4: Add Custom Domain

Add to hosts file (`C:\Windows\System32\drivers\etc\hosts` or `/etc/hosts`):
```
127.0.0.1   patient-management.local
```

## Step 5: Build Docker Images

```bash
cd node-patient-management-system-microservices

docker build -t patient-mgmt/auth-service:latest -f auth-service/Dockerfile auth-service/
docker build -t patient-mgmt/api-gateway:latest -f api-gateway/Dockerfile api-gateway/
docker build -t patient-mgmt/billing-service:latest -f billing-service/Dockerfile .
docker build -t patient-mgmt/patient-service:latest -f patient-service/Dockerfile .
docker build -t patient-mgmt/analytics-service:latest -f analytics-service/Dockerfile .
```

## Step 6: Import Images into k3d

```bash
k3d image import \
  patient-mgmt/auth-service:latest \
  patient-mgmt/api-gateway:latest \
  patient-mgmt/billing-service:latest \
  patient-mgmt/patient-service:latest \
  patient-mgmt/analytics-service:latest \
  -c patient-mgmt
```

## Step 7: Deploy to Cluster

```bash
# Set kubeconfig (if not auto-set)
export KUBECONFIG=~/.config/k3d/kubeconfig-patient-mgmt.yaml

# Deploy everything
kubectl apply -f k8s/
```

## Step 8: Verify Pods

```bash
kubectl get pods -n patient-mgmt
```

Expected output:
```
NAME                                 READY   STATUS    AGE
auth-service-xxx-yyy                 1/1     Running   1m
auth-service-xxx-zzz                 1/1     Running   1m
billing-service-xxx-yyy              1/1     Running   1m
billing-service-xxx-zzz              1/1     Running   1m
patient-service-xxx-yyy              1/1     Running   1m
patient-service-xxx-zzz              1/1     Running   1m
analytics-service-xxx-yyy            1/1     Running   1m
api-gateway-xxx-yyy                  1/1     Running   1m
api-gateway-xxx-zzz                  1/1     Running   1m
```

## Step 9: Test

```bash
# Login
curl -X POST http://patient-management.local:8888/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@test.com","password":"password123"}'

# Get patients (use token from login)
curl http://patient-management.local:8888/api/patients \
  -H "Authorization: Bearer <token>"

# Create patient
curl -X POST http://patient-management.local:8888/api/patients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"K8s Patient","email":"k8s@test.com","address":"Cluster Ave","dateOfBirth":"1990-01-01","registeredDate":"2024-01-01"}'
```

## Useful kubectl Commands

```bash
# View all resources in namespace
kubectl get all -n patient-mgmt

# View Pod logs
kubectl logs -f deployment/patient-service -n patient-mgmt

# View which node each Pod runs on
kubectl get pods -n patient-mgmt -o wide

# Scale a service
kubectl scale deployment patient-service --replicas=5 -n patient-mgmt

# Restart a deployment (rolling restart)
kubectl rollout restart deployment/auth-service -n patient-mgmt

# View Ingress
kubectl get ingress -n patient-mgmt

# Describe a Pod (for debugging)
kubectl describe pod <pod-name> -n patient-mgmt
```

## Cleanup

```bash
# Delete all K8s resources
kubectl delete -f k8s/

# Delete the cluster
k3d cluster delete patient-mgmt

# Stop external infra
docker stop k8s-auth-db k8s-patient-db k8s-kafka
docker rm k8s-auth-db k8s-patient-db k8s-kafka
```

## K8s Manifest Files

```
k8s/
├── namespace.yaml          # Namespace: patient-mgmt
├── auth-service.yaml       # Deployment (2 replicas) + Service (:4005)
├── billing-service.yaml    # Deployment (2 replicas) + Service (:4001, :9001)
├── patient-service.yaml    # Deployment (2 replicas) + Service (:4000)
├── analytics-service.yaml  # Deployment (1 replica) + Service (:4002)
├── api-gateway.yaml        # Deployment (2 replicas) + Service (:4004)
└── ingress.yaml            # Ingress: patient-management.local → api-gateway:4004
```

## How This Maps to Production (AWS EKS)

| Local (k3d) | Production (AWS) |
|-------------|-----------------|
| k3d cluster | EKS cluster |
| k3d load balancer | AWS ALB (via Load Balancer Controller) |
| Traefik Ingress | Nginx Ingress or ALB Ingress |
| Docker containers (postgres, kafka) | RDS + MSK (managed services) |
| host.k3d.internal | RDS/MSK endpoints |
| k3d image import | ECR (container registry) |
| kubectl apply | GitLab CI pipeline |
| patient-management.local:8888 | patientcare.in (Route 53 + CloudFront) |
