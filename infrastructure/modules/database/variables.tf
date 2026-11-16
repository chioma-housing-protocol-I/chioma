variable "name_prefix" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  description = "Private subnets for the DB subnet group (one per AZ)."
  type        = list(string)
}

variable "allowed_security_group_ids" {
  description = "Security groups allowed to connect on 5432."
  type        = list(string)
}

variable "engine_version" {
  description = "PostgreSQL major/minor version."
  type        = string
  default     = "16"
}

variable "instance_class" {
  type = string
}

variable "storage_gb" {
  type = number
}

variable "max_storage_gb" {
  type = number
}

variable "multi_az" {
  type = bool
}

variable "username" {
  type = string
}

variable "pitr_retention_days" {
  description = "Days of automated backups/WAL kept for point-in-time recovery."
  type        = number
  default     = 7
}
