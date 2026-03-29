# Terraform Infrastructure

AWS infrastructure for the Patient Management System using Terraform.
Equivalent to the CDK stack in `../infrastructure/`.

## Resources Created

| Resource | Service | Details |
|----------|---------|---------|
| VPC | Networking | 2 AZs, public + private subnets, NAT gateways |
| RDS | Auth DB | PostgreSQL 17.2, managed password via Secrets Manager |
| RDS | Patient DB | PostgreSQL 17.2, managed password via Secrets Manager |
| MSK | Kafka | Kafka 2.8.0 cluster for event streaming |
| ECS Fargate | 5 services | auth, billing, patient, analytics, api-gateway |
| ALB | Load Balancer | Public-facing, routes to API Gateway |
| ECR | Container Registry | One repo per service, image scanning enabled |
| Cloud Map | Service Discovery | `patient-management.local` namespace |
| CloudWatch | Logging | Log groups per service + MSK |
| Auto Scaling | ECS Services | CPU/memory target tracking, circuit breaker rollback |

## Usage

```bash
# Initialize
terraform init

# Plan with environment config
terraform plan -var-file=environments/dev.tfvars

# Apply
terraform apply -var-file=environments/dev.tfvars

# Destroy
terraform destroy -var-file=environments/dev.tfvars
```

## Environments

| File | Use Case |
|------|----------|
| `environments/dev.tfvars` | Development - minimal resources, single replicas |
| `environments/staging.tfvars` | Staging - mirrors prod at smaller scale |
| `environments/prod.tfvars` | Production - HA, multi-AZ RDS, 3 replicas |

## Remote State (Team Use)

Uncomment the `backend "s3"` block in `main.tf` and create the S3 bucket + DynamoDB table:

```bash
aws s3 mb s3://patient-mgmt-terraform-state
aws dynamodb create-table \
  --table-name terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

## File Structure

```
terraform/
├── main.tf              # Provider, backend, data sources
├── variables.tf         # All input variables
├── outputs.tf           # All outputs (ALB DNS, endpoints, etc.)
├── vpc.tf               # VPC, subnets, IGW, NAT, route tables
├── security-groups.tf   # SGs for ALB, ECS, RDS, MSK
├── rds.tf               # 2x PostgreSQL instances
├── msk.tf               # Kafka cluster
├── ecr.tf               # Container registries + lifecycle policies
├── ecs.tf               # ECS cluster, IAM roles, Cloud Map, log groups
├── ecs-services.tf      # 4 services: auth, billing, patient, analytics
├── alb.tf               # ALB + API Gateway service (behind LB)
├── autoscaling.tf       # ECS auto-scaling (CPU + memory target tracking)
├── environments/
│   ├── dev.tfvars
│   ├── staging.tfvars
│   └── prod.tfvars
└── README.md
```
