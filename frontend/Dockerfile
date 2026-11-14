
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

# Start Vite and make it accessible outside the container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

