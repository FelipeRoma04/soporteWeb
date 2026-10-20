import { useState } from 'react';
import { Star } from 'lucide-react';

// Muestra una calificación de 1 a 5 estrellas. Con onChange es un selector (radios accesibles); sin él, solo lectura.
export default function StarRating({ value = 0, onChange, size = 22, label = 'Calificación' }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  if (!onChange) {
    return <span className="star-rating" role="img" aria-label={`${label}: ${value} de 5`}>
      {[1, 2, 3, 4, 5].map((star) => <Star key={star} size={size} className={star <= value ? 'star on' : 'star'} aria-hidden="true" />)}
    </span>;
  }

  return <span className="star-rating star-input" role="radiogroup" aria-label={label} onMouseLeave={() => setHover(0)}>
    {[1, 2, 3, 4, 5].map((star) => <button
      type="button"
      key={star}
      role="radio"
      aria-checked={value === star}
      aria-label={`${star} de 5`}
      title={`${star} de 5`}
      className={`star-button ${star <= shown ? 'on' : ''}`}
      onMouseEnter={() => setHover(star)}
      onFocus={() => setHover(star)}
      onBlur={() => setHover(0)}
      onClick={() => onChange(star)}
    ><Star size={size} aria-hidden="true" className="star" /></button>)}
  </span>;
}
