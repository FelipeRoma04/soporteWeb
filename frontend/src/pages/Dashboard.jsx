import { Activity, Ticket } from 'lucide-react';
import Charts from '../components/Charts.jsx';
import MetricsCard from '../components/MetricsCard.jsx';

export default function Dashboard({ onNew, stats, user, children }) {
  return (
    <section className="page-body dashboard-page">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">SYSPULSE · RESUMEN DE SOPORTE</p>
          <h2>Hola, {user?.name} <span className="wave">✦</span></h2>
          <p className="muted">Aquí tienes un resumen de tus solicitudes.</p>
        </div>
        <button className="primary-button" onClick={onNew}>
          <Ticket size={17} />Nuevo ticket
        </button>
      </div>
      <div className="stat-grid">
        <MetricsCard label="Total de tickets" value={stats.total || 0} trend="Registrados en la base" icon={<Ticket />} />
        <MetricsCard label="Abiertos" value={stats.open || 0} trend="Nuevos tickets" icon={<Activity />} color="blue" />
        <MetricsCard label="Pendientes" value={stats.pending || 0} trend="En progreso" icon={<Activity />} />
        <MetricsCard
          label="Resueltos"
          value={stats.closed || 0}
          trend={stats.average_resolution_hours ? `${stats.average_resolution_hours} h promedio` : 'Tickets cerrados'}
          icon={<span className="check-icon">✓</span>}
          color="green"
        />
      </div>
      <Charts>
        <Chart title="Tickets por categoría" items={stats.categories || []} labelKey="category" />
        <Chart title="Tickets por prioridad" items={stats.priorities || []} labelKey="priority" />
      </Charts>
      {children}
    </section>
  );
}

function Chart({ title, items, labelKey }) {
  const max = Math.max(...items.map((item) => Number(item.total)), 1);

  return (
    <section className="panel chart-panel">
      <h3>{title}</h3>
      {items.length ? items.map((item) => {
        const value = Number(item.total);
        const percentage = value / max * 100;

        return (
          <div className="bar-row" key={item[labelKey]}>
            <span title={item[labelKey]}>{item[labelKey]}</span>
            <div className="bar-track" role="meter" aria-label={item[labelKey]} aria-valuemin="0" aria-valuemax={max} aria-valuenow={value}>
              <i style={{ width: `${percentage}%` }} />
            </div>
            <strong>{item.total}</strong>
          </div>
        );
      }) : <div className="chart-empty"><Activity size={20} aria-hidden="true" /><p className="muted">Aún no hay datos.</p></div>}
    </section>
  );
}
