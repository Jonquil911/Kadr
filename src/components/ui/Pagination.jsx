import { ChevronLeft, ChevronRight } from 'lucide-react';

function buildPages(page, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, page, page - 1, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (page >= total - 2) [total - 1, total - 2, total - 3].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) result.push(`gap-${p}`);
    result.push(p);
  });
  return result;
}

export default function Pagination({ page, totalPages, onChange, disabled }) {
  if (totalPages <= 1) return null;
  const pages = buildPages(page, totalPages);

  return (
    <nav className="pagination" aria-label="Страницы">
      <button
        type="button"
        className="pagination__btn"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1 || disabled}
        aria-label="Предыдущая страница"
      >
        <ChevronLeft size={18} />
      </button>
      {pages.map((p) =>
        typeof p === 'string' ? (
          <span key={p} className="pagination__gap">
            …
          </span>
        ) : (
          <button
            type="button"
            key={p}
            className={`pagination__btn ${p === page ? 'is-active' : ''}`}
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            disabled={disabled}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        className="pagination__btn"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages || disabled}
        aria-label="Следующая страница"
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}
