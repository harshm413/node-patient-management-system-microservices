# =============================================================================
# Staging Environment - Mirrors prod but smaller scale
# =============================================================================

environment        = "staging"
aws_region         = "us-east-1"

db_instance_class  = "db.t3.small"
db_allocated_storage = 50
msk_instance_type  = "kafka.m5.large"
msk_broker_count   = 2

service_desired_count = 2
ecs_task_cpu          = 512
ecs_task_memory       = 1024
