import { pool } from '../config/db.js';

export function normalizeCategoryName(name = '') {
  return name.trim();
}

export async function listCategories() { const [rows] = await pool.execute('SELECT id, name, created_at FROM categories ORDER BY name'); return rows; }
export async function createCategory(name) { const [result] = await pool.execute('INSERT INTO categories (name) VALUES (?)', [name]); return { id: result.insertId, name }; }

// Devuelve el nombre tal como está guardado en "categories" (mismas mayúsculas y tildes) o null si no existe.
// "General" siempre es válida: es la categoría por defecto aunque no esté en la tabla.
export async function resolveCategoryName(name) {
  const clean = normalizeCategoryName(typeof name === 'string' ? name : '');
  if (!clean) return null;
  const [rows] = await pool.execute('SELECT name FROM categories WHERE name = ? LIMIT 1', [clean]);
  if (rows[0]) return rows[0].name;
  return clean.toLowerCase() === 'general' ? 'General' : null;
}