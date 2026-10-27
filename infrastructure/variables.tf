variable "environment" {
  description = "Deployment environment (staging or production)."
  type        = string

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be staging or production."
  }
}

variable "aws_region" {
  description = "Primary AWS region."
  type        = string
  default     = "us-east-1"
}

variable "dr_region" {
  description = "Disaster recovery AWS region for backup copies and replication. Must differ from aws_region."
  type        = string
  default     = "us-west-2"
}

# ── Networking ───────────────────────────────────────────────────────────────

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "az_count" {
  description = "Number of availability zones to spread subnets across."
  type        = number
  default     = 3
}

variable "single_nat_gateway" {
  description = "Use one NAT gateway for all AZs (cheaper, not AZ-fault tolerant)."
  type        = bool
  default     = false
}

# ── Kubernetes ───────────────────────────────────────────────────────────────

variable "eks_version" {
  description = "EKS Kubernetes version."
  type        = string
  default     = "1.30"
}

variable "node_instance_types" {
  description = "Instance types for the EKS managed node group."
  type        = list(string)
  default     = ["t3.large"]
}

variable "node_min_size" {
  description = "Minimum number of worker nodes."
  type        = number
  default     = 3
}

variable "node_desired_size" {
  description = "Desired number of worker nodes."
  type        = number
  default     = 3
}

variable "node_max_size" {
  description = "Maximum number of worker nodes."
  type        = number
  default     = 6
}

variable "eks_public_endpoint" {
  description = "Expose the EKS API endpoint publicly (restricted by eks_public_access_cidrs)."
  type        = bool
  default     = true
}

variable "eks_public_access_cidrs" {
  description = "CIDRs allowed to reach the public EKS API endpoint."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# ── Database ─────────────────────────────────────────────────────────────────

variable "db_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.medium"
}

variable "db_storage_gb" {
  description = "Initial allocated storage in GB."
  type        = number
  default     = 50
}

variable "db_max_storage_gb" {
  description = "Upper limit for storage autoscaling in GB."
  type        = number
  default     = 200
}

variable "db_multi_az" {
  description = "Run a synchronous standby in a second AZ."
  type        = bool
  default     = true
}

variable "db_username" {
  description = "Master username. The password is generated and stored in Secrets Manager by RDS."
  type        = string
  default     = "chioma_admin"
}

# ── Cache ────────────────────────────────────────────────────────────────────

variable "redis_node_type" {
  description = "ElastiCache node type."
  type        = string
  default     = "cache.t4g.small"
}

variable "redis_num_nodes" {
  description = "Number of Redis nodes (primary + replicas). >1 enables automatic failover."
  type        = number
  default     = 2
}

# ── Backups ──────────────────────────────────────────────────────────────────

variable "backup_daily_retention_days" {
  description = "Retention for daily snapshots."
  type        = number
  default     = 30
}

variable "backup_monthly_retention_days" {
  description = "Retention for monthly snapshots."
  type        = number
  default     = 365
}

variable "backup_alert_emails" {
  description = "Email addresses notified of failed backup, copy or restore-test jobs."
  type        = list(string)
  default     = []
}
