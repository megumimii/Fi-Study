import './feature-card.css';

export default function FeatureCard({ icon, title, description, index = '01' }) {
  return (
    <article className="feature-card">
      <div className="feature-card-top">
        <span className="feature-card-index">{index}</span>
        <span className="material-symbols-outlined feature-card-icon">{icon}</span>
      </div>

      <h2>{title}</h2>
      <p>{description}</p>
    </article>
  );
}
