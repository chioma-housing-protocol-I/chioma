output "vpc_id" {
  description = "VPC ID."
  value       = module.networking.vpc_id
}

output "eks_cluster_name" {
  description = "EKS cluster name (use with `aws eks update-kubeconfig --name`)."
  value       = module.kubernetes.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS API endpoint."
  value       = module.kubernetes.cluster_endpoint
}

output "db_endpoint" {
  description = "RDS PostgreSQL endpoint (host:port)."
  value       = module.database.endpoint
}

output "db_master_secret_arn" {
  description = "Secrets Manager ARN holding the RDS master credentials."
  value       = module.database.master_user_secret_arn
}

output "redis_primary_endpoint" {
  description = "ElastiCache Redis primary endpoint."
  value       = module.cache.primary_endpoint
}

output "assets_bucket" {
  description = "S3 bucket for uploaded files."
  value       = module.storage.assets_bucket_name
}

output "backup_vault_name" {
  description = "Primary AWS Backup vault."
  value       = module.backup.vault_name
}

output "backup_dr_vault_arn" {
  description = "Cross-region AWS Backup vault holding DR copies."
  value       = module.backup.dr_vault_arn
}
