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

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy Prisma schema
COPY libs/infrustructure/prisma ./libs/infrustructure/prisma

# Install only production dependencies
RUN npm install --omit=dev

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod"]

