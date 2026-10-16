import { pool } from '../config/db.js';

export async function createInteraction(userId, question, answer, articleIds) {
  const sourceArticleIds = JSON.stringify(articleIds);
  const [result] = await pool.execute(
    'INSERT INTO ai_interactions (user_id, question, answer, source_article_ids) VALUES (?, ?, ?, ?)',
    [userId, question, answer, sourceArticleIds]
  );
  return result.insertId;
}

export async function saveFeedback(interactionId, userId, rating) {
  const [result] = await pool.execute(
    'UPDATE ai_interactions SET rating = ?, rated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
    [rating, interactionId, userId]
  );
  if (result.affectedRows > 0) return true;

  const [rows] = await pool.execute(
    'SELECT id FROM ai_interactions WHERE id = ? AND user_id = ?',
    [interactionId, userId]
  );
  return rows.length > 0;
}