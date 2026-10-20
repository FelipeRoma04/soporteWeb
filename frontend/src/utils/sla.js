// Estado del plazo de un ticket a partir de lo que calcula la API: sla_due_at (fecha límite) y sla_hours (horas de plazo).
// Un ticket vencido NO desaparece ni cambia de estado: solo se marca. Si se cierra tarde, queda marcado como "Resuelto fuera de plazo".
function formatDuration(ms) {
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.round(hours / 24)} d`;
}

export function slaInfo(ticket, now = Date.now()) {
  if (!ticket?.sla_due_at) return null;
  const due = new Date(ticket.sla_due_at).getTime();
  const total = Number(ticket.sla_hours || 0) * 3600000;

  if (ticket.status === 'Cerrado') {
    const closedAt = new Date(ticket.updated_at).getTime();
    return closedAt > due
      ? { state: 'late', tone: 'red', label: 'Resuelto fuera de plazo', detail: `Se cerró ${formatDuration(closedAt - due)} después del plazo` }
      : { state: 'ok', tone: 'green', label: 'Resuelto a tiempo', detail: 'Se cerró dentro del plazo' };
  }
  const left = due - now;
  if (left < 0) return { state: 'overdue', tone: 'red', label: 'Vencido', detail: `Venció hace ${formatDuration(-left)}` };
  if (left <= Math.max(total * 0.25, 3600000)) return { state: 'soon', tone: 'amber', label: `Vence en ${formatDuration(left)}`, detail: `Vence en ${formatDuration(left)}` };
  return { state: 'ok', tone: 'neutral', label: `Vence en ${formatDuration(left)}`, detail: `Vence en ${formatDuration(left)}` };
}