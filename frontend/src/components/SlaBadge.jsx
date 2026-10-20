import { slaInfo } from '../utils/sla.js';

// En las tablas solo se muestra cuando importa (vencido, resuelto tarde o por vencer) para no llenar la lista de etiquetas.
// Con `always` (detalle del ticket) se muestra en cualquier estado.
export default function SlaBadge({ ticket, always = false }) {
  const info = slaInfo(ticket);
  if (!info || (!always && (info.state === 'ok'))) return null;
  return <span className={`badge-soft ${info.tone} sla-badge ${info.state}`} title={info.detail}>{info.label}</span>;
}