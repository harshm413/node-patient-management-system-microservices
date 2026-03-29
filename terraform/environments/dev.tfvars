# =============================================================================
# Dev Environment - Minimal resources for development/testing
# =============================================================================

environment        = "dev"
aws_region         = "us-east-1"

# Smaller instances for cost savings
db_instance_class  = "db.t3.micro"
db_allocated_storage = 20
msk_instance_type  = "kafka.t3.small"
msk_broker_count   = 2

# Single replica per service
service_desired_count = 1
ecs_task_cpu          = 256
ecs_task_memory       = 512
