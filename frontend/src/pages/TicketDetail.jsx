import { useEffect, useRef, useState } from 'react';
import { addTicketComment, getTicketComments, getTicketHistory } from '../services/ticketService.js';
import StatusPicker from '../components/StatusPicker.jsx';
import StarRating from '../components/StarRating.jsx';
import { formatRole } from '../utils/roles.js';

const MAX_LENGTH = 2000;
const formatDate = (value) => new Date(value).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function TicketDetail({ ticket, user, canManage = false, onStatusChange, onRate, onClose }) {
  const [comments, setComments] = useState([]);
  const [history, setHistory] = useState([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [stars, setStars] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSending, setRatingSending] = useState(false);
  const [ratingError, setRatingError] = useState('');

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
  }, [ticket.status, ticket.rating]);

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

  async function submitRating(event) {
    event.preventDefault();
    if (!stars || ratingSending) return;
    setRatingSending(true);
    setRatingError('');
    try {
      await onRate(ticket.dbId, stars, ratingComment.trim());
    } catch (requestError) {
      setRatingError(requestError.response?.data?.message || 'No se pudo enviar la calificación.');
    } finally {
      setRatingSending(false);
    }
  }

  const isRequester = ticket.user_id === user?.id;

  return <div className="modal-backdrop ticket-detail-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal-panel ticket-detail-panel" role="dialog" aria-modal="true" aria-label={`Ticket ${ticket.id}`} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
      <div className="modal-heading">
        <div><span className="eyebrow">{ticket.id} · {String(ticket.status).toUpperCase()}</span><h2>{ticket.subject}</h2></div>
        <button type="button" className="close-button" onClick={onClose} aria-label="Cerrar">×</button>
      </div>
      <p className="muted">{ticket.category} · Prioridad {ticket.priority} · {ticket.date}</p>
      {ticket.requester_name && <p className="muted">Solicitante: <strong>{ticket.requester_name}</strong> · {formatRole(ticket.requester_role)}</p>}
      {canManage && <div style={{ margin: '12px 0' }}><StatusPicker value={ticket.status} onChange={(status) => onStatusChange(ticket.dbId, status)} /></div>}
      <p className="ticket-description" style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{ticket.description}</p>
      {ticket.status === 'Cerrado' && <section className="rating-box" aria-label="Calificación de la atención">
        {ticket.rating ? <>
          <h3>Calificación de la atención</h3>
          <div className="rating-result"><StarRating value={ticket.rating} size={20} label="Calificación de la atención" /><strong>{ticket.rating}/5</strong></div>
          {ticket.rating_comment && <p className="rating-comment">“{ticket.rating_comment}”</p>}
        </> : isRequester ? <form onSubmit={submitRating}>
          <h3>¿Cómo fue la atención?</h3>
          <p className="muted">Tu ticket está cerrado. Califica la atención que recibiste.</p>
          <StarRating value={stars} onChange={setStars} label="Calificación de la atención" />
          <label>Comentario (opcional)<textarea rows="2" maxLength={500} value={ratingComment} onChange={(event) => setRatingComment(event.target.value)} placeholder="Cuéntanos qué salió bien o qué podemos mejorar..." /></label>
          {ratingError && <p className="auth-error" role="alert">{ratingError}</p>}
          <button className="primary-button" type="submit" disabled={!stars || ratingSending}>{ratingSending ? 'Enviando...' : 'Enviar calificación'} <span>→</span></button>
        </form> : <p className="muted">El solicitante aún no ha calificado la atención.</p>}
      </section>}
      {history.length > 0 && <details style={{ margin: '12px 0' }}>
        <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Historial ({history.length})</summary>
        <ol className="ticket-history-list" style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'grid', gap: 8, fontSize: 13 }}>
          {history.map((entry) => <li className="ticket-history-item" key={entry.id}>
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