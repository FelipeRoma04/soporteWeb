import { useEffect } from 'react';

export default function ArticleDetail({ article, onClose }) {
  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const keywords = (article.keywords || '').split(',').map((keyword) => keyword.trim()).filter(Boolean);

  return <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal-panel" role="dialog" aria-modal="true" aria-label={article.title} style={{ width: 'min(680px, 100%)', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}>
      <div className="modal-heading">
        <div><span className="eyebrow">{String(article.category).toUpperCase()}</span><h2>{article.title}</h2></div>
        <button type="button" className="close-button" onClick={onClose} aria-label="Cerrar">×</button>
      </div>
      <p className="muted">{article.author_name ? <>Publicado por <strong>{article.author_name}</strong> · </> : null}Actualizado: {new Date(article.updated_at || Date.now()).toLocaleDateString('es-ES')}</p>
      <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.65 }}>{article.content}</div>
      {keywords.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>{keywords.map((keyword) => <span className="badge-soft blue" key={keyword}>{keyword}</span>)}</div>}
    </div>
  </div>;
}