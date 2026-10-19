import { useEffect, useRef, useState } from 'react';
import { BookOpen, Bot, Plus, Search, ThumbsDown, ThumbsUp } from 'lucide-react';
import { createCategory, getCategories, getDashboard, getUsers, updateUserRole, updateUserStatus } from './api.js';
import { analyzeTicket, askAssistant, sendAssistantFeedback } from './services/aiService.js';
import { createKnowledge, getKnowledge } from './services/knowledgeService.js';
import { createTicket, getTickets, updateTicketStatus } from './services/ticketService.js';
import { getNotifications, markAllNotificationsAsRead, markNotificationAsRead } from './services/notificationService.js';
import { useAuth } from './context/AuthContext.jsx';
import MainLayout from './layouts/MainLayout.jsx';
import StatusPicker from './components/StatusPicker.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { formatRole } from './utils/roles.js';
import Login from './pages/Login.jsx';
import Users from './pages/Users.jsx';
import TicketDetail from './pages/TicketDetail.jsx';
import Settings from './pages/Settings.jsx';
import ArticleDetail from './pages/ArticleDetail.jsx';

function Badge({ children, tone = 'neutral' }) { return <span className={`badge-soft ${tone}`}>{children}</span>; }
function statusTone(status) { return status === 'Cerrado' ? 'green' : status === 'En progreso' ? 'blue' : 'amber'; }
function priorityTone(priority) { return ['Alta', 'Urgente'].includes(priority) ? 'red' : priority === 'Baja' ? 'green' : 'amber'; }
function formatTicket(ticket) {
  return { ...ticket, dbId: ticket.id, id: `TK-${ticket.id}`, date: new Date(ticket.created_at).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) };
}

