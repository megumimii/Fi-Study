import "./quiz.css";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase-config";
import { ref as dbRef, get } from "firebase/database";
import { quizApi, materialApi, userApi } from "../../services/api";
import QuizCard from "../../components/QuizCard/QuizCard";
import Header from "../../components/Header/Header";
import DPLayout from "../../components/DPLayout/DPLayout";
import Modal from "../../components/Modal/Modal";
import MaterialWorkspaceNav from "../../components/ui/MaterialWorkspaceNav/MaterialWorkspaceNav";
import StatusBadge from "../../components/ui/StatusBadge/StatusBadge";
import {
  extractMaterialText,
  constructMaterialDbPath,
} from "../../utils/materialUtils";

export default function Quiz({ userData }) {
  const { courseUID, lessonUID, materialUID } = useParams();
  const navigate = useNavigate();

  // States
  const [material, setMaterial] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitted, setSubmitted] = useState(0);
  const [score, setScore] = useState(0);
  const [isQuizSubmitted, setIsQuizSubmitted] = useState(false);

  // References to modals
  const scoreModalRef = useRef(null);
  const exitConfirmModalRef = useRef(null);
  const isSubmittingRef = useRef(false);

  // Fetch material metadata from Firebase
  useEffect(() => {
    async function fetchMaterial() {
      if (!userData?.uid) return;
      try {
        const matPath = constructMaterialDbPath(
          userData.uid,
          courseUID,
          lessonUID,
          materialUID
        );
        const matRef = dbRef(db, matPath);
        const snap = await get(matRef);
        if (snap.exists()) setMaterial(snap.val());
        else navigate(`/main/course/${courseUID}/lesson/${lessonUID}/materials`);
      } catch (err) {
        console.error("Failed to fetch material:", err);
        setError("Could not load material.");
      }
    }
    fetchMaterial();
  }, [userData, courseUID, lessonUID, materialUID, navigate]);

  // Generate quiz via AI function
  async function handleGenerateQuiz() {
    setLoading(true);
    setError(null);
    setQuestions([]);
    setSelectedAnswers({});
    setSubmitted(0);
    setIsQuizSubmitted(false);
    isSubmittingRef.current = false;

    try {
      const materialText = await extractMaterialText(material);

      if (!materialText || !materialText.trim()) {
        setLoading(false);
        throw new Error(
          "No study content available for quiz generation. Open the Note Editor to write or upload notes first."
        );
      }

      if (materialText.trim().length < 500) {
        setLoading(false);
        throw new Error(
          "Not enough content for quiz generation. At least 500 characters are required."
        );
      }

      // Call Fi-API OpenRouter AI endpoint
      const quiz = await quizApi.generateQuiz(materialText);

      if (!quiz || !Array.isArray(quiz.questions)) {
        throw new Error(
          "Quiz generation failed: API returned invalid format or material lacks content."
        );
      }

      setQuestions(
        quiz.questions.map((q, i) => ({ ...q, id: q.id || i + 1 }))
      );
    } catch (err) {
      console.error("Quiz generation failed:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Handle user selecting an answer
  function handleSelect(questionId, option) {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: option }));
  }

  // Handle a question being "checked" (submitted)
  function handleCheck() {
    setSubmitted((prev) => prev + 1);
  }

  // Handle final quiz submission (records ONLY on the first button click)
  const handleSubmitQuiz = () => {
    // Prevent duplicate records on repeated clicks
    if (isQuizSubmitted || isSubmittingRef.current) {
      scoreModalRef.current?.openModal();
      return;
    }

    const correctCount = questions.filter(
      (q) => selectedAnswers[q.id] === q.correct_answer
    ).length;

    // Passing threshold: 70% or higher (7/10 for 10-question quiz)
    const passingScore = Math.ceil(questions.length * 0.7);
    const passedQuiz = correctCount >= passingScore;

    setScore(correctCount);
    setIsQuizSubmitted(true);
    isSubmittingRef.current = true;

    scoreModalRef.current?.openModal();

    // Log quiz attempt for real Dashboard telemetry (RECORDED ONLY ONCE)
    userApi
      .logQuizAttempt({
        score: correctCount,
        total: questions.length,
        passed: passedQuiz,
        materialUID,
        materialTitle: material?.title || "Quiz",
        courseUID
      })
      .catch((err) => console.warn("Could not log quiz attempt:", err.message));

    // If score >= 70%, mark material as passed via Fi-API (RECORDED ONLY ONCE)
    if (passedQuiz) {
      materialApi
        .updateProgress(courseUID, lessonUID, materialUID, true)
        .then(() => {
          setMaterial((prev) => (prev ? { ...prev, passed: true } : prev));
        })
        .catch((err) =>
          console.error("Failed to update passed status via Fi-API:", err)
        );
    }
  };

  return (
    <>
      <Header
        userData={userData}
        title={material?.title || "AI Quiz"}
        subtitle="Auto-generated comprehension assessment"
        icon="quiz"
      />

      <DPLayout>
        <div className="workspace-top-bar">
          <span
            className="back-button"
            onClick={() => {
              if (isQuizSubmitted || submitted > 0) {
                exitConfirmModalRef.current?.openModal();
              } else {
                navigate(`/main/course/${courseUID}/lesson/${lessonUID}/materials`);
              }
            }}
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Materials
          </span>

          <MaterialWorkspaceNav
            courseUID={courseUID}
            lessonUID={lessonUID}
            materialUID={materialUID}
            activeTab="quiz"
          />
        </div>

        <section id="quiz-section">
          {/* Empty state before quiz generation */}
          {!questions.length && !loading && !error && (
            <div className="quiz-empty">
              <span className="material-symbols-outlined quiz-empty-icon">
                quiz
              </span>
              <h2>Generate Comprehension Quiz</h2>
              <p>
                Synthesize a 10-question assessment from{" "}
                <strong>{material?.title || "your study material"}</strong>.
                Score 7/10 (70%) or higher to mark this material as Passed.
              </p>
              <button className="site-button" onClick={handleGenerateQuiz}>
                <span className="material-symbols-outlined">auto_awesome</span>
                Generate AI Quiz
              </button>
            </div>
          )}

          {/* Loading spinner */}
          {loading && (
            <div className="quiz-loading">
              <span className="material-symbols-outlined spin">sync</span>
              <h3>Synthesizing Assessment...</h3>
              <p>Analyzing material content and generating multiple-choice questions.</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="quiz-error">
              <span className="material-symbols-outlined">error</span>
              <p>{error}</p>
              <button className="site-button" onClick={handleGenerateQuiz}>
                <span className="material-symbols-outlined">refresh</span>
                Retry Generation
              </button>
            </div>
          )}

          {/* Quiz list */}
          {questions.length > 0 && (
            <div className="quiz-list">
              <div className="quiz-telemetry-header">
                <div className="title-subtitle-container">
                  <span className="section-kicker">
                    ASSESSMENT PROTOCOL // {questions.length} QUESTIONS
                  </span>
                  <h1 className="h1-icon">
                    <span className="material-symbols-outlined">quiz</span>
                    Quiz: {material?.title}
                  </h1>
                  {material?.description && <p>{material.description}</p>}
                </div>

                <div className="quiz-telemetry-badges">
                  <StatusBadge variant="accent" icon="fact_check">
                    CHECKED: {submitted} / {questions.length}
                  </StatusBadge>
                  {material?.passed && (
                    <StatusBadge variant="success" icon="workspace_premium">
                      PASSED
                    </StatusBadge>
                  )}
                  <button
                    type="button"
                    className="site-button secondary"
                    onClick={handleGenerateQuiz}
                  >
                    <span className="material-symbols-outlined">refresh</span>
                    New Quiz
                  </button>
                </div>
              </div>

              {questions.map((q, i) => (
                <QuizCard
                  key={q.id}
                  question={q.question}
                  choices={q.options}
                  number={i + 1}
                  correctAnswer={q.correct_answer}
                  explanation={q.explanation}
                  onSelect={(choice) => handleSelect(q.id, choice)}
                  selected={selectedAnswers[q.id]}
                  onSubmit={handleCheck}
                />
              ))}

              {/* Submit quiz button or Exit / Return button once submitted */}
              <div className="quiz-finish">
                {!isQuizSubmitted ? (
                  <button
                    type="button"
                    className="site-button finish-button"
                    disabled={submitted !== questions.length}
                    onClick={handleSubmitQuiz}
                  >
                    <span className="material-symbols-outlined">task_alt</span>
                    Submit Final Quiz ({submitted}/{questions.length} Checked)
                  </button>
                ) : (
                  <div className="quiz-finish-submitted">
                    <button
                      type="button"
                      className="site-button secondary"
                      onClick={() => scoreModalRef.current?.openModal()}
                    >
                      <span className="material-symbols-outlined">analytics</span>
                      View Score Summary ({score}/{questions.length})
                    </button>
                    <button
                      type="button"
                      className="site-button exit-button"
                      onClick={() => exitConfirmModalRef.current?.openModal()}
                    >
                      <span className="material-symbols-outlined">arrow_back</span>
                      Go Back to Notes
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </DPLayout>

      {/* Modal for quiz results */}
      <Modal
        ref={scoreModalRef}
        title="Assessment Results"
        onClose={() => scoreModalRef.current?.closeModal()}
        withCloseButton={false}
      >
        <div className="result-container">
          <span className="section-kicker">FINAL EVALUATION</span>
          <h2>
            Score: {score} / {questions.length}
          </h2>
          {score >= Math.ceil(questions.length * 0.7) ? (
            <p className="result-pass-text">
              Target threshold (70%+) achieved. Material marked as Passed!
            </p>
          ) : (
            <p className="result-fail-text">
              Score of {Math.ceil(questions.length * 0.7)}/{questions.length} (70%) or higher required to pass. Review the explanations or study with Flashcards and try again!
            </p>
          )}
        </div>
        <div className="result-actions">
          <button
            type="button"
            className="site-button secondary"
            onClick={() => scoreModalRef.current?.closeModal()}
          >
            Review Answers
          </button>
          <button
            type="button"
            className="site-button"
            onClick={() => {
              scoreModalRef.current?.closeModal();
              exitConfirmModalRef.current?.openModal();
            }}
          >
            Return to Materials
          </button>
        </div>
      </Modal>

      {/* Confirmation Modal when exiting to notes */}
      <Modal
        ref={exitConfirmModalRef}
        title="Return to Materials"
        onClose={() => exitConfirmModalRef.current?.closeModal()}
        withCloseButton={true}
      >
        <div className="exit-confirm-body">
          <div className="exit-confirm-icon">
            <span className="material-symbols-outlined">help</span>
          </div>
          <div className="exit-confirm-text">
            <h3>Exit this Quiz?</h3>
            <p>
              {isQuizSubmitted
                ? `Your score of ${score}/${questions.length} has already been recorded in your study history. Are you ready to return to your notes?`
                : "Your answers on this quiz have not been submitted yet. Leaving now will reset your progress."}
            </p>
          </div>
        </div>
        <div className="result-actions">
          <button
            type="button"
            className="site-button secondary"
            onClick={() => exitConfirmModalRef.current?.closeModal()}
          >
            Stay on Quiz
          </button>
          <button
            type="button"
            className="site-button"
            onClick={() => {
              exitConfirmModalRef.current?.closeModal();
              navigate(
                `/main/course/${courseUID}/lesson/${lessonUID}/materials`
              );
            }}
          >
            <span className="material-symbols-outlined">check</span>
            Confirm & Exit
          </button>
        </div>
      </Modal>
    </>
  );
}
