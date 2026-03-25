# 🔐 Get Neon Database Credentials

The database connection is failing due to authentication issues. Here's how to get the correct credentials:

## Step 1: Access Neon Dashboard

1. Go to https://console.neon.tech/
2. Log in to your account
3. Select your project

## Step 2: Get Connection String

1. Click on your database name
2. Look for "Connection Details" or "Connection String"
3. Select "Pooled connection" (recommended for serverless)
4. Copy the full connection string

The connection string should look like:
```
postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

## Step 3: Update Environment Variables

### Option A: Use Full Connection String (Recommended)

Update `backend/.env.production`:

```env
DATABASE_URL=your_full_connection_string_here
DB_SSL=true
NODE_ENV=production
```

### Option B: Use Individual Parameters

If the password has special characters, you might need to URL-encode it:

```env
DB_HOST=your-host.neon.tech
DB_PORT=5432
DB_USERNAME=your_username
DB_PASSWORD=your_password_here
DB_NAME=your_database_name
DB_SSL=true
NODE_ENV=production
```

## Step 4: Test Connection

```bash
cd backend
export DATABASE_URL="your_connection_string_here"
node test-db-connection.js
```

If successful, you'll see:
```
✅ Connected successfully!
✅ Query executed: { now: '2024-03-22T...' }
✅ Connection closed
```

## Step 5: Run Migrations and Seeding

Once connection is successful:

```bash
# Run migrations
export DATABASE_URL="your_connection_string_here"
export NODE_ENV=production
pnpm migration:run

# Seed demo users
./scripts/seed-production.sh
```

## Common Issues

### Special Characters in Password

If your password contains special characters like `@`, `#`, `$`, etc., you need to URL-encode them:

| Character | Encoded |
|-----------|---------|
| @         | %40     |
| #         | %23     |
| $         | %24     |
| %         | %25     |
| &         | %26     |
| +         | %2B     |
| =         | %3D     |
| /         | %2F     |
| ?         | %3F     |

Example:
- Password: `my$ecret@123`
- Encoded: `my%24ecret%40123`

### IP Allowlist

Neon might have IP restrictions:

1. Go to Neon Dashboard
2. Navigate to Settings → Security
3. Check "IP Allow" settings
4. Add your IP address or use `0.0.0.0/0` for testing (not recommended for production)

### Pooler vs Direct Connection

Neon offers two connection types:

1. **Pooled** (recommended): Uses connection pooling, better for serverless
   - Format: `@[project]-pooler.region.aws.neon.tech`
   
2. **Direct**: Direct connection to database
   - Format: `@[project].region.aws.neon.tech`

Try both if one doesn't work.

## Alternative: Use Neon CLI

Install Neon CLI:
```bash
npm install -g neonctl
```

Get connection string:
```bash
neonctl connection-string --project-id your-project-id
```

## Need Help?

1. Check Neon documentation: https://neon.tech/docs
2. Verify your Neon project is active
3. Check billing status (free tier has limits)
4. Contact Neon support if issues persist

---

Once you have the correct credentials, update the files and run:
```bash
./setup-production.sh
```
