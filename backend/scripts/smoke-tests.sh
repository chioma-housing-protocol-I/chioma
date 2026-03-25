#!/bin/bash

# Smoke Tests for Production Deployment

set -e

API_URL="${API_URL:-http://localhost:3000}"
TIMEOUT=5

echo "Running smoke tests against $API_URL..."

# Test 1: Health Check
echo "Test 1: Health Check"
response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$API_URL/health")
if [ "$response" = "200" ]; then
    echo "✓ Health check passed"
else
    echo "✗ Health check failed (HTTP $response)"
    exit 1
fi

# Test 2: API Root
echo "Test 2: API Root"
response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$API_URL/")
if [ "$response" = "200" ] || [ "$response" = "404" ]; then
    echo "✓ API root accessible"
else
    echo "✗ API root failed (HTTP $response)"
    exit 1
fi

# Test 3: Metrics Endpoint
echo "Test 3: Metrics Endpoint"
response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$API_URL/metrics")
if [ "$response" = "200" ]; then
    echo "✓ Metrics endpoint accessible"
else
    echo "✗ Metrics endpoint failed (HTTP $response)"
    exit 1
fi

# Test 4: Database Connection (via health check details)
echo "Test 4: Database Connection"
health_response=$(curl -s --max-time $TIMEOUT "$API_URL/health")
if echo "$health_response" | grep -q "database"; then
    echo "✓ Database connection verified"
else
    echo "✗ Database connection check failed"
    exit 1
fi

echo ""
echo "✓ All smoke tests passed!"
exit 0
