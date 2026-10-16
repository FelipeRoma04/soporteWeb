import mysql from 'mysql2/promise';
import 'dotenv/config';

export const pool = mysql.createPool({
	host: process.env.DB_HOST,
	port: Number(process.env.DB_PORT || 3306),
	// En Cloud Run, Cloud SQL se conecta por socket Unix:
	// DB_SOCKET_PATH=/cloudsql/PROYECTO:REGION:INSTANCIA
	// Si no está definida queda en undefined y se usa host/port como hasta ahora.
	socketPath: process.env.DB_SOCKET_PATH || undefined,
	database: process.env.DB_NAME,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	charset: 'utf8mb4',
	waitForConnections: true,
	connectionLimit: 10
});