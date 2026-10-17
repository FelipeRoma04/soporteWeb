import { pool } from '../config/db.js';
import { ROLES, STAFF_ROLES } from './Role.js';

export function toSafeUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function createUser({ name, email, passwordHash }) {
  const { rows } = await pool.query('INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id', [name, email, passwordHash]);
  return { id: rows[0].id, name, email, role: ROLES.USER };
}
export async function findByEmail(email) {
  const { rows } = await pool.query('SELECT id, name, email, password_hash, role, is_active, token_version FROM users WHERE email = $1', [email]);
  return rows[0];
}
export async function findById(id) {
  const { rows } = await pool.query('SELECT id, name, email, role, is_active, token_version FROM users WHERE id = $1', [id]);
  return rows[0];
}
export async function findWithPasswordById(id) {
  const { rows } = await pool.query('SELECT id, name, email, password_hash, role FROM users WHERE id = $1', [id]);
  return rows[0];
}
export async function updatePassword(userId, passwordHash) {
  await pool.query('UPDATE users SET password_hash = $1, token_version = token_version + 1 WHERE id = $2', [passwordHash, userId]);
}
export async function listUsers() {
  const { rows } = await pool.query('SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC');
  return rows;
}
// Agentes y administradores activos: reciben el aviso de cada ticket nuevo.
export async function listActiveStaffIds() {
  const roleParameters = STAFF_ROLES.map((_, index) => `$${index + 1}`).join(', ');
  const { rows } = await pool.query(`SELECT id FROM users WHERE is_active = TRUE AND role IN (${roleParameters})`, STAFF_ROLES);
  return rows.map((row) => row.id);
}

// Cambia rol y/o estado de un usuario sin dejar nunca el sistema sin administradores activos.
// Se bloquean (FOR UPDATE) las filas de los admins activos y la del usuario, así dos peticiones
// simultáneas no pueden quitarse el último admin entre sí.
// Devuelve 'ok' | 'not_found' | 'last_admin'.
async function changeWithAdminGuard(userId, buildChange) {
  const connection = await pool.connect();
  try {
    await connection.query('BEGIN');
    const { rows: activeAdmins } = await connection.query('SELECT id FROM users WHERE role = $1 AND is_active = TRUE FOR UPDATE', [ROLES.ADMIN]);
    const { rows } = await connection.query('SELECT id, role, is_active FROM users WHERE id = $1 FOR UPDATE', [userId]);
    const target = rows[0];
    if (!target) { await connection.query('ROLLBACK'); return 'not_found'; }

    const change = buildChange(target); // { role, active }
    const isActiveAdmin = target.role === ROLES.ADMIN && Boolean(target.is_active);
    const staysActiveAdmin = change.role === ROLES.ADMIN && change.active;
    if (isActiveAdmin && !staysActiveAdmin && activeAdmins.length <= 1) { await connection.query('ROLLBACK'); return 'last_admin'; }

    await connection.query(
      'UPDATE users SET role = $1, is_active = $2, deactivated_at = CASE WHEN $2 THEN NULL ELSE COALESCE(deactivated_at, CURRENT_TIMESTAMP) END WHERE id = $3',
      [change.role, change.active, userId]
    );
    await connection.query('COMMIT');
    return 'ok';
  } catch (error) {
    await connection.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}

export const updateRole = (userId, role) => changeWithAdminGuard(userId, (target) => ({ role, active: Boolean(target.is_active) }));
export const setActive = (userId, active) => changeWithAdminGuard(userId, (target) => ({ role: target.role, active }));