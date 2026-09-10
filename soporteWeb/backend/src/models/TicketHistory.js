import { pool } from '../config/db.js';

export async function record(ticketId, userId, action) { await pool.execute('INSERT INTO ticket_history (ticket_id, user_id, action) VALUES (?, ?, ?)', [ticketId, userId, action]); }