# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm at the exact version pinned by package.json's "packageManager"
# field. Installing via `npm install -g pnpm` (whatever "latest" resolves to)
# leaves pnpm's own version-manager to notice the mismatch and fetch that
# pinned version's native binary — which @pnpm/exe doesn't publish for
# linux-x64-musl (this base image), so the build fails outright. Installing
# the pinned version directly here means npm (pure JS, works on any libc)
# does the install and there's no version to switch to.
RUN npm install -g pnpm@10.28.2

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# ============================================================================
# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install pnpm at the exact version pinned by package.json's "packageManager"
# field — see the matching comment in the builder stage above.
RUN npm install -g pnpm@10.28.2

# Copy package files from builder
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Optional migrations on start (RUN_MIGRATIONS_ON_START=true)
COPY scripts/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -e "require('http').get('http://localhost:3000/health', (res) => {if (res.statusCode !== 200) throw new Error(res.statusCode)})"

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "dist/src/main.js"]
