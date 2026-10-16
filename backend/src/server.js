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
import { errorHandler } from './middleware/errorHandler.js';

if (!process.env.JWT_SECRET) {
	console.error('✖ Falta JWT_SECRET en backend/.env. Ejecuta "npm run setup" (crea el archivo con una clave aleatoria) o define una clave larga.');
	process.exit(1);
}
if (process.env.JWT_SECRET === 'change-this-secret') {
	if (process.env.NODE_ENV === 'production') {
		console.error('✖ JWT_SECRET usa el valor de ejemplo. Define una clave aleatoria antes de ejecutar en producción.');
		process.exit(1);
	}
	console.warn('⚠ JWT_SECRET usa el valor de ejemplo. Está bien para probar, pero cámbialo antes de publicar la app.');
}

const isOutdatedSchema = (error) => ['ER_BAD_FIELD_ERROR', 'ER_NO_SUCH_TABLE', 'ER_BAD_DB_ERROR'].includes(error.code);

const app = express();
const allowedOrigins = [
	process.env.CLIENT_URL || 'http://localhost:5173',
	'http://localhost:5173',
	'http://127.0.0.1:5173'
];
// Detrás de un proxy inverso, TRUST_PROXY=1 (nº de proxies) hace que req.ip sea la IP real del cliente.
if (process.env.TRUST_PROXY) app.set('trust proxy', /^\d+$/.test(process.env.TRUST_PROXY) ? Number(process.env.TRUST_PROXY) : process.env.TRUST_PROXY);
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.get('/api/health', async (_req, res) => {
	try {
		await pool.query('SELECT token_version, is_active FROM users LIMIT 1');
		res.json({ status: 'ok', service: 'soporte-web-api', database: 'ok' });
	} catch (error) {
		res.status(503).json({ status: 'degraded', service: 'soporte-web-api', database: isOutdatedSchema(error) ? 'outdated' : 'unavailable' });
	}
});
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use(errorHandler);

const port = Number(process.env.PORT || 4000);
const server = app.listen(port, () => {
	console.log(`API listening on port ${port}`);
	pool.query('SELECT token_version, is_active FROM users LIMIT 1')
		.then(() => console.log('Base de datos conectada'))
		.catch((error) => console.error(isOutdatedSchema(error)
			? '✖ La base de datos está vacía o desactualizada. Ejecuta "npm run db:setup" y reinicia la API.'
			: `✖ No se pudo conectar a MySQL (${error.code || error.message}). Revisa backend/.env y ejecuta "npm run db:setup".`));
});
server.on('error', (error) => {
	console.error(error.code === 'EADDRINUSE' ? `✖ El puerto ${port} ya está en uso. Cierra el programa que lo ocupa o cambia PORT en backend/.env.` : error);
	process.exit(1);
});