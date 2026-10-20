import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { pool } from './config/db.js';

import authRoutes from './routes/auth.routes.js';
import ticketRoutes from './routes/tickets.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import knowledgeRoutes from './routes/knowledge.routes.js';
import aiRoutes from './routes/ai.routes.js';
import userRoutes from './routes/users.routes.js';
import categoryRoutes from './routes/categories.routes.js';
import reportRoutes from './routes/reports.routes.js';

import { errorHandler } from './middleware/errorHandler.js';

if (!process.env.JWT_SECRET) {
	console.error(
		'✖ Falta JWT_SECRET en backend/.env. Ejecuta "npm run setup" o define una clave segura.'
	);
	process.exit(1);
}

if (process.env.JWT_SECRET === 'change-this-secret') {
	if (process.env.NODE_ENV === 'production') {
		console.error(
			'✖ JWT_SECRET usa el valor de ejemplo. Define una clave segura antes de ejecutar en producción.'
		);
		process.exit(1);
	}

	console.warn(
		'⚠ JWT_SECRET usa el valor de ejemplo. Cámbialo antes de publicar la app.'
	);
}

const isOutdatedSchema = (error) =>
	['42P01', '42703', '3D000'].includes(error.code);

const app = express();

const allowedOrigins = [
	process.env.CLIENT_URL || 'http://localhost:5173',
	'http://localhost:5173',
	'http://127.0.0.1:5173'
];

// Configuración para despliegues detrás de un proxy inverso.
if (process.env.TRUST_PROXY) {
	app.set(
		'trust proxy',
		/^\d+$/.test(process.env.TRUST_PROXY)
			? Number(process.env.TRUST_PROXY)
			: process.env.TRUST_PROXY
	);
}

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Comprobación de salud de la API y de la base de datos.
app.get('/api/health', async (_req, res) => {
	try {
		await pool.query(
			'SELECT token_version, is_active FROM users LIMIT 1'
		);

		res.json({
			status: 'ok',
			service: 'soporte-web-api',
			database: 'ok'
		});
	} catch (error) {
		res.status(503).json({
			status: 'degraded',
			service: 'soporte-web-api',
			database: isOutdatedSchema(error)
				? 'outdated'
				: 'unavailable'
		});
	}
});

// Rutas de la API.
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reports', reportRoutes);

// Manejo centralizado de errores.
app.use(errorHandler);

// La API no ejecuta migraciones al arrancar.
// La estructura de la base de datos debe prepararse mediante db:setup.

const port = Number(process.env.PORT || 4000);

const server = app.listen(port, () => {
	console.log(`API listening on port ${port}`);

	pool.query('SELECT token_version, is_active FROM users LIMIT 1')
		.then(() => {
			console.log('Base de datos conectada');
		})
		.catch((error) => {
			console.error(
				isOutdatedSchema(error)
					? '✖ La base de datos está vacía o desactualizada. Ejecuta "npm run db:setup" y reinicia la API.'
					: `✖ No se pudo conectar a PostgreSQL (${error.code || error.message}). Revisa DATABASE_URL o la configuración DB_* y ejecuta "npm run db:setup".`
			);
		});
});

server.on('error', (error) => {
	console.error(
		error.code === 'EADDRINUSE'
			? `✖ El puerto ${port} ya está en uso. Cierra el programa que lo ocupa o cambia PORT en backend/.env.`
			: error
	);

	process.exit(1);
});