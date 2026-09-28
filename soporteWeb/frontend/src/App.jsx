import { useEffect, useState } from 'react';
import { Activity, BookOpen, Bot, Plus, Search, Ticket, ThumbsDown, ThumbsUp } from 'lucide-react';
import { createCategory, getCategories, getDashboard, getUsers, updateUserRole } from './api.js';
import { analyzeTicket, askAssistant, sendAssistantFeedback } from './services/aiService.js';
import { createKnowledge, getKnowledge } from './services/knowledgeService.js';
import { createTicket, getTickets, updateTicketStatus } from './services/ticketService.js';
import { getNotifications, markNotificationAsRead } from './services/notificationService.js';
import { useAuth } from './context/AuthContext.jsx';
import MainLayout from './layouts/MainLayout.jsx';
import Login from './pages/Login.jsx';
import Users from './pages/Users.jsx';

function Badge({ children, tone = 'neutral' }) { return <span className={`badge-soft ${tone}`}>{children}</span>; }
function statusTone(status) { return status === 'Cerrado' ? 'green' : status === 'En progreso' ? 'blue' : 'amber'; }
function priorityTone(priority) { return priority === 'Alta' ? 'red' : priority === 'Baja' ? 'green' : 'amber'; }
function formatRole(role) {
  const labels = {
    user: 'Usuario',
    agent: 'Agente',
    admin: 'Administrador'
  };
  return labels[role] || 'Usuario';
}
function formatTicket(ticket) {
  return { ...ticket, dbId: ticket.id, id: `TK-${ticket.id}`, date: new Date(ticket.created_at).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) };
}

