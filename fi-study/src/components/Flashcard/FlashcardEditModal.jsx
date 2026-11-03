import { useState, useEffect } from "react";
import "./flashcard.css";

export default function FlashcardEditModal({
  isOpen,
  card,
  onClose,
  onSave,
}) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [tag, setTag] = useState("Concept");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (card) {
      setFront(card.front || "");
      setBack(card.back || "");
      setTag(card.tag || "Concept");
    } else {
      setFront("");
      setBack("");
      setTag("Concept");
    }
    setValidationError("");
  }, [card, isOpen]);

  if (!isOpen) return null;

  function handleSubmit(e) {
    e.preventDefault();
    if (!front.trim() || !back.trim()) {
      setValidationError("Both Front (Question) and Back (Answer) are required.");
      return;
    }

    onSave({
      id: card?.id || `fc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      front: front.trim(),
      back: back.trim(),
      tag: tag.trim() || "Concept",
      reviewed: card?.reviewed || false,
    });
  }

  return (
    <div className="flashcard-modal-backdrop" onClick={onClose}>
      <div
        className="flashcard-modal-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="flashcard-modal-title"
      >
        <div className="flashcard-modal-header">
          <div>
            <span className="section-kicker">
              {card ? "EDIT FLASHCARD" : "CREATE FLASHCARD"}
            </span>
            <h3 id="flashcard-modal-title">
              {card ? "Update Card Content" : "Add New Study Card"}
            </h3>
          </div>
          <button
            type="button"
            className="flashcard-icon-action"
            onClick={onClose}
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form className="flashcard-modal-form" onSubmit={handleSubmit}>
          <div className="flashcard-form-field">
            <label htmlFor="fc-tag-input">TOPIC TAG</label>
            <input
              id="fc-tag-input"
              type="text"
              maxLength={40}
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="e.g. Definition, Mechanism, Architecture"
            />
          </div>

          <div className="flashcard-form-field">
            <label htmlFor="fc-front-input">FRONT // QUESTION OR PROMPT *</label>
            <textarea
              id="fc-front-input"
              rows={3}
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="Enter a clear, comprehension-focused question..."
              required
            />
          </div>

          <div className="flashcard-form-field">
            <label htmlFor="fc-back-input">BACK // ANSWER & EXPLANATION *</label>
            <textarea
              id="fc-back-input"
              rows={4}
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="Enter the accurate answer or synthesis..."
              required
            />
          </div>

          {validationError && (
            <p className="flashcard-form-error">{validationError}</p>
          )}

          <div className="flashcard-modal-footer">
            <button
              type="button"
              className="site-button secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="site-button">
              <span className="material-symbols-outlined">check</span>
              {card ? "Update Card" : "Add to Deck"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

