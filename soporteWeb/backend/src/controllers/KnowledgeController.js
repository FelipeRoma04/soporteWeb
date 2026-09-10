import * as knowledgeService from '../services/KnowledgeService.js';
export async function list(_req, res, next) { try { res.json(await knowledgeService.list()); } catch (error) { next(error); } }
export async function create(req, res, next) { try { res.status(201).json(await knowledgeService.create(req.body, req.user.id)); } catch (error) { next(error); } }
