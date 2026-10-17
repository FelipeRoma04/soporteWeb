// Crea un administrador, o promueve a una cuenta existente.
// Uso:  npm run create-admin                       (usa ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD de backend/.env)
//       npm --prefix backend run create-admin -- --email a@b.com --name "Ana" --password "secreta123"
//       añade --reset-password para cambiar la contraseña de una cuenta que ya existe
import './env.js';
import bcrypt from 'bcryptjs';
import { pathToFileURL } from 'node:url';
import { pool } from '../src/config/db.js';
import * as userModel from '../src/models/User.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const adminFromEnv = () => ({ name: process.env.ADMIN_NAME, email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });

export async function ensureAdmin({ name, email, password, resetPassword = false } = {}) {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) return { status: 'skipped' };
  if (!EMAIL_PATTERN.test(normalizedEmail)) throw new Error(`ADMIN_EMAIL no es un correo válido: ${email}`);

  const existing = await userModel.findByEmail(normalizedEmail);
  if (existing) {
    if (resetPassword) {
      if (!password || password.length < 8) throw new Error('Para cambiar la contraseña indica una de al menos 8 caracteres.');
      await pool.query('UPDATE users SET password_hash = $1, token_version = token_version + 1 WHERE id = $2', [await bcrypt.hash(password, 12), existing.id]);
    }
    if (existing.role === 'admin') return { status: resetPassword ? 'password-reset' : 'already-admin', email: normalizedEmail };
    await userModel.updateRole(existing.id, 'admin');
    return { status: 'promoted', email: normalizedEmail };
  }

  if (!name?.trim() || !password || password.length < 8) {
    throw new Error('Para crear el administrador completa ADMIN_NAME, ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 8 caracteres) en backend/.env.');
  }
  const created = await userModel.createUser({ name: name.trim(), email: normalizedEmail, passwordHash: await bcrypt.hash(password, 12) });
  await userModel.updateRole(created.id, 'admin');
  return { status: 'created', email: normalizedEmail };
}

export const adminMessages = {
  created: (email) => `Administrador creado: ${email}`,
  promoted: (email) => `La cuenta ${email} ahora es administrador`,
  'already-admin': (email) => `Administrador ya existente: ${email}`,
  'password-reset': (email) => `Contraseña actualizada para ${email} (sus sesiones abiertas se cerraron)`
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = {};
  for (let index = 2; index < process.argv.length; index += 1) {
    if (!process.argv[index].startsWith('--')) continue;
    const key = process.argv[index].slice(2);
    args[key] = key === 'reset-password' ? true : process.argv[++index];
  }
  try {
    const result = await ensureAdmin({ ...adminFromEnv(), ...Object.fromEntries(['name', 'email', 'password'].filter((key) => args[key]).map((key) => [key, args[key]])), resetPassword: Boolean(args['reset-password']) });
    console.log(result.status === 'skipped' ? '✖ Indica un correo: --email o ADMIN_EMAIL en backend/.env' : `✔ ${adminMessages[result.status](result.email)}`);
    if (result.status === 'skipped') process.exitCode = 1;
  } catch (error) {
    console.error(`✖ ${error.code === 'ECONNREFUSED' ? 'No se pudo conectar a PostgreSQL. Revisa DATABASE_URL o la configuración DB_*.' : error.message}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}