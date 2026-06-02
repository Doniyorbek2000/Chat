# ==================== STAGE 1: Builder ====================
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ openssl

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the NestJS application
RUN npm run build

# Prune dev dependencies for production install
RUN npm ci --omit=dev && npm cache clean --force

# ==================== STAGE 2: Runner ====================
FROM node:20-alpine AS runner

# Install runtime dependencies
RUN apk add --no-cache openssl dumb-init

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs node

WORKDIR /app

# Copy production node_modules from builder
COPY --from=builder --chown=node:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=node:nodejs /app/dist ./dist

# Copy prisma schema and generated client
COPY --from=builder --chown=node:nodejs /app/prisma ./prisma
COPY --from=builder --chown=node:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=node:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Copy package.json for runtime reference
COPY --from=builder --chown=node:nodejs /app/package.json ./package.json

# Set correct ownership
RUN chown -R node:nodejs /app

# Switch to non-root user
USER node

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Use dumb-init to handle PID 1 signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main"]
