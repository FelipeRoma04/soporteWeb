import { pool } from '../config/db.js';

export async function summary(req, res, next) {
  try {
    const filter = req.user.role === 'user' ? 'WHERE user_id = ?' : '';
    const params = req.user.role === 'user' ? [req.user.id] : [];
    const [rows] = await pool.execute(`SELECT COUNT(*) total, COALESCE(SUM(status = 'Abierto'), 0) open, COALESCE(SUM(status = 'En progreso'), 0) pending, COALESCE(SUM(status = 'Cerrado'), 0) closed, ROUND(AVG(CASE WHEN status = 'Cerrado' THEN TIMESTAMPDIFF(HOUR, created_at, updated_at) END), 1) average_resolution_hours FROM tickets ${filter}`, params);
    const [categories] = await pool.execute(`SELECT category, COUNT(*) total FROM tickets ${filter} GROUP BY category ORDER BY total DESC`, params);
    const [priorities] = await pool.execute(`SELECT priority, COUNT(*) total FROM tickets ${filter} GROUP BY priority ORDER BY total DESC`, params);
    res.json({ ...rows[0], categories, priorities });
  } catch (error) { next(error); }
}
