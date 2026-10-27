output "assets_bucket_name" {
  value = aws_s3_bucket.assets.bucket
}

output "assets_bucket_arn" {
  value = aws_s3_bucket.assets.arn
}

output "assets_replica_bucket_arn" {
  value = aws_s3_bucket.assets_replica.arn
}
