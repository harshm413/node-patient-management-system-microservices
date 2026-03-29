# =============================================================================
# MSK (Kafka) - Matches CDK: kafka.m5.xlarge, Kafka 2.8.0
# =============================================================================

resource "aws_msk_cluster" "main" {
  cluster_name           = "${var.project_name}-kafka"
  kafka_version          = var.msk_kafka_version
  number_of_broker_nodes = var.msk_broker_count

  broker_node_group_info {
    instance_type  = var.msk_instance_type
    client_subnets = aws_subnet.private[*].id
    security_groups = [aws_security_group.msk.id]

    storage_info {
      ebs_storage_info {
        volume_size = 100
      }
    }
  }

  encryption_info {
    encryption_in_transit {
      client_broker = "TLS_PLAINTEXT"
      in_cluster    = true
    }
  }

  logging_info {
    broker_logs {
      cloudwatch_logs {
        enabled   = true
        log_group = aws_cloudwatch_log_group.msk.name
      }
    }
  }

  tags = {
    Name = "${var.project_name}-kafka"
  }
}

resource "aws_cloudwatch_log_group" "msk" {
  name              = "/msk/${var.project_name}"
  retention_in_days = var.environment == "prod" ? 30 : 1
}
