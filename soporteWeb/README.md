# SoporteWeb

Plataforma full-stack para gestión de tickets, mesa de soporte, base de conocimiento y análisis asistido por IA.

## Requisitos

- Node.js 20+
- MySQL 8+
- Una clave de OpenAI para las sugerencias opcionales

## Instalación

```bash
npm install
npm run install:all
```

Copia `backend/.env.example` como `backend/.env`, configura MySQL y ejecuta el esquema de `database/schema.sql`.

## Desarrollo

```bash
npm run dev
```

Frontend: `http://localhost:5173`  
API: `http://localhost:4000`

El frontend incluye datos de demostración para poder revisar la experiencia antes de conectar la API.
