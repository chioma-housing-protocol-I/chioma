variable "name_prefix" {
  type = string
}

variable "noncurrent_version_retention_days" {
  description = "Days to keep overwritten/deleted object versions."
  type        = number
  default     = 30
}
