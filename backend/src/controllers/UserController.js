import * as userModel from '../models/User.js';
import * as notificationModel from '../models/Notification.js';
import { ALL_ROLES } from '../models/Role.js';

const LAST_ADMIN_MESSAGE = 'Debe quedar al menos un administrador activo.';

function parseUserId(value) {
  const userId = Number(value);
  return Number.isSafeInteger(userId) && userId >= 1 ? userId : null;
}

// Traduce el resultado del modelo ('ok' | 'not_found' | 'last_admin') a la respuesta HTTP.
function sendChangeResult(res, result, successMessage) {
  if (result === 'not_found') return res.status(404).json({ message: 'Usuario no encontrado' });
  if (result === 'last_admin') return res.status(409).json({ message: LAST_ADMIN_MESSAGE });
  return res.json({ message: successMessage });
}

export async function list(req, res, next) {
  try { res.json(await userModel.listUsers()); } catch (error) { next(error); }
}

export async function updateRole(req, res, next) {
  try {
    const userId = parseUserId(req.params.id);
    if (!userId) return res.status(400).json({ message: 'Usuario no válido' });
    if (!ALL_ROLES.includes(req.body.role)) return res.status(400).json({ message: 'Rol no válido' });
    if (userId === req.user.id) return res.status(403).json({ message: 'No puedes cambiar tu propio rol' });
    sendChangeResult(res, await userModel.updateRole(userId, req.body.role), 'Rol actualizado');
  } catch (error) { next(error); }
}

// Borrado lógico: desactiva o reactiva la cuenta. Nunca se borra la fila ni sus tickets.
export async function updateStatus(req, res, next) {
  try {
    const userId = parseUserId(req.params.id);
    if (!userId) return res.status(400).json({ message: 'Usuario no válido' });
    if (typeof req.body.active !== 'boolean') return res.status(400).json({ message: 'Indica si la cuenta debe quedar activa o inactiva' });
    if (userId === req.user.id) return res.status(403).json({ message: 'No puedes desactivar tu propia cuenta' });
    sendChangeResult(res, await userModel.setActive(userId, req.body.active), req.body.active ? 'Usuario reactivado' : 'Usuario desactivado');
  } catch (error) { next(error); }
}

export async function notifications(req, res, next) {
  try { res.json(await notificationModel.listForUser(req.user.id)); } catch (error) { next(error); }
}

export async function markNotificationAsRead(req, res, next) {
  try {
    await notificationModel.markAsRead(req.params.id, req.user.id);
    res.json({ message: 'Notificación marcada como leída' });
  } catch (error) { next(error); }
}

export async function markAllNotificationsAsRead(req, res, next) {
  try {
    await notificationModel.markAllAsRead(req.user.id);
    res.json({ message: 'Notificaciones marcadas como leídas' });
  } catch (error) { next(error); }
}