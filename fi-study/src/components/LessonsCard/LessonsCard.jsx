import './lessons-card.css';
import { useState, useRef } from 'react';
import FormModal from '../Modal/FormModal/FormModal';
import { verifyInput, sanitizeInput, safeText } from '../../utils/InputSanitize';
import { lessonApi } from '../../services/api';

function formatShortDate(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function LessonCard({
  lesson = null,
  title,
  description,
  totalCompletedMaterials = 0,
  totalMaterials = 0,
  onClick = () => {},
  color = '#3b82f6',
  courseUID = null,
  courseData = {}
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateLessonModalRef = useRef(null);
  const deleteLessonModalRef = useRef(null);
  const titleRef = useRef(null);
  const descriptionRef = useRef(null);
  const placeholderTitleRef = useRef(null);
  const placeholderDescriptionRef = useRef(null);

  const [lessonInputData, setLessonInputData] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  const isCompleted =
    (totalMaterials || 0) > 0 && totalCompletedMaterials === totalMaterials;
  const dateLabel = formatShortDate(lesson?.updatedAt || lesson?.createdAt);

  function updateLesson(lessonUID, data) {
    if (!lessonUID || !data) return;
    setIsUpdating(true);

    const sanitizedData = {
      ...data,
      title: sanitizeInput(data.title),
      description: sanitizeInput(data.description)
    };

    lessonApi
      .update(courseUID, lessonUID, sanitizedData)
      .then(() => {
        updateLessonModalRef.current.closeModal();
        setLessonInputData({});
      })
      .catch((error) => alert(error.message))
      .finally(() => setIsUpdating(false));
  }

  async function deleteLesson(lessonUID) {
    setIsDeleting(true);
    lessonApi
      .delete(courseUID, lessonUID)
      .then(() => {
        deleteLessonModalRef.current?.closeModal();
        setDeleteTarget(null);
      })
      .catch((error) => alert(error.message))
      .finally(() => setIsDeleting(false));
  }

  function openUpdateLessonModal(e, lessonData) {
    e.stopPropagation();
    updateLessonModalRef.current.openModal();

    setTimeout(() => {
      if (placeholderTitleRef.current && placeholderDescriptionRef.current) {
        placeholderTitleRef.current.value = lessonData.title;
        placeholderDescriptionRef.current.value = lessonData.description;
        setLessonInputData(lessonData);
      }
    }, 0);
  }

  function openDeleteLessonModal(e, lessonData) {
    e.stopPropagation();
    setDeleteTarget(lessonData);
    deleteLessonModalRef.current.openModal();
  }

  return (
    <>
      <div className="lesson-row-item" onClick={onClick}>
        <div className="lesson-row-left">
          <span
            className="lesson-row-accent-bar"
            style={{ backgroundColor: color }}
          />
          <div className="lesson-row-text">
            <div className="lesson-row-title-line">
              <h3
                className="lesson-row-title"
                dangerouslySetInnerHTML={{ __html: safeText(title) }}
              />
              <span
                className="lesson-row-pill"
                style={{
                  color,
                  backgroundColor: `${color}1f`,
                  borderColor: `${color}44`
                }}
              >
                {courseData?.title ? courseData.title.slice(0, 14).toUpperCase() : 'LESSON'}
              </span>
              {isCompleted && (
                <span className="lesson-row-star" title="All materials passed">
                  ★
                </span>
              )}
            </div>
            <p
              className="lesson-row-desc"
              dangerouslySetInnerHTML={{ __html: safeText(description) }}
            />
          </div>
        </div>

        <div className="lesson-row-metric">
          {totalCompletedMaterials || 0}/{totalMaterials || 0}n
        </div>

        <div className="lesson-row-date">{dateLabel}</div>

        <div className="lesson-row-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="row-icon-btn"
            onClick={(e) => openUpdateLessonModal(e, lesson)}
            title="Edit lesson"
          >
            <span className="material-symbols-outlined">edit</span>
          </button>
          <button
            type="button"
            className="row-icon-btn is-danger"
            onClick={(e) => openDeleteLessonModal(e, lesson)}
            title="Delete lesson"
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>

      <FormModal
        ref={updateLessonModalRef}
        header="Update Lesson"
        title="Update Lesson"
        icon="edit"
        closeDisabled={isUpdating}
        subtitle="Modify lesson details below."
        buttonName="Save Changes"
        buttonCallback={() => updateLesson(lessonInputData.uid, lessonInputData)}
        disabled={
          !lessonInputData.title ||
          !lessonInputData.description ||
          lessonInputData.title.length > 50 ||
          lessonInputData.description.length > 150 ||
          isUpdating
        }
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
              title: e.target.value
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
              description: e.target.value
            });
          }}
        ></textarea>
        <span className="error-message" ref={descriptionRef}></span>
      </FormModal>

      <FormModal
        ref={deleteLessonModalRef}
        header="Confirm Delete"
        title="Delete Lesson"
        icon="delete"
        closeDisabled={isDeleting}
        subtitle={`Are you sure you want to delete "${deleteTarget?.title}"? All study notes within this lesson will also be permanently deleted.`}
        buttonName={isDeleting ? 'Deleting...' : 'Delete Lesson'}
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
