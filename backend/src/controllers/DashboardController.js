import { pool } from '../config/db.js';
import { TICKET_PRIORITIES } from '../models/Ticket.js';

export async function summary(req, res, next) {
  try {
    const filter = req.user.role === 'user' ? 'WHERE user_id = $1' : '';
    const params = req.user.role === 'user' ? [req.user.id] : [];
    const { rows } = await pool.query(
      `SELECT COUNT(*)::INTEGER AS total,
        COUNT(*) FILTER (WHERE status = 'Abierto')::INTEGER AS open,
        COUNT(*) FILTER (WHERE status = 'En progreso')::INTEGER AS pending,
        COUNT(*) FILTER (WHERE status = 'Cerrado')::INTEGER AS closed,
        ROUND((AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600)
          FILTER (WHERE status = 'Cerrado'))::NUMERIC, 1)::FLOAT AS average_resolution_hours
       FROM tickets ${filter}`,
      params
    );

    // Categorías: se normalizan espacios y vacíos (→ "General") para que cada barra sea una categoría real.
    // El alias "label" normaliza espacios y vacíos antes de agrupar las categorías.
    const { rows: categoryRows } = await pool.query(
      `SELECT label AS category, COUNT(*)::INTEGER AS total FROM (SELECT COALESCE(NULLIF(TRIM(category), ''), 'General') AS label FROM tickets ${filter}) AS normalized GROUP BY label ORDER BY total DESC, label ASC`,
      params
    );
    const categories = categoryRows.map((row) => ({ category: row.category, total: Number(row.total) }));

    // Prioridades: siempre las cuatro, de mayor a menor, con 0 cuando no hay tickets. Si hubiera valores antiguos fuera
    // de la lista, se añaden al final para que la suma de barras coincida con el total de tickets.
    const { rows: priorityRows } = await pool.query(`SELECT priority, COUNT(*)::INTEGER AS total FROM tickets ${filter} GROUP BY priority`, params);
    const known = [...TICKET_PRIORITIES].reverse();
    const priorities = [
      ...known.map((priority) => ({ priority, total: Number(priorityRows.find((row) => row.priority === priority)?.total || 0) })),
      ...priorityRows.filter((row) => !known.includes(row.priority)).map((row) => ({ priority: row.priority || 'Sin prioridad', total: Number(row.total) }))
    ];

    res.json({ ...rows[0], categories, priorities });
  } catch (error) { next(error); }
}