#!/bin/bash

# Blue-Green Deployment Script for Zero-Downtime Deployments

set -e

# Configuration
BLUE_PORT=3000
GREEN_PORT=3001
HEALTH_CHECK_URL="http://localhost"
MAX_RETRIES=30
RETRY_INTERVAL=2

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Get current active environment
get_active_env() {
    if docker ps | grep -q "chioma-backend-blue.*Up"; then
        echo "blue"
    elif docker ps | grep -q "chioma-backend-green.*Up"; then
        echo "green"
    else
        echo "none"
    fi
}

# Health check function
health_check() {
    local port=$1
    local retries=0
    
    echo "Performing health check on port $port..."
    
    while [ $retries -lt $MAX_RETRIES ]; do
        if curl -f -s "${HEALTH_CHECK_URL}:${port}/health" > /dev/null; then
            echo -e "${GREEN}✓ Health check passed${NC}"
            return 0
        fi
        
        retries=$((retries + 1))
        echo "Health check attempt $retries/$MAX_RETRIES..."
        sleep $RETRY_INTERVAL
    done
    
    echo -e "${RED}✗ Health check failed after $MAX_RETRIES attempts${NC}"
    return 1
}

# Deploy to inactive environment
deploy() {
    local active_env=$(get_active_env)
    local target_env
    local target_port
    
    if [ "$active_env" = "blue" ]; then
        target_env="green"
        target_port=$GREEN_PORT
    else
        target_env="blue"
        target_port=$BLUE_PORT
    fi
    
    echo -e "${BLUE}Starting deployment to $target_env environment...${NC}"
    
    # Pull latest image
    echo "Pulling latest Docker image..."
    docker-compose -f docker-compose.production.yml pull backend
    
    # Start new environment
    echo "Starting $target_env environment on port $target_port..."
    ENVIRONMENT=$target_env PORT=$target_port docker-compose -f docker-compose.production.yml up -d backend
    
    # Wait for container to be ready
    sleep 5
    
    # Health check
    if ! health_check $target_port; then
        echo -e "${RED}Deployment failed! Rolling back...${NC}"
        docker-compose -f docker-compose.production.yml stop backend
        exit 1
    fi
    
    # Switch traffic (update nginx/load balancer configuration)
    echo "Switching traffic to $target_env environment..."
    # Add your load balancer switch logic here
    
    # Stop old environment
    if [ "$active_env" != "none" ]; then
        echo "Stopping $active_env environment..."
        sleep 5  # Grace period for existing connections
        ENVIRONMENT=$active_env docker-compose -f docker-compose.production.yml stop backend
    fi
    
    echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
    echo "Active environment: $target_env"
}

# Rollback function
rollback() {
    local active_env=$(get_active_env)
    local previous_env
    
    if [ "$active_env" = "blue" ]; then
        previous_env="green"
    else
        previous_env="blue"
    fi
    
    echo -e "${RED}Rolling back to $previous_env environment...${NC}"
    
    # Start previous environment
    ENVIRONMENT=$previous_env docker-compose -f docker-compose.production.yml up -d backend
    
    # Health check
    if ! health_check $([ "$previous_env" = "blue" ] && echo $BLUE_PORT || echo $GREEN_PORT); then
        echo -e "${RED}Rollback failed!${NC}"
        exit 1
    fi
    
    # Switch traffic back
    echo "Switching traffic back to $previous_env..."
    
    # Stop current environment
    ENVIRONMENT=$active_env docker-compose -f docker-compose.production.yml stop backend
    
    echo -e "${GREEN}✓ Rollback completed${NC}"
}

# Status function
status() {
    local active_env=$(get_active_env)
    echo "Current active environment: $active_env"
    
    echo -e "\nRunning containers:"
    docker ps --filter "name=chioma-backend" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# Main
case "${1:-deploy}" in
    deploy)
        deploy
        ;;
    rollback)
        rollback
        ;;
    status)
        status
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|status}"
        exit 1
        ;;
esac
