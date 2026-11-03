import './course-card.css';
import { useEffect, useRef, useState } from 'react';
import FormModal from '../Modal/FormModal/FormModal';
import { courseApi } from '../../services/api';
import { verifyInput, sanitizeInput, safeText } from '../../utils/InputSanitize';

function formatShortDate(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function CourseCard({
  iconColor = '#3b82f6',
  title,
  description,
  totalLessons = 0,
  totalCompletedLessons = 0,
  uid,
  courseData = {},
  onClick = () => {}
}) {
  const settingRef = useRef(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [updateData, setUpdateData] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateModalRef = useRef(null);
  const deleteModalRef = useRef(null);
  const cardRef = useRef(null);
  const titleRef = useRef(null);
  const descriptionRef = useRef(null);

  const isCompleted = totalLessons > 0 && totalCompletedLessons === totalLessons;
  const dateLabel = formatShortDate(courseData.updatedAt || courseData.createdAt);

  function openUpdateModal(e) {
    e.stopPropagation();
    setUpdateData({ ...courseData });
    updateModalRef.current.openModal();
    setIsSettingsOpen(false);
  }

  function openDeleteModal(e) {
    e.stopPropagation();
    setDeleteTarget(courseData);
    deleteModalRef.current.openModal();
    setIsSettingsOpen(false);
  }

  function updateCourse() {
    if (!updateData.title || !updateData.description) return;
    setIsUpdating(true);

    const sanitizedData = {
      ...updateData,
      title: sanitizeInput(updateData.title),
      description: sanitizeInput(updateData.description)
    };

    courseApi
      .update(uid, sanitizedData)
      .then(() => updateModalRef.current.closeModal())
      .catch(console.error)
      .finally(() => setIsUpdating(false));
  }

  async function deleteCourse() {
    setIsDeleting(true);
    courseApi
      .delete(uid)
      .then(() => deleteModalRef.current?.closeModal())
      .catch(console.error)
      .finally(() => setIsDeleting(false));
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (!isSettingsOpen) return;
      if (settingRef.current?.contains(e.target)) return;
      if (cardRef.current?.contains(e.target)) return;
      setIsSettingsOpen(false);
    }

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isSettingsOpen]);

  return (
    <>
      <div
        className={`course-row-item ${isSettingsOpen ? 'active' : ''}`}
        onClick={onClick}
        ref={cardRef}
      >
        <div className="course-row-left">
          <span
            className="course-row-accent-bar"
            style={{ backgroundColor: iconColor }}
          />
          <div className="course-row-text">
            <div className="course-row-title-line">
              <h2
                className="course-row-title"
                dangerouslySetInnerHTML={{ __html: safeText(title) }}
              />
              <span
                className="course-row-pill"
                style={{
                  color: iconColor,
                  backgroundColor: `${iconColor}1f`,
                  borderColor: `${iconColor}44`
                }}
              >
                {isCompleted ? 'COMPLETED' : 'COURSE'}
              </span>
              {isCompleted && (
                <span className="course-row-star" title="All lessons completed">
                  ★
                </span>
              )}
            </div>
            <p
              className="course-row-desc"
              dangerouslySetInnerHTML={{ __html: safeText(description) }}
            />
          </div>
        </div>

        <div className="course-row-metric">
          {totalCompletedLessons || 0}/{totalLessons || 0}l
        </div>

        <div className="course-row-date">{dateLabel}</div>

        <div
          className="course-row-actions"
          onClick={(e) => e.stopPropagation()}
          ref={settingRef}
        >
          <button
            type="button"
            className="row-icon-btn"
            onClick={openUpdateModal}
            title="Edit course"
          >
            <span className="material-symbols-outlined">edit</span>
          </button>
          <button
            type="button"
            className="row-icon-btn is-danger"
            onClick={openDeleteModal}
            title="Delete course"
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>

      <FormModal
        ref={updateModalRef}
        header="Update Course"
        title="Update Course"
        icon="edit"
        subtitle="Update your course details below."
        buttonName="Save Changes"
        closeDisabled={isUpdating}
        buttonCallback={updateCourse}
        disabled={
          !updateData.title ||
          !updateData.description ||
          updateData.title.length > 50 ||
          updateData.description.length > 150 ||
          isUpdating
        }
        onClose={() => {
          setUpdateData({});
          updateModalRef.current.closeModal();
        }}
      >
        <label>Course Title:</label>
        <input
          type="text"
          value={updateData.title || ''}
          onInput={(e) => {
            verifyInput(e.target.value, titleRef, 50);
            setUpdateData({ ...updateData, title: e.target.value });
          }}
        />
        <span className="error-message" ref={titleRef}></span>

        <label>Description:</label>
        <textarea
          value={updateData.description || ''}
          onInput={(e) => {
            verifyInput(e.target.value, descriptionRef, 150);
            setUpdateData({ ...updateData, description: e.target.value });
          }}
        />
        <span className="error-message" ref={descriptionRef}></span>

        <label>Subject Color:</label>
        <input
          type="color"
          value={updateData.color || '#3b82f6'}
          onChange={(e) => setUpdateData({ ...updateData, color: e.target.value })}
        />
      </FormModal>

      <FormModal
        ref={deleteModalRef}
        header="Confirm Delete"
        title="Delete Course"
        icon="delete"
        subtitle={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        buttonName={isDeleting ? 'Deleting...' : 'Delete'}
        buttonCallback={deleteCourse}
        disabled={isDeleting}
        closeDisabled={isDeleting}
        onClose={() => {
          setDeleteTarget(null);
          deleteModalRef.current?.closeModal();
        }}
        buttonGradient="var(--delete-gradient)"
      />
    </>
  );
}
