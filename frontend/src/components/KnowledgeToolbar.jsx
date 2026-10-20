import { Search } from 'lucide-react';
import { INITIAL_VIEW, NO_AUTHOR_VALUE, SORT_OPTIONS, filterOptions, isViewActive } from '../utils/knowledgeView.js';

// Buscador a la izquierda; contador, filtros por categoría y autor, y orden a la derecha.
export default function KnowledgeToolbar({ articles, view, onChange, shown }) {
  const { categories, authors, hasUnknownAuthor } = filterOptions(articles);
  const set = (field) => (event) => onChange({ ...view, [field]: event.target.value });
  return <div className="knowledge-toolbar">
    <div className="knowledge-search"><Search size={20} /><input placeholder="Buscar una solución..." aria-label="Buscar una solución" value={view.search} onChange={set('search')} /></div>
    <div className="knowledge-filters">
      {isViewActive(view) && <div className="knowledge-toolbar-meta"><small className="muted">{shown} de {articles.length} documentos</small><button type="button" className="text-button" onClick={() => onChange(INITIAL_VIEW)}>Limpiar</button></div>}
      <label className="knowledge-select"><span>Categoría</span>
        <select value={view.category} onChange={set('category')}><option value="">Todas</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
      </label>
      <label className="knowledge-select"><span>Autor</span>
        <select value={view.author} onChange={set('author')}><option value="">Todos</option>{authors.map((author) => <option key={author} value={author}>{author}</option>)}{hasUnknownAuthor && <option value={NO_AUTHOR_VALUE}>Sin autor</option>}</select>
      </label>
      <label className="knowledge-select"><span>Ordenar por</span>
        <select value={view.sort} onChange={set('sort')}>{SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
      </label>
    </div>
  </div>;
}