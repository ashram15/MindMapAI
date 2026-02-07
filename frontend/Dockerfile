# /frontend/Dockerfile
FROM node:20.9.0-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

EXPOSE 3000

# Start Next.js
CMD ["npm", "start"]