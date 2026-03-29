# =============================================================================
# ALB - Matches CDK: ApplicationLoadBalancedFargateService for API Gateway
# =============================================================================

resource "aws_lb" "main" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  tags = {
    Name = "${var.project_name}-alb"
  }
}

resource "aws_lb_target_group" "api_gateway" {
  name        = "${var.project_name}-api-gw-tg"
  port        = 4004
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/health"
    port                = "4004"
    protocol            = "HTTP"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = {
    Name = "${var.project_name}-api-gw-tg"
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api_gateway.arn
  }
}

# Uncomment for HTTPS (requires ACM certificate)
# resource "aws_lb_listener" "https" {
#   load_balancer_arn = aws_lb.main.arn
#   port              = 443
#   protocol          = "HTTPS"
#   ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
#   certificate_arn   = var.acm_certificate_arn
#
#   default_action {
#     type             = "forward"
#     target_group_arn = aws_lb_target_group.api_gateway.arn
#   }
# }

# =============================================================================
# API GATEWAY SERVICE (port 4004) - behind ALB
# =============================================================================

resource "aws_ecs_task_definition" "api_gateway" {
  family                   = "${var.project_name}-api-gateway"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.ecs_task_cpu
  memory                   = var.ecs_task_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "api-gateway"
    image = "${local.ecr_base}/api-gateway:latest"
    portMappings = [{
      containerPort = 4004
      hostPort      = 4004
      protocol      = "tcp"
    }]
    environment = [
      { name = "PORT", value = "4004" },
      {
        name  = "AUTH_SERVICE_URL"
        value = "http://auth-service.patient-management.local:4005"
      },
      {
        name  = "PATIENT_SERVICE_URL"
        value = "http://patient-service.patient-management.local:4000"
      }
    ]
    healthCheck = {
      command     = ["CMD-SHELL", "node -e \"require('http').get('http://localhost:4004/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))\" || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/api-gateway"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "api-gateway"
      }
    }
  }])
}

resource "aws_service_discovery_service" "api_gateway" {
  name = "api-gateway"

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

resource "aws_ecs_service" "api_gateway" {
  name            = "api-gateway"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api_gateway.arn
  desired_count   = var.service_desired_count
  launch_type     = "FARGATE"

  health_check_grace_period_seconds = 60

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api_gateway.arn
    container_name   = "api-gateway"
    container_port   = 4004
  }

  service_registries {
    registry_arn = aws_service_discovery_service.api_gateway.arn
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  depends_on = [
    aws_lb_listener.http,
    aws_ecs_service.auth,
    aws_ecs_service.patient
  ]
}
