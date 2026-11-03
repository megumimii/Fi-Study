import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase-config";
import { ref as dbRef, get } from "firebase/database";
import { flashcardApi, materialApi } from "../../services/api";
import {
  extractMaterialText,
  constructMaterialDbPath,
} from "../../utils/materialUtils";
import Header from "../../components/Header/Header";
import DPLayout from "../../components/DPLayout/DPLayout";
import MaterialWorkspaceNav from "../../components/ui/MaterialWorkspaceNav/MaterialWorkspaceNav";
import FlashcardControls from "../../components/Flashcard/FlashcardControls";
import FlashcardStage from "../../components/Flashcard/FlashcardStage";
import FlashcardList from "../../components/Flashcard/FlashcardList";
import FlashcardEditModal from "../../components/Flashcard/FlashcardEditModal";
import "./flashcards.css";

export default function Flashcards({ userData }) {
  const { courseUID, lessonUID, materialUID } = useParams();
  const navigate = useNavigate();

  const [material, setMaterial] = useState(null);
  const [cards, setCards] = useState([]);
  const [cardCount, setCardCount] = useState(10);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [filterMode, setFilterMode] = useState("all");

  const [loadingMaterial, setLoadingMaterial] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState(null);
  const [statusNotice, setStatusNotice] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);

  // Load material and any saved flashcards from Firebase RTDB
  useEffect(() => {
    async function fetchMaterial() {
      if (!userData?.uid) return;
      setLoadingMaterial(true);
      try {
        const matPath = constructMaterialDbPath(
          userData.uid,
          courseUID,
          lessonUID,
          materialUID
        );
        const snap = await get(dbRef(db, matPath));
        if (snap.exists()) {
          const matData = snap.val();
          setMaterial(matData);
          if (Array.isArray(matData.flashcards) && matData.flashcards.length > 0) {
            setCards(matData.flashcards);
          }
        } else {
          navigate(`/main/course/${courseUID}/lesson/${lessonUID}/materials`);
        }
      } catch (err) {
        console.error("Failed to load material for flashcards:", err);
        setError("Could not load material data.");
      } finally {
        setLoadingMaterial(false);
      }
    }
    fetchMaterial();
  }, [userData, courseUID, lessonUID, materialUID, navigate]);

  const filteredCards = useMemo(() => {
    if (filterMode === "unreviewed") {
      return cards.filter((c) => !c.reviewed);
    }
    return cards;
  }, [cards, filterMode]);

  const safeIndex = useMemo(() => {
    if (filteredCards.length === 0) return 0;
    return Math.min(currentIndex, filteredCards.length - 1);
  }, [currentIndex, filteredCards.length]);

  const activeCard = filteredCards[safeIndex] || null;

  const reviewedCount = useMemo(
    () => cards.filter((c) => c.reviewed).length,
    [cards]
  );

  // Persist deck to backend
  const persistDeck = useCallback(
    async (deckToSave, showFeedback = true) => {
      if (!material) return;
      setSaving(true);
      try {
        const updatedMaterial = {
          ...material,
          flashcards: deckToSave,
        };
        await materialApi.update(courseUID, lessonUID, materialUID, updatedMaterial);
        setMaterial(updatedMaterial);
        setHasUnsavedChanges(false);
        if (showFeedback) {
          setStatusNotice("Flashcard deck saved to cloud.");
          setTimeout(() => setStatusNotice(null), 3500);
        }
      } catch (err) {
        console.error("Failed to save flashcards:", err);
        setError(err.message || "Failed to save flashcard deck.");
      } finally {
        setSaving(false);
      }
    },
    [material, courseUID, lessonUID, materialUID]
  );

  // Mark material as passed when deck review is completed
  const handleCompleteDeckReview = useCallback(async () => {
    if (!material) return;
    try {
      await materialApi.updateProgress(courseUID, lessonUID, materialUID, true);
      setMaterial((prev) => (prev ? { ...prev, passed: true } : prev));
      setStatusNotice("Deck review complete! Material marked as Passed.");
      setTimeout(() => setStatusNotice(null), 4500);
    } catch (err) {
      console.error("Failed to update material progress from flashcards:", err);
    }
  }, [material, courseUID, lessonUID, materialUID]);

  // Generate AI flashcards
  async function handleGenerateFlashcards() {
    setGenerating(true);
    setError(null);
    setStatusNotice(null);

    try {
      const materialText = await extractMaterialText(material);
      if (!materialText || !materialText.trim()) {
        throw new Error(
          "No study content found in this material. Open the Note Editor to write or upload notes first."
        );
      }
      if (materialText.trim().length < 200) {
        throw new Error(
          "At least 200 characters of study notes are required to generate meaningful flashcards."
        );
      }

      const response = await flashcardApi.generateFlashcards(materialText, cardCount);
      if (!response || !Array.isArray(response.flashcards) || response.flashcards.length === 0) {
        throw new Error("AI returned an empty flashcard deck. Please try again.");
      }

      const generatedDeck = response.flashcards.map((card, idx) => ({
        id: card.id || `fc_${Date.now()}_${idx + 1}`,
        front: card.front,
        back: card.back,
        tag: card.tag || "Concept",
        reviewed: false,
      }));

      setCards(generatedDeck);
      setCurrentIndex(0);
      setIsFlipped(false);
      setFilterMode("all");

      // Automatically save newly generated deck
      await persistDeck(generatedDeck, false);
      setStatusNotice(`Generated and saved ${generatedDeck.length} AI flashcards.`);
      setTimeout(() => setStatusNotice(null), 4000);
    } catch (err) {
      console.error("Flashcard generation error:", err);
      setError(err.message || "Failed to generate flashcards.");
    } finally {
      setGenerating(false);
    }
  }

  function handleFlip() {
    setIsFlipped((prev) => !prev);
  }

  function handlePrev() {
    if (filteredCards.length <= 1) return;
    setIsFlipped(false);
    setCurrentIndex((prev) =>
      prev <= 0 ? filteredCards.length - 1 : prev - 1
    );
  }

  function handleNext() {
    if (filteredCards.length <= 1) return;
    setIsFlipped(false);
    setCurrentIndex((prev) =>
      prev >= filteredCards.length - 1 ? 0 : prev + 1
    );
  }

  function handleShuffle() {
    if (cards.length <= 1) return;
    const shuffled = [...cards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setHasUnsavedChanges(true);
  }

  function handleResetReview() {
    const resetDeck = cards.map((c) => ({ ...c, reviewed: false }));
    setCards(resetDeck);
    setFilterMode("all");
    setCurrentIndex(0);
    setIsFlipped(false);
    setHasUnsavedChanges(true);
  }

  function handleToggleReviewed(cardId) {
    const nextCards = cards.map((c) =>
      c.id === cardId ? { ...c, reviewed: !c.reviewed } : c
    );
    setCards(nextCards);
    setHasUnsavedChanges(true);

    const newReviewedTotal = nextCards.filter((c) => c.reviewed).length;
    if (
      newReviewedTotal === nextCards.length &&
      nextCards.length > 0 &&
      !material?.passed
    ) {
      handleCompleteDeckReview();
    }
  }

  function handleOpenAddModal() {
    setEditingCard(null);
    setModalOpen(true);
  }

  function handleOpenEditModal(card) {
    setEditingCard(card);
    setModalOpen(true);
  }

  function handleSaveCardFromModal(savedCard) {
    setCards((prev) => {
      const exists = prev.some((c) => c.id === savedCard.id);
      if (exists) {
        return prev.map((c) => (c.id === savedCard.id ? savedCard : c));
      }
      return [...prev, savedCard];
    });
    setHasUnsavedChanges(true);
    setModalOpen(false);
    setEditingCard(null);
  }

  function handleDeleteCard(cardId) {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    setHasUnsavedChanges(true);
  }

  function handleSelectCardFromManifest(cardId) {
    const idxInFiltered = filteredCards.findIndex((c) => c.id === cardId);
    if (idxInFiltered !== -1) {
      setCurrentIndex(idxInFiltered);
      setIsFlipped(false);
    } else {
      setFilterMode("all");
      const idxInAll = cards.findIndex((c) => c.id === cardId);
      if (idxInAll !== -1) {
        setCurrentIndex(idxInAll);
        setIsFlipped(false);
      }
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      <Header
        userData={userData}
        title={material?.title || "AI Flashcards"}
        subtitle="Comprehension & active-recall flashcard deck"
        icon="style"
      />

      <DPLayout>
        <div className="workspace-top-bar">
          <span
            className="back-button"
            onClick={() =>
              navigate(`/main/course/${courseUID}/lesson/${lessonUID}/materials`)
            }
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Materials
          </span>

          <MaterialWorkspaceNav
            courseUID={courseUID}
            lessonUID={lessonUID}
            materialUID={materialUID}
            activeTab="flashcards"
          />
        </div>

        <section id="flashcards-section">
          <FlashcardControls
            cardCount={cardCount}
            onCardCountChange={setCardCount}
            onGenerate={handleGenerateFlashcards}
            onShuffle={handleShuffle}
            onResetReview={handleResetReview}
            onAddCard={handleOpenAddModal}
            onSaveDeck={() => persistDeck(cards, true)}
            filterMode={filterMode}
            onFilterModeChange={(mode) => {
              setFilterMode(mode);
              setCurrentIndex(0);
              setIsFlipped(false);
            }}
            hasCards={cards.length > 0}
            hasUnsavedChanges={hasUnsavedChanges}
            generating={generating}
            saving={saving}
            reviewedCount={reviewedCount}
            totalCount={cards.length}
          />

          {statusNotice && (
            <div className="flashcard-status-banner" role="status">
              <span className="material-symbols-outlined">verified</span>
              <span>{statusNotice}</span>
            </div>
          )}

          {error && (
            <div className="flashcard-error-banner" role="alert">
              <span className="material-symbols-outlined">error</span>
              <span>{error}</span>
            </div>
          )}

          {loadingMaterial || generating ? (
            <div className="flashcard-loading-state">
              <span className="material-symbols-outlined spin">sync</span>
              <h3>
                {generating
                  ? `Synthesizing ${cardCount} Comprehension Flashcards...`
                  : "Loading Study Material..."}
              </h3>
              <p>
                {generating
                  ? "Analyzing concepts, definitions, and cause-effect relationships from your notes."
                  : "Fetching saved deck and document telemetry."}
              </p>
            </div>
          ) : cards.length === 0 ? (
            <div className="flashcard-empty-state">
              <span className="material-symbols-outlined flashcard-empty-icon">
                style
              </span>
              <h2>Generate Your Study Flashcards</h2>
              <p>
                Select the number of cards above and click{" "}
                <strong>Generate AI Flashcards</strong> to extract high-retention
                questions and answers from <em>{material?.title || "your notes"}</em>, or
                create custom cards manually.
              </p>
              <div className="flashcard-empty-actions">
                <button
                  type="button"
                  className="site-button"
                  onClick={handleGenerateFlashcards}
                >
                  <span className="material-symbols-outlined">auto_awesome</span>
                  Generate {cardCount} Flashcards
                </button>
                <button
                  type="button"
                  className="site-button secondary"
                  onClick={handleOpenAddModal}
                >
                  <span className="material-symbols-outlined">add</span>
                  Create Card Manually
                </button>
              </div>
            </div>
          ) : (
            <>
              <FlashcardStage
                card={activeCard}
                currentIndex={safeIndex}
                totalFiltered={filteredCards.length}
                isFlipped={isFlipped}
                onFlip={handleFlip}
                onPrev={handlePrev}
                onNext={handleNext}
                onToggleReviewed={handleToggleReviewed}
                onEditCard={handleOpenEditModal}
                reviewedCount={reviewedCount}
                totalDeckCount={cards.length}
                materialPassed={Boolean(material?.passed)}
                onCompleteDeck={handleCompleteDeckReview}
              />

              <FlashcardList
                cards={cards}
                activeCardId={activeCard?.id}
                onSelectCard={handleSelectCardFromManifest}
                onEditCard={handleOpenEditModal}
                onDeleteCard={handleDeleteCard}
                onToggleReviewed={handleToggleReviewed}
              />
            </>
          )}
        </section>
      </DPLayout>

      <FlashcardEditModal
        isOpen={modalOpen}
        card={editingCard}
        onClose={() => {
          setModalOpen(false);
          setEditingCard(null);
        }}
        onSave={handleSaveCardFromModal}
      />
    </>
  );
}

