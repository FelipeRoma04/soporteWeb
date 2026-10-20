import * as reportModel from '../models/Report.js';
import { toCsv } from '../utils/csv.js';
import { parseReportFilters } from '../utils/reportFilters.js';

// Valida los filtros y que la zona horaria exista en PostgreSQL; si no, responde 400 y devuelve null.
async function readFilters(req, res) {
  const { filters, error } = parseReportFilters(req.query);
  if (error) { res.status(400).json({ message: error }); return null; }
  if (!(await reportModel.isKnownTimeZone(filters.tz))) { res.status(400).json({ message: 'Zona horaria no válida' }); return null; }
  return filters;
}

export async function summary(req, res, next) {
  try {
    const filters = await readFilters(req, res);
    if (filters) res.json(await reportModel.summary(filters));
  } catch (error) { next(error); }
}

const CSV_HEADERS = ['Ticket', 'Asunto', 'Descripción', 'Categoría', 'Prioridad', 'Estado', 'Solicitante', 'Atendido por', 'Creado', 'Cerrado', 'Horas de resolución', 'Calificación', 'Comentario de la calificación'];

export async function exportTickets(req, res, next) {
  try {
    const filters = await readFilters(req, res);
    if (!filters) return;
    const rows = await reportModel.exportRows(filters);
    const csv = toCsv(CSV_HEADERS, rows.map((row) => [`TK-${row.id}`, row.subject, row.description, row.category, row.priority, row.status, row.requester, row.agent, row.created_at, row.closed_at, row.resolution_hours, row.rating, row.rating_comment]));
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="tickets-${new Date().toISOString().slice(0, 10)}.csv"`, 'Cache-Control': 'no-store' });
    res.send(csv);
  } catch (error) { next(error); }
}
