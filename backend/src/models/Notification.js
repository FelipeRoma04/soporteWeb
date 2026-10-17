import { pool } from '../config/db.js';

export async function listForUser(userId) { const { rows } = await pool.query('SELECT id, message, ticket_id, read_at, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30', [userId]); return rows; }
export async function markAsRead(notificationId, userId) { await pool.query('UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 AND read_at IS NULL', [notificationId, userId]); }
export async function markAllAsRead(userId) { await pool.query('UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND read_at IS NULL', [userId]); }
export async function create(userId, ticketId, message) { await pool.query('INSERT INTO notifications (user_id, ticket_id, message) VALUES ($1, $2, $3)', [userId, ticketId, message]); }
export async function createMany(userIds, ticketId, message) {
  if (!userIds.length) return;
  const values = [];
  const placeholders = userIds.map((userId, index) => {
    const parameter = index * 3 + 1;
    values.push(userId, ticketId, message);
    return `($${parameter}, $${parameter + 1}, $${parameter + 2})`;
  });
  await pool.query(`INSERT INTO notifications (user_id, ticket_id, message) VALUES ${placeholders.join(', ')}`, values);
}