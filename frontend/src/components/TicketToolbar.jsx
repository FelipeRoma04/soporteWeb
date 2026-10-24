import { Search, UserCheck } from 'lucide-react';
import { ASSIGNMENT_OPTIONS, INITIAL_TICKET_VIEW, PERIOD_OPTIONS, PRIORITY_OPTIONS, SLA_OPTIONS, STATUS_OPTIONS, isTicketViewActive, sortOptions, ticketFilterOptions } from '../utils/ticketView.js';

function Filter({ label, value, onChange, allLabel = 'Todos', children }) {
  return <label className="knowledge-select"><span>{label}</span>
    <select value={value} onChange={onChange}>{allLabel && <option value="">{allLabel}</option>}{children}</select>
  </label>;
}

// Misma barra que la base de conocimiento: buscador, filtros y orden. «Gestionados por mí» y «Asignación» solo los ven agentes y admins.
export default function TicketToolbar({ tickets, view, search, onChange, onSearch, shown, isStaff }) {
  const { categories } = ticketFilterOptions(tickets);
  const set = (field) => (event) => onChange({ ...view, [field]: event.target.value });
  const active = isTicketViewActive({ ...view, search }, isStaff);
  const options = (list) => list.map((option) => <option key={option.value} value={option.value}>{option.label}</option>);
  return <div className="knowledge-toolbar ticket-toolbar">
    <div className="ticket-toolbar-top">
      <div className="knowledge-search"><Search size={20} /><input placeholder={isStaff ? 'Buscar por asunto, número o solicitante...' : 'Buscar por asunto o número...'} aria-label="Buscar tickets" value={search} onChange={(event) => onSearch(event.target.value)} /></div>
      {isStaff && <button type="button" className={`ticket-toggle${view.mine ? ' active' : ''}`} aria-pressed={view.mine} title="Tickets que creaste o que tienes asignados" onClick={() => onChange({ ...view, mine: !view.mine })}><UserCheck size={17} />Gestionados por mí</button>}
      {active && <div className="knowledge-toolbar-meta"><small className="muted">{shown} de {tickets.length} tickets</small><button type="button" className="text-button" onClick={() => { onChange(INITIAL_TICKET_VIEW); onSearch(''); }}>Limpiar</button></div>}
    </div>
    <div className="knowledge-filters ticket-filters">
      <Filter label="Estado" value={view.status} onChange={set('status')}>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}</Filter>
      <Filter label="Prioridad" value={view.priority} onChange={set('priority')} allLabel="Todas">{PRIORITY_OPTIONS.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</Filter>
      <Filter label="Categoría" value={view.category} onChange={set('category')} allLabel="Todas">{categories.map((category) => <option key={category} value={category}>{category}</option>)}</Filter>
      <Filter label="Plazo" value={view.sla} onChange={set('sla')}>{options(SLA_OPTIONS)}</Filter>
      <Filter label="Creados" value={view.period} onChange={set('period')} allLabel="Siempre">{options(PERIOD_OPTIONS)}</Filter>
      {isStaff && <Filter label="Asignación" value={view.assignment} onChange={set('assignment')}>{options(ASSIGNMENT_OPTIONS)}</Filter>}
      <Filter label="Ordenar por" value={view.sort} onChange={set('sort')} allLabel="">{options(sortOptions(isStaff))}</Filter>
    </div>
  </div>;
}