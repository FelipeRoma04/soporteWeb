import { pool } from '../config/db.js';

export async function findByTicket(ticketId) { const { rows } = await pool.query('SELECT h.id, h.action, h.created_at, u.name AS user_name FROM ticket_history h JOIN users u ON u.id = h.user_id WHERE h.ticket_id = $1 ORDER BY h.created_at ASC, h.id ASC', [ticketId]); return rows; }
export async function record(ticketId, userId, action) { await pool.query('INSERT INTO ticket_history (ticket_id, user_id, action) VALUES ($1, $2, $3)', [ticketId, userId, action]); }