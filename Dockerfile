# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app
# force rebuild cache bust v2

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy the rest of the application files
COPY . .

# Build both the Vite frontend and the Express backend
RUN npm run build

# Stage 2: Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Copy package files for installing production dependencies
COPY package*.json ./

# Install only production dependencies to keep the image lightweight
RUN npm ci --only=production

# Copy built assets and server from the builder stage
COPY --from=builder /app/dist ./dist

# Expose the application port
EXPOSE 3000

# Start the application using the production script
CMD ["npm", "start"]
