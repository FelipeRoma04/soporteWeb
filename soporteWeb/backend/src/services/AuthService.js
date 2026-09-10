import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as userModel from '../models/User.js';
import { toSafeUser } from '../models/User.js';

function tokenFor(user) { return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' }); }
function serviceError(message, status) { const error = new Error(message); error.status = status; return error; }

export async function register({ name, email, password }) {
  if (!name?.trim() || !email?.trim() || !password || password.length < 8) throw serviceError('Nombre, email y contraseña de 8 caracteres son obligatorios', 400);
  const passwordHash = await bcrypt.hash(password, 12);
  const safeUser = toSafeUser(await userModel.createUser({ name: name.trim(), email: email.trim(), passwordHash }));
  return { user: safeUser, token: tokenFor(safeUser) };
}

export async function login({ email, password }) {
  const user = await userModel.findByEmail(email);
  if (!user || !(await bcrypt.compare(password || '', user.password_hash))) throw serviceError('Credenciales incorrectas', 401);
  const safeUser = toSafeUser(user);
  return { user: safeUser, token: tokenFor(safeUser) };
}
