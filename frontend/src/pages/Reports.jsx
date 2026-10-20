import { useEffect, useMemo, useState } from 'react';
import { Clock, Download, Star, Ticket } from 'lucide-react';
import MetricsCard from '../components/MetricsCard.jsx';
import StarRating from '../components/StarRating.jsx';
import { downloadTicketsCsv, getReportSummary } from '../services/reportService.js';

const STATUSES = ['Abierto', 'En progreso', 'Cerrado'];
const PRIORITIES = ['Baja', 'Media', 'Alta', 'Urgente'];
const EMPTY_FILTERS = { from: '', to: '', status: '', category: '', priority: '' };

const timeZone = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } })();
const monthLabel = (key) => { const [year, month] = key.split('-').map(Number); return new Date(year, month - 1, 1).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }); };
const hours = (value) => (value === null || value === undefined ? '—' : `${value} h`);
// Solo se envían los filtros que tienen valor; la zona horaria hace que "desde/hasta" cuenten por días de quien consulta.
const toParams = (filters) => ({ ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)), tz: timeZone });

export default function Reports({ categories = [] }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const hasFilters = Object.values(filters).some(Boolean);
  const update = (field) => (event) => setFilters((current) => ({ ...current, [field]: event.target.value }));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // Pequeña espera para no consultar en cada tecla al escribir una fecha.
    const timer = setTimeout(() => {
      getReportSummary(toParams(filters))
        .then((response) => { if (!cancelled) { setData(response.data); setError(''); } })
        .catch((requestError) => { if (!cancelled) setError(requestError.response?.data?.message || 'No se pudieron cargar los reportes.'); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [filters]);

  async function download() {
    setDownloading(true);
    setError('');
    try {
      const response = await downloadTicketsCsv(toParams(filters));
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tickets-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('No se pudo descargar el archivo. Inténtalo de nuevo.');
    } finally {
      setDownloading(false);
    }
  }

  const categoryOptions = useMemo(() => [...new Set(['General', ...categories.map((category) => category.name)])].sort((a, b) => a.localeCompare(b)), [categories]);
  const totals = data?.totals;
  const satisfaction = data?.satisfaction;
  const resolvedShare = totals?.total ? Math.round((totals.closed / totals.total) * 100) : 0;

  return <section className="page-body reports-page" aria-busy={loading}>
    <div className="welcome-row">
      <div><p className="eyebrow">ADMINISTRACIÓN</p><h2>Reportes</h2><p className="muted">Estadísticas de la mesa de soporte y descarga de tickets.</p></div>
      <button type="button" className="primary-button" onClick={download} disabled={downloading || !totals?.total}><Download size={17} />{downloading ? 'Preparando...' : 'Descargar CSV'}</button>
    </div>

    <form className="panel report-filters" onSubmit={(event) => event.preventDefault()} aria-label="Filtros del reporte">
      <label>Desde<input type="date" value={filters.from} max={filters.to || undefined} onChange={update('from')} /></label>
      <label>Hasta<input type="date" value={filters.to} min={filters.from || undefined} onChange={update('to')} /></label>
      <label>Estado<select value={filters.status} onChange={update('status')}><option value="">Todos</option>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
      <label>Categoría<select value={filters.category} onChange={update('category')}><option value="">Todas</option>{categoryOptions.map((name) => <option key={name}>{name}</option>)}</select></label>
      <label>Prioridad<select value={filters.priority} onChange={update('priority')}><option value="">Todas</option>{PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}</select></label>
      <button type="button" className="text-button report-clear" onClick={() => setFilters(EMPTY_FILTERS)} disabled={!hasFilters}>Limpiar filtros</button>
    </form>

    {error && <p className="auth-error" role="alert">{error}</p>}

    {data && <div className={loading ? 'report-body is-loading' : 'report-body'}>
      <div className="stat-grid">
        <MetricsCard label="Tickets en el periodo" value={totals.total} trend={hasFilters ? 'Con los filtros aplicados' : 'Todos los registrados'} icon={<Ticket />} />
        <MetricsCard label="Resueltos" value={totals.closed} trend={`${resolvedShare}% del total`} icon={<span className="check-icon">✓</span>} color="green" />
        <MetricsCard label="Tiempo de resolución" value={totals.average_resolution_hours === null ? '—' : `${totals.average_resolution_hours} h`} trend="Promedio de tickets cerrados" icon={<Clock />} color="blue" />
        <MetricsCard label="Satisfacción" value={satisfaction.average === null ? '—' : satisfaction.average.toFixed(1)} trend={satisfaction.count ? `${satisfaction.count} ${satisfaction.count === 1 ? 'calificación' : 'calificaciones'} de 5` : 'Aún sin calificaciones'} icon={<Star />} />
      </div>

      <div className="chart-grid">
        <section className="panel chart-panel month-panel">
          <h3>Tickets por mes</h3>
          {data.by_month.length ? <>
            <div className="month-chart" role="img" aria-label={`Tickets por mes: ${data.by_month.map((m) => `${monthLabel(m.month)} ${m.created} creados, ${m.closed} cerrados`).join('; ')}`}>
              {(() => {
                const max = Math.max(...data.by_month.flatMap((m) => [m.created, m.closed]), 1);
                return data.by_month.map((m) => <div className="month-col" key={m.month}>
                  <div className="month-bars">
                    <span className="month-bar created" style={{ height: `${(m.created / max) * 100}%` }} title={`${m.created} creados`}><em>{m.created}</em></span>
                    <span className="month-bar closed" style={{ height: `${(m.closed / max) * 100}%` }} title={`${m.closed} cerrados`}><em>{m.closed}</em></span>
                  </div>
                  <small>{monthLabel(m.month)}</small>
                </div>);
              })()}
            </div>
            <div className="month-legend"><span><i className="created" />Creados</span><span><i className="closed" />Cerrados</span></div>
          </> : <p className="muted">No hay tickets con estos filtros.</p>}
        </section>
        <BarList title="Categorías más frecuentes" items={data.by_category} labelKey="category" valueKey="total" />
        <BarList title="Tickets por prioridad" items={data.by_priority} labelKey="priority" valueKey="total" />
        <BarList title="Tiempo de resolución por prioridad" items={data.resolution_by_priority} labelKey="priority" valueKey="average_hours" format={hours} note={(item) => `${item.closed} ${item.closed === 1 ? 'cerrado' : 'cerrados'}`} />
        <BarList title="Calificaciones de la atención" items={data.satisfaction.distribution.map((row) => ({ ...row, label: `${row.rating} ${row.rating === 1 ? 'estrella' : 'estrellas'}` }))} labelKey="label" valueKey="total" empty="Aún no hay calificaciones." hideWhenEmpty={!satisfaction.count} />
      </div>

      <div className="panel ticket-panel">
        <div className="panel-header"><h3>Rendimiento de agentes</h3></div>
        <div className="table-wrap">
          <table className="ticket-table">
            <thead><tr><th>Agente</th><th>Atendidos</th><th>Cerrados</th><th>Tiempo medio</th><th>Calificación</th></tr></thead>
            <tbody>{data.agents.length ? data.agents.map((agent) => <tr key={agent.id}>
              <td data-label="Agente"><strong>{agent.name}</strong></td>
              <td data-label="Atendidos">{agent.assigned}</td>
              <td data-label="Cerrados">{agent.closed}</td>
              <td data-label="Tiempo medio">{hours(agent.average_resolution_hours)}</td>
              <td data-label="Calificación">{agent.rating_count ? <span className="agent-rating"><StarRating value={Math.round(agent.average_rating)} size={14} label="Calificación promedio" /><strong>{agent.average_rating.toFixed(1)}</strong><small className="muted">({agent.rating_count})</small></span> : <span className="muted">Sin calificar</span>}</td>
            </tr>) : <tr className="table-empty-row"><td colSpan="5">Ningún agente ha atendido tickets con estos filtros.</td></tr>}</tbody>
          </table>
        </div>
      </div>
    </div>}
    {!data && loading && <div className="panel empty-state" role="status"><span className="app-loading-indicator" aria-hidden="true" /><h3>Cargando reportes</h3></div>}
  </section>;
}

function BarList({ title, items, labelKey, valueKey, format = (value) => value, note, empty = 'Aún no hay datos.', hideWhenEmpty = false }) {
  const values = items.map((item) => Number(item[valueKey]) || 0);
  const max = Math.max(...values, 1);
  const hasData = !hideWhenEmpty && items.length > 0 && values.some(Boolean);
  return <section className="panel chart-panel report-bars">
    <h3>{title}</h3>
    {hasData ? items.map((item) => {
      const value = Number(item[valueKey]) || 0;
      return <div className="bar-row" key={item[labelKey]}>
        <span title={item[labelKey]}>{item[labelKey]}</span>
        <div className="bar-track" role="meter" aria-label={item[labelKey]} aria-valuemin="0" aria-valuemax={max} aria-valuenow={value}><i style={{ width: `${(value / max) * 100}%` }} /></div>
        <strong title={note ? note(item) : undefined}>{format(item[valueKey])}</strong>
      </div>;
    }) : <p className="muted">{empty}</p>}
  </section>;
}
