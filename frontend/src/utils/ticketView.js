// Filtros y orden de la lista de tickets. Todo se hace en el navegador sobre los tickets ya cargados (no toca la API ni la base de datos).
const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });
const time = (value) => (value ? new Date(value).getTime() : 0);
const DAY = 24 * 60 * 60 * 1000;
const PRIORITY_RANK = { Urgente: 4, Alta: 3, Media: 2, Baja: 1 };
const STATUS_RANK = { Abierto: 0, 'En progreso': 1, Cerrado: 2 };

export const STATUS_OPTIONS = ['Abierto', 'En progreso', 'Cerrado'];
export const PRIORITY_OPTIONS = ['Urgente', 'Alta', 'Media', 'Baja'];
export const SLA_OPTIONS = [
  { value: 'overdue', label: 'Vencidos sin resolver' },
  { value: 'ok', label: 'Abiertos en plazo' },
  { value: 'ontime', label: 'Resueltos a tiempo' },
  { value: 'late', label: 'Resueltos fuera de plazo' }
];
export const PERIOD_OPTIONS = [
  { value: 'today', label: 'Hoy' },
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' }
];
export const ASSIGNMENT_OPTIONS = [
  { value: 'unassigned', label: 'Sin agente asignado' },
  { value: 'assigned', label: 'Con agente asignado' }
];
const SORT_BASE = [
  { value: 'created_desc', label: 'Más nuevos primero' },
  { value: 'created_asc', label: 'Más antiguos primero' },
  { value: 'updated_desc', label: 'Actividad reciente' },
  { value: 'priority_desc', label: 'Prioridad (urgente primero)' },
  { value: 'sla_asc', label: 'Vencimiento del plazo (más urgente)' },
  { value: 'status_asc', label: 'Estado (abiertos primero)' },
  { value: 'category_asc', label: 'Categoría (A-Z)' }
];
export const sortOptions = (isStaff) => (isStaff ? [...SORT_BASE, { value: 'requester_asc', label: 'Solicitante (A-Z)' }] : SORT_BASE);

export const INITIAL_TICKET_VIEW = { category: '', status: '', priority: '', sla: '', period: '', assignment: '', mine: false, sort: 'created_desc' };

// Estado del plazo (SLA) de un ticket: vencido, en plazo, resuelto a tiempo o resuelto fuera de plazo.
export function slaState(ticket, now = Date.now()) {
  const due = ticket.sla_due_at ? time(ticket.sla_due_at) : ticket.sla_hours ? time(ticket.created_at) + ticket.sla_hours * 3600000 : null;
  if (!due) return { key: 'none', due: null };
  if (ticket.status === 'Cerrado') return { key: time(ticket.updated_at) > due ? 'late' : 'ontime', due };
  return { key: now > due ? 'overdue' : 'ok', due };
}

export function ticketFilterOptions(tickets) {
  return { categories: [...new Set(tickets.map((ticket) => ticket.category).filter(Boolean))].sort(collator.compare) };
}

// «Gestionados por mí»: los que el agente/admin creó o tiene asignados.
const isMine = (ticket, user) => user?.id != null && (Number(ticket.assigned_to) === Number(user.id) || Number(ticket.user_id) === Number(user.id));

function comparator(sort, now) {
  const newest = (a, b) => time(b.created_at) - time(a.created_at);
  switch (sort) {
    case 'created_asc': return (a, b) => time(a.created_at) - time(b.created_at);
    case 'updated_desc': return (a, b) => time(b.updated_at) - time(a.updated_at) || newest(a, b);
    case 'priority_desc': return (a, b) => (PRIORITY_RANK[b.priority] || 0) - (PRIORITY_RANK[a.priority] || 0) || newest(a, b);
    case 'status_asc': return (a, b) => (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9) || newest(a, b);
    case 'category_asc': return (a, b) => collator.compare(a.category, b.category) || newest(a, b);
    case 'requester_asc': return (a, b) => collator.compare(a.requester_name || '', b.requester_name || '') || newest(a, b);
    case 'sla_asc': return (a, b) => {
      const x = slaState(a, now); const y = slaState(b, now);
      const open = (s, t) => t.status !== 'Cerrado' && s.due;
      if (open(x, a) && open(y, b)) return x.due - y.due;
      return (open(y, b) ? 1 : 0) - (open(x, a) ? 1 : 0) || newest(a, b); // abiertos con plazo primero, cerrados al final
    };
    default: return newest;
  }
}

export function applyTicketView(tickets, view, user, isStaff) {
  const now = Date.now();
  const term = (view.search || '').trim().toLowerCase();
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const since = { today: startOfToday.getTime(), '7d': now - 7 * DAY, '30d': now - 30 * DAY }[view.period];
  return tickets
    .filter((ticket) => !term || `${ticket.subject} ${ticket.id} ${ticket.category} ${ticket.status} ${ticket.priority} ${ticket.requester_name || ''} ${ticket.description || ''}`.toLowerCase().includes(term))
    .filter((ticket) => !view.category || ticket.category === view.category)
    .filter((ticket) => !view.status || ticket.status === view.status)
    .filter((ticket) => !view.priority || ticket.priority === view.priority)
    .filter((ticket) => !view.sla || slaState(ticket, now).key === view.sla)
    .filter((ticket) => !since || time(ticket.created_at) >= since)
    .filter((ticket) => !isStaff || !view.mine || isMine(ticket, user))
    .filter((ticket) => !isStaff || !view.assignment || (view.assignment === 'unassigned' ? !ticket.assigned_to : Boolean(ticket.assigned_to)))
    .sort(comparator(view.sort, now));
}

export const isTicketViewActive = (view, isStaff) => Boolean(
  (view.search || '').trim() || view.category || view.status || view.priority || view.sla || view.period
  || (isStaff && (view.mine || view.assignment)) || view.sort !== INITIAL_TICKET_VIEW.sort
);