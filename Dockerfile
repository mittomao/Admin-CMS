# ==============================================================================
# Treecraft CMS - Multi-stage Production Dockerfile
# Base: Node.js 20 LTS Alpine (Minimal, Secure, Non-root)
# ==============================================================================

# Stage 1: Build Assets & Prepare Production Dependencies
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies if needed
RUN apk add --no-cache python3 make g++

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for Tailwind CSS build)
RUN npm ci

# Copy sources required for asset compilation
COPY tailwind.site.config.js tailwind.admin.config.js ./
COPY src/ ./src/
COPY public/ ./public/
COPY views/ ./views/

# Build minified production Tailwind CSS for both site and admin
RUN npm run build:css

# Prune devDependencies to keep image size minimal
RUN npm prune --omit=dev

# ------------------------------------------------------------------------------
# Stage 2: Production Runtime
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment flags
ENV NODE_ENV=production \
    PORT=4000

# Copy runtime node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy compiled public assets from builder
COPY --from=builder /app/public ./public

# Copy application code
COPY package.json ./
COPY src/ ./src/
COPY views/ ./views/
COPY starter/ ./starter/
COPY bin/ ./bin/

# Ensure directory permissions for node user (UID 1000)
RUN mkdir -p /app/site/backups /app/data && \
    chown -R node:node /app

# Drop root privileges - run as non-root node user
USER node

# Expose HTTP port
EXPOSE 4000

# Container Liveness Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.PORT || 4000) + '/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Start Monolithic Treecraft CMS Server
CMD ["node", "src/server.js"]
