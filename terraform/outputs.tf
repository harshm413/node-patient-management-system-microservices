# =============================================================================
# Outputs
# =============================================================================

# --- VPC ---
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public[*].id
}

# --- ALB ---
output "alb_dns_name" {
  description = "ALB DNS name - use this to access the API"
  value       = aws_lb.main.dns_name
}

output "alb_url" {
  description = "Full ALB URL"
  value       = "http://${aws_lb.main.dns_name}"
}

# --- RDS ---
output "auth_db_endpoint" {
  description = "Auth service RDS endpoint"
  value       = aws_db_instance.auth.endpoint
}

output "patient_db_endpoint" {
  description = "Patient service RDS endpoint"
  value       = aws_db_instance.patient.endpoint
}

output "auth_db_secret_arn" {
  description = "Auth DB password secret ARN (in Secrets Manager)"
  value       = aws_db_instance.auth.master_user_secret[0].secret_arn
}

output "patient_db_secret_arn" {
  description = "Patient DB password secret ARN (in Secrets Manager)"
  value       = aws_db_instance.patient.master_user_secret[0].secret_arn
}

# --- MSK ---
output "msk_bootstrap_brokers" {
  description = "MSK bootstrap broker connection string"
  value       = aws_msk_cluster.main.bootstrap_brokers
}

output "msk_bootstrap_brokers_tls" {
  description = "MSK bootstrap broker TLS connection string"
  value       = aws_msk_cluster.main.bootstrap_brokers_tls
}

# --- ECS ---
output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_cluster_arn" {
  description = "ECS cluster ARN"
  value       = aws_ecs_cluster.main.arn
}

# --- ECR ---
output "ecr_repository_urls" {
  description = "ECR repository URLs for each service"
  value       = { for k, v in aws_ecr_repository.services : k => v.repository_url }
}

# --- Service Discovery ---
output "service_discovery_namespace" {
  description = "Cloud Map namespace for service discovery"
  value       = aws_service_discovery_private_dns_namespace.main.name
}
