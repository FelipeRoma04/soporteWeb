import { BookOpen, Bot, LayoutDashboard, Settings, Ticket, Users } from 'lucide-react';

export default function Sidebar({ active, onChange, role }) {
  const items = [['Resumen', LayoutDashboard], ['Mis tickets', Ticket], ['Base de conocimiento', BookOpen], ['Asistente IA', Bot], ...(role === 'admin' ? [['Usuarios', Users], ['Categorías', Settings]] : [])];
  return <nav>{items.map(([label, Icon]) => <button className={active === label ? 'nav-item active' : 'nav-item'} onClick={() => onChange(label)} key={label}><Icon size={18} />{label}</button>)}</nav>;
}
