const roles = ['user', 'agent', 'admin'];

export default function Users({ users = [], onRoleChange }) {
	return <section className="page-body"><div className="welcome-row"><div><p className="eyebrow">ADMINISTRACIÓN</p><h2>Usuarios</h2><p className="muted">Gestiona los roles y permisos de la mesa de soporte.</p></div></div><div className="panel ticket-panel"><div className="table-wrap"><table><thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Alta</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.name}</strong></td><td>{user.email}</td><td><select className="status-select" value={user.role} onChange={(event) => onRoleChange(user.id, event.target.value)}>{roles.map((role) => <option key={role}>{role}</option>)}</select></td><td className="muted">{new Date(user.created_at).toLocaleDateString('es-ES')}</td></tr>)}</tbody></table></div></div></section>;
}
