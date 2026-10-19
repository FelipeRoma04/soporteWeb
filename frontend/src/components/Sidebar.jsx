import { BookOpen, Bot, LayoutDashboard, Settings, Ticket, Users } from 'lucide-react';

export default function Sidebar({ active, onChange, role }) {
  const items = [['Resumen', LayoutDashboard], ['Mis tickets', Ticket], ['Base de conocimiento', BookOpen], ['Asistente IA', Bot], ...(role === 'admin' ? [['Usuarios', Users], ['Categorías', Settings]] : [])];
  return <nav className="primary-nav" aria-label="Navegación principal">{items.map(([label, Icon]) => <button type="button" className={active === label ? 'nav-item active' : 'nav-item'} onClick={() => onChange(label)} key={label} aria-current={active === label ? 'page' : undefined} title={label}><Icon size={18} aria-hidden="true" /><span>{label}</span></button>)}</nav>;
}
