FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm pkg delete scripts.prepare && npm ci --omit=dev
EXPOSE 8080
CMD ["node", "node_modules/y-websocket/bin/server.js"]
