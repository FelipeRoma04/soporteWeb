import { pool } from '../config/db.js';

export function normalizeArticleInput(input = {}) {
  return {
    title: input.title?.trim(),
    content: input.content?.trim(),
    category: input.category?.trim() || 'General',
    keywords: input.keywords?.trim() || ''
  };
}

export async function listArticles() { const [rows] = await pool.execute('SELECT id, title, content, category, updated_at FROM knowledge_articles ORDER BY updated_at DESC'); return rows; }
export async function createArticle(article, authorId) { const [result] = await pool.execute('INSERT INTO knowledge_articles (author_id, title, content, category, keywords) VALUES (?, ?, ?, ?, ?)', [authorId, article.title, article.content, article.category, article.keywords]); return { id: result.insertId, ...article }; }
export async function searchArticles(question) { const terms = question.split(/\s+/).filter((term) => term.length > 2).slice(0, 8); const conditions = terms.length ? terms.map(() => '(title LIKE ? OR content LIKE ? OR keywords LIKE ?)').join(' OR ') : '1 = 0'; const params = terms.flatMap((term) => [`%${term}%`, `%${term}%`, `%${term}%`]); const [rows] = await pool.execute(`SELECT title, content, category FROM knowledge_articles WHERE ${conditions} ORDER BY updated_at DESC LIMIT 3`, params); return rows; }
