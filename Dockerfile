# syntax=docker/dockerfile:1

ARG NODE_VERSION=25.2.1

####################
# Build stage
####################
FROM node:${NODE_VERSION}-alpine AS builder

WORKDIR /usr/src/app

RUN npm install -g @nestjs/cli

# Install dependencies (including dev deps for Nest build)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build NestJS app
RUN npm run build

####################
# Production stage
####################
FROM node:${NODE_VERSION}-alpine

WORKDIR /usr/src/app

# Copy only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built app from builder
COPY --from=builder /usr/src/app/dist ./dist

# Use non-root user
USER node

EXPOSE 8080

# Run NestJS app
CMD ["node", "dist/main.js"]