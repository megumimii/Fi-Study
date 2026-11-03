import './filter-chips.css';

const DOT_PALETTE = ['#4a8bdf', '#3b82f6', '#818cf8', '#a855f7', '#f59e0b', '#ec4899'];

export default function FilterChips({ options = [], activeId, onChange }) {
  if (!options.length) return null;

  return (
    <div className="minimal-filter-chips" role="tablist" aria-label="Filter items">
      {options.map((opt, idx) => {
        const isActive = activeId === opt.id;
        const dotColor = opt.color || (opt.id !== 'all' ? DOT_PALETTE[idx % DOT_PALETTE.length] : null);
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`minimal-chip ${isActive ? 'active' : ''}`}
            onClick={() => onChange(opt.id)}
          >
            {dotColor && opt.id !== 'all' && (
              <span
                className="chip-dot"
                style={{ backgroundColor: dotColor }}
                aria-hidden="true"
              />
            )}
            <span className="chip-label">{opt.label}</span>
            {typeof opt.count === 'number' && opt.id !== 'all' && (
              <span className="chip-count">({opt.count})</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
