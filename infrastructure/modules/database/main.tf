resource "aws_db_subnet_group" "main" {
  name       = "${var.name_prefix}-postgres"
  subnet_ids = var.subnet_ids
}

resource "aws_security_group" "rds" {
  name        = "${var.name_prefix}-postgres"
  description = "PostgreSQL access from the application cluster"
  vpc_id      = var.vpc_id
}

resource "aws_vpc_security_group_ingress_rule" "rds_from_app" {
  for_each = toset(var.allowed_security_group_ids)

  security_group_id            = aws_security_group.rds.id
  referenced_security_group_id = each.value
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
}

resource "aws_db_instance" "main" {
  identifier            = "${var.name_prefix}-postgres"
  engine                = "postgres"
  engine_version        = var.engine_version
  instance_class        = var.instance_class
  allocated_storage     = var.storage_gb
  max_allocated_storage = var.max_storage_gb
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "chioma_db"
  username = var.username
  # RDS generates the password and keeps it in Secrets Manager, so it never
  # appears in Terraform state or variables.
  manage_master_user_password = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = var.multi_az

  # Native automated backups provide point-in-time recovery (WAL) for the
  # PITR window; long-term daily/monthly snapshots are managed by AWS Backup
  # (modules/backup).
  backup_retention_period = var.pitr_retention_days
  backup_window           = "01:00-01:45"
  maintenance_window      = "Mon:04:00-Mon:05:00"
  copy_tags_to_snapshot   = true

  deletion_protection       = var.environment == "production"
  skip_final_snapshot       = var.environment != "production"
  final_snapshot_identifier = "${var.name_prefix}-postgres-final"

  performance_insights_enabled    = true
  enabled_cloudwatch_logs_exports = ["postgresql"]
  auto_minor_version_upgrade      = true

  tags = {
    Backup = "chioma"
  }
}
