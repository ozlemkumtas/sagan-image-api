FROM mcr.microsoft.com/playwright:v1.50.0-jammy

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start the app
CMD ["node", "server.js"]
