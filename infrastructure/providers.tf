terraform {
  backend "s3" {}
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">=4.0.0"
    }
  }
}

provider "aws" {
  region = var.region

  profile = "fincop"

  default_tags {
    tags = merge(var.tags, aws_servicecatalogappregistry_application.app.application_tag)
  }
}

# Create application using aliased 'application' provider
provider "aws" {
  region = var.region
  alias  = "application"

  profile = "fincop"
}

resource "aws_servicecatalogappregistry_application" "app" {
  provider    = aws.application
  name        = "${var.project_name}-auth"
  description = "Auth Backend for ${var.project_name} in ${var.env} environment"
  tags        = var.tags
}