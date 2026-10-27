terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
  }

  # Partial configuration: the bucket/key/region/lock table are supplied per
  # environment with `terraform init -backend-config=environments/<env>.s3.tfbackend`.
  # The state bucket and lock table are created once by ./bootstrap.
  backend "s3" {}
}
