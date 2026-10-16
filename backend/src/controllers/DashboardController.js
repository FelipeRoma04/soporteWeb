import { pool } from '../config/db.js';
import { TICKET_PRIORITIES } from '../models/Ticket.js';

export async function summary(req, res, next) {
  try {
    const filter = req.user.role === 'user' ? 'WHERE user_id = ?' : '';
    const params = req.user.role === 'user' ? [req.user.id] : [];
    const [rows] = await pool.execute(`SELECT COUNT(*) total, COALESCE(SUM(status = 'Abierto'), 0) open, COALESCE(SUM(status = 'En progreso'), 0) pending, COALESCE(SUM(status = 'Cerrado'), 0) closed, ROUND(AVG(CASE WHEN status = 'Cerrado' THEN TIMESTAMPDIFF(HOUR, created_at, updated_at) END), 1) average_resolution_hours FROM tickets ${filter}`, params);

    // Categorías: se normalizan espacios y vacíos (→ "General") para que cada barra sea una categoría real.
    // El alias es "label" porque en GROUP BY MySQL daría prioridad a la columna "category" sobre un alias con ese nombre.
    const [categoryRows] = await pool.execute(
      `SELECT label AS category, COUNT(*) AS total FROM (SELECT COALESCE(NULLIF(TRIM(category), ''), 'General') AS label FROM tickets ${filter}) AS normalized GROUP BY label ORDER BY total DESC, label ASC`,
      params
    );
    const categories = categoryRows.map((row) => ({ category: row.category, total: Number(row.total) }));

    // Prioridades: siempre las cuatro, de mayor a menor, con 0 cuando no hay tickets. Si hubiera valores antiguos fuera
    // de la lista, se añaden al final para que la suma de barras coincida con el total de tickets.
    const [priorityRows] = await pool.execute(`SELECT priority, COUNT(*) AS total FROM tickets ${filter} GROUP BY priority`, params);
    const known = [...TICKET_PRIORITIES].reverse();
    const priorities = [
      ...known.map((priority) => ({ priority, total: Number(priorityRows.find((row) => row.priority === priority)?.total || 0) })),
      ...priorityRows.filter((row) => !known.includes(row.priority)).map((row) => ({ priority: row.priority || 'Sin prioridad', total: Number(row.total) }))
    ];

    res.json({ ...rows[0], categories, priorities });
  } catch (error) { next(error); }
}