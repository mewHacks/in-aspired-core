# ──────────────────────────────────────────────────
# React Client Dockerfile (Development)
# Build context: monorepo root (../)
# ──────────────────────────────────────────────────

FROM node:20-alpine

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Copy client workspace
COPY client/package.json ./client/

# Copy shared workspace (may be used by client)
COPY shared/ ./shared/

# Install client dependencies
RUN npm install --workspace=client --workspace=shared

# Copy client source code
COPY client/ ./client/

# Expose Vite dev server port
EXPOSE 5173

# Set working directory to the client
WORKDIR /app/client

# Start Vite dev server with --host to allow external access
CMD ["npx", "vite", "--host"]
