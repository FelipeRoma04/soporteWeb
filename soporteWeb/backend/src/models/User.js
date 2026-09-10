import { pool } from '../config/db.js';

export function toSafeUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function createUser({ name, email, passwordHash }) { const [result] = await pool.execute('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [name, email, passwordHash]); return { id: result.insertId, name, email, role: 'user' }; }
export async function findByEmail(email) { const [rows] = await pool.execute('SELECT id, name, email, password_hash, role FROM users WHERE email = ?', [email]); return rows[0]; }
export async function listUsers() { const [rows] = await pool.execute('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'); return rows; }
export async function updateRole(userId, role) { await pool.execute('UPDATE users SET role = ? WHERE id = ?', [role, userId]); }
