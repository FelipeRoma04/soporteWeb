import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, LogOut, Search, Settings, X } from 'lucide-react';
import { formatRole } from '../utils/roles.js';

const formatDate = (value) => new Date(value).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
// En estas pantallas la propia tabla ya se filtra al escribir; en las demás, el buscador muestra una lista de resultados.
const FILTERED_PAGES = ['Resumen', 'Mis tickets'];

export default function Header({ active, search, onSearch, onSearchSubmit, searchResults = [], onOpenTicket, user, onLogout, onOpenSettings, notifications, onReadNotification, onReadAllNotifications }) {
  const [bellOpen, setBellOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const bellRef = useRef(null);
  const searchRef = useRef(null);
  const unread = notifications.filter((notification) => !notification.read_at).length;
  const query = search.trim();
  const showResults = resultsOpen && query && !FILTERED_PAGES.includes(active);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) setBellOpen(false);
      if (searchRef.current && !searchRef.current.contains(event.target)) setResultsOpen(false);
    };
    const closeOnEscape = (event) => { if (event.key === 'Escape') { setBellOpen(false); setResultsOpen(false); } };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('mousedown', closeOnOutsideClick); document.removeEventListener('keydown', closeOnEscape); };
  }, []);

  function submitSearch(event) {
    if (event.key !== 'Enter' || !query) return;
    setResultsOpen(false);
    onSearchSubmit();
  }

  return <header className="topbar">
    <div><div className="crumb">SysPulse / {active}</div><h1>{active}</h1></div>
    <div className="top-actions" role="group" aria-label="Acciones de la cuenta">
      <div className="search-wrap" ref={searchRef}>
        <div className="search-box">
          <Search size={17} />
          <input placeholder="Buscar tickets..." aria-label="Buscar tickets" value={search} onChange={(event) => { onSearch(event.target.value); setResultsOpen(true); }} onFocus={() => setResultsOpen(true)} onKeyDown={submitSearch} />
          {search && <button type="button" className="clear-search" aria-label="Limpiar búsqueda" onClick={() => onSearch('')}><X size={15} /></button>}
        </div>
        {showResults && <div className="search-results" role="listbox">
          {searchResults.length ? <>
            {searchResults.slice(0, 6).map((ticket) => <button type="button" role="option" className="search-result" key={ticket.dbId} onClick={() => { setResultsOpen(false); onOpenTicket(ticket.dbId); }}>
              <strong>{ticket.id} · {ticket.subject}</strong>
              <small>{ticket.status} · {ticket.category}{ticket.requester_name ? ` · ${ticket.requester_name}` : ''}</small>
            </button>)}
            <button type="button" className="search-result search-all" onClick={() => { setResultsOpen(false); onSearchSubmit(); }}>Ver los {searchResults.length} resultados en Mis tickets →</button>
          </> : <p className="notification-empty">No se encontraron tickets para “{query}”.</p>}
        </div>}
      </div>
      <div className="notification-wrap" ref={bellRef}>
        <button className="icon-button" title="Notificaciones" aria-label="Abrir notificaciones" aria-expanded={bellOpen} onClick={() => setBellOpen((current) => !current)}><Bell size={18} />{unread > 0 && <span className="notification-count">{unread > 9 ? '9+' : unread}</span>}</button>
        {bellOpen && <div className="notification-panel">
          <div className="notification-heading"><strong>Notificaciones</strong>{unread > 0 ? <button type="button" className="text-button notification-read-all" onClick={onReadAllNotifications}><CheckCheck size={14} /> Marcar todas como leídas</button> : <span>Al día</span>}</div>
          {notifications.length ? <div className="notification-list">{notifications.slice(0, 8).map((notification) => <button className={`notification-item ${notification.read_at ? 'read' : ''}`} key={notification.id} onClick={() => { setBellOpen(false); onReadNotification(notification); }}><span className="notification-dot" /><span><strong>{notification.message}</strong><small>{formatDate(notification.created_at)}</small></span></button>)}</div> : <p className="notification-empty">No tienes notificaciones.</p>}
        </div>}
      </div>
      <button type="button" className={`icon-button ${active === 'Configuración' ? 'active' : ''}`} title="Configuración" aria-label="Abrir configuración" aria-current={active === 'Configuración' ? 'page' : undefined} onClick={onOpenSettings}><Settings size={18} /></button>
      <button className="icon-button" title="Cerrar sesión" aria-label="Cerrar sesión" onClick={onLogout}><LogOut size={18} /></button>
      <div className="header-user" title={user?.name || 'Cuenta'}>
        <div className="mini-avatar" aria-hidden="true">{user?.name?.slice(0, 2).toUpperCase() || 'U'}</div>
        <div className="header-user-copy"><strong>{user?.name}</strong><small>{formatRole(user?.role)}</small></div>
      </div>
    </div>
  </header>;
}