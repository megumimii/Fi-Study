import "./flashcard.css";

const COUNT_PRESETS = [5, 10, 15, 20];

export default function FlashcardControls({
  cardCount,
  onCardCountChange,
  onGenerate,
  onShuffle,
  onResetReview,
  onAddCard,
  onSaveDeck,
  filterMode,
  onFilterModeChange,
  hasCards,
  hasUnsavedChanges,
  generating,
  saving,
  reviewedCount,
  totalCount,
}) {
  return (
    <div className="flashcard-controls-bar">
      <div className="flashcard-controls-group">
        <span className="flashcard-controls-label">CARD COUNT</span>
        <div className="flashcard-count-selector" role="group" aria-label="Number of flashcards to generate">
          {COUNT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`flashcard-count-btn ${cardCount === preset ? "is-active" : ""}`}
              onClick={() => onCardCountChange(preset)}
              disabled={generating}
            >
              {String(preset).padStart(2, "0")}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="site-button flashcard-generate-btn"
          onClick={onGenerate}
          disabled={generating}
        >
          <span className="material-symbols-outlined">auto_awesome</span>
          {generating ? "Generating..." : hasCards ? "Regenerate AI Deck" : "Generate AI Flashcards"}
        </button>
      </div>

      {hasCards && (
        <div className="flashcard-controls-actions">
          <div className="flashcard-filter-toggle" role="tablist" aria-label="Filter flashcards">
            <button
              type="button"
              className={`flashcard-filter-btn ${filterMode === "all" ? "is-active" : ""}`}
              onClick={() => onFilterModeChange("all")}
            >
              ALL ({totalCount})
            </button>
            <button
              type="button"
              className={`flashcard-filter-btn ${filterMode === "unreviewed" ? "is-active" : ""}`}
              onClick={() => onFilterModeChange("unreviewed")}
            >
              UNREVIEWED ({Math.max(0, totalCount - reviewedCount)})
            </button>
          </div>

          <button
            type="button"
            className="site-button secondary flashcard-ctrl-btn"
            onClick={onShuffle}
            title="Shuffle deck order"
          >
            <span className="material-symbols-outlined">shuffle</span>
            Shuffle
          </button>

          {reviewedCount > 0 && (
            <button
              type="button"
              className="site-button secondary flashcard-ctrl-btn"
              onClick={onResetReview}
              title="Reset reviewed checkmarks"
            >
              <span className="material-symbols-outlined">restart_alt</span>
              Reset Review
            </button>
          )}

          <button
            type="button"
            className="site-button secondary flashcard-ctrl-btn"
            onClick={onAddCard}
            title="Add custom flashcard"
          >
            <span className="material-symbols-outlined">add</span>
            Add Card
          </button>

          <button
            type="button"
            className="site-button flashcard-ctrl-btn"
            onClick={onSaveDeck}
            disabled={saving || !hasUnsavedChanges}
            title="Save deck to cloud"
          >
            <span className="material-symbols-outlined">
              {saving ? "sync" : hasUnsavedChanges ? "save" : "cloud_done"}
            </span>
            {saving ? "Saving..." : hasUnsavedChanges ? "Save Deck" : "Saved"}
          </button>
        </div>
      )}
    </div>
  );
}

