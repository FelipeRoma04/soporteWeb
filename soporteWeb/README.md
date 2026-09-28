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

Copia `backend/.env.example` como `backend/.env`, configura MySQL y ejecuta el esquema de `database/schema.sql`. Si la base de datos ya existe, ejecuta `database/migration-003-ai-interaction-feedback.sql` para habilitar el registro de fuentes y valoraciones del asistente. Ejecuta `database/seed-knowledge-general.sql` para cargar guías generales de soporte TI; el script evita repetir títulos.

## Asistente de IA

El proveedor se configura en `backend/.env` con `AI_PROVIDER=openai` o `AI_PROVIDER=anthropic`. Añade la clave del proveedor seleccionado en `OPENAI_API_KEY` o `ANTHROPIC_API_KEY`. OpenAI usa `OPENAI_MODEL` (por defecto `gpt-4o-mini`); Anthropic requiere `ANTHROPIC_MODEL` con un modelo habilitado en tu cuenta. Mantén las claves fuera del repositorio. Sin una clave válida, el asistente conserva una respuesta de respaldo basada en los artículos de la base de conocimiento.

## Desarrollo

```bash
npm run dev
```

Frontend: `http://localhost:5173`  
API: `http://localhost:4000`

El frontend incluye datos de demostración para poder revisar la experiencia antes de conectar la API.