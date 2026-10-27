output "vault_name" {
  value = aws_backup_vault.main.name
}

output "vault_arn" {
  value = aws_backup_vault.main.arn
}

output "dr_vault_arn" {
  value = aws_backup_vault.dr.arn
}

output "plan_id" {
  value = aws_backup_plan.main.id
}

output "events_topic_arn" {
  value = aws_sns_topic.backup_events.arn
}
