import { useEffect, useRef, useState } from 'react';
import { addTicketComment, getTicketComments, getTicketHistory } from '../services/ticketService.js';
import StatusPicker from '../components/StatusPicker.jsx';
import { formatRole } from '../utils/roles.js';

const MAX_LENGTH = 2000;
const formatDate = (value) => new Date(value).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function TicketDetail({ ticket, user, canManage = false, onStatusChange, onClose }) {
  const [comments, setComments] = useState([]);
  const [history, setHistory] = useState([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([getTicketComments(ticket.dbId), getTicketHistory(ticket.dbId).catch(() => ({ data: [] }))])
      .then(([commentsResponse, historyResponse]) => { if (!cancelled) { setComments(commentsResponse.data); setHistory(historyResponse.data); } })
      .catch((requestError) => { if (!cancelled) setError(requestError.response?.data?.message || 'No se pudieron cargar los comentarios.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ticket.dbId]);

  // Cuando un agente cambia el estado desde aquí, el historial se recarga para mostrar el nuevo movimiento.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    getTicketHistory(ticket.dbId).then((historyResponse) => setHistory(historyResponse.data)).catch(() => {});
  }, [ticket.status]);

  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  async function submit(event) {
    event.preventDefault();
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setError('');
    try {
      const response = await addTicketComment(ticket.dbId, text);
      setComments((current) => [...current, response.data]);
      setBody('');
      getTicketHistory(ticket.dbId).then((historyResponse) => setHistory(historyResponse.data)).catch(() => {});
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'No se pudo enviar el comentario.');
    } finally {
      setSending(false);
    }
  }

  return <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal-panel" role="dialog" aria-modal="true" aria-label={`Ticket ${ticket.id}`} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
      <div className="modal-heading">
        <div><span className="eyebrow">{ticket.id} · {String(ticket.status).toUpperCase()}</span><h2>{ticket.subject}</h2></div>
        <button type="button" className="close-button" onClick={onClose} aria-label="Cerrar">×</button>
      </div>
      <p className="muted">{ticket.category} · Prioridad {ticket.priority} · {ticket.date}</p>
      {ticket.requester_name && <p className="muted">Solicitante: <strong>{ticket.requester_name}</strong> · {formatRole(ticket.requester_role)}</p>}
      {canManage && <div style={{ margin: '12px 0' }}><StatusPicker value={ticket.status} onChange={(status) => onStatusChange(ticket.dbId, status)} /></div>}
      <p style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{ticket.description}</p>
      {history.length > 0 && <details style={{ margin: '12px 0' }}>
        <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Historial ({history.length})</summary>
        <ol style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'grid', gap: 8, fontSize: 13 }}>
          {history.map((entry) => <li key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderLeft: '2px solid #e87946', paddingLeft: 10 }}>
            <span><strong>{entry.action}</strong><span className="muted"> · {entry.user_name}</span></span>
            <span className="muted">{formatDate(entry.created_at)}</span>
          </li>)}
        </ol>
      </details>}
      <div className="chat-thread" aria-live="polite">
        {loading && <p className="muted">Cargando comentarios...</p>}
        {!loading && !comments.length && !error && <p className="muted">Aún no hay comentarios en este ticket.</p>}
        {comments.map((comment) => <div className={`chat-row ${comment.user_id === user?.id ? 'user' : 'assistant'}`} key={comment.id}>
          <div className="chat-bubble"><small style={{ display: 'block', opacity: 0.75, marginBottom: 4 }}>{comment.author_name} · {formatDate(comment.created_at)}</small>{comment.body}</div>
        </div>)}
      </div>
      <form onSubmit={submit}>
        <label>Añadir comentario<textarea rows="3" maxLength={MAX_LENGTH} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Escribe tu mensaje..." required /></label>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="primary-button" type="submit" disabled={sending || !body.trim()}>{sending ? 'Enviando...' : 'Enviar comentario'} <span>→</span></button>
      </form>
    </div>
  </div>;
}