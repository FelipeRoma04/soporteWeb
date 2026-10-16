export const MAX_COMMENT_LENGTH = 2000;

export function normalizeCommentBody(body = '') {
  return String(body ?? '').trim();
}