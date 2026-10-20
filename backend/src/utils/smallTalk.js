// Detecta mensajes de conversación (saludos, "¿cómo vas?", gracias, despedidas, "¿quién eres?") para contestarlos directamente,
// sin buscar en la base de conocimiento. Un mensaje cuenta como charla SOLO si, al quitarle estas frases, no queda nada:
// "hola, ¿cómo vas?" es charla, pero "hola, no abre Teams" no lo es y sigue el camino normal (buscar una guía).

const normalize = (text) => String(text).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es').replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().replace(/\s+/g, ' ');

// Cada intención: frases completas (ya sin tildes ni signos). Van de más específicas a más generales.
const INTENTS = [
  ['farewell', ['hasta luego', 'hasta pronto', 'hasta manana', 'nos vemos', 'adios', 'chao', 'chau', 'bye', 'que estes bien', 'cuidate']],
  ['identity', ['quien eres', 'quien sos', 'que eres', 'como te llamas', 'cual es tu nombre', 'eres un bot', 'eres una ia', 'eres humano', 'eres una persona', 'eres real']],
  ['capabilities', ['que puedes hacer', 'que sabes hacer', 'que haces', 'para que sirves', 'en que me puedes ayudar', 'como me puedes ayudar', 'como funcionas', 'necesito ayuda', 'me puedes ayudar', 'puedes ayudarme', 'me ayudas', 'ayudame', 'ayuda']],
  ['how', ['como estas', 'como vas', 'como te va', 'como andas', 'como te encuentras', 'como amaneciste', 'como esta todo', 'que tal estas', 'que tal', 'que mas', 'que hubo', 'todo bien', 'y tu', 'como estan']],
  ['greeting', ['buenos dias', 'buenas tardes', 'buenas noches', 'buen dia', 'buenas', 'hola', 'holi', 'holis', 'hey', 'hi', 'hello', 'saludos', 'ey', 'oye']],
  ['thanks', ['muchas gracias', 'mil gracias', 'te lo agradezco', 'gracias', 'ok', 'okay', 'vale', 'listo', 'perfecto', 'genial', 'entendido', 'dale', 'excelente', 'super', 'chevere', 'buenisimo', 'bien']],
  ['filler', ['por favor', 'porfa', 'asistente', 'bot', 'amigo', 'amiga', 'claude', 'ia']]
];

const compiled = INTENTS.map(([name, phrases]) => [name, new RegExp(`(^| )(${phrases.sort((a, b) => b.length - a.length).join('|')})(?= |$)`, 'g')]);

// Devuelve la lista de intenciones detectadas, o [] si el mensaje trae algo más que charla (o es demasiado largo para serlo).
export function detectSmallTalk(question) {
  let text = normalize(question);
  if (!text || text.split(' ').length > 9) return [];
  const found = [];
  for (const [name, pattern] of compiled) {
    if (pattern.test(text)) { if (name !== 'filler') found.push(name); text = text.replace(pattern, ' ').replace(/\s+/g, ' ').trim(); }
    pattern.lastIndex = 0;
  }
  return text ? [] : found;
}

const INVITE = 'Cuéntame qué problema tienes y buscaré una solución en la base de conocimiento.';

// Respuesta para la charla detectada (o null si el mensaje no es charla).
export function smallTalkReply(question) {
  const intents = detectSmallTalk(question);
  if (!intents.length) return null;
  const has = (name) => intents.includes(name);
  if (has('identity') || has('capabilities')) {
    return 'Soy el asistente de soporte de SysPulse. Busco soluciones en la base de conocimiento para problemas como accesos, correo, redes o equipos, y si no encuentro una, te ayudo a preparar un ticket para que un agente lo atienda. ¿Qué te está pasando?';
  }
  if (has('farewell')) return '¡Hasta luego! Si vuelve a surgir un problema, aquí estaré.';
  if (has('how')) return `${has('greeting') ? '¡Hola! ' : ''}¡Muy bien, gracias por preguntar! ${INVITE}`;
  if (has('greeting')) return `¡Hola! Soy el asistente de soporte. ${INVITE}`;
  return '¡De nada! Si surge otro problema, cuéntame y lo revisamos.';
}