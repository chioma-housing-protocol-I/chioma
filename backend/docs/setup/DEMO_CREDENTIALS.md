# Chioma Demo Credentials

This document contains demo user credentials for development and testing purposes.

## Production Database Setup

### Prerequisites
Ensure your production database URL is set in `.env.production`:
```env
DATABASE_URL=postgresql://neondb_owner:npg_st-1.aws.neon.tech/neondb?sslmode=require
```

### Run Migrations and Seed Production Database
```bash
cd backend
chmod +x scripts/seed-production.sh
./scripts/seed-production.sh
```

This will:
1. Run all database migrations
2. Create demo users for all roles with fixed credentials

## Backend Seed Commands

### Create All Demo Users (Development)
```bash
cd backend
pnpm seed:all
```

### Create All Demo Users (Production)
```bash
cd backend
pnpm seed:all:prod
```

### Create Individual Users
```bash
# Admin user
pnpm seed:admin

# Agent user  
pnpm seed:agent

# Landlord user
pnpm seed:landlord

# Tenant user
pnpm seed:tenant
```

## Demo User Accounts

### Production Demo Credentials
These credentials are used in production for demo purposes:

#### Admin User
- **Email:** `admin@chioma.demo`
- **Password:** `Admin@Demo2024!`
- **Role:** Admin
- **Access:** Full system administration

#### Agent User
- **Email:** `agent@chioma.demo`
- **Password:** `Agent@Demo2024!`
- **Role:** Agent
- **Access:** Property management, client relations

#### Landlord User
- **Email:** `landlord@chioma.demo`
- **Password:** `Landlord@Demo2024!`
- **Role:** Landlord
- **Access:** Property listings, tenant management

#### Tenant User
- **Email:** `tenant@chioma.demo`
- **Password:** `Tenant@Demo2024!`
- **Role:** Tenant
- **Access:** Property browsing, rent payments

### Development Demo Credentials
For local development (auto-generated passwords):

#### Admin User
- **Email:** `admin@chioma.local`
- **Password:** `QwW??H<EauRx6EyB>wm_`
- **Role:** Admin
- **Access:** Full system administration

#### Agent User
- **Email:** `agent@chioma.local`
- **Password:** `nWkW~HWN6S*-6o!??kHg`
- **Role:** Agent
- **Access:** Property management, client relations

#### Landlord User
- **Email:** `landlord@chioma.local`
- **Password:** (auto-generated on seed)
- **Role:** Landlord
- **Access:** Property listings, tenant management

#### Tenant User
- **Email:** `tenant@chioma.local`
- **Password:** `8T<}2QXRm(?rwyJ4Pq3/`
- **Role:** Tenant
- **Access:** Property browsing, rent payments

## Frontend Access

1. Start the frontend development server:
   ```bash
   cd frontend
   npm run dev
   ```

2. Navigate to: `http://localhost:3000/login`

3. **Demo Mode:** Click on any demo credential button to auto-fill the login form (email only, password hidden for security)

## Environment Configuration

Demo credentials are available in both development and production environments. The login page will show clickable demo user buttons that auto-fill the email field.

## Custom Credentials

You can also create custom users with specific credentials:

```bash
# Custom admin
pnpm seed:admin -- --email custom@admin.com --password MySecurePassword123!

# Custom agent
pnpm seed:agent -- --email john@agent.com --password AgentPass123! --first-name John --last-name Doe

# Custom landlord
pnpm seed:landlord -- --email property@owner.com --password LandlordPass123! --first-name Property --last-name Owner

# Custom tenant
pnpm seed:tenant -- --email jane@tenant.com --password TenantPass123! --first-name Jane --last-name Smith
```

## Database Setup

Ensure your PostgreSQL database is running and configured in `.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=chioma_db
```

Run migrations before seeding:
```bash
pnpm migration:run
```

## Security Notes

⚠️ **Important Security Information**
- Production demo credentials are for demonstration purposes only
- Change or disable demo accounts before going live with real users
- Demo credentials should only be used in controlled demo environments
- Never use these passwords for real user accounts

## User Roles and Permissions

### Admin
- Full system access
- User management
- Platform configuration
- Analytics and reporting

### Agent
- Property listings management
- Client communication
- Agreement management
- Commission tracking

### Landlord
- Property listings creation
- Tenant management
- Rent collection
- Property maintenance

### Tenant
- Property search and browsing
- Rental applications
- Payment processing
- Maintenance requests
