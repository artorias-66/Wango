FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer cache optimization)
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

EXPOSE 3001

CMD ["npx", "tsx", "src/index.ts"]
