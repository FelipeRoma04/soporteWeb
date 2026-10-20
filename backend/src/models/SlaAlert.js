import { pool } from '../config/db.js';
import { slaHoursSql } from './Sla.js';

// Tickets sin cerrar cuyo plazo ya pasó y de los que todavía no se avisó. Insertar en ticket_sla_alerts "reserva" cada ticket
// en la misma sentencia (ON CONFLICT DO NOTHING), así aunque dos instancias de la API lo revisen a la vez, el aviso sale una sola vez.
export async function claimNewlyOverdueTickets() {
  const { rows } = await pool.query(
    `WITH overdue AS (
       SELECT t.id, t.priority, t.status, t.assigned_to, t.sla_hours
       FROM (SELECT tickets.*, ${slaHoursSql('tickets.priority')} AS sla_hours FROM tickets) t
       LEFT JOIN ticket_sla_alerts a ON a.ticket_id = t.id
       WHERE t.status <> 'Cerrado' AND a.ticket_id IS NULL
         AND t.created_at + t.sla_hours * INTERVAL '1 hour' < CURRENT_TIMESTAMP
     ), claimed AS (
       INSERT INTO ticket_sla_alerts (ticket_id) SELECT id FROM overdue ON CONFLICT (ticket_id) DO NOTHING RETURNING ticket_id
     )
     SELECT o.id, o.priority, o.status, o.assigned_to, o.sla_hours FROM overdue o JOIN claimed c ON c.ticket_id = o.id ORDER BY o.id`
  );
  return rows;
}

export async function listActiveUserIdsByRole(role) {
  const { rows } = await pool.query('SELECT id FROM users WHERE is_active = TRUE AND role = $1', [role]);
  return rows.map((row) => row.id);
}