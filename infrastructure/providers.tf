provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}

# Secondary region used for disaster recovery: cross-region backup copies and
# object storage replication.
provider "aws" {
  alias  = "dr"
  region = var.dr_region

  default_tags {
    tags = local.common_tags
  }
}
