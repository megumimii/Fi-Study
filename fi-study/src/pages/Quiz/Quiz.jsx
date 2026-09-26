import "./quiz.css";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase-config";
import { ref as dbRef, get } from "firebase/database";
import { quizApi, materialApi } from "../../services/api";
import QuizCard from "../../components/QuizCard/QuizCard";
import Header from "../../components/Header/Header";
import DPLayout from "../../components/DPLayout/DPLayout";
import Modal from "../../components/Modal/Modal";
import { 
  extractMaterialText, 
  constructMaterialDbPath 
} from "../../utils/materialUtils";

export default function Quiz({ userData }) {
  const { courseUID, lessonUID, materialUID } = useParams();
  const navigate = useNavigate();

  //States
  const [material, setMaterial] = useState(null); // Material metadata
  const [questions, setQuestions] = useState([]); // Array of quiz questions
  const [loading, setLoading] = useState(false); // Loading spinner while generating quiz
  const [error, setError] = useState(null); // Error message if something fails
  const [selectedAnswers, setSelectedAnswers] = useState({}); // Tracks which option user selected for each question
  const [submitted, setSubmitted] = useState(0); // Tracks how many questions have been "checked"
  const [score, setScore] = useState(0); // Stores total score after submission

  // Reference to modal to open programmatically
  const scoreModalRef = useRef(null);

  //Fetch material metadata from Firebase
  useEffect(() => {
    async function fetchMaterial() {
      try {
        const matPath = constructMaterialDbPath(userData.uid, courseUID, lessonUID, materialUID);
        const matRef = dbRef(db, matPath);
        const snap = await get(matRef);
        if (snap.exists()) setMaterial(snap.val());
        else navigate(-1); // Navigate back if material doesn't exist
      } catch (err) {
        console.error("Failed to fetch material:", err);
        setError("Could not load material.");
      }
    }
    fetchMaterial();
  }, [userData, courseUID, lessonUID, materialUID, navigate]);

  //Generate quiz via AI function
  async function handleGenerateQuiz() {
    setLoading(true); // Show spinner
    setError(null); // Clear previous errors
    setQuestions([]); // Reset previous questions
    setSelectedAnswers({}); // Reset selections
    setSubmitted(0); // Reset submitted counter

    try {
      const materialText = await extractMaterialText(material);
      
      if (!materialText.trim()) {
        setLoading(false);
        throw new Error("No text available for quiz generation.");
      }
      
      //If not enough content, throw error
      if (materialText.trim().length < 500) {
        setLoading(false);
        throw new Error("Not enough content for quiz generation, atleast 500 characters required.");
      }

      // Call Fi-API OpenRouter AI endpoint
      const quiz = await quizApi.generateQuiz(materialText);

      if (!quiz || !Array.isArray(quiz.questions)) {
        throw new Error(
          "Quiz generation failed: API returned invalid format or material lacks content."
        );
      }

      // Add IDs if missing, store in state
      setQuestions(
        quiz.questions.map((q, i) => ({ ...q, id: q.id || i + 1 }))
      );
    } catch (err) {
      console.error("Quiz generation failed:", err);
      setError(err.message);//Get the error message thrown
    } finally {
      setLoading(false);
    }
  }

  //Handle user selecting an answer
  function handleSelect(questionId, option) {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: option }));
    // Updates selectedAnswers so each QuizCard's "selected" prop updates
  }

  //Handle a question being "checked" (submitted)
  function handleCheck() {
    // Increment submitted count when user clicks "Check Answer" in QuizCard
    setSubmitted((prev) => prev + 1);
  }

  //Handle final quiz submission
  const handleSubmitQuiz = () => {
    // Calculate score: number of correct answers
    const correctCount = questions.filter(
      (q) => selectedAnswers[q.id] === q.correct_answer
    ).length;

    setScore(correctCount);

    // Open the modal to show results
    scoreModalRef.current.openModal();

    // If score > 7, mark material as passed via Fi-API
    if (correctCount > 7) {
      materialApi.updateProgress(courseUID, lessonUID, materialUID, true)
        .catch((err) => console.error("Failed to update passed status via Fi-API:", err));
    }
  };

  return (
    <>
      {/* Header section */}
      <Header
        userData={userData}
        title={material?.title || "Quiz"}
        subtitle="Auto-generated quiz based on material"
        icon="quiz"
      />

      <DPLayout>
        {/* Back button */}
        <span className="back-button" onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined">arrow_back</span>Back
        </span>

        <section id="quiz-section">
          {/* Empty state before quiz generation */}
          {!questions.length && !loading && !error && (
            <div className="quiz-empty">
              <span className="material-symbols-outlined">quiz</span>
              <h2>Generate a Quiz</h2>
              <p>This quiz will be generated automatically from your study material</p>
              <button className="site-button" onClick={handleGenerateQuiz}>
                Generate Quiz
              </button>
            </div>
          )}

          {/* Loading spinner */}
          {loading && (
            <div className="quiz-loading">
              <span className="material-symbols-outlined spin">sync</span>
              <p>Generating quiz with AI...</p>
              <small>This may take a few seconds depending on content size.</small>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="quiz-error">
              <span className="material-symbols-outlined">error</span>
              <p>{error}</p>
              <button className="site-button" onClick={handleGenerateQuiz}>
                Retry
              </button>
            </div>
          )}

          {/* Quiz list */}
          {questions.length > 0 && (
            <div className="quiz-list">
              <span className="title-subtitle-container">
                <h1 className="h1-icon">
                  <span className="material-symbols-outlined">quiz</span>Quiz for {material?.title}
                </h1>
                <p>{material?.description}</p>
                <p>{questions.length} questions</p>
              </span>

              {questions.map((q, i) => (
                <QuizCard
                  key={q.id}
                  question={q.question}
                  choices={q.options}
                  number={i + 1}
                  correctAnswer={q.correct_answer}
                  explanation={q.explanation}
                  onSelect={(choice) => handleSelect(q.id, choice)} // Callback for selection
                  selected={selectedAnswers[q.id]} // Prop reflects current selected option
                  onSubmit={handleCheck} // Callback for "Check Answer" button in QuizCard
                />
              ))}

              {/* Submit quiz button */}
              <div className="quiz-finish">
                <button
                  className="site-button finish-button"
                  // Only enabled if all questions have been selected AND checked
                  disabled={submitted !== questions.length}
                  onClick={handleSubmitQuiz}
                >
                  Submit Quiz
                </button>
              </div>
            </div>
          )}
        </section>
      </DPLayout>

      {/* Modal for quiz results */}
      <Modal
        ref={scoreModalRef}
        title="Quiz Results"
        onClose={() => scoreModalRef.current.closeModal()}
        withCloseButton={false}
      >
        <div className="result-container">
          <h2>
            Your Score: {score} / {questions.length}
          </h2>
          {score > 7 ? (
            <p>Congratulations! You passed the quiz.</p>
          ) : (
            <p>You did not pass. Try again!</p>
          )}
        </div>
        <button
          className="site-button"
          onClick={() => {scoreModalRef.current.closeModal(); navigate(-1);}}
        >
          Close
        </button>
      </Modal>
    </>
  );
}