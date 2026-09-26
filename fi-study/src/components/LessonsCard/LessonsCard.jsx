import './lessons-card.css';
import { useState, useRef, useEffect } from 'react';
import { db } from '../../firebase-config';
import FormModal from '../Modal/FormModal/FormModal';
import { verifyInput, sanitizeInput, safeText } from '../../utils/InputSanitize';
import { lessonApi } from '../../services/api';

export default function LessonCard({
  lesson = null,
  title,
  description,
  totalCompletedMaterials,
  totalMaterials,
  takeQuizCallback = () => {},
  onClick = () => {},
  color = '#dbdbdbff',
  userData = null,
  courseUID = null,
  courseData = {},
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const settingsRef = useRef(null);

  const updateLessonModalRef = useRef(null);
  const deleteLessonModalRef = useRef(null);
  const cardRef = useRef(null);

  const titleRef = useRef(null);
  const descriptionRef = useRef(null);
  const placeholderTitleRef = useRef(null);
  const placeholderDescriptionRef = useRef(null);

  const [lessonInputData, setLessonInputData] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  function toggleSettings(e) {
    e.stopPropagation();
    setIsSettingsOpen((prev) => !prev);
  }

  // --- CRUD Methods ---
  function updateLesson(lessonUID, data) {
    if (!lessonUID || !data) return;

    setIsUpdating(true);

    // Sanitize only at the moment of saving
    const sanitizedData = {
      ...data,
      title: sanitizeInput(data.title),
      description: sanitizeInput(data.description),
    };

    lessonApi.update(courseUID, lessonUID, sanitizedData)
      .then(() => {
        updateLessonModalRef.current.closeModal();
        setLessonInputData({});
      })
      .catch((error) => {
        alert(error.message);
      })
      .finally(() => setIsUpdating(false));
  }

  async function deleteLesson(lessonUID) {

    setIsDeleting(true);

    lessonApi.delete(courseUID, lessonUID)
      .then(() => {
        deleteLessonModalRef.current?.closeModal();
        setDeleteTarget(null);
      })
      .catch((error) => {
        alert(error.message);
      })
      .finally(() => setIsDeleting(false));
  }

  function openUpdateLessonModal(lessonData) {
    updateLessonModalRef.current.openModal();

    setTimeout(() => {
      if (placeholderTitleRef.current && placeholderDescriptionRef.current) {
        placeholderTitleRef.current.value = lessonData.title;
        placeholderDescriptionRef.current.value = lessonData.description;
        setLessonInputData(lessonData);
      }
    }, 0);
  }

  function openDeleteLessonModal(lessonData) {
    setDeleteTarget(lessonData);
    deleteLessonModalRef.current.openModal();
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (!isSettingsOpen) return;
      if (settingsRef.current?.contains(e.target)) return;
      if (cardRef.current?.contains(e.target)) return;
      setIsSettingsOpen(false);
    }

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isSettingsOpen]);

  return (
    <>
      <div
        className={`lesson-card ${isSettingsOpen ? 'active' : ''}`}
        onClick={onClick}
        style={{ border: `1px solid ${color}` }}
        ref={cardRef}
      >
        <div className="lesson-header">
          <h3 className="h1-icon">
            <span className="material-symbols-outlined">folder</span>
            <span dangerouslySetInnerHTML={{__html: safeText(title)}} />
          </h3>

          <span className="settings">
            <span
              className="material-symbols-outlined sett-container"
              ref={settingsRef}
              onClick={toggleSettings}
            >
              more_vert
            </span>

            {isSettingsOpen && (
              <div
                className="lesson-card-settings"
                onClick={(e) => e.stopPropagation()}
                style={{ border: `1px solid ${color}` }}
              >
                <span
                  className="option"
                  onClick={() => {
                    openUpdateLessonModal(lesson);
                    setIsSettingsOpen(false);
                  }}
                >
                  <h3>
                    <span className="material-symbols-outlined">edit</span>Edit
                  </h3>
                </span>
                <span
                  className="option"
                  onClick={() => {
                    openDeleteLessonModal(lesson);
                    setIsSettingsOpen(false);
                  }}
                >
                  <h3>
                    <span className="material-symbols-outlined">delete</span>Delete
                  </h3>
                </span>
                <span
                  className="option"
                  onClick={() => setIsSettingsOpen(false)}
                >
                  <h3>
                    <span className="material-symbols-outlined">cancel</span>Cancel
                  </h3>
                </span>
              </div>
            )}
          </span>
        </div>

        <p className="lesson-description" dangerouslySetInnerHTML={{__html: safeText(description)}}></p>
        <p className="lesson-metadata">
          {totalCompletedMaterials || 0} out of {totalMaterials || 0} materials completed
        </p>
      </div>

      {/* Update Lesson Modal */}
      <FormModal
        ref={updateLessonModalRef}
        header="Update Lesson"
        title="Update Lesson"
        icon="edit"
        closeDisabled={isUpdating}
        subtitle="Modify lesson details below."
        buttonName="Update Lesson"
        buttonCallback={() => updateLesson(lessonInputData.uid, lessonInputData)}
        disabled={!lessonInputData.title || !lessonInputData.description || lessonInputData.title.length > 50 || lessonInputData.description.length > 150 || isUpdating}
        onClose={() => {
          updateLessonModalRef.current.closeModal();
          setLessonInputData({});
        }}
      >
        <label htmlFor="lesson-title">Lesson Title:</label>
        <input
          ref={placeholderTitleRef}
          type="text"
          id="lesson-title"
          placeholder="Lesson Title"
          required
          onInput={(e) => {
            verifyInput(e.target.value, titleRef, 50);
            setLessonInputData({
              ...lessonInputData,
              title: e.target.value, // keep raw input until save
            });
          }}
        />
        <span className="error-message" ref={titleRef}></span>

        <label htmlFor="lesson-desc">Lesson Description:</label>
        <textarea
          ref={placeholderDescriptionRef}
          id="lesson-desc"
          placeholder="Lesson Description"
          required
          onInput={(e) => {
            verifyInput(e.target.value, descriptionRef, 150);
            setLessonInputData({
              ...lessonInputData,
              description: e.target.value, // keep raw input until save
            });
          }}
        ></textarea>
        <span className="error-message" ref={descriptionRef}></span>
      </FormModal>

      {/* Delete Lesson Modal */}
      <FormModal
        ref={deleteLessonModalRef}
        header="Confirm Delete"
        title="Delete Lesson"
        icon="delete"
        closeDisabled={isDeleting}
        subtitle={`Are you sure you want to delete "${deleteTarget?.title}"? All files within this lesson will also be permanently deleted.`}
        buttonName={isDeleting ? "Deleting..." : "Delete Lesson"}
        buttonCallback={() => deleteLesson(deleteTarget.uid)}
        disabled={isDeleting}
        onClose={() => {
          deleteLessonModalRef.current.closeModal();
          setDeleteTarget(null);
        }}
        buttonGradient="var(--delete-gradient)"
      />
    </>
  );
}
