FROM node:20-slim

# Install Python
RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production

COPY . .
RUN pip3 install --break-system-packages anthropic websockets python-dotenv fastapi uvicorn pydantic aiohttp

EXPOSE 3002
CMD ["node", "start-server.js"]
