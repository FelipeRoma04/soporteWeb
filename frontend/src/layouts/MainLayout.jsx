import Header from '../components/Header.jsx';
import Sidebar from '../components/Sidebar.jsx';
import BrandIdentity from '../components/BrandIdentity.jsx';
import AssistantButton from '../components/AssistantButton.jsx';

export default function MainLayout({ active, search, onSearch, onSearchSubmit, searchResults, onOpenTicket, user, onLogout, notifications, onReadNotification, onReadAllNotifications, onNavigate, children }) {
  return <div className="app-shell"><div className="top-nav"><BrandIdentity className="brand" /><Sidebar active={active} onChange={onNavigate} role={user?.role} /></div><main className="main-content"><Header active={active} search={search} onSearch={onSearch} onSearchSubmit={onSearchSubmit} searchResults={searchResults} onOpenTicket={onOpenTicket} user={user} onLogout={onLogout} onOpenSettings={() => onNavigate('Configuración')} notifications={notifications} onReadNotification={onReadNotification} onReadAllNotifications={onReadAllNotifications} />{children}</main><AssistantButton active={active} onOpen={() => onNavigate('Asistente IA')} /></div>;
}