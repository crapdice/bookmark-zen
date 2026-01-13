# Use the official Playwright image which comes with all necessary system dependencies pre-installed
# We use 'focal' or 'jammy' tag to match a standard Ubuntu LTS
FROM mcr.microsoft.com/playwright:v1.49.1-jammy

# Set working directory
WORKDIR /app

# Copy root package files
COPY package.json ./

# Create client and server directories
RUN mkdir client server

# Copy client and server package files
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install dependencies
# We use --production=false to ensure devDependencies (like vite) are installed for building
RUN npm install
RUN npm install --prefix client
RUN npm install --prefix server

# Copy the rest of the application code
COPY . .

# Build the frontend
RUN npm run build --prefix client

# Expose the API port
ENV PORT=8080
EXPOSE 8080

# Start the server
CMD ["node", "server/index.js"]
