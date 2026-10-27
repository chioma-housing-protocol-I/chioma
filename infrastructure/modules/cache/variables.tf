variable "name_prefix" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "allowed_security_group_ids" {
  description = "Security groups allowed to connect on 6379."
  type        = list(string)
}

variable "engine_version" {
  type    = string
  default = "7.1"
}

variable "node_type" {
  type = string
}

variable "num_nodes" {
  description = "Primary + replicas. Values above 1 enable Multi-AZ failover."
  type        = number
}
