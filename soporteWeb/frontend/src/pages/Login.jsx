import { useState } from 'react';
import { login, register } from '../services/authService.js';

export default function Login({ onAuth }) {
	const [mode, setMode] = useState('login');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	async function submit(event) {
		event.preventDefault();
		setError('');
		setLoading(true);
		const data = new FormData(event.currentTarget);
		const payload = { name: data.get('name'), email: data.get('email'), password: data.get('password') };
		try {
			const response = await (mode === 'login' ? login(payload) : register(payload));
			onAuth(response.data.user, response.data.token);
		} catch {
			setError('No se pudo conectar con la API. Verifica el backend y tus credenciales.');
		} finally { setLoading(false); }
	}

	return <div className="auth-shell"><div className="auth-visual"><div className="auth-brand"><div className="brand-mark">S</div><span>soporte<span className="brand-accent">web</span></span></div><div className="auth-quote"><p>“Resolver un problema empieza por saber que no estás solo.”</p><span>Mesa de soporte, siempre cerca</span></div></div><div className="auth-form-wrap"><form className="auth-form" onSubmit={submit}><span className="eyebrow">CENTRO DE SOPORTE</span><h1>{mode === 'login' ? 'Bienvenida de nuevo' : 'Crea tu cuenta'}</h1><p className="muted">{mode === 'login' ? 'Accede para revisar tus solicitudes.' : 'Gestiona tus solicitudes en un solo lugar.'}</p>{mode === 'register' && <label>Nombre completo<input name="name" required placeholder="María Cruz" /></label>}<label>Correo electrónico<input name="email" required type="email" placeholder="tu@empresa.com" /></label><label>Contraseña<input name="password" required minLength="8" type="password" placeholder="8 caracteres mínimo" /></label>{error && <p className="auth-error">{error}</p>}<button className="primary-button auth-submit" disabled={loading}>{loading ? 'Conectando...' : mode === 'login' ? 'Iniciar sesión' : 'Registrarme'} <span>→</span></button><div className="auth-switch">{mode === 'login' ? '¿Aún no tienes una cuenta?' : '¿Ya tienes una cuenta?'} <button type="button" onClick={() => { setError(''); setMode(mode === 'login' ? 'register' : 'login'); }}>{mode === 'login' ? 'Regístrate' : 'Inicia sesión'}</button></div></form></div></div>;
}
