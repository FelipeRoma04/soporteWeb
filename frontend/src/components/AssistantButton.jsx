import { Bot } from 'lucide-react';

// Botón flotante (abajo a la derecha) que abre el Asistente IA. Solo lleva el icono del bot; el texto va en title/aria-label.
// En la propia página del asistente se oculta, porque allí ya estás y taparía el chat.
export default function AssistantButton({ active, onOpen }) {
  if (active === 'Asistente IA') return null;
  return <button type="button" className="assistant-fab" title="Asistente IA" aria-label="Abrir Asistente IA" onClick={onOpen}><Bot size={24} aria-hidden="true" /></button>;
}