import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useReducedMotionSafe from "../../hooks/useReducedMotionSafe";
import StatusBadge from "../ui/StatusBadge/StatusBadge";
import "./flashcard.css";

export default function FlashcardStage({
  card,
  currentIndex,
  totalFiltered,
  isFlipped,
  onFlip,
  onPrev,
  onNext,
  onToggleReviewed,
  onEditCard,
  reviewedCount,
  totalDeckCount,
  materialPassed,
  onCompleteDeck,
}) {
  const prefersReducedMotion = useReducedMotionSafe();

  useEffect(() => {
    function handleKeyDown(e) {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || document.activeElement?.isContentEditable) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        onFlip();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        onNext();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        onPrev();
      } else if (e.code === "KeyR") {
        e.preventDefault();
        if (card) onToggleReviewed(card.id);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [card, onFlip, onNext, onPrev, onToggleReviewed]);

  if (!card) {
    return (
      <div className="flashcard-stage-empty">
        <span className="material-symbols-outlined">task_alt</span>
        <h3>All Cards Reviewed in Current Filter</h3>
        <p>You have reviewed every card in this view. Switch back to ALL cards or reset review state to study again.</p>
      </div>
    );
  }

  const progressRatio = totalDeckCount > 0 ? Math.round((reviewedCount / totalDeckCount) * 100) : 0;

  return (
    <div className="flashcard-stage-wrapper">
      <div className="flashcard-stage-telemetry">
        <div className="flashcard-telemetry-left">
          <span className="flashcard-index-readout">
            CARD {String(currentIndex + 1).padStart(2, "0")} // {String(totalFiltered).padStart(2, "0")}
          </span>
          {card.tag && (
            <StatusBadge variant="accent" icon="sell">
              {card.tag}
            </StatusBadge>
          )}
          {card.reviewed && (
            <StatusBadge variant="success" icon="verified">
              REVIEWED
            </StatusBadge>
          )}
        </div>

        <div className="flashcard-telemetry-right">
          <span className="flashcard-progress-text">
            DECK MASTERY: {reviewedCount}/{totalDeckCount} ({progressRatio}%)
          </span>
          {materialPassed && (
            <StatusBadge variant="success" icon="workspace_premium">
              MATERIAL PASSED
            </StatusBadge>
          )}
        </div>
      </div>

      <div className="flashcard-progress-track" aria-hidden="true">
        <div
          className="flashcard-progress-fill"
          style={{ width: `${progressRatio}%` }}
        />
      </div>

      <div
        className="flashcard-perspective-container"
        onClick={onFlip}
        role="button"
        tabIndex={0}
        aria-label={isFlipped ? "Flashcard answer side. Click or press Space to flip to question." : "Flashcard question side. Click or press Space to flip to answer."}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onFlip();
          }
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`${card.id}-${isFlipped ? "back" : "front"}`}
            className={`flashcard-interactive-card ${isFlipped ? "is-back" : "is-front"} ${card.reviewed ? "is-reviewed" : ""}`}
            initial={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, rotateX: isFlipped ? -14 : 14, y: 8 }
            }
            animate={
              prefersReducedMotion
                ? { opacity: 1 }
                : { opacity: 1, rotateX: 0, y: 0 }
            }
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: -6 }
            }
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flashcard-card-header">
              <span className="flashcard-side-pill">
                <span className="material-symbols-outlined">
                  {isFlipped ? "lightbulb" : "help"}
                </span>
                {isFlipped ? "BACK // ANSWER & EXPLANATION" : "FRONT // QUESTION PROMPT"}
              </span>

              <div className="flashcard-card-quick-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="flashcard-icon-action"
                  onClick={() => onEditCard(card)}
                  title="Edit this flashcard"
                  aria-label="Edit flashcard"
                >
                  <span className="material-symbols-outlined">edit</span>
                </button>
              </div>
            </div>

            <div className="flashcard-card-body">
              <p className="flashcard-card-content">
                {isFlipped ? card.back : card.front}
              </p>
            </div>

            <div className="flashcard-card-footer">
              <span className="flashcard-flip-hint">
                <span className="material-symbols-outlined">flip</span>
                CLICK CARD OR PRESS [SPACE] TO FLIP
              </span>
              <span className="flashcard-shortcut-hint">
                [← / →] NAVIGATE · [R] MARK REVIEWED
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flashcard-stage-nav">
        <button
          type="button"
          className="site-button secondary flashcard-nav-btn"
          onClick={onPrev}
          disabled={totalFiltered <= 1}
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Prev Card
        </button>

        <div className="flashcard-stage-center-actions">
          <button
            type="button"
            className={`site-button ${card.reviewed ? "secondary" : ""} flashcard-review-btn`}
            onClick={() => onToggleReviewed(card.id)}
          >
            <span className="material-symbols-outlined">
              {card.reviewed ? "check_box" : "check_box_outline_blank"}
            </span>
            {card.reviewed ? "Reviewed" : "Mark as Reviewed"}
          </button>

          {reviewedCount === totalDeckCount && totalDeckCount > 0 && !materialPassed && (
            <button
              type="button"
              className="site-button flashcard-complete-btn"
              onClick={onCompleteDeck}
            >
              <span className="material-symbols-outlined">workspace_premium</span>
              Complete Review & Pass Material
            </button>
          )}
        </div>

        <button
          type="button"
          className="site-button secondary flashcard-nav-btn"
          onClick={onNext}
          disabled={totalFiltered <= 1}
        >
          Next Card
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}

