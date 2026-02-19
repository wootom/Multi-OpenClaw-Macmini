FROM node:22-alpine

# Install git and build tools for npm dependencies (node-llama-cpp)
RUN apk add --no-cache git python3 make g++ linux-headers cmake

# Install OpenClaw globally
RUN npm install -g openclaw

# Set working directory
WORKDIR /app

# Set default workspace path
ENV OPENCLAW_WORKSPACE=/workspace

# Create workspace directory
RUN mkdir -p /workspace && chown -R node:node /workspace /app

# Switch to non-root user
USER node

# Expose the default port
EXPOSE 3100

# Start command
CMD ["openclaw", "gateway", "--port", "3100", "--bind", "lan", "--allow-unconfigured"]
