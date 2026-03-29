# =============================================================================
# RDS PostgreSQL - Matches CDK: 2x DatabaseInstance (t2.micro, Postgres 17.2)
# =============================================================================

resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

# --- Auth Service Database ---
resource "aws_db_instance" "auth" {
  identifier     = "${var.project_name}-auth-db"
  engine         = "postgres"
  engine_version = var.db_engine_version
  instance_class = var.db_instance_class

  allocated_storage = var.db_allocated_storage
  storage_encrypted = true

  db_name  = "db"
  username = var.db_username
  manage_master_user_password = true  # AWS manages password in Secrets Manager

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  multi_az            = var.environment == "prod" ? true : false
  skip_final_snapshot = var.environment != "prod"
  deletion_protection = var.environment == "prod" ? true : false

  backup_retention_period = var.environment == "prod" ? 7 : 1

  tags = {
    Name    = "${var.project_name}-auth-db"
    Service = "auth-service"
  }
}

# --- Patient Service Database ---
resource "aws_db_instance" "patient" {
  identifier     = "${var.project_name}-patient-db"
  engine         = "postgres"
  engine_version = var.db_engine_version
  instance_class = var.db_instance_class

  allocated_storage = var.db_allocated_storage
  storage_encrypted = true

  db_name  = "db"
  username = var.db_username
  manage_master_user_password = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  multi_az            = var.environment == "prod" ? true : false
  skip_final_snapshot = var.environment != "prod"
  deletion_protection = var.environment == "prod" ? true : false

  backup_retention_period = var.environment == "prod" ? 7 : 1

  tags = {
    Name    = "${var.project_name}-patient-db"
    Service = "patient-service"
  }
}
