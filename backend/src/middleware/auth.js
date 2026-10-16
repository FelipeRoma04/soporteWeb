import jwt from 'jsonwebtoken';
import * as userModel from '../models/User.js';

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Token requerido' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Sesión no válida o expirada' });
  }

  try {
    // El token solo identifica a la persona: el rol y el estado se leen de la base en cada petición,
    // así un cambio de rol o desactivar la cuenta surte efecto de inmediato. Cambiar la contraseña sube la versión
    // del usuario e invalida todos los tokens anteriores.
    const { token_version: tokenVersion, ...user } = (await userModel.findById(payload.id)) || {};
    // Los tokens emitidos antes de existir la versión no la traen: cuentan como versión 0.
    if (!user.id || Number(payload.v ?? 0) !== tokenVersion) return res.status(401).json({ message: 'Sesión no válida o expirada' });
    // Borrado lógico: la cuenta sigue existiendo (con sus tickets), pero ya no puede usar la API.
    if (!user.is_active) return res.status(401).json({ message: 'Tu cuenta está desactivada. Contacta al administrador.' });
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}