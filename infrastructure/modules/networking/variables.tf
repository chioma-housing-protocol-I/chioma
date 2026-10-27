variable "name_prefix" {
  description = "Prefix for resource names, e.g. chioma-production."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
}

variable "az_count" {
  description = "Number of availability zones to use."
  type        = number
}

variable "single_nat_gateway" {
  description = "Share one NAT gateway across all private subnets."
  type        = bool
}
