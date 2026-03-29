# =============================================================================
# Variables
# =============================================================================

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "patient-mgmt"
}

# --- VPC ---
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# --- RDS ---
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "17.2"
}

variable "db_username" {
  description = "Master username for RDS instances"
  type        = string
  default     = "admin_user"
}

# --- MSK (Kafka) ---
variable "msk_instance_type" {
  description = "MSK broker instance type"
  type        = string
  default     = "kafka.m5.xlarge"
}

variable "msk_kafka_version" {
  description = "Kafka version for MSK"
  type        = string
  default     = "2.8.0"
}

variable "msk_broker_count" {
  description = "Number of MSK broker nodes"
  type        = number
  default     = 2
}

# --- ECS ---
variable "ecs_task_cpu" {
  description = "CPU units for ECS tasks (256 = 0.25 vCPU)"
  type        = number
  default     = 256
}

variable "ecs_task_memory" {
  description = "Memory in MiB for ECS tasks"
  type        = number
  default     = 512
}

variable "service_desired_count" {
  description = "Desired number of ECS tasks per service"
  type        = number
  default     = 2
}

# --- Container Images (ECR) ---
variable "ecr_repository_prefix" {
  description = "ECR repository prefix"
  type        = string
  default     = "patient-mgmt"
}

# --- Auth ---
variable "jwt_secret" {
  description = "JWT secret for auth-service"
  type        = string
  sensitive   = true
  default     = "Y2hhVEc3aHJnb0hYTzMyZ2ZqVkpiZ1RkZG93YWxrUkM="
}
