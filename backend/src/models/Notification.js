import { pool } from '../config/db.js';

export async function listForUser(userId) { const [rows] = await pool.execute('SELECT id, message, ticket_id, read_at, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30', [userId]); return rows; }
export async function markAsRead(notificationId, userId) { await pool.execute('UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? AND read_at IS NULL', [notificationId, userId]); }
export async function markAllAsRead(userId) { await pool.execute('UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL', [userId]); }
export async function create(userId, ticketId, message) { await pool.execute('INSERT INTO notifications (user_id, ticket_id, message) VALUES (?, ?, ?)', [userId, ticketId, message]); }
export async function createMany(userIds, ticketId, message) {
  if (!userIds.length) return;
  await pool.query('INSERT INTO notifications (user_id, ticket_id, message) VALUES ?', [userIds.map((userId) => [userId, ticketId, message])]);
}