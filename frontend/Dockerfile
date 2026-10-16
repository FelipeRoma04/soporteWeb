# Interfaz de SoporteWeb. Contexto de build: la carpeta frontend/
#   docker build -t soporteweb-web --build-arg VITE_API_URL=https://TU-API/api ./frontend
#
# VITE_API_URL se incrusta al compilar (Vite), no se lee en tiempo de ejecución.

# --- 1) Compilar con Vite ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# --- 2) Servir los archivos estáticos con nginx ---
FROM nginx:1.27-alpine
# nginx sustituye ${PORT} en la plantilla al arrancar (Cloud Run usa 8080)
ENV PORT=8080
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080