export default function App() {
  const { authenticated, ready, user, startSession, endSession } = useAuth();
  const [active, setActive] = useState('Resumen');
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, closed: 0 });
  const [articles, setArticles] = useState([]);
  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [notice, setNotice] = useState('');
  const noticeTimer = useRef(null);
  const filtered = tickets.filter((ticket) => `${ticket.subject} ${ticket.id} ${ticket.category} ${ticket.status} ${ticket.requester_name || ''}`.toLowerCase().includes(search.trim().toLowerCase()));

  function flash(message, duration = 2600) {
    clearTimeout(noticeTimer.current);
    setNotice(message);
    noticeTimer.current = setTimeout(() => setNotice(''), duration);
  }

  // Recarga tickets, estadísticas y notificaciones desde el servidor para que lista, gráficos y campana siempre coincidan con la base.
  async function refreshTicketData() {
    try {
      const [ticketsResponse, dashboardResponse, notificationsResponse] = await Promise.all([getTickets(), getDashboard(), getNotifications()]);
      setTickets(ticketsResponse.data.map(formatTicket));
      setStats(dashboardResponse.data);
      setNotifications(notificationsResponse.data);
    } catch { /* si falla, se conservan los datos actuales y se reintenta en el siguiente ciclo */ }
  }

  useEffect(() => {
    if (!authenticated || !ready) return;
    setDataLoading(true);
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
      .catch(() => setLoadError('No se pudieron cargar los datos de la base de datos.'))
      .finally(() => setDataLoading(false));
  }, [authenticated, ready]);

  // La campana y la lista se actualizan solas cada minuto (tickets nuevos, comentarios, cambios de estado).
  useEffect(() => {
    if (!authenticated || !ready) return undefined;
    const timer = setInterval(refreshTicketData, 60_000);
    return () => clearInterval(timer);
  }, [authenticated, ready]);

  if (!authenticated) return <Login onAuth={startSession} />;
  if (!ready) return <div className="notice">Verificando sesión...</div>;

  function logout() {
    setSelectedTicketId(null);
    endSession();
  }

  async function addTicket(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const draft = { subject: data.get('subject'), description: data.get('description'), category: data.get('category'), priority: data.get('priority') };
    try {
      const response = await createTicket(draft);
      setTickets((current) => [formatTicket(response.data), ...current]);
    } catch (error) {
      flash(error.response?.data?.message || 'No se pudo crear el ticket', 4000);
      return;
    }
    setShowForm(false);
    flash('Ticket creado correctamente');
    refreshTicketData(); // actualiza también los gráficos por categoría y prioridad
  }

  async function changeTicketStatus(ticketId, status) {
    try {
      await updateTicketStatus(ticketId, status);
      setTickets((current) => current.map((ticket) => ticket.dbId === ticketId ? { ...ticket, status } : ticket));
      flash('Estado del ticket actualizado');
      refreshTicketData(); // contadores del resumen y gráficos salen del servidor, no de cuentas locales
    } catch (error) {
      flash(error.response?.data?.message || 'No se pudo actualizar el ticket', 4000);
    }
  }

  async function reloadUsers() {
    try { setUsers((await getUsers()).data); } catch { /* se mantiene la lista actual */ }
  }

  async function changeUserRole(userId, role) {
    try { await updateUserRole(userId, role); flash('Rol actualizado'); } catch (error) { flash(error.response?.data?.message || 'No se pudo cambiar el rol', 4000); }
    await reloadUsers(); // vuelve a leer la lista: si el servidor rechazó el cambio, la lista recupera el valor real
  }

  async function changeUserStatus(userId, active) {
    try { await updateUserStatus(userId, active); flash(active ? 'Usuario reactivado' : 'Usuario desactivado'); } catch (error) { flash(error.response?.data?.message || 'No se pudo cambiar el estado del usuario', 4000); }
    await reloadUsers();
  }

  async function readNotification(notification) {
    if (notification.ticket_id) {
      if (tickets.some((ticket) => ticket.dbId === notification.ticket_id)) setSelectedTicketId(notification.ticket_id);
      else { flash('Ese ticket no está en tu lista actual. Se está actualizando; inténtalo de nuevo en unos segundos.', 4000); refreshTicketData(); }
    }
    if (notification.read_at) return;
    try {
      await markNotificationAsRead(notification.id);
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item));
    } catch { flash('No se pudo actualizar la notificación', 4000); }
  }

  async function readAllNotifications() {
    try {
      await markAllNotificationsAsRead();
      const now = new Date().toISOString();
      setNotifications((current) => current.map((item) => item.read_at ? item : { ...item, read_at: now }));
    } catch { flash('No se pudieron marcar las notificaciones', 4000); }
  }

  const canManageTickets = ['agent', 'admin'].includes(user?.role);
  const selectedTicket = tickets.find((ticket) => ticket.dbId === selectedTicketId);
  const ticketCategories = categories.length ? categories.map((category) => category.name) : ['General'];

  return <MainLayout active={active} search={search} onSearch={setSearch} onSearchSubmit={() => setActive('Mis tickets')} searchResults={filtered} onOpenTicket={setSelectedTicketId} user={user} onLogout={logout} notifications={notifications} onReadNotification={readNotification} onReadAllNotifications={readAllNotifications} onNavigate={setActive}>
      {notice && <div className="notice"><span>✓</span>{notice}</div>}
      {loadError ? <section className="page-body app-page-state" role="alert">
        <div className="panel empty-state">
          <h2>No se pudo cargar el espacio de trabajo</h2>
          <p>{loadError}</p>
          <button type="button" className="secondary-button" onClick={() => window.location.reload()}>Reintentar</button>
        </div>
      </section> : dataLoading ? <section className="page-body app-page-state" role="status" aria-live="polite" aria-busy="true">
        <div className="panel empty-state">
          <span className="app-loading-indicator" aria-hidden="true" />
          <h2>Cargando tu espacio de trabajo</h2>
          <p>Estamos preparando tus tickets, estadísticas y notificaciones.</p>
        </div>
      </section> : <>
      {active === 'Resumen' && <Dashboard onNew={() => setShowForm(true)} stats={stats} user={user}>
        <div className="content-grid">
          <div className="panel ticket-panel">
            <PanelHeader title="Actividad reciente" action="Ver todos" onAction={() => setActive('Mis tickets')} />
            <div className="table-wrap"><TicketTable tickets={filtered.slice(0, 5)} canManageTickets={canManageTickets} onStatusChange={changeTicketStatus} onOpen={setSelectedTicketId} /></div>
          </div>
          <div className="panel insight-panel">
            <PanelHeader title="¿Necesitas ayuda?" />
            <div className="insight-graphic"><div className="graphic-ring">?</div></div>
            <p className="insight-copy">Describe tu problema y nuestra IA te ayudará a encontrar una solución más rápido.</p>
            <button className="secondary-button" onClick={() => setActive('Asistente IA')}><Bot size={16} />Abrir Asistente IA <span>→</span></button>
          </div>
        </div>
      </Dashboard>}
      {active === 'Mis tickets' && <TicketList tickets={filtered} onNew={() => setShowForm(true)} canManageTickets={canManageTickets} onStatusChange={changeTicketStatus} onOpen={setSelectedTicketId} />}
      {active === 'Base de conocimiento' && <Knowledge articles={articles} categories={categories} isAdmin={user?.role === 'admin'} onCreate={async (article) => { const response = await createKnowledge(article); setArticles((current) => [response.data, ...current]); }} />}
      {active === 'Asistente IA' && <Assistant categories={categories} onTicketCreated={refreshTicketData} />}
      {active === 'Usuarios' && user?.role === 'admin' && <Users users={users} currentUserId={user.id} onRoleChange={changeUserRole} onStatusChange={changeUserStatus} />}
      {active === 'Categorías' && user?.role === 'admin' && <CategoryManagement categories={categories} onCreate={async (name) => { const response = await createCategory(name); setCategories((current) => [...current, response.data].sort((first, second) => first.name.localeCompare(second.name))); }} />}
      {active === 'Configuración' && <Settings user={user} />}
      {showForm && <div className="modal-backdrop"><form className="modal-panel" onSubmit={addTicket}><div className="modal-heading"><div><span className="eyebrow">NUEVA SOLICITUD</span><h2>Crear ticket</h2></div><button type="button" className="close-button" onClick={() => setShowForm(false)}>×</button></div><label>Asunto<input name="subject" required placeholder="¿En qué podemos ayudarte?" /></label><label>Categoría<select name="category" defaultValue="General">{ticketCategories.map((name) => <option key={name}>{name}</option>)}</select></label><label>Prioridad<select name="priority"><option>Media</option><option>Alta</option><option>Baja</option><option>Urgente</option></select></label><label>Descripción<textarea name="description" required rows="4" placeholder="Describe el problema con el mayor detalle posible..." /></label><button className="primary-button" type="submit">Enviar ticket <span>→</span></button></form></div>}
    {selectedTicket && <TicketDetail ticket={selectedTicket} user={user} canManage={canManageTickets} onStatusChange={changeTicketStatus} onClose={() => setSelectedTicketId(null)} />}
      </>}
  </MainLayout>;
}

