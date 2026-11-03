import './status-badge.css';

export default function StatusBadge({ variant = 'neutral', icon, label, children }) {
  return (
    <span className={`tactical-status-badge variant-${variant}`}>
      {icon && <span className="material-symbols-outlined badge-icon">{icon}</span>}
      <span>{children || label}</span>
    </span>
  );
}
