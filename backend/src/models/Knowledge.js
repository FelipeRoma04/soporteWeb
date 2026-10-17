import { pool } from '../config/db.js';

export function normalizeArticleInput(input = {}) {
  return {
    title: input.title?.trim(),
    content: input.content?.trim(),
    category: input.category?.trim() || 'General',
    keywords: input.keywords?.trim() || ''
  };
}

export async function listArticles() { const { rows } = await pool.query('SELECT id, title, content, category, keywords, updated_at FROM knowledge_articles ORDER BY updated_at DESC'); return rows; }
export async function createArticle(article, authorId) {
  const { rows } = await pool.query(
    'INSERT INTO knowledge_articles (author_id, title, content, category, keywords) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [authorId, article.title, article.content, article.category, article.keywords]
  );
  return { id: rows[0].id, ...article };
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

export async function searchArticles(question) {
  const terms = extractSearchTerms(question);
  if (!terms.length) return [];

  const scoreExpression = terms.map((_, index) => {
    const parameter = index * 3 + 1;
    return `(CASE WHEN title ILIKE $${parameter} THEN 3 ELSE 0 END + CASE WHEN keywords ILIKE $${parameter + 1} THEN 2 ELSE 0 END + CASE WHEN content ILIKE $${parameter + 2} THEN 1 ELSE 0 END)`;
  }).join(' + ');
  const conditions = terms.map((_, index) => {
    const parameter = terms.length * 3 + index * 3 + 1;
    return `(title ILIKE $${parameter} OR content ILIKE $${parameter + 1} OR keywords ILIKE $${parameter + 2})`;
  }).join(' OR ');
  const termPatterns = terms.flatMap((term) => [`%${term}%`, `%${term}%`, `%${term}%`]);
  const { rows } = await pool.query(
    `SELECT id, title, content, category, relevance FROM (
       SELECT id, title, content, category, updated_at, (${scoreExpression}) AS relevance
       FROM knowledge_articles
       WHERE ${conditions}
     ) AS matches
     WHERE relevance >= 2
     ORDER BY relevance DESC, updated_at DESC
     LIMIT 3`,
    [...termPatterns, ...termPatterns]
  );
  return rows;
}