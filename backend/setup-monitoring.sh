#!/bin/bash

# Monitoring Stack Setup Script

set -e

echo "🔧 Setting up Production Monitoring & Observability Stack..."

# Create logs directory
mkdir -p logs

# Install dependencies
echo "📦 Installing monitoring dependencies..."
pnpm add prom-client winston winston-daily-rotate-file

# Start monitoring stack
echo "🚀 Starting monitoring stack..."
docker-compose -f docker-compose.monitoring.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "🏥 Checking service health..."
curl -f http://localhost:9090/-/healthy && echo "✅ Prometheus is healthy"
curl -f http://localhost:3001/api/health && echo "✅ Grafana is healthy"
curl -f http://localhost:3100/ready && echo "✅ Loki is healthy"

echo ""
echo "✅ Monitoring stack setup complete!"
echo ""
echo "📊 Access URLs:"
echo "  - Grafana: http://localhost:3001 (admin/admin)"
echo "  - Prometheus: http://localhost:9090"
echo "  - Jaeger: http://localhost:16686"
echo "  - AlertManager: http://localhost:9093"
echo ""
echo "📝 Metrics endpoint: http://localhost:3000/metrics"
echo ""
echo "📚 Documentation: backend/MONITORING.md"
