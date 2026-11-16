variable "name_prefix" {
  type = string
}

variable "daily_retention_days" {
  description = "Days to keep daily recovery points (primary and DR copy)."
  type        = number
  default     = 30
}

variable "monthly_retention_days" {
  description = "Days to keep monthly recovery points (primary and DR copy)."
  type        = number
  default     = 365
}

variable "protected_resource_arns" {
  description = "ARNs of resources covered by the backup plan (RDS instance, S3 buckets)."
  type        = list(string)
}

variable "db_instance_arn" {
  description = "RDS instance whose recovery points are restore-tested weekly."
  type        = string
}

variable "db_subnet_group_name" {
  description = "Subnet group used for restore-test instances."
  type        = string
}

variable "db_security_group_id" {
  description = "Security group attached to restore-test instances."
  type        = string
}

variable "alert_emails" {
  description = "Email addresses subscribed to backup failure notifications."
  type        = list(string)
  default     = []
}
