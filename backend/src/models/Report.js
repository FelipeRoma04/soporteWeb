import { pool } from '../config/db.js';
import { TICKET_PRIORITIES } from './Ticket.js';
import { buildTicketWhere } from '../utils/reportFilters.js';

const HOURS = 'EXTRACT(EPOCH FROM (t.updated_at - t.created_at)) / 3600';
const MAX_MONTHS = 24;
const MAX_EXPORT_ROWS = 20000;
const round1 = (value) => (value === null || value === undefined ? null : Math.round(Number(value) * 10) / 10);

export async function isKnownTimeZone(name) {
  const { rowCount } = await pool.query('SELECT 1 FROM pg_timezone_names WHERE name = $1', [name]);
  return rowCount > 0;
}

// Rellena con ceros los meses sin tickets entre el primero y el último, para que el gráfico no "salte" meses.
function fillMonths(rows) {
  if (!rows.length) return [];
  const byMonth = new Map(rows.map((row) => [row.month, row]));
  const [firstYear, firstMonth] = rows[0].month.split('-').map(Number);
  const [lastYear, lastMonth] = rows[rows.length - 1].month.split('-').map(Number);
  const months = [];
  for (let year = firstYear, month = firstMonth; year < lastYear || (year === lastYear && month <= lastMonth); month += 1) {
    if (month > 12) { month = 1; year += 1; }
    const key = `${year}-${String(month).padStart(2, '0')}`;
    months.push({ month: key, created: byMonth.get(key)?.created || 0, closed: byMonth.get(key)?.closed || 0 });
  }
  return months.slice(-MAX_MONTHS);
}

export async function summary(filters) {
  const { where, params } = buildTicketWhere(filters);
  const [totals, monthly, categories, priorities, resolution, agents, satisfaction] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::INTEGER AS total,
        COUNT(*) FILTER (WHERE t.status = 'Abierto')::INTEGER AS open,
        COUNT(*) FILTER (WHERE t.status = 'En progreso')::INTEGER AS in_progress,
        COUNT(*) FILTER (WHERE t.status = 'Cerrado')::INTEGER AS closed,
        AVG(${HOURS}) FILTER (WHERE t.status = 'Cerrado') AS average_resolution_hours
       FROM tickets t ${where}`, params),
    pool.query(
      `SELECT TO_CHAR(t.created_at AT TIME ZONE $1, 'YYYY-MM') AS month, COUNT(*)::INTEGER AS created,
        COUNT(*) FILTER (WHERE t.status = 'Cerrado')::INTEGER AS closed
       FROM tickets t ${where} GROUP BY 1 ORDER BY 1`, params),
    pool.query(
      `SELECT COALESCE(NULLIF(TRIM(t.category), ''), 'General') AS category, COUNT(*)::INTEGER AS total
       FROM tickets t ${where} GROUP BY 1 ORDER BY total DESC, category ASC LIMIT 8`, params),
    pool.query(`SELECT t.priority, COUNT(*)::INTEGER AS total FROM tickets t ${where} GROUP BY t.priority`, params),
    pool.query(
      `SELECT t.priority, COUNT(*)::INTEGER AS closed, AVG(${HOURS}) AS average_hours
       FROM tickets t ${where} AND t.status = 'Cerrado' GROUP BY t.priority`, params),
    pool.query(
      `SELECT u.id, u.name, COUNT(*)::INTEGER AS assigned,
        COUNT(*) FILTER (WHERE t.status = 'Cerrado')::INTEGER AS closed,
        AVG(${HOURS}) FILTER (WHERE t.status = 'Cerrado') AS average_resolution_hours,
        AVG(r.rating) AS average_rating, COUNT(r.rating)::INTEGER AS rating_count
       FROM tickets t JOIN users u ON u.id = t.assigned_to LEFT JOIN ticket_ratings r ON r.ticket_id = t.id
       ${where} AND t.assigned_to IS NOT NULL
       GROUP BY u.id, u.name ORDER BY closed DESC, assigned DESC, u.name ASC`, params),
    pool.query(
      `SELECT r.rating, COUNT(*)::INTEGER AS total FROM tickets t JOIN ticket_ratings r ON r.ticket_id = t.id ${where} GROUP BY r.rating`, params)
  ]);

  const stars = [5, 4, 3, 2, 1].map((rating) => ({ rating, total: satisfaction.rows.find((row) => row.rating === rating)?.total || 0 }));
  const ratingCount = stars.reduce((sum, row) => sum + row.total, 0);
  const ratingSum = stars.reduce((sum, row) => sum + row.rating * row.total, 0);
  const priorityOrder = [...TICKET_PRIORITIES].reverse();

  return {
    filters: filters,
    totals: { ...totals.rows[0], average_resolution_hours: round1(totals.rows[0].average_resolution_hours) },
    by_month: fillMonths(monthly.rows),
    by_category: categories.rows,
    by_priority: priorityOrder.map((priority) => ({ priority, total: priorities.rows.find((row) => row.priority === priority)?.total || 0 })),
    resolution_by_priority: priorityOrder.map((priority) => {
      const row = resolution.rows.find((item) => item.priority === priority);
      return { priority, closed: row?.closed || 0, average_hours: round1(row?.average_hours) };
    }),
    agents: agents.rows.map((row) => ({ ...row, average_resolution_hours: round1(row.average_resolution_hours), average_rating: round1(row.average_rating) })),
    satisfaction: { average: ratingCount ? Math.round((ratingSum / ratingCount) * 10) / 10 : null, count: ratingCount, distribution: stars }
  };
}

// Filas listas para el CSV (la zona horaria ya aplicada a las fechas).
export async function exportRows(filters) {
  const { where, params } = buildTicketWhere(filters);
  const { rows } = await pool.query(
    `SELECT t.id, t.subject, t.description, COALESCE(NULLIF(TRIM(t.category), ''), 'General') AS category, t.priority, t.status,
        requester.name AS requester, agent.name AS agent,
        TO_CHAR(t.created_at AT TIME ZONE $1, 'YYYY-MM-DD HH24:MI') AS created_at,
        CASE WHEN t.status = 'Cerrado' THEN TO_CHAR(t.updated_at AT TIME ZONE $1, 'YYYY-MM-DD HH24:MI') END AS closed_at,
        CASE WHEN t.status = 'Cerrado' THEN ROUND((${HOURS})::NUMERIC, 1) END AS resolution_hours,
        r.rating, r.comment AS rating_comment
       FROM tickets t JOIN users requester ON requester.id = t.user_id LEFT JOIN users agent ON agent.id = t.assigned_to
       LEFT JOIN ticket_ratings r ON r.ticket_id = t.id
       ${where} ORDER BY t.created_at DESC LIMIT ${MAX_EXPORT_ROWS}`, params);
  return rows;
}
