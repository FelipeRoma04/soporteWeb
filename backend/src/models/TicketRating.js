import { pool } from '../config/db.js';

export const MAX_RATING_COMMENT_LENGTH = 500;

export function normalizeRatingInput(input = {}) {
  const rating = Number(input.rating);
  return {
    rating: Number.isInteger(rating) ? rating : null,
    comment: typeof input.comment === 'string' ? input.comment.trim() : ''
  };
}

// Una calificación por ticket. Devuelve null si el ticket ya estaba calificado (la primera es la que vale).
export async function createRating(ticketId, userId, { rating, comment }) {
  const { rows } = await pool.query(
    `INSERT INTO ticket_ratings (ticket_id, user_id, rating, comment) VALUES ($1, $2, $3, $4)
     ON CONFLICT (ticket_id) DO NOTHING RETURNING ticket_id, rating, comment, created_at`,
    [ticketId, userId, rating, comment || null]
  );
  return rows[0] || null;
}