export default function App() {
  const { authenticated, user, startSession, endSession } = useAuth();
  const [active, setActive] = useState('Resumen');
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, closed: 0 });
  const [articles, setArticles] = useState([]);
  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState('');
  const filtered = tickets.filter((ticket) => `${ticket.subject} ${ticket.id} ${ticket.category}`.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    if (!authenticated) return;
    Promise.all([getTickets(), getDashboard(), getKnowledge(), getNotifications(), getCategories(), user?.role === 'admin' ? getUsers() : Promise.resolve({ data: [] })])
      .then(([ticketsResponse, dashboardResponse, articlesResponse, notificationsResponse, categoriesResponse, usersResponse]) => {
        setTickets(ticketsResponse.data.map(formatTicket));
        setStats(dashboardResponse.data);
        setArticles(articlesResponse.data);
        setNotifications(notificationsResponse.data);
        setCategories(categoriesResponse.data);
        setUsers(usersResponse.data);
        setLoadError('');
      })
      .catch(() => setLoadError('No se pudieron cargar los datos de la base de datos.'));
  }, [authenticated]);

  if (!authenticated) return <Login onAuth={startSession} />;

  function logout() {
    endSession();
  }

  async function addTicket(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const draft = { subject: data.get('subject'), description: data.get('description'), category: data.get('category'), priority: data.get('priority') };
    try {
      const response = await createTicket(draft);
      setTickets([formatTicket(response.data), ...tickets]);
      setStats((current) => ({ ...current, total: Number(current.total) + 1, open: Number(current.open) + 1 }));
    } catch (error) {
      setNotice(error.response?.data?.message || 'No se pudo crear el ticket');
      return;
    }
    setShowForm(false);
    setNotice('Ticket creado correctamente');
    setTimeout(() => setNotice(''), 2600);
  }

  async function changeTicketStatus(ticketId, status) {
    try {
      await updateTicketStatus(ticketId, status);
      setTickets((current) => current.map((ticket) => ticket.dbId === ticketId ? { ...ticket, status } : ticket));
      setStats((current) => {
        const updated = tickets.find((ticket) => ticket.dbId === ticketId);
        if (!updated || updated.status === status) return current;
        return {
          ...current,
          open: Number(current.open) + (status === 'Abierto' ? 1 : 0) - (updated.status === 'Abierto' ? 1 : 0),
          closed: Number(current.closed) + (status === 'Cerrado' ? 1 : 0) - (updated.status === 'Cerrado' ? 1 : 0)
        };
      });
      setNotice('Estado del ticket actualizado');
      setTimeout(() => setNotice(''), 2600);
    } catch (error) {
      setNotice(error.response?.data?.message || 'No se pudo actualizar el ticket');
    }
  }

  async function readNotification(notification) {
    if (notification.read_at) return;
    try {
      await markNotificationAsRead(notification.id);
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item));
    } catch { setNotice('No se pudo actualizar la notificación'); }
  }

  const canManageTickets = ['agent', 'admin'].includes(user?.role);

  return <MainLayout active={active} search={search} onSearch={setSearch} user={user} onLogout={logout} notifications={notifications} onReadNotification={readNotification} onNavigate={setActive}>
      {notice && <div className="notice"><span>✓</span>{notice}</div>}
      {loadError && <div className="notice auth-error">{loadError}</div>}
      {active === 'Resumen' && <Dashboard onNew={() => setShowForm(true)} tickets={filtered} stats={stats} user={user} canManageTickets={canManageTickets} onStatusChange={changeTicketStatus} />}
      {active === 'Mis tickets' && <TicketList tickets={filtered} onNew={() => setShowForm(true)} canManageTickets={canManageTickets} onStatusChange={changeTicketStatus} />}
      {active === 'Base de conocimiento' && <Knowledge articles={articles} isAdmin={user?.role === 'admin'} onCreate={async (article) => { const response = await createKnowledge(article); setArticles((current) => [response.data, ...current]); }} />}
      {active === 'Asistente IA' && <Assistant categories={categories} />}
      {active === 'Usuarios' && user?.role === 'admin' && <Users users={users} onRoleChange={async (userId, role) => { await updateUserRole(userId, role); setUsers((current) => current.map((item) => item.id === userId ? { ...item, role } : item)); }} />}
      {active === 'Categorías' && user?.role === 'admin' && <CategoryManagement categories={categories} onCreate={async (name) => { const response = await createCategory(name); setCategories((current) => [...current, response.data].sort((first, second) => first.name.localeCompare(second.name))); }} />}
      {active === 'Configuración' && <SettingsPanel user={user} />}
    {showForm && <div className="modal-backdrop"><form className="modal-panel" onSubmit={addTicket}><div className="modal-heading"><div><span className="eyebrow">NUEVA SOLICITUD</span><h2>Crear ticket</h2></div><button type="button" className="close-button" onClick={() => setShowForm(false)}>×</button></div><label>Asunto<input name="subject" required placeholder="¿En qué podemos ayudarte?" /></label><label>Categoría<select name="category"><option>Acceso</option><option>Hardware</option><option>Permisos</option><option>Software</option></select></label><label>Prioridad<select name="priority"><option>Media</option><option>Alta</option><option>Baja</option><option>Urgente</option></select></label><label>Descripción<textarea name="description" required rows="4" placeholder="Describe el problema con el mayor detalle posible..." /></label><button className="primary-button" type="submit">Enviar ticket <span>→</span></button></form></div>}
  </MainLayout>;
}

function SettingsPanel({ user }) {
  return <section className="page-body"><div className="welcome-row"><div><p className="eyebrow">CUENTA</p><h2>Configuración</h2><p className="muted">Sesión activa como {formatRole(user?.role)}.</p></div></div><div className="settings-grid"><div className="panel settings-panel"><h3>Perfil</h3><div className="settings-list"><div className="setting-row"><span>Nombre</span><strong>{user?.name || 'Sin nombre'}</strong></div><div className="setting-row"><span>Email</span><strong>{user?.email || 'Sin correo'}</strong></div><div className="setting-row"><span>Rol</span><strong>{formatRole(user?.role)}</strong></div><div className="setting-row"><span>Idioma</span><strong>Español</strong></div></div></div><div className="panel settings-panel"><h3>Preferencias</h3><div className="toggle-list"><label className="toggle-item"><span>Notificaciones por email</span><input type="checkbox" defaultChecked /></label><label className="toggle-item"><span>Resumen semanal</span><input type="checkbox" defaultChecked /></label><label className="toggle-item"><span>Alertas de tickets</span><input type="checkbox" defaultChecked /></label><label className="toggle-item"><span>Modo oscuro</span><input type="checkbox" /></label></div></div><div className="panel settings-panel"><h3>Seguridad</h3><div className="settings-list"><div className="setting-row"><span>Último acceso</span><strong>Hoy</strong></div><div className="setting-row"><span>Sesión</span><strong>Activa</strong></div><div className="setting-row"><span>Autenticación</span><strong>JWT</strong></div></div><button className="secondary-button settings-action">Cambiar contraseña <span>→</span></button></div></div></section>;
}

