import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import * as knowledgeModel from '../models/Knowledge.js';
import { smallTalkReply } from '../utils/smallTalk.js';

const fallbackAnswer =
  'No encontré información suficiente en la base de conocimiento para resolver tu consulta. Te recomiendo crear un ticket para que el equipo de soporte pueda ayudarte.';

const fallbackTicketAnalysis = {
  category: 'General',
  priority: 'Media',
  summary: '',
  suggestions: [
    'Añade pasos para reproducir el problema',
    'Incluye capturas o mensajes de error',
  ],
};

const TICKET_PRIORITIES = ['Baja', 'Media', 'Alta', 'Urgente'];

function getProvider() {
  const provider = (process.env.AI_PROVIDER || 'openai')
    .trim()
    .toLowerCase();

  if (provider === 'groq') {
    return {
      name: 'groq',
      client: new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1',
      }),
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    };
  }

  if (provider === 'anthropic') {
    return {
      name: 'anthropic',
      client: new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      }),
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest',
    };
  }

  return {
    name: 'openai',
    client: new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    }),
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  };
}

async function generateText(
  systemPrompt,
  userPrompt,
  jsonMode = false,
  history = []
) {
  try {
    const provider = getProvider();

    if (provider.name === 'anthropic') {
      const messages = [
        ...history.map(({ role, content }) => ({ role, content })),
        { role: 'user', content: userPrompt },
      ];

      const response = await provider.client.messages.create({
        model: provider.model,
        max_tokens: 1200,
        system: systemPrompt,
        messages,
      });

      const text = response.content
        .filter((item) => item.type === 'text')
        .map((item) => item.text)
        .join('\n')
        .trim();

      return text || null;
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(({ role, content }) => ({ role, content })),
      { role: 'user', content: userPrompt },
    ];

    const completion = await provider.client.chat.completions.create({
      model: provider.model,
      messages,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    });

    return completion.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error('Error generando respuesta con IA:', error.message);
    return null;
  }
}

function parseTicketAnalysis(text) {
  if (!text) {
    return { ...fallbackTicketAnalysis };
  }

  try {
    const cleanedText = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    const parsed = JSON.parse(cleanedText);
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.filter((item) => typeof item === 'string' && item.trim()).slice(0, 5)
      : [];

    return {
      category:
        typeof parsed.category === 'string' && parsed.category.trim()
          ? parsed.category.trim()
          : fallbackTicketAnalysis.category,
      priority: TICKET_PRIORITIES.includes(parsed.priority)
        ? parsed.priority
        : fallbackTicketAnalysis.priority,
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      suggestions: suggestions.length ? suggestions : fallbackTicketAnalysis.suggestions,
    };
  } catch (error) {
    console.error('Error interpretando análisis del ticket:', error.message);
    return { ...fallbackTicketAnalysis };
  }
}

export function sanitizeHistory(history) {
  const messages = (Array.isArray(history) ? history : []).filter(
    (message) =>
      ['user', 'assistant'].includes(message?.role) &&
      typeof message.content === 'string' &&
      message.content.trim()
  );

  const firstUser = messages.findIndex(
    (message) => message.role === 'user'
  );

  return firstUser === -1
    ? []
    : messages.slice(firstUser).map(({ role, content }) => ({
        role,
        content,
      }));
}

const genericTerms = new Set([
  'ayuda',
  'ayudame',
  'ayúdame',
  'problema',
  'error',
  'consulta',
  'pregunta',
  'soporte',
  'ticket',
  'hola',
  'buenos',
  'buenas',
  'dias',
  'días',
  'tardes',
  'noches',
  'gracias',
  'por',
  'favor',
  'como',
  'cómo',
  'estas',
  'estás',
  'estas?',
  'quien',
  'quién',
  'eres',
  'puedes',
  'necesito',
  'tengo',
  'quiero',
  'mi',
  'el',
  'la',
  'los',
  'las',
  'un',
  'una',
  'de',
  'del',
  'en',
  'para',
  'con',
  'que',
  'qué',
  'me',
  'se',
  'es',
  'al',
  'y',
]);

