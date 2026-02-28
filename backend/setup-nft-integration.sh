#!/bin/bash

# Rent Obligation NFT Integration Setup Script
# This script sets up the NFT integration for Chioma backend

set -e

echo "🎨 Setting up Rent Obligation NFT Integration..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file${NC}"
fi

# Check if RENT_OBLIGATION_CONTRACT_ID is set
if ! grep -q "RENT_OBLIGATION_CONTRACT_ID=" .env; then
    echo -e "${YELLOW}⚠️  Adding RENT_OBLIGATION_CONTRACT_ID to .env...${NC}"
    echo "" >> .env
    echo "# Rent Obligation NFT Contract" >> .env
    echo "RENT_OBLIGATION_CONTRACT_ID=" >> .env
    echo -e "${GREEN}✓ Added RENT_OBLIGATION_CONTRACT_ID to .env${NC}"
fi

# Install dependencies if needed
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Run database migration
echo "🗄️  Running database migrations..."
npm run migration:run || echo -e "${YELLOW}⚠️  Migration may have already been run${NC}"

echo ""
echo -e "${GREEN}✅ Rent Obligation NFT Integration setup complete!${NC}"
echo ""
echo "📝 Next steps:"
echo "1. Deploy the rent_obligation contract to Stellar testnet/mainnet"
echo "2. Update RENT_OBLIGATION_CONTRACT_ID in .env with the deployed contract ID"
echo "3. Ensure STELLAR_ADMIN_SECRET_KEY is set for transaction signing"
echo "4. Start the backend: npm run start:dev"
echo ""
echo "📚 Documentation: backend/docs/rent-obligation-nft-integration.md"
echo ""
echo "🧪 Run tests:"
echo "   Unit tests: npm test -- agreement-nft.service.spec.ts"
echo "   E2E tests: npm run test:e2e -- rent-obligation-nft.e2e-spec.ts"
echo ""
