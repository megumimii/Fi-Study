import './feature-card.css'

export default function FeatureCard({icon, title, description}) {
    return (
        <div className="feature-card">
            <span className="material-symbols-outlined">{icon}</span>
            <h2>{title}</h2>
            <p>{description}</p>
        </div>
    )
}