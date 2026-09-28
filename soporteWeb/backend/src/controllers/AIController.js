import * as openAIService from '../services/OpenAIService.js';
import * as interactionModel from '../models/AIInteraction.js';

export async function chat(req, res, next) {
	try {
		const question = req.body.question?.trim();
		if (!question) return res.status(400).json({ message: 'La pregunta es obligatoria' });
		const history = Array.isArray(req.body.history)
			? req.body.history
				.filter((message) => ['user', 'assistant'].includes(message?.role) && typeof message.content === 'string')
				.slice(-10)
				.map((message) => ({ role: message.role, content: message.content.trim().slice(0, 4000) }))
				.filter((message) => message.content)
			: [];

		const result = await openAIService.answerQuestion(question, history);
		let interactionId = null;
		if (result.recordInteraction !== false) {
			try {
				interactionId = await interactionModel.createInteraction(
					req.user.id,
					question,
					result.answer,
					(result.articles || []).map((article) => article.id)
				);
			} catch (error) {
				console.error('Unable to persist assistant interaction', error);
			}
		}
		const { recordInteraction, ...reply } = result;
		res.json({ ...reply, interactionId });
	} catch (error) { next(error); }
}

export async function feedback(req, res, next) {
	try {
		const interactionId = Number(req.params.interactionId);
		const { rating } = req.body;
		if (!Number.isSafeInteger(interactionId) || interactionId < 1) return res.status(400).json({ message: 'Interacción no válida' });
		if (!['helpful', 'not_helpful'].includes(rating)) return res.status(400).json({ message: 'La valoración no es válida' });

		const saved = await interactionModel.saveFeedback(interactionId, req.user.id, rating);
		if (!saved) return res.status(404).json({ message: 'Interacción no encontrada' });
		res.json({ message: 'Gracias por tu valoración' });
	} catch (error) { next(error); }
}

export async function analyze(req, res, next) { try { const description = req.body.description?.trim(); if (!description) return res.status(400).json({ message: 'La descripción es obligatoria' }); res.json(await openAIService.analyzeTicket(description)); } catch (error) { next(error); } }
