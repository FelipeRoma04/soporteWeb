import * as ticketService from '../services/TicketService.js';

export async function list(req, res, next) {
  try { res.json(await ticketService.listForUser(req.user)); } catch (error) { next(error); }
}

export async function create(req, res, next) {
  try {
    res.status(201).json(await ticketService.create(req.body, req.user.id));
  } catch (error) { next(error); }
}

export async function updateStatus(req, res, next) {
  try {
    await ticketService.updateStatus(req.params.id, req.body.status, req.user);
    res.json({ message: 'Ticket actualizado' });
  } catch (error) { next(error); }
}

export async function listComments(req, res, next) {
  try { res.json(await ticketService.listComments(req.params.id, req.user)); } catch (error) { next(error); }
}

export async function listHistory(req, res, next) {
  try { res.json(await ticketService.listHistory(req.params.id, req.user)); } catch (error) { next(error); }
}

export async function createComment(req, res, next) {
  try {
    res.status(201).json(await ticketService.addComment(req.params.id, req.body.body || '', req.user));
  } catch (error) { next(error); }
}
export async function rate(req, res, next) {
  try { res.status(201).json(await ticketService.rate(req.params.id, req.body, req.user)); } catch (error) { next(error); }
}
