# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy all source files
COPY . .

# Build the application
RUN npm run build

# Verify build output
RUN ls -la dist/ || (echo "Build failed - dist directory not found" && exit 1)
RUN if [ ! -f dist/main.js ]; then echo "Build failed - dist/main.js not found" && ls -la dist/ && exit 1; fi

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev --legacy-peer-deps

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "dist/main"]

