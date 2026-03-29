# =============================================================================
# ECR Repositories - One per service for Docker images
# =============================================================================

locals {
  services = ["auth-service", "billing-service", "patient-service", "analytics-service", "api-gateway"]
}

resource "aws_ecr_repository" "services" {
  for_each = toset(local.services)

  name                 = "${var.ecr_repository_prefix}/${each.key}"
  image_tag_mutability = "MUTABLE"
  force_delete         = var.environment != "prod"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name    = "${var.project_name}-${each.key}"
    Service = each.key
  }
}

# Lifecycle policy - keep last 10 images, expire untagged after 1 day
resource "aws_ecr_lifecycle_policy" "services" {
  for_each   = aws_ecr_repository.services
  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images after 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep last 10 tagged images"
        selection = {
          tagStatus   = "tagged"
          tagPrefixList = ["v"]
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
