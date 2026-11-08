import { useState } from 'react';

/** Оценка от 1 до 10 — как в кинодневниках: ряд делений, подсветка при наведении. */
export default function RatingPicker({ value, onChange, disabled }) {
  const [hover, setHover] = useState(null);
  const shown = hover ?? value ?? 0;

  return (
    <div className="rating-picker" onMouseLeave={() => setHover(null)} role="radiogroup" aria-label="Ваша оценка">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`Оценка ${n}`}
          className={`rating-picker__step ${n <= shown ? 'is-on' : ''}`}
          onMouseEnter={() => setHover(n)}
          onFocus={() => setHover(n)}
          onBlur={() => setHover(null)}
          onClick={() => onChange(n)}
          disabled={disabled}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
