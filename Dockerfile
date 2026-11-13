# Shared base image for dependency installation, build, and runtime stages.
FROM node:20-alpine AS base
# Provide the compatibility library required by some Node.js packages.
RUN apk add --no-cache libc6-compat

# Install production and build dependencies from the lockfile.
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Build the Next.js app and generate its standalone server output.
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Create a smaller production image using only the standalone build output.
FROM base AS runner
WORKDIR /app

# Configure the production server to listen on port 3000 on all interfaces.
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run the app as an unprivileged user inside the container.
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copy the public assets, standalone server, and generated static files.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Document the port used by the Next.js server.
EXPOSE 3000

# Start the standalone Next.js production server when the container runs.
CMD ["node", "server.js"]
