# SoporteWeb

Mesa de ayuda con tickets, comentarios, notificaciones, plazos de atención (SLA) con avisos de vencimiento, base de conocimiento con autoría, reportes y estadísticas para administradores, y un asistente de IA que responde usando las guías y distingue la charla informal de una consulta real.

**Tecnologías:** React 18 + Vite (interfaz) · Node.js 20 + Express (API) · PostgreSQL · OpenAI, Anthropic o Groq (opcional).

## Contenido

1. [Características](#características)
2. [Arquitectura](#arquitectura)
3. [Estructura del proyecto](#estructura-del-proyecto)
4. [Modelo de datos](#modelo-de-datos)
5. [Puesta en marcha](#puesta-en-marcha)
6. [Roles y permisos](#roles-y-permisos)
7. [Plazos de atención (SLA)](#plazos-de-atención-sla)
8. [Endpoints destacados](#endpoints-destacados)
9. [Comandos útiles](#comandos-útiles)
10. [Solución de problemas](#solución-de-problemas)
11. [Seguridad](#seguridad)
12. [Antes de publicar en internet](#antes-de-publicar-en-internet)
13. [Despliegue gratuito](#despliegue-gratuito-github-pages--render--neon)

---

## Características

- **Tickets** con prioridad, categoría, estado, comentarios, historial y notificaciones en la campana.
- **Plazos de atención (SLA)** según la prioridad. El ticket vencido no se borra: se marca como *Vencido* y se avisa a agentes y administradores.
- **Calificación de la atención:** 1 a 5 estrellas y comentario opcional al cerrar un ticket.
- **Base de conocimiento** con el autor visible en cada artículo, búsqueda, filtros por categoría y autor, y orden por fecha, título, autor o categoría (todo en el navegador).
- **Asistente de IA** que busca primero en las guías, ofrece crear un ticket si no hay solución y responde directo a saludos y charla informal.
- **Reportes** (administrador): tickets por mes, categorías más frecuentes, tiempos de resolución, prioridades, rendimiento de agentes, satisfacción y descarga CSV con filtros.
- **Administración** de usuarios (roles y activación) y de categorías (crear y eliminar las que no se usan).
- **Interfaz** con barra de navegación superior, tuerca de configuración en la cabecera y botón flotante del asistente.

---

## Arquitectura

```mermaid
flowchart LR
  U[Navegador] -->|HTTP| F[Frontend<br/>React + Vite<br/>:5173]
  F -->|REST /api + JWT| A[API<br/>Node + Express<br/>:4000]
  A -->|pg| D[(PostgreSQL<br/>soporte_web)]
  A -.->|opcional| L[OpenAI / Anthropic / Groq]
```

El proyecto es una aplicación de tres capas:

| Capa | Qué hace |
| --- | --- |
| **Frontend** (`frontend/`) | Interfaz de una sola página. Guarda la sesión (token JWT) y consume la API con `axios`. |
| **API** (`backend/`) | Valida la sesión, aplica permisos por rol, ejecuta la lógica de negocio (SLA, asistente, reportes) y accede a la base de datos. |
| **Base de datos** (`database/`) | PostgreSQL con el esquema y las guías de ejemplo. |

### Cómo viaja una petición en la API

```
Petición → routes → middleware → controllers → services → models → PostgreSQL
```

| Paso | Responsabilidad |
| --- | --- |
| `routes/` | Define las URL (`/api/tickets`, `/api/auth`…) y qué middleware lleva cada una. |
| `middleware/` | Autenticación (`auth`), permisos por rol (`roleGuard`), límite de intentos (`loginThrottle`, `rateLimit`) y manejo central de errores (`errorHandler`). |
| `controllers/` | Reciben la petición HTTP y devuelven la respuesta. Sin lógica de negocio. |
| `services/` | Reglas de negocio: validaciones, contraseñas, tokens, llamadas a la IA, avisos de SLA. |
| `models/` | Consultas SQL. Es la única capa que toca la base de datos. |

Los errores se lanzan con un `status` HTTP y los recoge `errorHandler`; cualquier error sin `status` responde `500 Error interno del servidor` y el detalle real queda en la consola del servidor.

---

## Estructura del proyecto

```
.
├── README.md
├── package.json              Scripts de la raíz: setup, dev, db:up, db:setup, create-admin, build
├── package-lock.json
├── docker-compose.yml        PostgreSQL 16 para desarrollo (puerto 5433 del equipo)
├── render.yaml               Blueprint de Render: despliegue de la API (backend)
├── neon.ts                   Configuración de la CLI de Neon (ramas); la app no lo usa
├── skills-lock.json          Versiones de las skills de Neon para asistentes de IA
├── .gitignore                Excluye .env, node_modules, dist y copias de seguridad
├── .github/
│   └── workflows/
│       └── deploy-pages.yml  Compila el frontend y lo publica en GitHub Pages
├── .agents/skills/           Documentación de Neon para asistentes de IA (no es parte de la app)
├── .vscode/
│   └── mcp.json              Conexión de VS Code al servidor MCP de Neon (herramienta de desarrollo)
│
├── backend/                  API REST (Node.js + Express)
│   ├── Dockerfile            Imagen opcional para otro host con contenedores (hoy el despliegue usa Render sin Docker)
│   ├── .dockerignore         Mantiene .env y node_modules fuera de la imagen
│   ├── .gitignore            Refuerza que .env no se versione
│   ├── .env.example          Plantilla de variables de entorno (el .env real no se sube)
│   ├── package.json
│   ├── package-lock.json
│   ├── scripts/              Utilidades que se ejecutan con npm run …
│   │   ├── env.js              Ayudas compartidas por los scripts (lectura de variables)
│   │   ├── init-env.js         Crea backend/.env con un JWT_SECRET aleatorio
│   │   ├── db-setup.js         Crea la base, aplica el esquema, el admin y las guías
│   │   └── create-admin.js     Crea/promueve un administrador o restablece su clave
│   └── src/
│       ├── server.js           Arranque de Express, CORS, rutas y /api/health
│       ├── config/
│       │   └── db.js             Pool PostgreSQL (DATABASE_URL o host/puerto)
│       ├── routes/             ai · auth · categories · dashboard · knowledge · reports · tickets · users
│       ├── controllers/        AI · Auth · Category · Dashboard · Knowledge · Report · Ticket · User
│       ├── middleware/         auth · roleGuard · loginThrottle · rateLimit · errorHandler
│       ├── services/           AuthService · TicketService · KnowledgeService · SlaService ·
│       │                       OpenAIService (proveedor de IA: OpenAI, Anthropic o Groq)
│       ├── utils/              smallTalk (charla informal del asistente) · reportFilters · csv
│       └── models/             User · Ticket · Comment · TicketHistory · Notification · Category ·
│                               Knowledge · AIInteraction · Role · Sla · SlaAlert · TicketRating
│
├── frontend/                 Interfaz (React 18 + Vite)
│   ├── Dockerfile            Imagen opcional con nginx (hoy el frontend se publica en GitHub Pages)
│   ├── .dockerignore
│   ├── nginx.conf.template   Configuración de nginx (SPA, caché, puerto ${PORT})
│   ├── .env.example          VITE_API_URL (dirección de la API) y VITE_BASE_PATH (ruta de Pages); se fijan al compilar
│   ├── index.html            Título de la pestaña («SysPulse | Centro de Asistencia») y enlace al favicon
│   ├── vite.config.js        Usa VITE_BASE_PATH como `base` (GitHub Pages sirve en /<repositorio>/)
│   ├── package.json
│   ├── package-lock.json
│   ├── public/
│   │   └── favicon.png       Icono de la pestaña del navegador (logo de SysPulse)
│   └── src/
│       ├── main.jsx · App.jsx  Punto de entrada y vistas principales (incluye la tabla de tickets)
│       ├── api.js              Cliente axios (añade el token a cada petición)
│       ├── styles.css          Estilos globales, barra superior, etiquetas de SLA y botón flotante
│       ├── context/            AuthContext: usuario y sesión actuales
│       ├── layouts/            MainLayout: barra superior de navegación + cabecera + botón flotante del asistente
│       ├── pages/              Login · Register · Dashboard · Tickets · TicketDetail · Knowledge ·
│       │                       ArticleDetail · AIChat · Notifications · Users · Settings · Reports
│       ├── components/         Sidebar (navegación, ahora horizontal) · Header · AssistantButton · TicketCard ·
│       │                       TicketModal · StatusPicker · SlaBadge · StarRating · KnowledgeCard · KnowledgeToolbar ·
│       │                       MetricsCard · Charts · ChatBot · NotificationBell · ProtectedRoute · BrandIdentity
│       ├── services/           Llamadas a la API por recurso (auth, tickets, knowledge,
│       │                       notificaciones, IA, reportes)
│       └── utils/
│           ├── roles.js          Ayudas para comprobar roles en la interfaz
│           ├── sla.js            Estado del plazo de un ticket (vencido, por vencer, resuelto a tiempo)
│           └── knowledgeView.js  Filtros y orden de la base de conocimiento (se hacen en el navegador)
│
└── database/
    ├── schema.sql                      Esquema completo e idempotente
    └── seed-knowledge-general.sql      26 guías de ejemplo para la base de conocimiento
```

### Variables de entorno (`backend/.env`)

El archivo se crea con `npm run setup` y **nunca se sube a git** (está en `.gitignore`).

| Variable | Descripción |
| --- | --- |
| `DATABASE_URL` | Cadena de conexión PostgreSQL (Neon en producción; opcional si usas las variables `DB_*`). |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Conexión PostgreSQL local. Con Docker: `127.0.0.1`, `5433`, `soporte_web`, `soporte_web`, `soporte_dev`. |
| `JWT_SECRET` | Clave para firmar las sesiones. La genera `npm run setup`. |
| `PORT` | Puerto de la API (por defecto `4000`). |
| `CLIENT_URL` | Dirección de la interfaz permitida por CORS (por defecto `http://localhost:5173`). |
| `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` | Cuenta de administrador que crea `db:setup` (clave de mínimo 8 caracteres). |
| `NODE_ENV` | `production` en producción: la API se niega a arrancar con el `JWT_SECRET` de ejemplo. |
| `TRUST_PROXY` | Número de proxies inversos delante de la API (ver [producción](#antes-de-publicar-en-internet)). |
| `AI_PROVIDER` | Proveedor de IA: `openai` (por defecto), `anthropic` o `groq`. Cualquier otro valor da error 503. |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Con `AI_PROVIDER=openai`. El modelo por defecto es `gpt-4o-mini`. |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Con `AI_PROVIDER=anthropic`. **`ANTHROPIC_MODEL` es obligatorio**: sin él la API responde 503. |
| `GROQ_API_KEY`, `GROQ_MODEL` | Con `AI_PROVIDER=groq`. El modelo por defecto es `openai/gpt-oss-20b`. |

La IA es opcional: sin la clave del proveedor elegido, el asistente responde con el texto de las guías.

---

## Modelo de datos

### Diagrama entidad-relación

```mermaid
erDiagram
  users ||--o{ tickets : crea
  users o|--o{ tickets : "asignado a"
  tickets ||--o{ comments : tiene
  tickets ||--o{ ticket_history : registra
  tickets ||--o{ notifications : genera
  tickets ||--o| ticket_sla_alerts : "marca vencimiento"
  tickets ||--o| ticket_ratings : recibe
  users ||--o{ comments : escribe
  users ||--o{ notifications : recibe
  users ||--o{ knowledge_articles : autor
  users ||--o{ ai_interactions : consulta
  users ||--o{ ticket_ratings : califica
```

| Tabla | Contenido |
| --- | --- |
| `users` | Cuentas. El rol (`user`, `agent`, `admin`) vive aquí, validado con un `CHECK`. Por política de la aplicación **nunca se borran**: se desactivan (`is_active = FALSE`) y conservan su historial. `token_version` invalida sesiones al cambiar la contraseña. |
| `tickets` | Solicitudes: asunto, descripción, categoría, prioridad (`Baja`…`Urgente`) y estado (`Abierto`, `En progreso`, `Cerrado`). Cada ticket tiene un creador y puede tener un agente asignado. El plazo de SLA no se guarda: se calcula a partir de la prioridad. |
| `ticket_sla_alerts` | Un registro por ticket cuyo vencimiento ya se avisó. Evita notificaciones duplicadas. |
| `ticket_ratings` | Calificación de 1 a 5 estrellas (validada con `CHECK`) y comentario opcional. La base garantiza una sola por ticket; que el ticket esté cerrado y que califique quien lo creó lo valida la API. |
| `comments` | Comentarios de cada ticket, asociados al usuario que los escribe. |
| `ticket_history` | Registro de cambios de cada ticket. |
| `notifications` | Avisos para los usuarios (comentarios, cambios de estado, vencimientos de plazo), con marca de lectura y asociación a un ticket. |
| `categories` | Catálogo de categorías. No tiene claves foráneas: tickets y artículos guardan el nombre como texto. Que no se pueda eliminar una categoría en uso (error 409) es una regla de la API. |
| `knowledge_articles` | Guías de la base de conocimiento que también utiliza el asistente. Guardan su autor (`author_id`); la API devuelve su nombre como `author_name`. |
| `ai_interactions` | Registro de preguntas al asistente, respuestas, artículos utilizados y valoraciones. La charla informal (saludos, gracias) no se registra. |
| `roles` | Catálogo de referencia sin relación con `users`: los permisos usan el valor de `users.role`. |

### Relaciones principales

- Un usuario puede crear múltiples tickets y tener otros asignados como agente; un ticket puede estar sin asignar.
- Un ticket puede tener varios comentarios, registros de historial y notificaciones.
- Un ticket puede recibir una única calificación (`ticket_ratings`) y tiene como máximo un aviso de vencimiento (`ticket_sla_alerts`).
- Cada comentario pertenece a un ticket y a un usuario.
- Un usuario puede publicar artículos de conocimiento y hacer múltiples consultas al asistente.

> **Qué garantiza cada capa.** PostgreSQL garantiza las claves foráneas, las restricciones `CHECK` (rol, prioridad, estado, calificación 1-5) y una calificación por ticket. La API garantiza las reglas de negocio: calificar solo tickets cerrados, no eliminar categorías en uso, desactivar usuarios en lugar de borrarlos y no registrar la charla informal del asistente.

### Esquema y datos de ejemplo

`database/schema.sql` contiene la estructura completa (tablas, relaciones, índices y restricciones) y se ejecuta con `npm run db:setup`. `database/seed-knowledge-general.sql` contiene las guías de ejemplo y puede ejecutarse de nuevo sin duplicarlas.

La API **no** modifica el esquema al arrancar. Si agregas una tabla o columna, actualiza `schema.sql` y aplica el cambio a las bases existentes (`npm run db:setup` es idempotente) **antes** de desplegar una versión del código que dependa de él.

---

## Puesta en marcha

### 1. Qué necesitas instalar

| Programa | Para qué | Cómo comprobar que está bien |
| --- | --- | --- |
| **Node.js 20 o superior** (LTS, nodejs.org) | Ejecutar la API y la interfaz | `node -v` debe mostrar `v20` o más |
| **Docker Desktop** *o* **Neon PostgreSQL** | Base de datos | — |
| **VS Code** | Editor | — |

Git es opcional: puedes descargar el proyecto como ZIP. Después de instalar Node.js, **cierra y vuelve a abrir VS Code**.

> **Windows:** si `npm` dice *"la ejecución de scripts está deshabilitada"*, usa una terminal **Command Prompt**, o ejecuta una vez en PowerShell: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

### 2. Base de datos (elige UNA opción)

**Opción A · Docker (la más simple).** Abre Docker Desktop y ejecuta `npm run db:up`. Crea PostgreSQL con usuario y base `soporte_web`, contraseña `soporte_dev`, accesible en el puerto **5433** del equipo.

**Opción B · Neon.** Crea un proyecto PostgreSQL gratuito y copia su cadena de conexión en `DATABASE_URL` en `backend/.env`.

### 3. Instalar y configurar

```bash
npm run setup
```

Instala las dependencias y crea `backend/.env`. Ábrelo y revisa la conexión a la base y `ADMIN_EMAIL`, `ADMIN_NAME` y `ADMIN_PASSWORD`. Si ya tenías `.env`, el comando no lo sobrescribe: actualiza manualmente los valores antiguos de MySQL.

Después crea la base, las tablas, el administrador y las guías de ejemplo:

```bash
npm run db:setup
```

Es repetible: crea lo que falte y no duplica ni borra nada.

### 4. Ejecutar

```bash
npm run dev
```

- Interfaz: <http://localhost:5173>
- API: <http://localhost:4000> · diagnóstico: <http://localhost:4000/api/health> (debe mostrar `"database":"ok"`)

Inicia sesión con `ADMIN_EMAIL` y `ADMIN_PASSWORD`. Las demás personas se registran desde la pantalla de acceso con rol **Usuario**; el administrador puede cambiar su rol en **Usuarios**.

### Empezar de cero (borra todos los datos)

- Docker: elimina únicamente el volumen local `soporte_pg_data`, luego `npm run db:up` y `npm run db:setup`.
- Neon: usa un proyecto de prueba nuevo; `npm run db:setup` no elimina tablas ni datos.

### Venir de la versión con MySQL

Las versiones anteriores usaban MySQL; sus tablas y datos no se migran a PostgreSQL. Si tenías el contenedor antiguo (`soporteweb-db`), elimínalo antes de levantar el nuevo: `docker rm -f soporteweb-db` y después `npm run db:up`.

---

## Roles y permisos

| Rol | Puede |
| --- | --- |
| **Usuario** | Crear tickets, ver y comentar los suyos, calificar la atención de los que ya se cerraron, usar el asistente y consultar la base de conocimiento (con el autor de cada artículo). |
| **Agente** | Además: ver todos los tickets, cambiar su estado y recibir los avisos de plazo vencido. |
| **Administrador** | Además: gestionar usuarios, categorías (crear y eliminar las que no se usan) y artículos, recibir los avisos de plazo vencido y consultar **Reportes** (gráficos, satisfacción, rendimiento de agentes y descarga CSV con filtros). |

El rol se lee de la base de datos en cada petición, así que un cambio surte efecto al instante.

---

## Plazos de atención (SLA)

El plazo depende de la prioridad y se cuenta desde que se crea el ticket:

| Prioridad | Plazo |
| --- | --- |
| Urgente | 4 h |
| Alta | 8 h |
| Media | 24 h |
| Baja | 72 h |

Los valores están en `backend/src/models/Sla.js` (única fuente: la API y la interfaz los usan desde ahí). Un ticket vencido **no se borra ni cambia de estado**: se marca como **Vencido** (o **Resuelto fuera de plazo** si se cierra tarde) y se avisa una sola vez por notificación:

- **al agente** asignado (o a todos los agentes activos si nadie lo tiene), para que lo atienda;
- **a los administradores**, para que sepan que el equipo no lo resolvió a tiempo.

**Cuándo se revisa:** no hay un proceso programado. La revisión corre cuando alguien carga la lista de tickets (la interfaz la refresca cada minuto), como máximo una vez por minuto, y en segundo plano: si falla, solo queda registrado en la consola y la lista carga igual. Como el plan gratuito de Render duerme la API, los avisos llegan en cuanto alguien vuelve a entrar, no en el minuto exacto del vencimiento.

**Al actualizar una base que ya tiene datos:** ejecuta `npm run db:setup` para crear `ticket_sla_alerts`. La primera revisión avisaría de *todos* los tickets abiertos que ya estén vencidos; para silenciarlos, marca los abiertos como ya avisados una sola vez en la consola SQL:

```sql
INSERT INTO ticket_sla_alerts (ticket_id) SELECT id FROM tickets WHERE status <> 'Cerrado' ON CONFLICT DO NOTHING;
```

---

## Endpoints destacados

| Método y ruta | Quién | Qué hace |
| --- | --- | --- |
| `GET /api/tickets` | Sesión iniciada | Lista los tickets visibles para el usuario, con `sla_hours` y `sla_due_at`. Dispara la revisión de plazos vencidos. |
| `DELETE /api/categories/:id` | Administrador | Elimina una categoría sin uso (409 si la usan tickets o artículos). |
| `POST /api/tickets/:id/rating` | Quien creó el ticket | Califica la atención (`rating` 1-5, `comment` opcional) cuando está cerrado; una sola vez. |
| `GET /api/reports/summary` | Administrador | Estadísticas para los gráficos. Filtros: `from`, `to` (AAAA-MM-DD), `status`, `category`, `priority`, `tz`. |
| `GET /api/reports/tickets.csv` | Administrador | Descarga los tickets filtrados (separador `;`, UTF-8 con BOM: abre directo en Excel). |

---

## Comandos útiles

| Comando | Qué hace |
| --- | --- |
| `npm run setup` | Instala dependencias y crea `backend/.env` |
| `npm run dev` | Inicia API e interfaz |
| `npm run db:up` | Inicia PostgreSQL con Docker |
| `npm run db:setup` | Crea/actualiza la base, el administrador y las guías (repetible) |
| `npm run create-admin` | Crea o promueve al administrador definido en `.env` |
| `npm --prefix backend run create-admin -- --email ana@empresa.com --name Ana --password clave12345` | Crea o promueve a otra cuenta |
| `npm --prefix backend run create-admin -- --email ana@empresa.com --password nueva12345 --reset-password` | Restablece una contraseña |
| `npm run build` | Compila la interfaz para producción |

---

## Solución de problemas

| Síntoma | Solución |
| --- | --- |
| `'node' no se reconoce` | Reinstala Node.js y reinicia VS Code |
| *No se pudo conectar a PostgreSQL* | Inicia PostgreSQL (`npm run db:up`) o revisa `DATABASE_URL` / `DB_HOST` y `DB_PORT` (`5433` con Docker) |
| *La base rechazó el usuario o la contraseña* | Corrige la cadena `DATABASE_URL` o `DB_USER` y `DB_PASSWORD` en `backend/.env` |
| *Port 5433 is already allocated* | Otro programa usa ese puerto: ciérralo o cambia el mapeo en `docker-compose.yml` y `DB_PORT` |
| *El puerto 4000/5173 ya está en uso* | Cierra el otro programa o cambia `PORT` en `backend/.env` |
| *Falta JWT_SECRET* | Ejecuta `npm run setup` |
| *Error interno del servidor* al registrarse o iniciar sesión | Mira el error real en la terminal de la API. Si dice `Table … doesn't exist` o `relation … does not exist`, ejecuta `npm run db:setup` |
| *Credenciales incorrectas* tras reiniciar la base | Si ejecutaste `down -v`, los usuarios se borraron: vuelve a crear la cuenta o ejecuta `npm run db:setup` |
| *La base de datos está vacía o desactualizada* | Ejecuta `npm run db:setup` y reinicia la API |
| No aparecen **Categorías**, **Usuarios**, **Reportes** o el botón de añadir artículos | Esas opciones son solo para administradores: usa `npm run create-admin` |
| No se envían avisos de plazo vencido | Comprueba que existe la tabla `ticket_sla_alerts` (`npm run db:setup`) y que alguien tiene la app abierta: la revisión corre al cargar la lista de tickets. El error, si lo hay, aparece en la consola de la API |
| Al desplegar, todos los tickets viejos generan aviso de vencido | Es la primera revisión. Para evitarlo en adelante, usa el `INSERT` opcional de [Plazos de atención](#plazos-de-atención-sla) antes de desplegar |
| El asistente responde «no encontré una solución» | La consulta no coincide con ninguna guía. Usa palabras del problema («VPN», «correo», «Teams») o añade la guía en Base de conocimiento. Los saludos y «¿cómo vas?» se responden aparte, sin buscar guías |
| Tildes como `?` (`Colaboraci?n`) | Comprueba que los archivos SQL se guardaron como UTF-8 y vuelve a ejecutar `npm run db:setup` |
| Te saca al login de repente | La sesión dura 8 horas, o cambiaron la contraseña de tu cuenta (cierra todas las sesiones). Vuelve a entrar |
| *Demasiados intentos de inicio de sesión* | Tras 5 fallos con el mismo correo y equipo se bloquea 15 minutos |
| Aviso `DEP0040 punycode` al arrancar | Es inofensivo (viene de una dependencia) |
| `container name "/soporteweb-db" is already in use` | Queda el contenedor MySQL de la versión anterior: `docker rm -f soporteweb-db` y luego `npm run db:up` |
| VS Code marca error en `neon.ts` (*Cannot find module `@neon/config/v1`*, `branch` implícito) | Faltan las dependencias de la raíz: ejecuta `npm install` en la carpeta principal y reinicia el servidor de TypeScript (*Ctrl+Shift+P → TypeScript: Restart TS Server*). `neon.ts` solo lo usa la CLI de Neon; la aplicación no lo necesita |
| En producción, la primera petición tarda o falla | El plan gratuito de Render duerme la API tras un rato sin uso: espera unos segundos y reintenta |
| La interfaz en Pages carga pero no deja entrar (error de red o CORS) | En Render, `CLIENT_URL` debe ser el origen de Pages **sin ruta**: `https://feliperoma04.github.io`. Comprueba también la variable `VITE_API_URL` del repositorio |

---

## Seguridad

- Las contraseñas se guardan con `bcrypt`; las sesiones son tokens JWT de 8 horas.
- Cambiar la contraseña (desde **Configuración** o con `--reset-password`) cierra las demás sesiones.
- El inicio de sesión limita los intentos: 5 por correo y equipo, y 20 por correo desde cualquier equipo, cada 15 minutos. Los contadores viven en la memoria de la API y se reinician con ella.
- Los reportes y la descarga CSV son solo para administradores; las calificaciones solo las puede enviar quien creó el ticket.
- El `.env` y las claves nunca se suben al repositorio.

---

## Antes de publicar en internet

- Usa un `JWT_SECRET` propio y largo (con `NODE_ENV=production` la API se niega a arrancar con el de ejemplo).
- Usa una cadena `DATABASE_URL` privada y no la guardes en el repositorio.
- Define `CLIENT_URL` con la dirección real de la interfaz y sirve todo por HTTPS.
- Si la API va detrás de un proxy inverso, define `TRUST_PROXY=1` (número de proxies); si no, todos los usuarios compartirían contador de intentos.
- Con varias instancias de la API (por ejemplo en Render con varias réplicas), el límite de intentos y las cuotas de IA no se comparten: usa un almacén común (p. ej. Redis). La revisión de plazos sí es segura con varias instancias: el aviso se reserva en la base de datos y sale una sola vez.
- Borra `ADMIN_PASSWORD` de `backend/.env` tras crear el administrador.
- Guarda `JWT_SECRET`, la clave de IA y la contraseña de la base en un gestor de secretos, no en el repositorio.
- En una base PostgreSQL gestionada, ejecuta `npm run db:setup` una vez apuntando a esa base. El script prepara el esquema y carga ejemplos sin borrar datos existentes. Si la base ya estaba desplegada antes de los plazos (SLA), consulta [Plazos de atención](#plazos-de-atención-sla).

## Despliegue gratuito (GitHub Pages + Render + Neon)

**En línea:**

| Servicio | Dirección |
| --- | --- |
| Interfaz (GitHub Pages) | <https://feliperoma04.github.io/soporteWeb/> |
| API (Render) · diagnóstico | <https://soporte-web-api.onrender.com/api/health> |
| Base de datos | Neon (PostgreSQL), accesible solo con su cadena de conexión |

El frontend estático se publica en GitHub Pages; la API Express se ejecuta en Render; Neon aloja PostgreSQL. GitHub Pages no puede ejecutar el backend ni la base de datos.

1. Crea una base de datos en [Neon](https://neon.tech/), activa **Connection pooling** y copia la cadena de conexión pooled PostgreSQL (la dirección del host suele incluir `-pooler`).
2. En `backend/.env`, define `DATABASE_URL`, `ADMIN_NAME`, `ADMIN_EMAIL` y una contraseña fuerte para `ADMIN_PASSWORD`. Ejecuta `npm run db:setup` desde la raíz para crear el esquema, el administrador y las guías de ejemplo en Neon. No se copian datos que estén en tu antigua base MySQL.
3. En Render, crea un Blueprint desde el repositorio usando [`render.yaml`](./render.yaml). Configura `DATABASE_URL` con la cadena de Neon y `CLIENT_URL` con el origen de GitHub Pages, por ejemplo `https://feliperoma04.github.io`. Render genera `JWT_SECRET`. **Antes de desplegar una versión nueva**, aplica el esquema actualizado a Neon con `npm run db:setup`.
4. En GitHub, crea la variable de repositorio `VITE_API_URL` con la URL de la API de Render seguida de `/api`, por ejemplo `https://soporte-web-api.onrender.com/api`.
5. En **Settings → Pages**, selecciona **GitHub Actions** como origen. Al subir cambios a `main`, [el workflow](./.github/workflows/deploy-pages.yml) compila el frontend y lo publica en Pages.

Los niveles gratuitos tienen límites. El servicio gratuito de Render puede tardar en despertar tras un periodo sin actividad (y, mientras duerme, no revisa plazos vencidos); Neon también aplica límites de uso. La IA es opcional y el proveedor de IA podría tener sus propios costes o límites.

### Crear o promover un administrador en producción

Cualquier persona que se registra en la interfaz queda con rol **Usuario**. El primer administrador se crea fuera de la aplicación, con acceso a la base de Neon. Hay dos formas:

1. **Con la consola SQL de Neon** (la más rápida). Quien tenga acceso al proyecto, tras registrarse la cuenta en la interfaz, ejecuta:

```sql
   UPDATE users SET role = 'admin', token_version = token_version + 1 WHERE email = 'correo@ejemplo.com';
```

   La persona debe cerrar sesión y volver a entrar.

2. **Con el script del proyecto.** Desde la raíz, con `DATABASE_URL` de Neon en `backend/.env` o en la terminal:

```bash
   npm --prefix backend run create-admin -- --email correo@ejemplo.com --name "Nombre" --password "clave-de-8-o-mas"
```

   Si la cuenta ya existe, la promueve; si no, la crea. Añade `--reset-password` para cambiar su contraseña.
