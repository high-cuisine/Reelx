# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema
COPY libs/infrustructure/prisma ./libs/infrustructure/prisma

# Generate Prisma Client
RUN npx prisma generate --schema=./libs/infrustructure/prisma/schema.prisma

# Copy all source files (excluding what's in .dockerignore)
COPY . .

# Build the application
RUN npm run build || (echo "Build failed!" && exit 1)

# Verify build output
RUN ls -la dist/ || (echo "Build failed - dist directory not found" && exit 1)
RUN test -f dist/main.js || (echo "Build failed - dist/main.js not found" && exit 1)

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy Prisma schema
COPY libs/infrustructure/prisma ./libs/infrustructure/prisma

# Install only production dependencies
RUN npm install --omit=dev

# Generate Prisma Client in production stage
RUN npx prisma generate --schema=./libs/infrustructure/prisma/schema.prisma

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Verify files are copied
RUN ls -la dist/ || (echo "Copy failed - dist directory not found" && exit 1)
RUN test -f dist/main.js || (echo "Copy failed - dist/main.js not found" && exit 1)

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod"]

