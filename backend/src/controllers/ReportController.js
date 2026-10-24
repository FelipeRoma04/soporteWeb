import * as reportModel from '../models/Report.js';
import { toCsv } from '../utils/csv.js';
import { toXlsxBuffer } from '../utils/xlsx.js';
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

const today = () => new Date().toISOString().slice(0, 10);
const NO_STORE = { 'Cache-Control': 'no-store' };

const CSV_HEADERS = ['Ticket', 'Asunto', 'Descripción', 'Categoría', 'Prioridad', 'Estado', 'Solicitante', 'Atendido por', 'Creado', 'Cerrado', 'Horas de resolución', 'Plazo (h)', 'Estado del plazo', 'Calificación', 'Comentario de la calificación'];

export async function exportTickets(req, res, next) {
  try {
    const filters = await readFilters(req, res);
    if (!filters) return;
    const rows = await reportModel.exportRows(filters);
    const csv = toCsv(CSV_HEADERS, rows.map((row) => [`TK-${row.id}`, row.subject, row.description, row.category, row.priority, row.status, row.requester, row.agent || 'Sin asignar', row.created_at, row.closed_at, row.resolution_hours, row.sla_hours, row.sla_state, row.rating, row.rating_comment]));
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="tickets-${today()}.csv"`, ...NO_STORE });
    res.send(csv);
  } catch (error) { next(error); }
}

const XLSX_COLUMNS = [
  { header: 'Ticket', key: 'ticket' },
  { header: 'Asunto', key: 'subject', wrap: true, maxWidth: 50 },
  { header: 'Descripción', key: 'description', wrap: true, maxWidth: 60 },
  { header: 'Categoría', key: 'category' },
  { header: 'Prioridad', key: 'priority' },
  { header: 'Estado', key: 'status' },
  { header: 'Solicitante', key: 'requester' },
  { header: 'Atendido por', key: 'agent' },
  { header: 'Creado', key: 'created_at', type: 'datetime' },
  { header: 'Cerrado', key: 'closed_at', type: 'datetime' },
  { header: 'Horas de resolución', key: 'resolution_hours', type: 'number', numFmt: '0.0' },
  { header: 'Plazo (h)', key: 'sla_hours', type: 'number' },
  { header: 'Estado del plazo', key: 'sla_state' },
  { header: 'Calificación', key: 'rating', type: 'number' },
  { header: 'Comentario de la calificación', key: 'rating_comment', wrap: true, maxWidth: 50 }
];

// La consulta devuelve las fechas ya en la zona horaria del usuario como "AAAA-MM-DD HH:MM"; se guardan como fecha real de Excel
// con esa misma hora (sin convertir otra vez), para poder filtrar y ordenar por fecha.
function parseLocalDate(text) {
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(text || '');
  return match ? new Date(Date.UTC(+match[1], +match[2] - 1, +match[3], +match[4], +match[5])) : null;
}

export async function exportTicketsXlsx(req, res, next) {
  try {
    const filters = await readFilters(req, res);
    if (!filters) return;
    const rows = (await reportModel.exportRows(filters)).map((row) => ({
      ticket: `TK-${row.id}`,
      subject: row.subject,
      description: row.description,
      category: row.category,
      priority: row.priority,
      status: row.status,
      requester: row.requester,
      agent: row.agent || 'Sin asignar',
      created_at: parseLocalDate(row.created_at),
      closed_at: parseLocalDate(row.closed_at),
      resolution_hours: row.resolution_hours === null ? null : Number(row.resolution_hours),
      sla_hours: row.sla_hours,
      sla_state: row.sla_state,
      rating: row.rating,
      rating_comment: row.rating_comment
    }));
    const buffer = await toXlsxBuffer({ sheetName: 'Tickets', columns: XLSX_COLUMNS, rows });
    res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="tickets-${today()}.xlsx"`, ...NO_STORE });
    res.send(buffer);
  } catch (error) { next(error); }
}