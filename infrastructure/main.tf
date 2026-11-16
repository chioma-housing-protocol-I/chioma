locals {
  name_prefix = "chioma-${var.environment}"

  common_tags = {
    Project     = "chioma"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

module "networking" {
  source = "./modules/networking"

  name_prefix        = local.name_prefix
  vpc_cidr           = var.vpc_cidr
  az_count           = var.az_count
  single_nat_gateway = var.single_nat_gateway
}

module "kubernetes" {
  source = "./modules/kubernetes"

  name_prefix         = local.name_prefix
  cluster_version     = var.eks_version
  subnet_ids          = module.networking.private_subnet_ids
  node_instance_types = var.node_instance_types
  node_min_size       = var.node_min_size
  node_desired_size   = var.node_desired_size
  node_max_size       = var.node_max_size
  public_endpoint     = var.eks_public_endpoint
  public_access_cidrs = var.eks_public_access_cidrs
}

module "database" {
  source = "./modules/database"

  name_prefix                = local.name_prefix
  environment                = var.environment
  vpc_id                     = module.networking.vpc_id
  subnet_ids                 = module.networking.private_subnet_ids
  allowed_security_group_ids = [module.kubernetes.cluster_security_group_id]
  instance_class             = var.db_instance_class
  storage_gb                 = var.db_storage_gb
  max_storage_gb             = var.db_max_storage_gb
  multi_az                   = var.db_multi_az
  username                   = var.db_username
}

module "cache" {
  source = "./modules/cache"

  name_prefix                = local.name_prefix
  vpc_id                     = module.networking.vpc_id
  subnet_ids                 = module.networking.private_subnet_ids
  allowed_security_group_ids = [module.kubernetes.cluster_security_group_id]
  node_type                  = var.redis_node_type
  num_nodes                  = var.redis_num_nodes
}

module "storage" {
  source = "./modules/storage"

  providers = {
    aws = aws
    aws.dr = aws.dr
  }

  name_prefix = local.name_prefix
}

module "backup" {
  source = "./modules/backup"

  providers = {
    aws = aws
    aws.dr = aws.dr
  }

  name_prefix             = local.name_prefix
  daily_retention_days    = var.backup_daily_retention_days
  monthly_retention_days  = var.backup_monthly_retention_days
  alert_emails            = var.backup_alert_emails
  db_instance_arn         = module.database.instance_arn
  db_subnet_group_name    = module.database.subnet_group_name
  db_security_group_id    = module.database.security_group_id
  protected_resource_arns = [module.database.instance_arn, module.storage.assets_bucket_arn]
}