// Palabras que dicen que algo falla pero no el tema ("sigue sin funcionar", "ya lo intenté y nada"):
// con ellas solas se busca con la última pregunta que sí tenía tema.
const followUpTerms = new Set([
  'funciona', 'funcionan', 'funcionar', 'funciono', 'sigue', 'siguen', 'igual', 'sirve', 'sirven', 'abre', 'abren', 'abrir',
  'pasa', 'pasaba', 'hacer', 'mismo', 'misma', 'tampoco', 'aun', 'todavia', 'nada', 'manera', 'forma', 'alternativa',
  'intentar', 'intente', 'probe', 'probar', 'prueba', 'hice', 'hizo', 'hecho', 'resuelve', 'resuelto', 'resolver',
  'persiste', 'continua', 'falla', 'fallo', 'fallando', 'tambien', 'solucion', 'soluciones'
]);

function hasTopic(question) {
  const terms = knowledgeModel.extractSearchTerms(question);

  return terms.some(
    (term) => !genericTerms.has(term.toLowerCase()) && !followUpTerms.has(term.toLowerCase())
  );
}

async function findArticles(question, conversation) {
  if (hasTopic(question)) {
    return knowledgeModel.searchArticles(question);
  }

  const topicQuestion = conversation
    .filter(
      (message) =>
        message.role === 'user' && hasTopic(message.content)
    )
    .at(-1)?.content;

  return topicQuestion
    ? knowledgeModel.searchArticles(`${question} ${topicQuestion}`)
    : [];
}

export async function answerQuestion(question, history = []) {
  // Los saludos, agradecimientos y mensajes sociales se responden directamente.
  const chatReply = smallTalkReply(question);

  if (chatReply) {
    return {
      answer: chatReply,
      articles: [],
      canCreateTicket: false,
      recordInteraction: false,
    };
  }

  const conversation = sanitizeHistory(history);
  const articles = await findArticles(question, conversation);

  if (!articles.length) {
    return {
      answer: fallbackAnswer,
      articles,
      canCreateTicket: true,
    };
  }

  const context = articles
    .map(
      (article) =>
        `${article.title} (${article.category}): ${article.content}`
    )
    .join('\n\n');

  // PROMPT ACTUALIZADO
  const systemPrompt =
    'Eres un asistente de soporte TI. Responde en español basándote EXCLUSIVAMENTE en los artículos proporcionados. Si un artículo del contexto no tiene relación directa con el problema específico planteado por el usuario, ignóralo por completo. No inventes pasos técnicos, direcciones IP ni combines instrucciones de artículos no relacionados. No estructures la respuesta como una lista de pasos numerados a menos que el artículo explícitamente describa un procedimiento paso a paso. Si la información no alcanza para resolver la consulta, dilo claramente y recomienda crear un ticket. Nunca pidas contraseñas, códigos MFA ni claves de recuperación.';

  const userPrompt = `Pregunta actual: ${question}

Artículos de conocimiento (usa solo los estrictamente necesarios):
${context}`;

  const answer = await generateText(
    systemPrompt,
    userPrompt,
    false,
    conversation
  );

  return {
    answer:
      answer ||
      `Encontré esta información en la base de conocimiento:\n\n${context}`,
    articles,
    canCreateTicket: true,
  };
}

// Recibe el texto de la solicitud (lo que envía la API) o un objeto { title, description, category, priority }.
export async function analyzeTicket(input) {
  const ticket = typeof input === 'string' ? { description: input } : input || {};

  const systemPrompt =
    'Eres un asistente experto en soporte TI. Analiza la solicitud proporcionada y devuelve únicamente un objeto JSON válido con las propiedades category, priority, summary y suggestions. La categoría debe ser exactamente una de estas: General, Acceso, Permisos, Hardware, Software, Red, Correo, Colaboración, Seguridad o Windows. La prioridad debe ser exactamente Baja, Media, Alta o Urgente. El resumen debe ser breve. suggestions es un arreglo de hasta 3 textos cortos, en español, con datos que el usuario debería añadir para que el equipo pueda atenderlo (pasos para reproducirlo, mensajes de error, desde cuándo ocurre). No inventes información que no aparezca en la solicitud.';

  const userPrompt = `Analiza la siguiente solicitud:

Título: ${ticket.title || ticket.subject || ''}
Descripción: ${ticket.description || ''}
Categoría actual: ${ticket.category || ''}
Prioridad actual: ${ticket.priority || ''}`;

  const result = await generateText(systemPrompt, userPrompt, true);

  return parseTicketAnalysis(result);
}