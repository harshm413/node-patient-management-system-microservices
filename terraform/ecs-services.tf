# =============================================================================
# ECS Fargate Services - Matches CDK: 5 services (256 CPU / 512 MiB each)
# =============================================================================

locals {
  account_id = data.aws_caller_identity.current.account_id
  ecr_base   = "${local.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.ecr_repository_prefix}"
}

# =============================================================================
# AUTH SERVICE (port 4005)
# =============================================================================

resource "aws_ecs_task_definition" "auth" {
  family                   = "${var.project_name}-auth-service"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.ecs_task_cpu
  memory                   = var.ecs_task_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "auth-service"
    image = "${local.ecr_base}/auth-service:latest"
    portMappings = [{
      containerPort = 4005
      hostPort      = 4005
      protocol      = "tcp"
    }]
    environment = [
      { name = "PORT", value = "4005" },
      { name = "JWT_SECRET", value = var.jwt_secret },
      {
        name  = "DATABASE_URL"
        value = "postgresql://${var.db_username}@${aws_db_instance.auth.endpoint}/db"
      }
    ]
    secrets = [{
      name      = "DB_PASSWORD"
      valueFrom = "${aws_db_instance.auth.master_user_secret[0].secret_arn}:password::"
    }]
    healthCheck = {
      command     = ["CMD-SHELL", "node -e \"require('http').get('http://localhost:4005/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))\" || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/auth-service"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "auth-service"
      }
    }
  }])
}

resource "aws_service_discovery_service" "auth" {
  name = "auth-service"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id
    dns_records {
      ttl  = 10
      type = "A"
    }
    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_ecs_service" "auth" {
  name            = "auth-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.auth.arn
  desired_count   = var.service_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn = aws_service_discovery_service.auth.arn
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  depends_on = [aws_db_instance.auth]
}


# =============================================================================
# BILLING SERVICE (port 4001 HTTP + port 9001 gRPC)
# =============================================================================

resource "aws_ecs_task_definition" "billing" {
  family                   = "${var.project_name}-billing-service"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.ecs_task_cpu
  memory                   = var.ecs_task_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "billing-service"
    image = "${local.ecr_base}/billing-service:latest"
    portMappings = [
      { containerPort = 4001, hostPort = 4001, protocol = "tcp" },
      { containerPort = 9001, hostPort = 9001, protocol = "tcp" }
    ]
    environment = [
      { name = "PORT", value = "4001" },
      { name = "GRPC_PORT", value = "9001" }
    ]
    healthCheck = {
      command     = ["CMD-SHELL", "node -e \"require('http').get('http://localhost:4001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))\" || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/billing-service"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "billing-service"
      }
    }
  }])
}

resource "aws_service_discovery_service" "billing" {
  name = "billing-service"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id
    dns_records {
      ttl  = 10
      type = "A"
    }
    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_ecs_service" "billing" {
  name            = "billing-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.billing.arn
  desired_count   = var.service_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn = aws_service_discovery_service.billing.arn
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}

# =============================================================================
# PATIENT SERVICE (port 4000)
# =============================================================================

resource "aws_ecs_task_definition" "patient" {
  family                   = "${var.project_name}-patient-service"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.ecs_task_cpu
  memory                   = var.ecs_task_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "patient-service"
    image = "${local.ecr_base}/patient-service:latest"
    portMappings = [{
      containerPort = 4000
      hostPort      = 4000
      protocol      = "tcp"
    }]
    environment = [
      { name = "PORT", value = "4000" },
      {
        name  = "DATABASE_URL"
        value = "postgresql://${var.db_username}@${aws_db_instance.patient.endpoint}/db"
      },
      {
        name  = "BILLING_SERVICE_ADDRESS"
        value = "billing-service.patient-management.local"
      },
      { name = "BILLING_SERVICE_GRPC_PORT", value = "9001" },
      {
        name  = "KAFKA_BROKERS"
        value = aws_msk_cluster.main.bootstrap_brokers
      }
    ]
    secrets = [{
      name      = "DB_PASSWORD"
      valueFrom = "${aws_db_instance.patient.master_user_secret[0].secret_arn}:password::"
    }]
    healthCheck = {
      command     = ["CMD-SHELL", "node -e \"require('http').get('http://localhost:4000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))\" || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/patient-service"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "patient-service"
      }
    }
  }])
}

resource "aws_service_discovery_service" "patient" {
  name = "patient-service"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id
    dns_records {
      ttl  = 10
      type = "A"
    }
    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_ecs_service" "patient" {
  name            = "patient-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.patient.arn
  desired_count   = var.service_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn = aws_service_discovery_service.patient.arn
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  depends_on = [
    aws_db_instance.patient,
    aws_ecs_service.billing,
    aws_msk_cluster.main
  ]
}

# =============================================================================
# ANALYTICS SERVICE (port 4002)
# =============================================================================

resource "aws_ecs_task_definition" "analytics" {
  family                   = "${var.project_name}-analytics-service"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.ecs_task_cpu
  memory                   = var.ecs_task_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "analytics-service"
    image = "${local.ecr_base}/analytics-service:latest"
    portMappings = [{
      containerPort = 4002
      hostPort      = 4002
      protocol      = "tcp"
    }]
    environment = [
      { name = "PORT", value = "4002" },
      {
        name  = "KAFKA_BROKERS"
        value = aws_msk_cluster.main.bootstrap_brokers
      }
    ]
    healthCheck = {
      command     = ["CMD-SHELL", "node -e \"require('http').get('http://localhost:4002/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))\" || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/analytics-service"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "analytics-service"
      }
    }
  }])
}

resource "aws_service_discovery_service" "analytics" {
  name = "analytics-service"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id
    dns_records {
      ttl  = 10
      type = "A"
    }
    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_ecs_service" "analytics" {
  name            = "analytics-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.analytics.arn
  desired_count   = var.service_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn = aws_service_discovery_service.analytics.arn
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  depends_on = [aws_msk_cluster.main]
}
