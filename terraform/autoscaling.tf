# =============================================================================
# ECS Auto Scaling - Scale services based on CPU/memory utilization
# =============================================================================

# --- Scalable Targets ---
resource "aws_appautoscaling_target" "services" {
  for_each = {
    auth      = aws_ecs_service.auth.name
    billing   = aws_ecs_service.billing.name
    patient   = aws_ecs_service.patient.name
    analytics = aws_ecs_service.analytics.name
    gateway   = aws_ecs_service.api_gateway.name
  }

  max_capacity       = var.environment == "prod" ? 10 : 4
  min_capacity       = var.service_desired_count
  resource_id        = "service/${aws_ecs_cluster.main.name}/${each.value}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# --- CPU-based Scaling ---
resource "aws_appautoscaling_policy" "cpu" {
  for_each = aws_appautoscaling_target.services

  name               = "${each.key}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = each.value.resource_id
  scalable_dimension = each.value.scalable_dimension
  service_namespace  = each.value.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# --- Memory-based Scaling ---
resource "aws_appautoscaling_policy" "memory" {
  for_each = aws_appautoscaling_target.services

  name               = "${each.key}-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = each.value.resource_id
  scalable_dimension = each.value.scalable_dimension
  service_namespace  = each.value.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = 80.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
