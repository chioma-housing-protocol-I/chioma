output "instance_arn" {
  value = aws_db_instance.main.arn
}

output "instance_id" {
  value = aws_db_instance.main.identifier
}

output "endpoint" {
  value = aws_db_instance.main.endpoint
}

output "master_user_secret_arn" {
  value = aws_db_instance.main.master_user_secret[0].secret_arn
}

output "subnet_group_name" {
  value = aws_db_subnet_group.main.name
}

output "security_group_id" {
  value = aws_security_group.rds.id
}
