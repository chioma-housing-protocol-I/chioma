#!/bin/bash
# Stellar Smart Contract Integration - Setup Script

set -e

echo "🚀 Chioma Stellar Smart Contract Integration Setup"
echo "=================================================="
echo ""

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    exit 1
fi

echo "📦 Step 1: Installing dependencies..."
npm install @nestjs/event-emitter@^2.1.0
echo "✅ Dependencies installed"
echo ""

echo "🗄️  Step 2: Running database migrations..."
npm run migration:run
echo "✅ Migrations completed"
echo ""

echo "🔧 Step 3: Checking environment configuration..."
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env and set the following variables:"
    echo "   - CHIOMA_CONTRACT_ID (deployed contract address)"
    echo "   - STELLAR_ADMIN_SECRET_KEY (admin wallet secret)"
    echo "   - SOROBAN_RPC_URL (RPC endpoint)"
fi
echo ""

echo "🧪 Step 4: Running unit tests..."
npm test -- chioma-contract.service.spec.ts --passWithNoTests
echo "✅ Unit tests completed"
echo ""

echo "✅ Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Deploy Chioma contract to Stellar testnet"
echo "2. Update .env with CHIOMA_CONTRACT_ID and STELLAR_ADMIN_SECRET_KEY"
echo "3. Run integration tests: npm run test:e2e -- blockchain-integration.e2e-spec.ts"
echo "4. Start the backend: npm run start:dev"
echo ""
echo "📚 Documentation:"
echo "- Integration Guide: docs/stellar-contract-integration.md"
echo "- Implementation Summary: BLOCKCHAIN_INTEGRATION.md"
echo "- Full Summary: ../IMPLEMENTATION_SUMMARY.md"
echo ""
echo "🎉 Happy coding!"
