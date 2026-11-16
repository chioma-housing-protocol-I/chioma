variable "name_prefix" {
  description = "Prefix for resource names; also the EKS cluster name."
  type        = string
}

variable "cluster_version" {
  description = "EKS Kubernetes version."
  type        = string
}

variable "subnet_ids" {
  description = "Private subnet IDs for the control plane ENIs and worker nodes."
  type        = list(string)
}

variable "node_instance_types" {
  description = "Instance types for the managed node group."
  type        = list(string)
}

variable "node_min_size" {
  type = number
}

variable "node_desired_size" {
  type = number
}

variable "node_max_size" {
  type = number
}

variable "public_endpoint" {
  description = "Expose the EKS API publicly."
  type        = bool
}

variable "public_access_cidrs" {
  description = "CIDRs allowed to reach the public EKS API."
  type        = list(string)
}
