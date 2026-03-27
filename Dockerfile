FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY server.mjs ./
RUN npm pkg delete scripts.prepare && npm ci --omit=dev
EXPOSE 8080
CMD ["node", "server.mjs"]
