# ──────────────────────────────────────────────────
# Node.js Backend Dockerfile (Development)
# Build context: monorepo root (../../)
# ──────────────────────────────────────────────────

FROM node:20-slim

WORKDIR /app

# Copy root package files and workspace definitions
COPY package.json package-lock.json ./

# Copy shared workspace
COPY shared/ ./shared/

# Copy node backend workspace
COPY server/node-backend/package.json ./server/node-backend/

# Install all workspace dependencies
RUN npm install --workspace=server/node-backend --workspace=shared

# Copy node backend source code
COPY server/node-backend/ ./server/node-backend/

# Expose default port
EXPOSE 5000

# Set working directory to the backend
WORKDIR /app/server/node-backend

# Start in development mode
CMD ["npm", "run", "dev"]
