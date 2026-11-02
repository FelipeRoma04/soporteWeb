import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function ArticleDetail({ article, onClose }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  const previousFocusRef = useRef(null);
  const keywords = (article.keywords || '').split(',').map((keyword) => keyword.trim()).filter(Boolean);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    const rootOverflow = root.style.overflow;
    const bodyOverflow = body.style.overflow;
    const bodyPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    previousFocusRef.current = document.activeElement;

    root.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    closeRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusableElements = dialogRef.current?.querySelectorAll(focusableSelector);
      if (!focusableElements?.length) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      root.style.overflow = rootOverflow;
      body.style.overflow = bodyOverflow;
      body.style.paddingRight = bodyPaddingRight;
      window.scrollTo({ top: scrollY, left: scrollX, behavior: 'instant' });
      previousFocusRef.current?.focus?.();
    };
  }, []);

  return createPortal(
    <div
      className="modal-backdrop article-detail-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="modal-panel article-detail-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="modal-heading">
          <div><span className="eyebrow">{String(article.category).toUpperCase()}</span><h2 id={titleId}>{article.title}</h2></div>
          <button ref={closeRef} type="button" className="close-button" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <p className="muted">{article.author_name ? <>Publicado por <strong>{article.author_name}</strong> · </> : null}Actualizado: {new Date(article.updated_at || Date.now()).toLocaleDateString('es-ES')}</p>
        <div className="article-detail-content">{article.content}</div>
        {keywords.length > 0 && <div className="article-detail-keywords">{keywords.map((keyword) => <span className="badge-soft blue" key={keyword}>{keyword}</span>)}</div>}
      </div>
    </div>,
    document.body
  );
}
