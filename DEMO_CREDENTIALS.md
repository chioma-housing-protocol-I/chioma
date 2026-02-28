# Chioma Demo Credentials

This document contains demo user credentials for development and testing purposes.

## Backend Seed Commands

### Create All Demo Users
```bash
cd backend
pnpm seed:all
```

### Create Individual Users
```bash
# Admin user
pnpm seed:admin

# Agent user  
pnpm seed:agent

# Tenant user
pnpm seed:tenant
```

## Demo User Accounts

### Admin User
- **Email:** `admin@chioma.local`
- **Password:** `QwW??H<EauRx6EyB>wm_`
- **Role:** Admin
- **Access:** Full system administration

### Agent User
- **Email:** `agent@chioma.local`
- **Password:** `nWkW~HWN6S*-6o!??kHg`
- **Role:** Agent
- **Access:** Property management, client relations

### Tenant User
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

3. **Development Mode Only:** Click on any demo credential button to auto-fill the login form

## Environment Configuration

These demo credentials are only visible in development mode (`NODE_ENV=development`). In production, the demo credentials section will be hidden.

## Custom Credentials

You can also create custom users with specific credentials:

```bash
# Custom admin
pnpm seed:admin -- --email custom@admin.com --password MySecurePassword123!

# Custom agent
pnpm seed:agent -- --email john@agent.com --password AgentPass123! --first-name John --last-name Doe

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

⚠️ **For Development Only**
- These credentials are intended for development and testing
- Never use these passwords in production
- Always change default passwords before deploying to production
- The demo credentials section is hidden in production builds

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

### Tenant
- Property search and browsing
- Rental applications
- Payment processing
- Maintenance requests
