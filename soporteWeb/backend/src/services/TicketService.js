import * as ticketModel from '../models/Ticket.js';
import * as notificationModel from '../models/Notification.js';
import * as historyModel from '../models/TicketHistory.js';
import { normalizeCommentBody } from '../models/Comment.js';
import { normalizeTicketInput, TICKET_STATUSES } from '../models/Ticket.js';
import { ROLES } from '../models/Role.js';

function serviceError(message, status) { const error = new Error(message); error.status = status; return error; }
export const listForUser = (user) => ticketModel.findTicketsForUser(user);
export async function create(input, userId) { const ticket = normalizeTicketInput(input); if (!ticket.subject || !ticket.description) throw serviceError('Asunto y descripción son obligatorios', 400); const created = await ticketModel.createTicket(ticket, userId); await historyModel.record(created.id, userId, 'Ticket creado'); return created; }
export async function updateStatus(ticketId, status, user) { if (!TICKET_STATUSES.includes(status)) throw serviceError('Estado de ticket no válido', 400); const ticket = await ticketModel.findTicketById(ticketId); if (!ticket) throw serviceError('Ticket no encontrado', 404); await ticketModel.updateStatus(ticket.id, status, user.id); await historyModel.record(ticket.id, user.id, `Estado cambiado a ${status}`); await notificationModel.create(ticket.user_id, ticket.id, `Tu ticket #${ticket.id} cambió a: ${status}`); }
export const listComments = (ticketId) => ticketModel.findComments(ticketId);
export async function addComment(ticketId, body, user) { const commentBody = normalizeCommentBody(body); if (!commentBody) throw serviceError('El comentario es obligatorio', 400); const ticket = await ticketModel.findTicketById(ticketId); if (!ticket) throw serviceError('Ticket no encontrado', 404); if (user.role === ROLES.USER && ticket.user_id !== user.id) throw serviceError('No puedes comentar este ticket', 403); const comment = await ticketModel.addComment(ticket.id, user.id, commentBody); await historyModel.record(ticket.id, user.id, 'Comentario agregado'); if (user.id !== ticket.user_id) await notificationModel.create(ticket.user_id, ticket.id, `Hay un nuevo comentario en tu ticket #${ticket.id}`); return comment; }
