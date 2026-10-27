# Automated backups (AWS Backup)
#
#   daily   02:00 UTC → kept 30 days, copied to the DR region
#   monthly 03:00 UTC on the 1st → kept 1 year, copied to the DR region
#   weekly  Sunday 05:00 UTC → restore test of the latest RDS recovery point
#
# Failed backup, copy and restore jobs notify the SNS topic below.

# ── Encryption keys and vaults ───────────────────────────────────────────────

resource "aws_kms_key" "backup" {
  description             = "${var.name_prefix} AWS Backup vault key"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

resource "aws_kms_alias" "backup" {
  name          = "alias/${var.name_prefix}-backup"
  target_key_id = aws_kms_key.backup.key_id
}

resource "aws_backup_vault" "main" {
  name        = "${var.name_prefix}-backup"
  kms_key_arn = aws_kms_key.backup.arn
}

resource "aws_kms_key" "backup_dr" {
  provider = aws.dr

  description             = "${var.name_prefix} AWS Backup DR vault key"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

resource "aws_kms_alias" "backup_dr" {
  provider = aws.dr

  name          = "alias/${var.name_prefix}-backup-dr"
  target_key_id = aws_kms_key.backup_dr.key_id
}

resource "aws_backup_vault" "dr" {
  provider = aws.dr

  name        = "${var.name_prefix}-backup-dr"
  kms_key_arn = aws_kms_key.backup_dr.arn
}

# ── Service role ─────────────────────────────────────────────────────────────

data "aws_iam_policy_document" "backup_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["backup.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "backup" {
  name               = "${var.name_prefix}-backup"
  assume_role_policy = data.aws_iam_policy_document.backup_assume.json
}

resource "aws_iam_role_policy_attachment" "backup" {
  for_each = toset([
    "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup",
    "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores",
    "arn:aws:iam::aws:policy/AWSBackupServiceRolePolicyForS3Backup",
    "arn:aws:iam::aws:policy/AWSBackupServiceRolePolicyForS3Restore",
  ])

  role       = aws_iam_role.backup.name
  policy_arn = each.value
}

# ── Backup plan ──────────────────────────────────────────────────────────────

resource "aws_backup_plan" "main" {
  name = "${var.name_prefix}-backup"

  rule {
    rule_name         = "daily"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 2 * * ? *)"
    start_window      = 60
    completion_window = 360

    lifecycle {
      delete_after = var.daily_retention_days
    }

    copy_action {
      destination_vault_arn = aws_backup_vault.dr.arn

      lifecycle {
        delete_after = var.daily_retention_days
      }
    }
  }

  rule {
    rule_name         = "monthly"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 3 1 * ? *)"
    start_window      = 60
    completion_window = 720

    lifecycle {
      delete_after = var.monthly_retention_days
    }

    copy_action {
      destination_vault_arn = aws_backup_vault.dr.arn

      lifecycle {
        delete_after = var.monthly_retention_days
      }
    }
  }
}

resource "aws_backup_selection" "main" {
  name         = "${var.name_prefix}-resources"
  plan_id      = aws_backup_plan.main.id
  iam_role_arn = aws_iam_role.backup.arn
  resources    = var.protected_resource_arns
}

# ── Weekly restore test ──────────────────────────────────────────────────────
# AWS Backup restores the latest RDS recovery point into a throwaway instance,
# waits for it to become available, then deletes it. Results appear under
# AWS Backup → Restore testing; failures are sent to the SNS topic.

resource "aws_backup_restore_testing_plan" "weekly" {
  name                         = replace("${var.name_prefix}_weekly_restore_test", "-", "_")
  schedule_expression          = "cron(0 5 ? * SUN *)"
  schedule_expression_timezone = "Etc/UTC"
  start_window_hours           = 2

  recovery_point_selection {
    algorithm             = "LATEST_WITHIN_WINDOW"
    include_vaults        = [aws_backup_vault.main.arn]
    recovery_point_types  = ["SNAPSHOT"]
    selection_window_days = 7
  }
}

resource "aws_backup_restore_testing_selection" "rds" {
  name                      = replace("${var.name_prefix}_rds", "-", "_")
  restore_testing_plan_name = aws_backup_restore_testing_plan.weekly.name
  protected_resource_type   = "RDS"
  iam_role_arn              = aws_iam_role.backup.arn
  protected_resource_arns   = [var.db_instance_arn]
  validation_window_hours   = 2

  restore_metadata_overrides = {
    dbSubnetGroupName   = var.db_subnet_group_name
    vpcSecurityGroupIds = jsonencode([var.db_security_group_id])
  }
}

# ── Failure notifications ────────────────────────────────────────────────────

resource "aws_sns_topic" "backup_events" {
  name = "${var.name_prefix}-backup-events"
}

data "aws_iam_policy_document" "backup_events" {
  statement {
    actions   = ["SNS:Publish"]
    resources = [aws_sns_topic.backup_events.arn]

    principals {
      type        = "Service"
      identifiers = ["backup.amazonaws.com"]
    }
  }
}

resource "aws_sns_topic_policy" "backup_events" {
  arn    = aws_sns_topic.backup_events.arn
  policy = data.aws_iam_policy_document.backup_events.json
}

resource "aws_sns_topic_subscription" "backup_events_email" {
  for_each = toset(var.alert_emails)

  topic_arn = aws_sns_topic.backup_events.arn
  protocol  = "email"
  endpoint  = each.value
}

resource "aws_backup_vault_notifications" "main" {
  backup_vault_name = aws_backup_vault.main.name
  sns_topic_arn     = aws_sns_topic.backup_events.arn
  backup_vault_events = [
    "BACKUP_JOB_FAILED",
    "COPY_JOB_FAILED",
    "RESTORE_JOB_FAILED",
  ]
}
