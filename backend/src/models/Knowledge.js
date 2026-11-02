import { pool } from '../config/db.js';

export function normalizeArticleInput(input = {}) {
  return {
    title: input.title?.trim(),
    content: input.content?.trim(),
    category: input.category?.trim() || 'General',
    keywords: input.keywords?.trim() || ''
  };
}

// author_name: quién publicó la guía (null si la cuenta ya no existe).
const SELECT_WITH_AUTHOR = 'SELECT a.id, a.title, a.content, a.category, a.keywords, a.created_at, a.updated_at, u.name AS author_name FROM knowledge_articles a LEFT JOIN users u ON u.id = a.author_id';

export async function listArticles() {
  const { rows } = await pool.query(`${SELECT_WITH_AUTHOR} ORDER BY a.updated_at DESC`);
  return rows;
}

export async function createArticle(article, authorId) {
  const { rows: inserted } = await pool.query(
    'INSERT INTO knowledge_articles (author_id, title, content, category, keywords) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [authorId, article.title, article.content, article.category, article.keywords]
  );
  const { rows } = await pool.query(`${SELECT_WITH_AUTHOR} WHERE a.id = $1`, [inserted[0].id]);
  return rows[0];
}

const stopWords = new Set([
  'a', 'al', 'algo', 'algunas', 'algunos', 'ante', 'antes', 'como', 'con', 'contra', 'cual', 'cuando', 'de', 'del', 'desde', 'donde', 'durante',
  'e', 'el', 'ella', 'ellas', 'ellos', 'en', 'entre', 'era', 'eres', 'es', 'esa', 'esas', 'ese', 'eso', 'esos', 'esta', 'estaba', 'estamos', 'estan', 'estar', 'estas', 'este', 'esto', 'estos',
  'fue', 'ha', 'hacia', 'hasta', 'hay', 'la', 'las', 'le', 'les', 'lo', 'los', 'mas', 'me', 'mi', 'mis', 'muy', 'no', 'nos', 'o', 'os', 'otra', 'otras', 'otro', 'otros',
  'para', 'pero', 'poco', 'por', 'porque', 'puede', 'pueden', 'puedo', 'puedes', 'que', 'quien', 'se', 'sea', 'ser', 'si', 'sin', 'sobre', 'son', 'su', 'sus', 'te', 'tiene', 'tienen', 'todo', 'tras', 'tu', 'tus', 'un', 'una', 'unas', 'uno', 'unos', 'y', 'ya'
]);

export function extractSearchTerms(question) {
  const normalizedQuestion = question.toLocaleLowerCase('es').normalize('NFD').replace(/\p{Diacritic}/gu, '');
  return [...new Set((normalizedQuestion.match(/[\p{L}\p{N}]{2,}/gu) || []).filter((term) => !stopWords.has(term)))].slice(0, 8);
}

// Relevancia mínima (ts_rank) para considerar que una guía responde la pregunta. Con datos reales, las coincidencias
// útiles dan >= 0.12 y las coincidencias casuales de una palabra suelta en el contenido dan <= 0.07.
const MIN_RELEVANCE = 0.1;

export async function searchArticles(question) {
  const terms = extractSearchTerms(question);
  if (!terms.length) return [];

  // Los términos solo tienen letras y números, así que son seguros para to_tsquery.
  // Se unen con "|" (OR): ["escritorio", "guardar"] -> "escritorio | guardar".
  const tsQueryString = terms.join(' | ');

  // Título pesa más (A) que las palabras clave (B) y el contenido (C). El documento se calcula una sola vez por fila.
  const { rows } = await pool.query(
    `SELECT id, title, content, category, relevance FROM (
       SELECT a.id, a.title, a.content, a.category, a.updated_at, ts_rank(d.doc, q.query) AS relevance
       FROM knowledge_articles a
       CROSS JOIN LATERAL (
         SELECT setweight(to_tsvector('spanish', coalesce(a.title, '')), 'A') ||
                setweight(to_tsvector('spanish', coalesce(a.keywords, '')), 'B') ||
                setweight(to_tsvector('spanish', coalesce(a.content, '')), 'C') AS doc
       ) d
       CROSS JOIN (SELECT to_tsquery('spanish', $1) AS query) q
       WHERE d.doc @@ q.query
     ) ranked
     WHERE relevance >= $2
     ORDER BY relevance DESC, updated_at DESC
     LIMIT 3`,
    [tsQueryString, MIN_RELEVANCE]
  );

  return rows;
}