import { pool } from '../config/db.js';
import { STAFF_ROLES } from './Role.js';

export const TICKET_STATUSES = Object.freeze(['Abierto', 'En progreso', 'Cerrado']);
export const TICKET_PRIORITIES = Object.freeze(['Baja', 'Media', 'Alta', 'Urgente']);

export function normalizeTicketInput(input = {}) {
  return {
    subject: input.subject?.trim(),
    description: input.description?.trim(),
    category: input.category?.trim() || 'General',
    priority: input.priority || 'Media'
  };
}

// Todas las consultas devuelven también quién solicitó el ticket y con qué rol.
const SELECT_WITH_REQUESTER = 'SELECT t.*, u.name AS requester_name, u.role AS requester_role FROM tickets t JOIN users u ON u.id = t.user_id';

export async function findTicketsForUser(user) {
  const isStaff = STAFF_ROLES.includes(user.role);
  const [rows] = await pool.execute(
    `${SELECT_WITH_REQUESTER} ${isStaff ? '' : 'WHERE t.user_id = ?'} ORDER BY t.created_at DESC`,
    isStaff ? [] : [user.id]
  );
  return rows;
}
export async function createTicket(ticket, userId) {
  const [result] = await pool.execute('INSERT INTO tickets (user_id, subject, description, category, priority) VALUES (?, ?, ?, ?, ?)', [userId, ticket.subject, ticket.description, ticket.category, ticket.priority]);
  const [rows] = await pool.execute(`${SELECT_WITH_REQUESTER} WHERE t.id = ?`, [result.insertId]);
  return rows[0];
}
export async function findTicketById(ticketId) { const [rows] = await pool.execute('SELECT * FROM tickets WHERE id = ?', [ticketId]); return rows[0]; }
export async function updateStatus(ticketId, status, agentId) { await pool.execute('UPDATE tickets SET status = ?, assigned_to = COALESCE(assigned_to, ?) WHERE id = ?', [status, agentId, ticketId]); }
export async function addComment(ticketId, userId, body) { const [result] = await pool.execute('INSERT INTO comments (ticket_id, user_id, body) VALUES (?, ?, ?)', [ticketId, userId, body]); const [rows] = await pool.execute('SELECT c.*, u.name AS author_name FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?', [result.insertId]); return rows[0]; }
export async function findComments(ticketId) { const [rows] = await pool.execute('SELECT c.*, u.name AS author_name FROM comments c JOIN users u ON u.id = c.user_id WHERE c.ticket_id = ? ORDER BY c.created_at ASC', [ticketId]); return rows; }