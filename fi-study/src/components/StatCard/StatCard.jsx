import './stat-card.css';

export default function StatCard({icon, iconColor, title, description}) {
    return (
        <div className="stat-card" style={{border: `1px solid ${iconColor}`, borderTop: `10px solid ${iconColor}`}}>
            <span className="material-symbols-outlined" style={{color: iconColor}}>{icon}</span>
            <h2>{title}</h2>
            <p>{description}</p>
        </div>
    )
}