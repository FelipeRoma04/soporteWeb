import { pool } from '../config/db.js';

export function normalizeCategoryName(name = '') {
  return name.trim();
}

// Cuántos tickets y artículos usan cada categoría (se guardan por nombre, sin importar mayúsculas ni espacios sobrantes).
// Con eso la pantalla de Categorías sabe cuáles se pueden eliminar.
export async function listCategories() {
  const { rows } = await pool.query(
    `SELECT c.id, c.name, c.created_at,
       (SELECT COUNT(*)::INTEGER FROM tickets t WHERE LOWER(TRIM(t.category)) = LOWER(c.name)) AS tickets_count,
       (SELECT COUNT(*)::INTEGER FROM knowledge_articles a WHERE LOWER(TRIM(a.category)) = LOWER(c.name)) AS articles_count
     FROM categories c ORDER BY c.name`
  );
  return rows;
}
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

export const PROTECTED_CATEGORY = 'General';

// Elimina una categoría solo si ningún ticket ni artículo la usa. El chequeo y el borrado van en una sola sentencia,
// así no se puede colar un uso entre la comprobación y el DELETE. Devuelve 'deleted', 'not_found', 'protected' o
// { status: 'in_use', tickets, articles }.
export async function deleteCategory(id) {
  const { rows: found } = await pool.query('SELECT id, name FROM categories WHERE id = $1', [id]);
  if (!found[0]) return 'not_found';
  if (found[0].name.trim().toLowerCase() === PROTECTED_CATEGORY.toLowerCase()) return 'protected';
  const { rowCount } = await pool.query(
    `DELETE FROM categories c WHERE c.id = $1
       AND NOT EXISTS (SELECT 1 FROM tickets t WHERE LOWER(TRIM(t.category)) = LOWER(c.name))
       AND NOT EXISTS (SELECT 1 FROM knowledge_articles a WHERE LOWER(TRIM(a.category)) = LOWER(c.name))`,
    [id]
  );
  if (rowCount) return 'deleted';
  const { rows: [usage] } = await pool.query(
    `SELECT (SELECT COUNT(*)::INTEGER FROM tickets WHERE LOWER(TRIM(category)) = LOWER($1)) AS tickets,
            (SELECT COUNT(*)::INTEGER FROM knowledge_articles WHERE LOWER(TRIM(category)) = LOWER($1)) AS articles`,
    [found[0].name]
  );
  return { status: 'in_use', tickets: usage.tickets, articles: usage.articles };
}
