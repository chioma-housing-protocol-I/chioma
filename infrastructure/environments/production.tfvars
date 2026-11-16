environment = "production"
aws_region  = "us-east-1"
dr_region   = "us-west-2"

vpc_cidr           = "10.20.0.0/16"
az_count           = 3
single_nat_gateway = false

node_instance_types = ["t3.large"]
node_min_size       = 3
node_desired_size   = 3
node_max_size       = 6

db_instance_class = "db.r6g.large"
db_storage_gb     = 100
db_max_storage_gb = 500
db_multi_az       = true

redis_node_type = "cache.t4g.medium"
redis_num_nodes = 2

backup_daily_retention_days   = 30
backup_monthly_retention_days = 365

# Set to the on-call/infra distribution list.
backup_alert_emails = []