function Dashboard({ onNew, tickets, stats, user, canManageTickets, onStatusChange }) { return <section className="page-body"><div className="welcome-row"><div><p className="eyebrow">RESUMEN DE SOPORTE</p><h2>Hola, {user?.name} <span className="wave">✦</span></h2><p className="muted">Aquí tienes un resumen de tus solicitudes.</p></div><button className="primary-button" onClick={onNew}><Plus size={17} />Nuevo ticket</button></div><div className="stat-grid"><Stat label="Total de tickets" value={stats.total || 0} trend="Registrados en la base" icon={<Ticket />} /><Stat label="Abiertos" value={stats.open || 0} trend="Nuevos tickets" icon={<Activity />} color="blue" /><Stat label="Pendientes" value={stats.pending || 0} trend="En progreso" icon={<Activity />} color="orange" /><Stat label="Resueltos" value={stats.closed || 0} trend={stats.average_resolution_hours ? `${stats.average_resolution_hours} h promedio` : 'Tickets cerrados'} icon={<span className="check-icon">✓</span>} color="green" /></div><div className="chart-grid"><Chart title="Tickets por categoría" items={stats.categories || []} labelKey="category" /><Chart title="Tickets por prioridad" items={stats.priorities || []} labelKey="priority" /></div><div className="content-grid"><div className="panel ticket-panel"><PanelHeader title="Actividad reciente" action="Ver todos" onAction={() => {}} /><div className="table-wrap"><TicketTable tickets={tickets} canManageTickets={canManageTickets} onStatusChange={onStatusChange} /></div></div><div className="panel insight-panel"><PanelHeader title="Necesitas ayuda?" /><div className="insight-graphic"><div className="graphic-ring">?</div></div><p className="insight-copy">Describe tu problema y nuestra IA te ayudará a encontrar una solución más rápido.</p><button className="secondary-button" onClick={onNew}>Consultar soporte <span>→</span></button></div></div></section>; }
function Chart({ title, items, labelKey }) { const max = Math.max(...items.map((item) => Number(item.total)), 1); return <div className="panel chart-panel"><h3>{title}</h3>{items.length ? items.map((item) => <div className="bar-row" key={item[labelKey]}><span>{item[labelKey]}</span><div className="bar-track"><i style={{ width: `${Number(item.total) / max * 100}%` }} /></div><strong>{item.total}</strong></div>) : <p className="muted">Aún no hay datos.</p>}</div>; }
function Stat({ label, value, trend, icon, color = 'orange' }) { return <div className="stat-card"><div className={`stat-icon ${color}`}>{icon}</div><div><p>{label}</p><strong>{value}</strong><small className={color === 'green' ? 'positive' : ''}>{trend}</small></div></div>; }
function PanelHeader({ title, action, onAction }) { return <div className="panel-header"><h3>{title}</h3>{action && <button className="text-button" onClick={onAction}>{action} →</button>}</div>; }
function TicketList({ tickets, onNew, canManageTickets, onStatusChange }) { return <section className="page-body"><div className="welcome-row"><div><p className="eyebrow">SEGUIMIENTO</p><h2>{canManageTickets ? 'Gestión de tickets' : 'Mis tickets'}</h2><p className="muted">{canManageTickets ? 'Revisa y actualiza las solicitudes de todos los usuarios.' : 'Consulta el avance de tus solicitudes.'}</p></div><button className="primary-button" onClick={onNew}><Plus size={17} />Nuevo ticket</button></div><div className="panel ticket-panel"><div className="table-wrap"><TicketTable tickets={tickets} canManageTickets={canManageTickets} onStatusChange={onStatusChange} /></div></div></section>; }
function TicketTable({ tickets, canManageTickets, onStatusChange }) { return <table><thead><tr><th>Ticket</th><th>Asunto</th>{canManageTickets && <th>Solicitante</th>}<th>Categoría</th><th>Prioridad</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>{tickets.map((ticket) => <tr key={ticket.id}><td><strong className="ticket-id">{ticket.id}</strong></td><td>{ticket.subject}</td>{canManageTickets && <td>{ticket.requester_name}</td>}<td><span className="category-dot" />{ticket.category}</td><td><Badge tone={priorityTone(ticket.priority)}>{ticket.priority}</Badge></td><td>{canManageTickets ? <select className="status-select" value={ticket.status} onChange={(event) => onStatusChange(ticket.dbId, event.target.value)}><option>Abierto</option><option>En progreso</option><option>Cerrado</option></select> : <Badge tone={statusTone(ticket.status)}>{ticket.status}</Badge>}</td><td className="muted">{ticket.date}</td></tr>)}</tbody></table>; }
function Knowledge({ articles, isAdmin, onCreate }) { const [searchTerm, setSearchTerm] = useState(''); const [showForm, setShowForm] = useState(false); const visibleArticles = articles.filter((article) => `${article.title} ${article.content} ${article.category} ${article.keywords || ''}`.toLowerCase().includes(searchTerm.toLowerCase())); async function submit(event) { event.preventDefault(); const data = new FormData(event.currentTarget); await onCreate({ title: data.get('title'), content: data.get('content'), category: data.get('category'), keywords: data.get('keywords') }); event.currentTarget.reset(); setShowForm(false); } return <section className="page-body"><div className="welcome-row"><div><p className="eyebrow">RECURSOS</p><h2>Base de conocimiento</h2><p className="muted">Soluciones rápidas para los problemas más comunes.</p></div>{isAdmin && <button className="primary-button" onClick={() => setShowForm((current) => !current)}><Plus size={17} />Cargar documento</button>}</div><div className="knowledge-search"><Search size={20} /><input placeholder="Buscar una solución..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} /></div>{isAdmin && showForm && <form className="panel knowledge-form" onSubmit={submit}><label>Título<input name="title" required placeholder="Problemas para entrar a Teams" /></label><label>Categoría<input name="category" required placeholder="Plataformas" /></label><label>Palabras clave<input name="keywords" placeholder="Teams, Microsoft, acceso" /></label><label>Contenido<textarea name="content" required rows="7" placeholder="Escribe la solución paso a paso..." /></label><button className="primary-button">Guardar documento <span>→</span></button></form>}<div className="article-grid">{visibleArticles.map((article) => <article className="article-card" key={article.id}><div className="article-icon"><BookOpen size={20} /></div><Badge tone="blue">{article.category}</Badge><h3>{article.title}</h3><p>Actualizado: {new Date(article.updated_at || Date.now()).toLocaleDateString('es-ES')}</p><button className="text-button">Leer artículo →</button></article>)}</div>{!visibleArticles.length && <div className="panel empty-state"><BookOpen size={24} /><h3>No hay documentos todavía</h3><p className="muted">{isAdmin ? 'Carga el primer documento para ayudar a tu equipo.' : 'El administrador aún no ha publicado soluciones.'}</p></div>}</section>; }
function Assistant({ categories }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [messages, setMessages] = useState([{ id: 'welcome', role: 'assistant', content: '¡Hola! Soy el asistente de soporte. Cuéntame qué problema tienes y buscaré una solución en la base de conocimiento.' }]);
  const [articles, setArticles] = useState([]);
  const [canCreateTicket, setCanCreateTicket] = useState(false);
  const [interactionId, setInteractionId] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [ticketDraft, setTicketDraft] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [ticketError, setTicketError] = useState('');
  const [ticketCreated, setTicketCreated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preparingTicket, setPreparingTicket] = useState(false);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const priorities = ['Baja', 'Media', 'Alta', 'Urgente'];
  const lastUserQuestion = [...messages].reverse().find((message) => message.role === 'user')?.content || question;

  async function ask(event) {
    event.preventDefault();
    const submittedQuestion = question.trim();
    if (!submittedQuestion) return;
    setLoading(true);
    setTicketDraft(null);
    setTicketError('');
    setTicketCreated(false);
    setAnswer('');
    setArticles([]);
    setCanCreateTicket(false);
    setInteractionId(null);
    setFeedback('');
    setFeedbackMessage('');
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', content: submittedQuestion }]);
    setQuestion('');
    try {
      const response = (await askAssistant(submittedQuestion, messages.filter((message) => message.role !== 'welcome'))).data;
      setAnswer(response.answer);
      setArticles(response.articles || []);
      setCanCreateTicket(Boolean(response.canCreateTicket));
      setInteractionId(response.interactionId || null);
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: 'assistant', content: response.answer }]);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'No se pudo consultar el asistente.';
      setAnswer(errorMessage);
      setArticles([]);
      setCanCreateTicket(false);
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: 'assistant', content: errorMessage }]);
    } finally {
      setLoading(false);
    }
  }

  async function rateAnswer(rating) {
    if (!interactionId) return;
    setFeedbackLoading(true);
    setFeedbackMessage('');
    try {
      await sendAssistantFeedback(interactionId, rating);
      setFeedback(rating);
      setFeedbackMessage('Gracias por tu valoración.');
    } catch (error) {
      setFeedbackMessage(error.response?.data?.message || 'No se pudo guardar la valoración.');
    } finally {
      setFeedbackLoading(false);
    }
  }

  async function prepareTicket() {
    setPreparingTicket(true);
    setTicketError('');
    try {
      const result = (await analyzeTicket(lastUserQuestion)).data;
      setTicketDraft({
        subject: lastUserQuestion.slice(0, 180),
        description: lastUserQuestion,
        category: result.category || 'General',
        priority: priorities.includes(result.priority) ? result.priority : 'Media'
      });
      setSuggestions(Array.isArray(result.suggestions) ? result.suggestions : []);
    } catch {
      setTicketDraft({ subject: lastUserQuestion.slice(0, 180), description: lastUserQuestion, category: 'General', priority: 'Media' });
      setSuggestions([]);
      setTicketError('No se pudieron generar sugerencias. Puedes completar el ticket manualmente.');
    } finally {
      setPreparingTicket(false);
    }
  }

  async function submitTicket(event) {
    event.preventDefault();
    setSubmittingTicket(true);
    setTicketError('');
    try {
      await createTicket(ticketDraft);
      setTicketCreated(true);
      setTicketDraft(null);
    } catch (error) {
      setTicketError(error.response?.data?.message || 'No se pudo crear el ticket.');
    } finally {
      setSubmittingTicket(false);
    }
  }

  function updateDraft(field, value) {
    setTicketDraft((current) => ({ ...current, [field]: value }));
  }

  const categoryOptions = [...new Set(['General', ...categories.map((category) => category.name), ticketDraft?.category].filter(Boolean))];

  return <section className="page-body">
    <div className="welcome-row"><div><p className="eyebrow">CENTRO DE AYUDA</p><h2>Asistente IA</h2><p className="muted">Primero busca una solución en la base de conocimiento.</p></div></div>
    <div className="panel ai-panel">
      <div className="article-icon"><Bot size={22} /></div>
      <div className="chat-thread">
        {messages.map((message) => <div className={`chat-row ${message.role}`} key={message.id}><div className="chat-bubble">{message.content}</div></div>)}
        {loading && <div className="chat-row assistant"><div className="chat-bubble typing">Consultando respuesta...</div></div>}
      </div>
      {answer && interactionId && <div className="ai-feedback">
        <span>¿Te sirvió esta respuesta?</span>
        <div className="ai-feedback-actions">
          <button type="button" className={`ai-feedback-button ${feedback === 'helpful' ? 'selected' : ''}`} aria-label="Sí, me sirvió" aria-pressed={feedback === 'helpful'} title="Sí, me sirvió" disabled={feedbackLoading || Boolean(feedback)} onClick={() => rateAnswer('helpful')}><ThumbsUp size={17} /></button>
          <button type="button" className={`ai-feedback-button ${feedback === 'not_helpful' ? 'selected' : ''}`} aria-label="No me sirvió" aria-pressed={feedback === 'not_helpful'} title="No me sirvió" disabled={feedbackLoading || Boolean(feedback)} onClick={() => rateAnswer('not_helpful')}><ThumbsDown size={17} /></button>
        </div>
        {feedbackMessage && <small className={feedback ? 'ai-success' : 'ai-error'} role={feedback ? 'status' : 'alert'}>{feedbackMessage}</small>}
      </div>}
      {articles.length > 0 && <div className="ai-sources"><h3>Artículos consultados</h3><ul>{articles.map((article) => <li key={`${article.category}-${article.title}`}><span>{article.title}</span><small>{article.category}</small></li>)}</ul></div>}
      {answer && canCreateTicket && !ticketCreated && !ticketDraft && <button className="secondary-button ai-ticket-cta" onClick={prepareTicket} disabled={preparingTicket}>{preparingTicket ? 'Preparando ticket...' : articles.length ? '¿No se resolvió? Preparar ticket' : 'Preparar ticket'} <span>→</span></button>}
      {ticketError && <p className="ai-error" role="alert">{ticketError}</p>}
      {ticketDraft && <form className="ai-ticket-form" onSubmit={submitTicket}>
        <h3>Revisa la solicitud</h3>
        {suggestions.length > 0 && <div className="ai-suggestions"><strong>Sugerencias para completar</strong><ul>{suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}</ul></div>}
        <label>Asunto<input value={ticketDraft.subject} maxLength={180} onChange={(event) => updateDraft('subject', event.target.value)} required /></label>
        <div className="ai-ticket-fields">
          <label>Categoría<select value={ticketDraft.category} onChange={(event) => updateDraft('category', event.target.value)}>{categoryOptions.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label>Prioridad<select value={ticketDraft.priority} onChange={(event) => updateDraft('priority', event.target.value)}>{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select></label>
        </div>
        <label>Descripción<textarea value={ticketDraft.description} rows="4" onChange={(event) => updateDraft('description', event.target.value)} required /></label>
        <button className="primary-button" type="submit" disabled={submittingTicket}>{submittingTicket ? 'Creando ticket...' : 'Crear ticket'} <span>→</span></button>
      </form>}
      {ticketCreated && <p className="ai-success" role="status">Ticket creado correctamente. Puedes consultarlo en Mis tickets.</p>}
      <form onSubmit={ask} className="ai-form"><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ejemplo: No puedo entrar a Teams" required /><button className="primary-button" disabled={loading}>{loading ? 'Consultando...' : 'Consultar IA'} <span>→</span></button></form>
    </div>
  </section>;
}
function CategoryManagement({ categories, onCreate }) { const [name, setName] = useState(''); async function submit(event) { event.preventDefault(); if (!name.trim()) return; await onCreate(name.trim()); setName(''); } return <section className="page-body"><div className="welcome-row"><div><p className="eyebrow">ADMINISTRACIÓN</p><h2>Categorías</h2><p className="muted">Organiza los tickets y la base de conocimiento.</p></div></div><div className="panel category-panel"><form className="ai-form" onSubmit={submit}><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nueva categoría" /><button className="primary-button">Agregar <span>→</span></button></form><div className="category-list">{categories.map((category) => <Badge key={category.id} tone="blue">{category.name}</Badge>)}</div></div></section>; }
