import * as knowledgeModel from '../models/Knowledge.js';
import { normalizeArticleInput } from '../models/Knowledge.js';
function serviceError(message, status) { const error = new Error(message); error.status = status; return error; }
export const list = () => knowledgeModel.listArticles();
export async function create(input, authorId) { const article = normalizeArticleInput(input); if (!article.title || !article.content) throw serviceError('Título y contenido son obligatorios', 400); return knowledgeModel.createArticle(article, authorId); }
