# 🚀 Quick Start - Production Setup

## One-Command Setup

Run this from the project root:

```bash
chmod +x setup-production.sh
./setup-production.sh
```

This will:
- ✅ Install dependencies
- ✅ Run database migrations
- ✅ Seed demo users for all roles
- ✅ Display login credentials

## Demo Login Credentials

```
Admin:    admin@chioma.demo    / Admin@Demo2024!
Agent:    agent@chioma.demo    / Agent@Demo2024!
Landlord: landlord@chioma.demo / Landlord@Demo2024!
Tenant:   tenant@chioma.demo   / Tenant@Demo2024!
```

## Start the Application

### Backend
```bash
cd backend
pnpm start:prod
```

### Frontend
```bash
cd frontend
npm run dev
```

## Test Login

1. Open browser to login page
2. Click any demo account button (auto-fills email)
3. Enter password manually
4. Sign in and test the role

## Documentation

- **[DEMO_LOGIN.md](DEMO_LOGIN.md)** - Quick login reference
- **[backend/PRODUCTION_SETUP.md](backend/PRODUCTION_SETUP.md)** - Detailed setup guide
- **[SETUP_COMPLETE.md](SETUP_COMPLETE.md)** - What was changed
- **[DEMO_CREDENTIALS.md](DEMO_CREDENTIALS.md)** - Complete credentials info

## Manual Setup

If you prefer manual setup:

```bash
cd backend

# Run migrations
pnpm migration:run

# Seed demo users
./scripts/seed-production.sh
```

## Troubleshooting

### SSL Connection Error
- Ensure `DATABASE_URL` includes `?sslmode=require`
- Set `DB_SSL=true` in environment

### Migration Errors
```bash
cd backend
pnpm typeorm migration:show
```

### Seed Errors
Use `--force` flag to update existing users:
```bash
pnpm seed:admin:prod
```

## Need Help?

Check the detailed guides:
1. [PRODUCTION_SETUP.md](backend/PRODUCTION_SETUP.md) for step-by-step instructions
2. [SETUP_COMPLETE.md](SETUP_COMPLETE.md) for what was fixed
3. Application logs for runtime errors

---

**Ready to go!** 🎉
