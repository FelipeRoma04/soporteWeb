// Estados del ticket como opciones separadas y seleccionables (en vez de una lista desplegable).
export const TICKET_STATUSES = ['Abierto', 'En progreso', 'Cerrado'];
const TONES = { Abierto: 'amber', 'En progreso': 'blue', Cerrado: 'green' };

export default function StatusPicker({ value, onChange, disabled = false }) {
  return <div className="status-options" role="radiogroup" aria-label="Estado del ticket">
    {TICKET_STATUSES.map((status) => {
      const selected = value === status;
      return <button
        type="button"
        role="radio"
        aria-checked={selected}
        disabled={disabled}
        className={`status-option ${TONES[status]} ${selected ? 'selected' : ''}`}
        key={status}
        onClick={() => { if (!selected) onChange(status); }}
      >{status}</button>;
    })}
  </div>;
}