import { TICKET_PRIORITIES, TICKET_STATUSES } from '../models/Ticket.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const isRealDate = (value) => DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);

// Valida los filtros de la URL (?from=2026-01-01&to=2026-03-31&status=Cerrado&category=Red&priority=Alta&tz=America/Bogota).
// Devuelve { filters } o { error } con un mensaje listo para mostrar.
export function parseReportFilters(query = {}) {
  const text = (key) => (typeof query[key] === 'string' ? query[key].trim() : '');
  const filters = { from: text('from'), to: text('to'), status: text('status'), category: text('category'), priority: text('priority'), tz: text('tz') || 'UTC' };
  if (filters.from && !isRealDate(filters.from)) return { error: 'La fecha inicial no es válida' };
  if (filters.to && !isRealDate(filters.to)) return { error: 'La fecha final no es válida' };
  if (filters.from && filters.to && filters.from > filters.to) return { error: 'La fecha inicial no puede ser posterior a la final' };
  if (filters.status && !TICKET_STATUSES.includes(filters.status)) return { error: 'Estado no válido' };
  if (filters.priority && !TICKET_PRIORITIES.includes(filters.priority)) return { error: 'Prioridad no válida' };
  if (filters.category.length > 80) return { error: 'Categoría no válida' };
  if (!/^[A-Za-z0-9_+\-/]{1,64}$/.test(filters.tz)) return { error: 'Zona horaria no válida' };
  return { filters };
}

// Arma el WHERE (con parámetros, nunca texto pegado) sobre la tabla tickets con alias "t".
// $1 siempre es la zona horaria: las fechas se interpretan en la zona de quien consulta, no en UTC.
export function buildTicketWhere(filters) {
  const params = [filters.tz];
  // $1 se usa siempre (aunque no haya filtros de fecha): PostgreSQL rechaza parámetros que la consulta no usa.
  const conditions = ['$1::text IS NOT NULL'];
  const add = (sql, value) => { params.push(value); conditions.push(sql.replace('?', `$${params.length}`)); };
  if (filters.from) add("(t.created_at AT TIME ZONE $1)::date >= ?::date", filters.from);
  if (filters.to) add("(t.created_at AT TIME ZONE $1)::date <= ?::date", filters.to);
  if (filters.status) add('t.status = ?', filters.status);
  if (filters.priority) add('t.priority = ?', filters.priority);
  if (filters.category) add('LOWER(TRIM(t.category)) = LOWER(?)', filters.category);
  return { where: `WHERE ${conditions.join(' AND ')}`, params };
}
