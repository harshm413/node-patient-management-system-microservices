# =============================================================================
# Production Environment - Full scale, HA, encryption
# =============================================================================

environment        = "prod"
aws_region         = "us-east-1"

# Production-grade instances
db_instance_class    = "db.r6g.large"
db_allocated_storage = 100
db_engine_version    = "17.2"

msk_instance_type  = "kafka.m5.xlarge"
msk_broker_count   = 3

# HA: multiple replicas
service_desired_count = 3
ecs_task_cpu          = 512
ecs_task_memory       = 1024
