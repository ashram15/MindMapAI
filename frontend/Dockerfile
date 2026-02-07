# /frontend/Dockerfile
FROM node:20.9.0-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Accept build-time environment variable
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build with environment variable baked in
RUN npm run build

EXPOSE 3000

# Start Next.js
CMD ["npm", "start"]