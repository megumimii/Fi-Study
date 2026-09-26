import './course-card.css';
import { useEffect, useRef, useState } from "react";
import FormModal from '../Modal/FormModal/FormModal';
import { courseApi } from '../../services/api';
import { verifyInput, sanitizeInput, safeText } from '../../utils/InputSanitize';

export default function CourseCard({
  icon,
  iconColor,
  title,
  description,
  totalLessons,
  totalCompletedLessons,
  uid,
  userUID,
  courseData = {},
  onClick = () => {}
}) {
  const settingRef = useRef(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [updateData, setUpdateData] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(null);
  const [isUpdating, setIsUpdating] = useState(null);

  const updateModalRef = useRef(null);
  const deleteModalRef = useRef(null);
  const cardRef = useRef(null);

  const titleRef = useRef(null);
  const descriptionRef = useRef(null);

  function toggleSettings(e) {
    e.stopPropagation();
    setIsSettingsOpen(prev => !prev);
  }

  function openUpdateModal() {
    setUpdateData({ ...courseData });
    updateModalRef.current.openModal();
    setIsSettingsOpen(false);
  }

  function openDeleteModal() {
    setDeleteTarget(courseData);
    deleteModalRef.current.openModal();
    setIsSettingsOpen(false);
  }

  function updateCourse() {
    if (!updateData.title || !updateData.description) return;

    setIsUpdating(true);

    // Sanitize only at the moment of saving/updating
    const sanitizedData = {
      ...updateData,
      title: sanitizeInput(updateData.title),
      description: sanitizeInput(updateData.description)
    };

    courseApi.update(uid, sanitizedData)
      .then(() => updateModalRef.current.closeModal())
      .catch(console.error)
      .finally(() => setIsUpdating(false));
  }

  async function deleteCourse() {
    setIsDeleting(true);
    courseApi.delete(uid)
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
        className={`course-card ${isSettingsOpen ? "active" : ""}`}
        style={{ border: `1px solid ${iconColor}` }}
        onClick={onClick}
        ref={cardRef}
      >
        <span className="title-settings">
          <h2 className='h1-icon'>
            <span className="material-symbols-outlined" style={{ color: iconColor }}>{icon}</span>
            <span dangerouslySetInnerHTML={{__html: safeText(title)}}/>
          </h2>

          <span className='settings'>
            <span
              className="material-symbols-outlined sett-container"
              ref={settingRef}
              onClick={toggleSettings}
            >
              more_vert
            </span>

            {isSettingsOpen && (
              <div
                className="course-card-settings"
                style={{ border: `1px solid ${iconColor}` }}
                onClick={(e) => e.stopPropagation()} 
                ref={settingRef}
              >
                <span className='option' onClick={openUpdateModal}>
                  <h3 className='h1-icon'>
                    <span className="material-symbols-outlined">edit</span>Edit
                  </h3>
                </span>
                <span className='option' onClick={openDeleteModal}>
                  <h3 className='h1-icon'>
                    <span className="material-symbols-outlined">delete</span>Delete
                  </h3>
                </span>
                <span className='option' onClick={() => setIsSettingsOpen(false)}>
                  <h3 className='h1-icon'>
                    <span className='material-symbols-outlined'>cancel</span>Cancel
                  </h3>
                </span>
              </div>
            )}
          </span>
        </span>

        <p dangerouslySetInnerHTML={{__html: safeText(description)}}></p>
        <p className='metadata-section'>
          {totalCompletedLessons || 0} out of {totalLessons || 0} Lessons Completed
        </p>
      </div>

      {/* --- Update Modal --- */}
      <FormModal
        ref={updateModalRef}
        header="Update Course"
        title="Update Course"
        icon="edit"
        subtitle="Update your course details below."
        buttonName="Update"
        closeDisabled={isUpdating}
        buttonCallback={updateCourse}
        disabled={!updateData.title || !updateData.description || updateData.title.length > 50 || updateData.description.length > 150 || isUpdating}
        onClose={() => { setUpdateData({}); updateModalRef.current.closeModal(); }}
      >
        <label>Course Title:</label>
        <input
          type="text"
          value={updateData.title || ''}
          onInput={(e) => {
            verifyInput(e.target.value, titleRef, 50); // 50 character limit
            setUpdateData({ ...updateData, title: e.target.value }); // keep raw input until save
          }}
        />
        <span className="error-message" ref={titleRef}></span>

        <label>Description:</label>
        <textarea
          value={updateData.description || ''}
          onInput={(e) => {
            verifyInput(e.target.value, descriptionRef, 150); // 150 character limit
            setUpdateData({ ...updateData, description: e.target.value }); // keep raw input until save
          }}
        />
        <span className="error-message" ref={descriptionRef}></span>

        <label>Course Color:</label>
        <input
          type="color"
          value={updateData.color || '#ffffff'}
          onChange={(e) => setUpdateData({ ...updateData, color: e.target.value })}
        />
      </FormModal>

      {/* --- Delete Modal --- */}
      <FormModal
        ref={deleteModalRef}
        header="Confirm Delete"
        title="Delete Course"
        icon="delete"
        subtitle={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        buttonName={isDeleting ? "Deleting..." : "Delete"}
        buttonCallback={deleteCourse}
        disabled={isDeleting}
        closeDisabled={isDeleting}
        onClose={() => { setDeleteTarget(null); deleteModalRef.current?.closeModal(); }}
        buttonGradient="var(--delete-gradient)"
      />
    </>
  );
}
