import Header from '../components/Header.jsx';
import Sidebar from '../components/Sidebar.jsx';

export default function MainLayout({ active, search, onSearch, user, onLogout, notifications, onReadNotification, onNavigate, children }) {
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><div className="brand-mark">S</div><span>soporte<span className="brand-accent">web</span></span></div><div className="workspace-label">ESPACIO DE TRABAJO</div><Sidebar active={active} onChange={onNavigate} role={user?.role} /><div className="sidebar-bottom"><button className="nav-item" onClick={() => onNavigate('Configuración')}>Configuración</button><div className="profile"><div className="avatar">{user?.name?.slice(0, 2).toUpperCase()}</div><div><strong>{user?.name}</strong><small>{user?.role}</small></div></div></div></aside><main className="main-content"><Header active={active} search={search} onSearch={onSearch} user={user} onLogout={onLogout} notifications={notifications} onReadNotification={onReadNotification} />{children}</main></div>;
}