function PanelHeader({ title, action, onAction }) { return <div className="panel-header"><h3>{title}</h3>{action && <button className="text-button" onClick={onAction}>{action} →</button>}</div>; }
function TicketList({ tickets, onNew, canManageTickets, onStatusChange, onOpen }) { return <section className="page-body"><div className="welcome-row"><div><p className="eyebrow">SEGUIMIENTO</p><h2>{canManageTickets ? 'Gestión de tickets' : 'Mis tickets'}</h2><p className="muted">{canManageTickets ? 'Revisa y actualiza las solicitudes de todos los usuarios.' : 'Consulta el avance de tus solicitudes.'}</p></div><button className="primary-button" onClick={onNew}><Plus size={17} />Nuevo ticket</button></div><div className="panel ticket-panel"><div className="table-wrap"><TicketTable tickets={tickets} canManageTickets={canManageTickets} onStatusChange={onStatusChange} onOpen={onOpen} /></div></div></section>; }
function TicketTable({ tickets, canManageTickets, onStatusChange, onOpen }) {
  return <table className="ticket-table">
    <thead><tr><th>Ticket</th><th>Asunto</th>{canManageTickets && <th>Solicitante</th>}<th>Categoría</th><th>Prioridad</th><th>Estado</th><th>Fecha</th></tr></thead>
    <tbody>{tickets.length ? tickets.map((ticket) => <tr key={ticket.id}>
      <td data-label="Ticket"><strong className="ticket-id">{ticket.id}</strong></td>
      <td data-label="Asunto"><button type="button" className="text-button" title="Ver detalle y comentarios" onClick={() => onOpen(ticket.dbId)}>{ticket.subject}</button></td>
      {canManageTickets && <td data-label="Solicitante"><strong>{ticket.requester_name}</strong><small className="muted" style={{ display: 'block' }}>{formatRole(ticket.requester_role)}</small></td>}
      <td data-label="Categoría"><span className="category-dot" />{ticket.category}</td>
      <td data-label="Prioridad"><Badge tone={priorityTone(ticket.priority)}>{ticket.priority}</Badge></td>
      <td data-label="Estado">{canManageTickets ? <StatusPicker value={ticket.status} onChange={(status) => onStatusChange(ticket.dbId, status)} /> : <Badge tone={statusTone(ticket.status)}>{ticket.status}</Badge>}</td>
      <td data-label="Fecha" className="muted">{ticket.date}</td>
    </tr>) : <tr className="table-empty-row"><td colSpan={canManageTickets ? 7 : 6}>No hay tickets que mostrar.</td></tr>}</tbody>
  </table>;
}
function Knowledge({ articles, categories, isAdmin, onCreate }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [openArticle, setOpenArticle] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const visibleArticles = articles.filter((article) => `${article.title} ${article.content} ${article.category} ${article.keywords || ''}`.toLowerCase().includes(searchTerm.toLowerCase()));

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget; // se guarda antes del await: después, React deja currentTarget en null
    const data = new FormData(form);
    setSaving(true);
    setFormError('');
    try {
      await onCreate({ title: data.get('title'), content: data.get('content'), category: data.get('category'), keywords: data.get('keywords') });
      form.reset();
      setShowForm(false);
    } catch (error) {
      setFormError(error.response?.data?.message || 'No se pudo guardar el documento.');
    } finally {
      setSaving(false);
    }
  }

  return <section className="page-body">
    <div className="welcome-row"><div><p className="eyebrow">RECURSOS</p><h2>Base de conocimiento</h2><p className="muted">Soluciones rápidas para los problemas más comunes.</p></div>{isAdmin && <button className="primary-button" onClick={() => setShowForm((current) => !current)}><Plus size={17} />Cargar documento</button>}</div>
    <div className="knowledge-search"><Search size={20} /><input placeholder="Buscar una solución..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} /></div>
    {isAdmin && showForm && <form className="panel knowledge-form" onSubmit={submit}>
      <label>Título<input name="title" required placeholder="Problemas para entrar a Teams" /></label>
      <label>Categoría<select name="category" required defaultValue="" disabled={!categories.length}>
        <option value="" disabled>{categories.length ? 'Selecciona una categoría' : 'No hay categorías creadas'}</option>
        {categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
      </select></label>
      {!categories.length && <p className="muted">Crea primero una categoría en la sección «Categorías».</p>}
      <label>Palabras clave<input name="keywords" placeholder="Teams, Microsoft, acceso" /></label>
      <label>Contenido<textarea name="content" required rows="7" placeholder="Escribe la solución paso a paso..." /></label>
      {formError && <p className="auth-error" role="alert">{formError}</p>}
      <button className="primary-button" disabled={saving || !categories.length}>{saving ? 'Guardando...' : 'Guardar documento'} <span>→</span></button>
    </form>}
    <div className="article-grid">{visibleArticles.map((article) => <article className="article-card" key={article.id}><div className="article-icon"><BookOpen size={20} /></div><Badge tone="blue">{article.category}</Badge><h3>{article.title}</h3><p>Actualizado: {new Date(article.updated_at || Date.now()).toLocaleDateString('es-ES')}</p><button className="text-button" onClick={() => setOpenArticle(article)}>Leer artículo →</button></article>)}</div>
    {!visibleArticles.length && <div className="panel empty-state"><BookOpen size={24} /><h3>{articles.length ? 'No hay resultados para esta búsqueda' : 'No hay documentos todavía'}</h3><p className="muted">{articles.length ? 'Prueba con otros términos o limpia el campo de búsqueda.' : isAdmin ? 'Carga el primer documento para ayudar a tu equipo.' : 'El administrador aún no ha publicado soluciones.'}</p></div>}
    {openArticle && <ArticleDetail article={openArticle} onClose={() => setOpenArticle(null)} />}
  </section>;
}
function Assistant({ categories, onTicketCreated }) {
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
      const response = (await askAssistant(submittedQuestion, messages.filter((message) => message.id !== 'welcome').map(({ role, content }) => ({ role, content })))).data;
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
        category: categories.find(
          (category) =>
            category.name.toLowerCase() ===
            String(result.category || '').trim().toLowerCase()
        )?.name || 'General',
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
      onTicketCreated?.(); // para que «Mis tickets» y los gráficos incluyan el ticket nuevo sin recargar la página
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
      <form onSubmit={ask} className="ai-form"><input value={question} maxLength={1000} onChange={(event) => setQuestion(event.target.value)} placeholder="Ejemplo: No puedo entrar a Teams" required /><button className="primary-button" disabled={loading}>{loading ? 'Consultando...' : 'Consultar IA'} <span>→</span></button></form>
    </div>
  </section>;
}
function CategoryManagement({ categories, onCreate }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (!name.trim()) return;
    setError('');
    try { await onCreate(name.trim()); setName(''); } catch (requestError) { setError(requestError.response?.data?.message || 'No se pudo crear la categoría.'); }
  }
  return <section className="page-body"><div className="welcome-row"><div><p className="eyebrow">ADMINISTRACIÓN</p><h2>Categorías</h2><p className="muted">Organiza los tickets y la base de conocimiento.</p></div></div><div className="panel category-panel"><form className="ai-form" onSubmit={submit}><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nueva categoría" aria-label="Nueva categoría" /><button className="primary-button">Agregar <span>→</span></button></form>{error && <p className="auth-error" role="alert">{error}</p>}<div className="category-list">{categories.length ? categories.map((category) => <Badge key={category.id} tone="blue">{category.name}</Badge>) : <p className="muted">Aún no hay categorías. Agrega una para organizar tickets y documentos.</p>}</div></div></section>;
}