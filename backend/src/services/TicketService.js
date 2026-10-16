import * as ticketModel from '../models/Ticket.js';
import * as notificationModel from '../models/Notification.js';
import * as historyModel from '../models/TicketHistory.js';
import * as categoryModel from '../models/Category.js';
import * as userModel from '../models/User.js';
import { normalizeCommentBody, MAX_COMMENT_LENGTH } from '../models/Comment.js';
import { normalizeTicketInput, TICKET_STATUSES, TICKET_PRIORITIES } from '../models/Ticket.js';
import { ROLES } from '../models/Role.js';

function serviceError(message, status) { const error = new Error(message); error.status = status; return error; }

// Avisa a agentes y administradores activos (menos a quien lo creó) de que hay un ticket nuevo.
// Es un extra: si falla, el ticket ya se creó y no debe devolverse un error.
async function notifyStaffOfNewTicket(ticket, creatorId) {
  try {
    const staffIds = (await userModel.listActiveStaffIds()).filter((id) => id !== creatorId);
    await notificationModel.createMany(staffIds, ticket.id, `Nuevo ticket #${ticket.id} de ${ticket.requester_name}: ${ticket.subject}`.slice(0, 200));
  } catch (error) {
    console.error('No se pudo notificar el nuevo ticket al personal', error);
  }
}

export const listForUser = (user) => ticketModel.findTicketsForUser(user);
export async function create(input, userId) {
  const ticket = normalizeTicketInput(input);
  if (!ticket.subject || !ticket.description) throw serviceError('Asunto y descripción son obligatorios', 400);
  if (!TICKET_PRIORITIES.includes(ticket.priority)) throw serviceError('Prioridad no válida', 400);
  // La categoría se guarda con el nombre exacto de la tabla "categories": evita variantes ("acceso"/"Acceso")
  // que partirían las estadísticas en barras distintas.
  const category = await categoryModel.resolveCategoryName(ticket.category);
  if (!category) throw serviceError('Categoría no válida', 400);
  const created = await ticketModel.createTicket({ ...ticket, category }, userId);
  await historyModel.record(created.id, userId, 'Ticket creado');
  await notifyStaffOfNewTicket(created, userId);
  return created;
}
export async function updateStatus(ticketId, status, user) { if (!TICKET_STATUSES.includes(status)) throw serviceError('Estado de ticket no válido', 400); const ticket = await ticketModel.findTicketById(ticketId); if (!ticket) throw serviceError('Ticket no encontrado', 404); await ticketModel.updateStatus(ticket.id, status, user.id); await historyModel.record(ticket.id, user.id, `Estado cambiado a ${status}`); await notificationModel.create(ticket.user_id, ticket.id, `Tu ticket #${ticket.id} cambió a: ${status}`); }
export async function listComments(ticketId, user) { const ticket = await ticketModel.findTicketById(ticketId); if (!ticket) throw serviceError('Ticket no encontrado', 404); if (user.role === ROLES.USER && ticket.user_id !== user.id) throw serviceError('No puedes ver los comentarios de este ticket', 403); return ticketModel.findComments(ticket.id); }
export async function listHistory(ticketId, user) { const ticket = await ticketModel.findTicketById(ticketId); if (!ticket) throw serviceError('Ticket no encontrado', 404); if (user.role === ROLES.USER && ticket.user_id !== user.id) throw serviceError('No puedes ver el historial de este ticket', 403); return historyModel.findByTicket(ticket.id); }
export async function addComment(ticketId, body, user) { const commentBody = normalizeCommentBody(body); if (!commentBody) throw serviceError('El comentario es obligatorio', 400); if (commentBody.length > MAX_COMMENT_LENGTH) throw serviceError(`El comentario no puede superar ${MAX_COMMENT_LENGTH} caracteres`, 400); const ticket = await ticketModel.findTicketById(ticketId); if (!ticket) throw serviceError('Ticket no encontrado', 404); if (user.role === ROLES.USER && ticket.user_id !== user.id) throw serviceError('No puedes comentar este ticket', 403); const comment = await ticketModel.addComment(ticket.id, user.id, commentBody); await historyModel.record(ticket.id, user.id, 'Comentario agregado'); if (user.id !== ticket.user_id) await notificationModel.create(ticket.user_id, ticket.id, `Hay un nuevo comentario en tu ticket #${ticket.id}`); else if (ticket.assigned_to) await notificationModel.create(ticket.assigned_to, ticket.id, `El solicitante respondió en el ticket #${ticket.id}`); return comment; }