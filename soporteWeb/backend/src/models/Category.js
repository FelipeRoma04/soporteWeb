import { pool } from '../config/db.js';

export function normalizeCategoryName(name = '') {
  return name.trim();
}

export async function listCategories() { const [rows] = await pool.execute('SELECT id, name, created_at FROM categories ORDER BY name'); return rows; }
export async function createCategory(name) { const [result] = await pool.execute('INSERT INTO categories (name) VALUES (?)', [name]); return { id: result.insertId, name }; }
