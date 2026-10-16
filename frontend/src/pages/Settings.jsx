import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { changePassword } from '../services/authService.js';

const roleLabels = { user: 'Usuario', agent: 'Agente', admin: 'Administrador' };
const emptyForm = { current: '', next: '', confirm: '' };

export default function Settings({ user }) {
  const auth = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState(false);
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    if (form.next.length < 8) return setStatus({ type: 'error', message: 'La nueva contraseña debe tener al menos 8 caracteres.' });
    if (form.next !== form.confirm) return setStatus({ type: 'error', message: 'Las contraseñas nuevas no coinciden.' });
    setSaving(true);
    setStatus({ type: '', message: '' });
    try {
      const response = await changePassword(form.current, form.next);
      if (response.data?.token) auth?.replaceToken?.(response.data.token);
      setForm(emptyForm);
      setStatus({ type: 'success', message: 'Contraseña actualizada correctamente.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data?.message || 'No se pudo cambiar la contraseña.' });
    } finally {
      setSaving(false);
    }
  }

  return <section className="page-body">
    <div className="welcome-row"><div><p className="eyebrow">CUENTA</p><h2>Configuración</h2><p className="muted">Sesión activa como {roleLabels[user?.role] || 'Usuario'}.</p></div></div>
    <div className="settings-grid">
      <div className="panel settings-panel">
        <h3>Perfil</h3>
        <div className="settings-list">
          <div className="setting-row"><span>Nombre</span><strong>{user?.name || 'Sin nombre'}</strong></div>
          <div className="setting-row"><span>Email</span><strong>{user?.email || 'Sin correo'}</strong></div>
          <div className="setting-row"><span>Rol</span><strong>{roleLabels[user?.role] || 'Usuario'}</strong></div>
        </div>
      </div>
      <div className="panel settings-panel">
        <h3>Seguridad</h3>
        <div className="settings-list"><div className="setting-row"><span>Duración de la sesión</span><strong>8 horas</strong></div></div>
        <p className="muted" style={{ fontSize: 12, margin: '12px 0 0' }}>Al cambiar la contraseña se cierran tus sesiones en otros dispositivos.</p>
        <form className="ai-ticket-form" onSubmit={submit}>
          <h3>Cambiar contraseña</h3>
          <label>Contraseña actual<input type="password" autoComplete="current-password" value={form.current} onChange={update('current')} required /></label>
          <label>Nueva contraseña<input type="password" autoComplete="new-password" minLength={8} maxLength={72} value={form.next} onChange={update('next')} required /></label>
          <label>Repite la nueva contraseña<input type="password" autoComplete="new-password" minLength={8} maxLength={72} value={form.confirm} onChange={update('confirm')} required /></label>
          {status.message && <p className={status.type === 'success' ? 'ai-success' : 'ai-error'} role={status.type === 'success' ? 'status' : 'alert'}>{status.message}</p>}
          <button className="primary-button" type="submit" disabled={saving || !form.current || !form.next || !form.confirm}>{saving ? 'Guardando...' : 'Actualizar contraseña'} <span>→</span></button>
        </form>
      </div>
    </div>
  </section>;
}