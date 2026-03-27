FROM node:22-alpine
WORKDIR /app
COPY signaling/package.json ./
RUN npm install
EXPOSE 8080
CMD ["node", "node_modules/y-webrtc/bin/server.js"]
