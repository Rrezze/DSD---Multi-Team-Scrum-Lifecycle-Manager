
# Use Node.js 22
FROM node:22-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source code
COPY . .

# Vite development server port
EXPOSE 5173

# Install new packages (node_modules is a volume, so packages added after the
# first build are not in it), then start Vite accessible outside the container
CMD ["sh", "-c", "npm install && npm run dev -- --host 0.0.0.0"]

