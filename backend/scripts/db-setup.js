// Prepara el esquema PostgreSQL, garantiza un administrador y carga las guías de ejemplo.

import './env.js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const databaseDir = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'..',
	'..',
	'database'
);

const ok = (message) => console.log(`✔ ${message}`);
const warn = (message) => console.log(`⚠ ${message}`);

// Neon: usar la conexión directa durante la preparación.
// La API puede seguir usando DATABASE_URL con pooling.
if (process.env.DATABASE_URL_UNPOOLED) {
	process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;
}

const { pool } = await import('../src/config/db.js');

try {
	// Crear o actualizar las tablas y categorías definidas en schema.sql.
	await pool.query(
		await readFile(path.join(databaseDir, 'schema.sql'), 'utf8')
	);
	ok('Esquema PostgreSQL y categorías base listos');

	// Garantizar el administrador configurado en el entorno.
	const {
		ensureAdmin,
		adminFromEnv,
		adminMessages
	} = await import('./create-admin.js');

	const result = await ensureAdmin(adminFromEnv());

	if (result.status === 'skipped') {
		warn('ADMIN_EMAIL está vacío: no se creó administrador.');
	} else {
		ok(adminMessages[result.status](result.email));
	}

	// Comprobar si existen usuarios antes de cargar las guías.
	const {
		rows: [{ total: usersCount }]
	} = await pool.query(
		'SELECT COUNT(*)::INTEGER AS total FROM users'
	);

	if (!usersCount) {
		warn('Aún no hay usuarios, así que no se cargaron las guías de ejemplo.');
		console.log(
			'Completa ADMIN_EMAIL y ADMIN_PASSWORD en backend/.env y vuelve a ejecutar "npm run db:setup".'
		);
	} else {
		const {
			rows: [{ total: before }]
		} = await pool.query(
			'SELECT COUNT(*)::INTEGER AS total FROM knowledge_articles'
		);

		await pool.query(
			await readFile(
				path.join(databaseDir, 'seed-knowledge-general.sql'),
				'utf8'
			)
		);

		const {
			rows: [{ total: after }]
		} = await pool.query(
			'SELECT COUNT(*)::INTEGER AS total FROM knowledge_articles'
		);

		ok(`Guías de ejemplo: ${after - before} nuevas (${after} en total)`);
	}

	// Mostrar el resumen final.
	const [
		{ rows: [{ total: users }] },
		{ rows: [{ total: categories }] },
		{ rows: [{ total: articles }] }
	] = await Promise.all([
		pool.query('SELECT COUNT(*)::INTEGER AS total FROM users'),
		pool.query('SELECT COUNT(*)::INTEGER AS total FROM categories'),
		pool.query('SELECT COUNT(*)::INTEGER AS total FROM knowledge_articles')
	]);

	console.log(
		`\nListo. Usuarios: ${users} · Categorías: ${categories} · Guías: ${articles}`
	);
} catch (error) {
	console.error(`\n✖ ${error.code || 'Error'}: ${error.message}\n`);
	process.exitCode = 1;
} finally {
	await pool.end();
}
