// Plazo máximo de resolución según la prioridad del ticket (en horas). Es la única fuente de estos valores:
// la API los usa para avisar y la pantalla recibe `sla_hours` y `sla_due_at` ya calculados en cada ticket.
export const SLA_HOURS = Object.freeze({ Urgente: 4, Alta: 8, Media: 24, Baja: 72 });
const DEFAULT_SLA_HOURS = SLA_HOURS.Media;

export const slaHoursFor = (priority) => SLA_HOURS[priority] ?? DEFAULT_SLA_HOURS;

// Fragmento SQL (sin datos del usuario: solo constantes de arriba) que devuelve las horas de plazo de la columna priority.
export function slaHoursSql(column = 't.priority') {
  const branches = Object.entries(SLA_HOURS).map(([priority, hours]) => `WHEN '${priority}' THEN ${hours}`).join(' ');
  return `(CASE ${column} ${branches} ELSE ${DEFAULT_SLA_HOURS} END)`;
}