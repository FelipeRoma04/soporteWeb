import { pool } from '../config/db.js';

export function normalizeCategoryName(name = '') {
  return name.trim();
}

export async function listCategories() { const { rows } = await pool.query('SELECT id, name, created_at FROM categories ORDER BY name'); return rows; }
export async function createCategory(name) {
  const { rows } = await pool.query('INSERT INTO categories (name) VALUES ($1) RETURNING id', [name]);
  return { id: rows[0].id, name };
}

// Devuelve el nombre tal como está guardado en "categories" (mismas mayúsculas y tildes) o null si no existe.
// "General" siempre es válida: es la categoría por defecto aunque no esté en la tabla.
export async function resolveCategoryName(name) {
  const clean = normalizeCategoryName(typeof name === 'string' ? name : '');
  if (!clean) return null;
  const { rows } = await pool.query('SELECT name FROM categories WHERE LOWER(name) = LOWER($1) LIMIT 1', [clean]);
  if (rows[0]) return rows[0].name;
  return clean.toLowerCase() === 'general' ? 'General' : null;
}