# =============================================================================
# ECS Cluster + Service Discovery - Matches CDK: PatientManagementCluster
# =============================================================================

resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "${var.project_name}-cluster"
  }
}

# Cloud Map namespace for service discovery (matches CDK: patient-management.local)
resource "aws_service_discovery_private_dns_namespace" "main" {
  name = "patient-management.local"
  vpc  = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-service-discovery"
  }
}

# --- IAM: ECS Task Execution Role ---
resource "aws_iam_role" "ecs_execution" {
  name = "${var.project_name}-ecs-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Allow pulling images from ECR
resource "aws_iam_role_policy" "ecs_ecr" {
  name = "${var.project_name}-ecs-ecr"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage"
      ]
      Resource = "*"
    }]
  })
}

# Allow reading RDS secrets from Secrets Manager
resource "aws_iam_role_policy" "ecs_secrets" {
  name = "${var.project_name}-ecs-secrets"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "secretsmanager:GetSecretValue"
      ]
      Resource = [
        aws_db_instance.auth.master_user_secret[0].secret_arn,
        aws_db_instance.patient.master_user_secret[0].secret_arn
      ]
    }]
  })
}

# --- IAM: ECS Task Role (for application code) ---
resource "aws_iam_role" "ecs_task" {
  name = "${var.project_name}-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

# --- CloudWatch Log Groups (matches CDK: /ecs/{service-name}) ---
resource "aws_cloudwatch_log_group" "services" {
  for_each = toset(local.services)

  name              = "/ecs/${each.key}"
  retention_in_days = var.environment == "prod" ? 30 : 1

  tags = {
    Service = each.key
  }
}
