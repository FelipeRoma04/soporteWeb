import { pool } from '../config/db.js';

export async function createInteraction(userId, question, answer, articleIds) {
  const sourceArticleIds = JSON.stringify(articleIds);
  const { rows } = await pool.query(
    'INSERT INTO ai_interactions (user_id, question, answer, source_article_ids) VALUES ($1, $2, $3, $4) RETURNING id',
    [userId, question, answer, sourceArticleIds]
  );
  return rows[0].id;
}

export async function saveFeedback(interactionId, userId, rating) {
  const result = await pool.query(
    'UPDATE ai_interactions SET rating = $1, rated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3',
    [rating, interactionId, userId]
  );
  if (result.rowCount > 0) return true;

  const { rows } = await pool.query(
    'SELECT id FROM ai_interactions WHERE id = $1 AND user_id = $2',
    [interactionId, userId]
  );
  return rows.length > 0;
}