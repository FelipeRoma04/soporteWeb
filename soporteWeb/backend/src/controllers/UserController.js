import * as userModel from '../models/User.js';
import * as notificationModel from '../models/Notification.js';

export async function list(req, res, next) {
  try { res.json(await userModel.listUsers()); } catch (error) { next(error); }
}

export async function updateRole(req, res, next) {
  try {
    if (!['user', 'agent', 'admin'].includes(req.body.role)) return res.status(400).json({ message: 'Rol no válido' });
    await userModel.updateRole(req.params.id, req.body.role);
    res.json({ message: 'Rol actualizado' });
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