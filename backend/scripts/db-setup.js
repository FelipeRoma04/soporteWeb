// Prepara la base de datos de principio a fin y se puede repetir sin riesgo:
//   1) crea la base si no existe  2) crea/actualiza las tablas  3) garantiza un administrador
//   4) carga las guías de ejemplo (que necesitan un autor, por eso va después del paso 3)
import './env.js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const databaseDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'database');
const dbName = process.env.DB_NAME || 'soporte_web';
const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || ''
};

const ok = (message) => console.log(`✔ ${message}`);
const warn = (message) => console.log(`⚠ ${message}`);
function fail(message) { console.error(`\n✖ ${message}\n`); process.exit(1); }
function explain(error) {
  if (['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'].includes(error.code)) return `No se pudo conectar a MySQL en ${config.host}:${config.port}. ¿Está iniciado? (Docker: "npm run db:up"; instalación local: inicia el servicio MySQL).`;
  if (error.code === 'ER_ACCESS_DENIED_ERROR') return 'MySQL rechazó el usuario o la contraseña. Revisa DB_USER y DB_PASSWORD en backend/.env.';
  return `${error.code || 'Error'}: ${error.message}`;
}

if (!/^[A-Za-z0-9_]+$/.test(dbName)) fail('DB_NAME solo puede contener letras, números y guion bajo.');
console.log(`\nSoporteWeb · preparando la base "${dbName}" en ${config.host}:${config.port}\n`);

let connection;
try { connection = await mysql.createConnection({ ...config, multipleStatements: true }); } catch (error) { fail(explain(error)); }

let pool;
try {
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.query(`USE \`${dbName}\``);
  await connection.query(await readFile(path.join(databaseDir, 'schema.sql'), 'utf8'));
  ok('Tablas y categorías base listas');

  // Bases creadas con versiones anteriores del proyecto: añade lo que les falte.
  const upgrades = [
    ['users', 'token_version', 'INT UNSIGNED NOT NULL DEFAULT 0'],
    ['knowledge_articles', 'keywords', "VARCHAR(255) NOT NULL DEFAULT ''"],
    ['ai_interactions', 'source_article_ids', 'JSON NULL'],
    ['ai_interactions', 'rating', "ENUM('helpful', 'not_helpful') NULL"],
    ['ai_interactions', 'rated_at', 'TIMESTAMP NULL']
  ];
  for (const [table, column, definition] of upgrades) {
    const [found] = await connection.query('SELECT 1 FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ?', [dbName, table, column]);
    if (!found.length) { await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`); ok(`Base actualizada: ${table}.${column} añadida`); }
  }

  ({ pool } = await import('../src/config/db.js'));
  const { ensureAdmin, adminFromEnv, adminMessages } = await import('./create-admin.js');
  try {
    const result = await ensureAdmin(adminFromEnv());
    if (result.status === 'skipped') warn('ADMIN_EMAIL está vacío: no se creó administrador.');
    else ok(adminMessages[result.status](result.email));
  } catch (error) { fail(error.message); }

  const count = async (table) => (await connection.query(`SELECT COUNT(*) AS total FROM \`${table}\``))[0][0].total;
  if (!(await count('users'))) {
    warn('Aún no hay usuarios, así que no se cargaron las guías de ejemplo.');
    console.log('  Completa ADMIN_EMAIL y ADMIN_PASSWORD en backend/.env y vuelve a ejecutar "npm run db:setup".');
  } else {
    const before = await count('knowledge_articles');
    // La semilla trae un "USE soporte_web;" fijo: se quita para respetar DB_NAME.
    await connection.query((await readFile(path.join(databaseDir, 'seed-knowledge-general.sql'), 'utf8')).replace(/^\s*USE\s+[^;]+;/im, ''));
    const after = await count('knowledge_articles');
    ok(`Guías de ejemplo: ${after - before} nuevas (${after} en total)`);
  }

  console.log(`\nListo. Usuarios: ${await count('users')} · Categorías: ${await count('categories')} · Guías: ${await count('knowledge_articles')}`);
  console.log('Siguiente paso: npm run dev\n');
} catch (error) {
  fail(explain(error));
} finally {
  await connection.end();
  await pool?.end();
}