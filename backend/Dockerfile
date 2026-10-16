# API de SoporteWeb. Contexto de build: la carpeta backend/
#   docker build -t soporteweb-api ./backend
FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

# Dependencias primero para aprovechar la caché de capas
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY scripts ./scripts

# Cloud Run inyecta PORT (8080); en local server.js usa 4000 por defecto
ENV PORT=8080
EXPOSE 8080
USER node
CMD ["node", "src/server.js"]