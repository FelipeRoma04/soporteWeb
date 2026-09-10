import { Bell } from 'lucide-react';

export default function NotificationBell({ notifications, onClick }) { const unread = notifications.filter((item) => !item.read_at).length; return <button className="icon-button" title="Notificaciones" onClick={onClick}><Bell size={18} />{unread > 0 && <span className="notification-count">{unread}</span>}</button>; }
