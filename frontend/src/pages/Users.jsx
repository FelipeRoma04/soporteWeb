import { formatRole, ROLE_OPTIONS } from '../utils/roles.js';

export default function Users({ users = [], currentUserId, onRoleChange, onStatusChange }) {
  const activeAdmins = users.filter((user) => user.role === 'admin' && user.is_active).length;

  function toggleActive(user) {
    // Se pide confirmación al desactivar para evitar clics accidentales; reactivar no la necesita.
    if (user.is_active && !window.confirm(`¿Desactivar a ${user.name}? No podrá iniciar sesión, pero se conservarán sus tickets e historial.`)) return;
    onStatusChange(user.id, !user.is_active);
  }

  return <section className="page-body">
    <div className="welcome-row"><div><p className="eyebrow">ADMINISTRACIÓN</p><h2>Usuarios</h2><p className="muted">Gestiona los roles, permisos y el acceso de la mesa de soporte.</p></div></div>
    <div className="panel ticket-panel"><div className="table-wrap"><table>
      <thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Alta</th><th>Acciones</th></tr></thead>
      <tbody>{users.map((user) => {
        const isSelf = user.id === currentUserId;
        const isLastAdmin = user.role === 'admin' && user.is_active && activeAdmins <= 1;
        const protectedReason = isSelf ? 'No puedes modificar tu propia cuenta' : isLastAdmin ? 'Debe quedar al menos un administrador activo' : undefined;
        return <tr key={user.id} style={user.is_active ? undefined : { opacity: 0.6 }}>
          <td><strong>{user.name}</strong>{isSelf && <span className="muted"> (tú)</span>}</td>
          <td>{user.email}</td>
          <td><select className="status-select" aria-label={`Rol de ${user.name}`} value={user.role} disabled={Boolean(protectedReason)} title={protectedReason} onChange={(event) => onRoleChange(user.id, event.target.value)}>{ROLE_OPTIONS.map((role) => <option key={role} value={role}>{formatRole(role)}</option>)}</select></td>
          <td><span className={`badge-soft ${user.is_active ? 'green' : 'neutral'}`}>{user.is_active ? 'Activo' : 'Inactivo'}</span></td>
          <td className="muted">{new Date(user.created_at).toLocaleDateString('es-ES')}</td>
          <td><button type="button" className="text-button" disabled={Boolean(protectedReason)} title={protectedReason} style={protectedReason ? { opacity: 0.45, cursor: 'not-allowed' } : undefined} onClick={() => toggleActive(user)}>{user.is_active ? 'Desactivar' : 'Reactivar'}</button></td>
        </tr>;
      })}</tbody>
    </table></div></div>
  </section>;
}