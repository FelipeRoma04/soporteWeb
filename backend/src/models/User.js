import { pool } from '../config/db.js';
import { ROLES, STAFF_ROLES } from './Role.js';

export function toSafeUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function createUser({ name, email, passwordHash }) {
  const [result] = await pool.execute('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [name, email, passwordHash]);
  return { id: result.insertId, name, email, role: ROLES.USER };
}
export async function findByEmail(email) {
  const [rows] = await pool.execute('SELECT id, name, email, password_hash, role, is_active, token_version FROM users WHERE email = ?', [email]);
  return rows[0];
}
export async function findById(id) {
  const [rows] = await pool.execute('SELECT id, name, email, role, is_active, token_version FROM users WHERE id = ?', [id]);
  return rows[0];
}
export async function findWithPasswordById(id) {
  const [rows] = await pool.execute('SELECT id, name, email, password_hash, role FROM users WHERE id = ?', [id]);
  return rows[0];
}
export async function updatePassword(userId, passwordHash) {
  await pool.execute('UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?', [passwordHash, userId]);
}
export async function listUsers() {
  const [rows] = await pool.execute('SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC');
  return rows.map((row) => ({ ...row, is_active: Boolean(row.is_active) }));
}
// Agentes y administradores activos: reciben el aviso de cada ticket nuevo.
export async function listActiveStaffIds() {
  const [rows] = await pool.execute(`SELECT id FROM users WHERE is_active = 1 AND role IN (${STAFF_ROLES.map(() => '?').join(', ')})`, [...STAFF_ROLES]);
  return rows.map((row) => row.id);
}

// Cambia rol y/o estado de un usuario sin dejar nunca el sistema sin administradores activos.
// Se bloquean (FOR UPDATE) las filas de los admins activos y la del usuario, así dos peticiones
// simultáneas no pueden quitarse el último admin entre sí.
// Devuelve 'ok' | 'not_found' | 'last_admin'.
async function changeWithAdminGuard(userId, buildChange) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [activeAdmins] = await connection.query("SELECT id FROM users WHERE role = ? AND is_active = 1 FOR UPDATE", [ROLES.ADMIN]);
    const [rows] = await connection.query('SELECT id, role, is_active FROM users WHERE id = ? FOR UPDATE', [userId]);
    const target = rows[0];
    if (!target) { await connection.rollback(); return 'not_found'; }

    const change = buildChange(target); // { role, active }
    const isActiveAdmin = target.role === ROLES.ADMIN && Boolean(target.is_active);
    const staysActiveAdmin = change.role === ROLES.ADMIN && change.active;
    if (isActiveAdmin && !staysActiveAdmin && activeAdmins.length <= 1) { await connection.rollback(); return 'last_admin'; }

    await connection.query(
      'UPDATE users SET role = ?, is_active = ?, deactivated_at = IF(?, NULL, COALESCE(deactivated_at, CURRENT_TIMESTAMP)) WHERE id = ?',
      [change.role, change.active ? 1 : 0, change.active ? 1 : 0, userId]
    );
    await connection.commit();
    return 'ok';
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}

export const updateRole = (userId, role) => changeWithAdminGuard(userId, (target) => ({ role, active: Boolean(target.is_active) }));
export const setActive = (userId, active) => changeWithAdminGuard(userId, (target) => ({ role: target.role, active }));