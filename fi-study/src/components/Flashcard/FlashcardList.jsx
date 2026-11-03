import StatusBadge from "../ui/StatusBadge/StatusBadge";
import "./flashcard.css";

export default function FlashcardList({
  cards,
  activeCardId,
  onSelectCard,
  onEditCard,
  onDeleteCard,
  onToggleReviewed,
}) {
  if (!cards || cards.length === 0) return null;

  return (
    <div className="flashcard-deck-list-section">
      <div className="flashcard-deck-list-header">
        <div>
          <span className="section-kicker">DECK MANIFEST // {cards.length} CARDS</span>
          <h3>Manage & Edit Flashcards</h3>
        </div>
        <p className="flashcard-deck-list-subtitle">
          Click any card below to jump to it on the stage, or edit and refine questions and answers.
        </p>
      </div>

      <div className="flashcard-deck-grid">
        {cards.map((card, index) => {
          const isCurrent = card.id === activeCardId;
          return (
            <article
              key={card.id}
              className={`flashcard-manifest-item ${isCurrent ? "is-current" : ""} ${card.reviewed ? "is-reviewed" : ""}`}
              onClick={() => onSelectCard(card.id)}
            >
              <div className="flashcard-manifest-top">
                <div className="flashcard-manifest-meta">
                  <span className="flashcard-manifest-index">
                    #{String(index + 1).padStart(2, "0")}
                  </span>
                  {card.tag && (
                    <StatusBadge variant="neutral" icon="sell">
                      {card.tag}
                    </StatusBadge>
                  )}
                  {card.reviewed && (
                    <StatusBadge variant="success" icon="check_circle">
                      Reviewed
                    </StatusBadge>
                  )}
                </div>

                <div
                  className="flashcard-manifest-actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="flashcard-icon-action"
                    onClick={() => onToggleReviewed(card.id)}
                    title={card.reviewed ? "Unmark reviewed" : "Mark reviewed"}
                    aria-label="Toggle reviewed status"
                  >
                    <span className="material-symbols-outlined">
                      {card.reviewed ? "check_circle" : "radio_button_unchecked"}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="flashcard-icon-action"
                    onClick={() => onEditCard(card)}
                    title="Edit flashcard"
                    aria-label="Edit flashcard"
                  >
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                  <button
                    type="button"
                    className="flashcard-icon-action is-danger"
                    onClick={() => onDeleteCard(card.id)}
                    title="Remove flashcard"
                    aria-label="Remove flashcard"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>

              <div className="flashcard-manifest-content">
                <div className="flashcard-manifest-side">
                  <span className="flashcard-manifest-label">PROMPT</span>
                  <p>{card.front}</p>
                </div>
                <div className="flashcard-manifest-side is-answer">
                  <span className="flashcard-manifest-label">ANSWER</span>
                  <p>{card.back}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

