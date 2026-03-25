# Production Database Setup Guide

This guide walks you through setting up the production database with migrations and demo data.

## Prerequisites

- Node.js 18+ and pnpm installed
- Access to Neon PostgreSQL database
- Database URL with SSL enabled

## Quick Setup

Run the automated setup script:

```bash
cd backend
chmod +x scripts/setup-production-db.sh
./scripts/setup-production-db.sh
```

This will:
1. Install dependencies
2. Run all database migrations
3. Seed demo users for all roles

## Manual Setup

### Step 1: Configure Environment

The production database URL is already configured in `.env.production`:

```env
DATABASE_URL=postgresql://neondb_owner:npg_4wpNJ8cnBQtg@ep-square-butterfly-aiinrpcp-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
DB_SSL=true
```

### Step 2: Run Migrations

```bash
cd backend
pnpm install
pnpm migration:run
```

### Step 3: Seed Demo Users

Run the production seeding script:

```bash
chmod +x scripts/seed-production.sh
./scripts/seed-production.sh
```

Or seed individual users:

```bash
# Admin
NODE_ENV=production ts-node src/commands/index.ts admin \
  --email "admin@chioma.demo" \
  --password "Admin@Demo2024!" \
  --force

# Agent
NODE_ENV=production ts-node src/commands/index.ts agent \
  --email "agent@chioma.demo" \
  --password "Agent@Demo2024!" \
  --force

# Landlord
NODE_ENV=production ts-node src/commands/index.ts landlord \
  --email "landlord@chioma.demo" \
  --password "Landlord@Demo2024!" \
  --force

# Tenant
NODE_ENV=production ts-node src/commands/index.ts tenant \
  --email "tenant@chioma.demo" \
  --password "Tenant@Demo2024!" \
  --force
```

## Production Demo Credentials

After seeding, you can log in with these credentials:

| Role     | Email                    | Password           |
| -------- | ------------------------ | ------------------ |
| Admin    | admin@chioma.demo        | Admin@Demo2024!    |
| Agent    | agent@chioma.demo        | Agent@Demo2024!    |
| Landlord | landlord@chioma.demo     | Landlord@Demo2024! |
| Tenant   | tenant@chioma.demo       | Tenant@Demo2024!   |

## Troubleshooting

### SSL Connection Error

If you see `connection is insecure (try using sslmode=require)`:

1. Ensure `DATABASE_URL` includes `?sslmode=require`
2. Set `DB_SSL=true` in environment
3. Check that `data-source.ts` has SSL configuration:

```typescript
ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
```

### Migration Errors

If migrations fail:

```bash
# Check database connection
pnpm typeorm query "SELECT 1"

# View migration status
pnpm typeorm migration:show

# Revert last migration if needed
pnpm migration:revert
```

### Seed Errors

If seeding fails:

1. Ensure migrations have run successfully
2. Check database connection
3. Verify user doesn't already exist (use `--force` to update)

## Render Deployment

When deploying to Render:

1. Set environment variables in Render dashboard:
   - `DATABASE_URL` (from Neon)
   - `DB_SSL=true`
   - All other required env vars from `.env.production`

2. Add build command:
   ```bash
   pnpm install && pnpm build
   ```

3. Add start command:
   ```bash
   pnpm start:prod
   ```

4. Run migrations on first deploy:
   ```bash
   pnpm migration:run
   ```

5. Seed demo data:
   ```bash
   ./scripts/seed-production.sh
   ```

## Security Notes

⚠️ **Important:**
- Demo credentials are for demonstration purposes only
- Change or disable demo accounts before accepting real users
- Use strong, unique passwords for production admin accounts
- Enable MFA for admin accounts in production
- Regularly rotate credentials

## Available Scripts

```bash
# Run migrations
pnpm migration:run

# Revert last migration
pnpm migration:revert

# Seed all demo users
pnpm seed:all:prod

# Seed individual users
pnpm seed:admin:prod
pnpm seed:agent:prod
pnpm seed:landlord:prod
pnpm seed:tenant:prod

# Check database consistency
pnpm db:consistency

# Backup database
pnpm db:backup

# Restore database
pnpm db:restore
```

## Next Steps

After setup:

1. Test login with each demo account
2. Verify role-based access control
3. Configure additional environment variables
4. Set up monitoring and logging
5. Configure email service
6. Set up payment gateway
7. Configure Stellar/Soroban contracts

## Support

For issues or questions:
- Check logs: `pnpm start:prod`
- Review migrations: `pnpm typeorm migration:show`
- Database console: Connect via Neon dashboard
