import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as userModel from '../models/User.js';
import { toSafeUser } from '../models/User.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function tokenFor(user) { return jwt.sign({ id: user.id, v: user.token_version ?? 0 }, process.env.JWT_SECRET, { expiresIn: '8h' }); }
function serviceError(message, status) { const error = new Error(message); error.status = status; return error; }

export async function register({ name, email, password } = {}) {
  const valid = [name, email, password].every((value) => typeof value === 'string')
    && name.trim() && EMAIL_PATTERN.test(email.trim()) && password.length >= 8 && password.length <= 72;
  if (!valid) throw serviceError('Nombre, correo válido y contraseña de 8 a 72 caracteres son obligatorios', 400);

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await userModel.findByEmail(normalizedEmail);
  if (existingUser) throw serviceError('Ya existe una cuenta con ese correo electrónico', 409);

  const passwordHash = await bcrypt.hash(password, 12);
  const safeUser = toSafeUser(await userModel.createUser({ name: name.trim(), email: normalizedEmail, passwordHash }));
  return { user: safeUser, token: tokenFor(safeUser) };
}

export async function login({ email, password } = {}) {
  if (typeof email !== 'string' || !email.trim() || typeof password !== 'string') throw serviceError('Credenciales incorrectas', 401);
  const user = await userModel.findByEmail(email.trim().toLowerCase());
  if (!user || !(await bcrypt.compare(password, user.password_hash))) throw serviceError('Credenciales incorrectas', 401);
  // Se comprueba después de la contraseña para no revelar a terceros qué cuentas existen o están desactivadas.
  // 403 (no 401): el cliente no debe interpretarlo como "sesión expirada".
  if (!user.is_active) throw serviceError('Tu cuenta está desactivada. Contacta al administrador.', 403);
  return { user: toSafeUser(user), token: tokenFor(user) };
}

export async function changePassword(userId, { currentPassword, newPassword } = {}) {
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') throw serviceError('Indica la contraseña actual y la nueva', 400);
  if (newPassword.length < 8 || newPassword.length > 72) throw serviceError('La nueva contraseña debe tener entre 8 y 72 caracteres', 400);
  const user = await userModel.findWithPasswordById(userId);
  // 400 (no 401): un 401 haría que el cliente interprete que la sesión expiró.
  if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) throw serviceError('La contraseña actual no es correcta', 400);
  if (currentPassword === newPassword) throw serviceError('La nueva contraseña debe ser distinta de la actual', 400);
  await userModel.updatePassword(userId, await bcrypt.hash(newPassword, 12));
  // Todas las sesiones anteriores quedan invalidadas; quien cambia la contraseña recibe un token nuevo y sigue dentro.
  return { token: tokenFor(await userModel.findById(userId)) };
}