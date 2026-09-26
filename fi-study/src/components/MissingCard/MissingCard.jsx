import './missing-card.css';

export default function MissingCard({ title, onClick }) {
    return (
        <div className="missing-card" onClick={onClick}>
            <div className="missing-content">
                <span className="material-symbols-outlined plus-icon">add</span>
                <p>Add {title}</p>
            </div>
        </div>
    );
}
