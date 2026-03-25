#!/bin/bash

# Chioma Production Setup - One Command Setup
# This script sets up the entire production database

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║                                                        ║"
echo "║        Chioma Production Database Setup                ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check if we're in the right directory
if [ ! -d "backend" ]; then
  echo "❌ Error: Please run this script from the project root directory"
  exit 1
fi

cd backend

echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile
echo "✅ Dependencies installed"
echo ""

echo "🔄 Running database migrations..."
export DATABASE_URL="postgresql://neondb_owner:npg_4wpNJ8cnBQtg@ep-square-butterfly-aiinrpcp-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
export DB_SSL=true
export NODE_ENV=production

pnpm migration:run
echo "✅ Migrations completed"
echo ""

echo "🌱 Seeding demo users..."
./scripts/seed-production.sh
echo ""

echo "╔════════════════════════════════════════════════════════╗"
echo "║                                                        ║"
echo "║              ✅ Setup Complete!                        ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Demo Credentials:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "👨‍💼 Admin:    admin@chioma.demo    / Admin@Demo2024!"
echo "🏢 Agent:    agent@chioma.demo    / Agent@Demo2024!"
echo "🏠 Landlord: landlord@chioma.demo / Landlord@Demo2024!"
echo "👤 Tenant:   tenant@chioma.demo   / Tenant@Demo2024!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📖 Next Steps:"
echo "  1. Start the backend: cd backend && pnpm start:prod"
echo "  2. Start the frontend: cd frontend && npm run dev"
echo "  3. Visit the login page and test each role"
echo ""
echo "📚 Documentation:"
echo "  • DEMO_LOGIN.md - Quick login reference"
echo "  • backend/PRODUCTION_SETUP.md - Detailed setup guide"
echo "  • SETUP_COMPLETE.md - What was changed"
echo ""
