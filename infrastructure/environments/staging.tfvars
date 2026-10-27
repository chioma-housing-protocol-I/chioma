environment = "staging"
aws_region  = "us-east-1"
dr_region   = "us-west-2"

vpc_cidr           = "10.30.0.0/16"
az_count           = 2
single_nat_gateway = true

node_instance_types = ["t3.medium"]
node_min_size       = 2
node_desired_size   = 2
node_max_size       = 4

db_instance_class = "db.t4g.small"
db_storage_gb     = 20
db_max_storage_gb = 50
db_multi_az       = false

redis_node_type = "cache.t4g.micro"
redis_num_nodes = 1

backup_daily_retention_days   = 30
backup_monthly_retention_days = 365
