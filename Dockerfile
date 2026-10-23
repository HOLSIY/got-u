# ==============================================================================
# GOT U - MULTI-STAGE PRODUCTION DOCKERFILE
# Targets: 'api' and 'worker' runtime roles from a single secure container image
# ==============================================================================

# Stage 1: Build Dependencies & Client Bundle
FROM node:22-alpine AS builder

WORKDIR /app

# Install native dependencies for build tools if required
RUN apk add --no-cache libc6-compat python3 make g++

# Copy package manifests
COPY package.json package-lock.json* ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci --prefer-offline || npm install

# Copy application source code
COPY . .

# Compile Client SPA and Bundle Server
RUN npm run build

# Stage 2: Production Runtime Environment
FROM node:22-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Install ffmpeg for media processing workers and curl for healthchecks
RUN apk add --no-cache ffmpeg curl

# Create non-root system user and group for container security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 gotu && \
    mkdir -p /app/uploads /app/data && \
    chown -R gotu:nodejs /app

# Copy production package manifests and install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production --ignore-scripts --prefer-offline || npm install --production

# Copy compiled assets from builder stage
COPY --from=builder --chown=gotu:nodejs /app/dist ./dist
COPY --from=builder --chown=gotu:nodejs /app/server ./server
COPY --from=builder --chown=gotu:nodejs /app/scripts ./scripts
COPY --from=builder --chown=gotu:nodejs /app/package.json ./package.json

# Switch to unprivileged non-root user
USER gotu

# Expose primary application port
EXPOSE 3000

# Container Healthcheck (using the Step 11 liveness probe)
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health/liveness || exit 1

# Default execution starts the Express API server
CMD ["node", "dist/server.cjs"]
