import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

export const pool = new Pool(connectionString
	? { connectionString, ssl: { rejectUnauthorized: false }, max: 5 }
	: {
		host: process.env.DB_HOST || '127.0.0.1',
		port: Number(process.env.DB_PORT || 5433),
		database: process.env.DB_NAME || 'soporte_web',
		user: process.env.DB_USER || 'soporte_web',
		password: process.env.DB_PASSWORD || 'soporte_dev',
		max: 5
	});