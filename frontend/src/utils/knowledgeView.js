// Filtros y orden de la base de conocimiento. Todo se hace en el navegador sobre los artículos ya cargados (no toca la API ni la base de datos).
const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });
const time = (value) => (value ? new Date(value).getTime() : 0);
const NO_AUTHOR = '__sin_autor__';

export const SORT_OPTIONS = [
  { value: 'updated_desc', label: 'Modificados recientemente' },
  { value: 'updated_asc', label: 'Modificados hace más tiempo' },
  { value: 'created_desc', label: 'Creados recientemente' },
  { value: 'created_asc', label: 'Creados hace más tiempo' },
  { value: 'title_asc', label: 'Título (A-Z)' },
  { value: 'title_desc', label: 'Título (Z-A)' },
  { value: 'author_asc', label: 'Autor (A-Z)' },
  { value: 'category_asc', label: 'Categoría (A-Z)' }
];
export const INITIAL_VIEW = { search: '', category: '', author: '', sort: 'updated_desc' };
export const NO_AUTHOR_VALUE = NO_AUTHOR;

const COMPARATORS = {
  updated_desc: (a, b) => time(b.updated_at) - time(a.updated_at),
  updated_asc: (a, b) => time(a.updated_at) - time(b.updated_at),
  created_desc: (a, b) => time(b.created_at) - time(a.created_at),
  created_asc: (a, b) => time(a.created_at) - time(b.created_at),
  title_asc: (a, b) => collator.compare(a.title, b.title),
  title_desc: (a, b) => collator.compare(b.title, a.title),
  // Los artículos sin autor (cuenta eliminada) van al final; a igual autor, el más reciente primero.
  author_asc: (a, b) => (!a.author_name - !b.author_name) || collator.compare(a.author_name || '', b.author_name || '') || time(b.updated_at) - time(a.updated_at),
  category_asc: (a, b) => collator.compare(a.category, b.category) || collator.compare(a.title, b.title)
};

// Categorías y autores que existen en los artículos, para llenar los filtros.
export function filterOptions(articles) {
  const categories = [...new Set(articles.map((article) => article.category).filter(Boolean))].sort(collator.compare);
  const authors = [...new Set(articles.map((article) => article.author_name).filter(Boolean))].sort(collator.compare);
  return { categories, authors, hasUnknownAuthor: articles.some((article) => !article.author_name) };
}

export function applyView(articles, view) {
  const term = view.search.trim().toLowerCase();
  return articles
    .filter((article) => !term || `${article.title} ${article.content} ${article.category} ${article.keywords || ''}`.toLowerCase().includes(term))
    .filter((article) => !view.category || article.category === view.category)
    .filter((article) => !view.author || (view.author === NO_AUTHOR ? !article.author_name : article.author_name === view.author))
    .sort(COMPARATORS[view.sort] || COMPARATORS.updated_desc);
}

export const isViewActive = (view) => Boolean(view.search.trim() || view.category || view.author || view.sort !== INITIAL_VIEW.sort);