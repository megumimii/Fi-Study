import "./quiz-card.css";
import { useState } from "react";

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"];

export default function QuizCard({
  question,
  choices,
  correctAnswer,
  explanation,
  selected,
  onSelect,
  onSubmit,
  number,
}) {
  const [revealed, setRevealed] = useState(false);
  const success = selected === correctAnswer;

  function handleChoice(choice) {
    if (revealed) return;
    onSelect(choice);
  }

  function reveal() {
    setRevealed(true);
    onSubmit();
  }

  return (
    <div
      className={`quiz-card ${
        revealed ? (success ? "correct" : "incorrect") : ""
      }`}
    >
      <div className="quiz-card-top">
        <span className="quiz-question-index">
          Q.{String(number).padStart(2, "0")}
        </span>
        {revealed && (
          <span
            className={`quiz-verdict-badge ${
              success ? "is-correct" : "is-incorrect"
            }`}
          >
            <span className="material-symbols-outlined">
              {success ? "check_circle" : "cancel"}
            </span>
            {success ? "CORRECT" : "INCORRECT"}
          </span>
        )}
      </div>

      <h3 className="quiz-question">{question}</h3>

      <div className="quiz-choices">
        {choices.map((c, i) => {
          let className = "";
          if (revealed) {
            if (c === correctAnswer) className = "right";
            else if (c === selected) className = "wrong";
          } else if (selected === c) {
            className = "selected";
          }
          return (
            <button
              key={i}
              type="button"
              className={`choice-btn ${className}`}
              onClick={() => handleChoice(c)}
              disabled={revealed}
            >
              <span className="choice-key">
                {OPTION_LABELS[i] || i + 1}
              </span>
              <span className="choice-text">{c}</span>
            </button>
          );
        })}
      </div>

      {selected && !revealed && (
        <button
          type="button"
          className="site-button reveal-btn"
          onClick={reveal}
        >
          <span className="material-symbols-outlined">fact_check</span>
          Verify Answer
        </button>
      )}

      {revealed && (
        <div className={`explanation ${success ? "is-correct" : "is-incorrect"}`}>
          <div className="explanation-header">
            <span className="material-symbols-outlined">
              {success ? "check_circle" : "cancel"}
            </span>
            <strong>{success ? "VERIFIED CORRECT" : "INCORRECT RESPONSE"}</strong>
          </div>
          <p>{explanation}</p>
        </div>
      )}
    </div>
  );
}
