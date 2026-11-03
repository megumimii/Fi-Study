import './lessons.css';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebase-config';
import { get, ref, onValue, off } from 'firebase/database';
import { lessonApi } from '../../services/api';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import Header from '../../components/Header/Header';
import DPLayout from '../../components/DPLayout/DPLayout';
import LessonCard from '../../components/LessonsCard/LessonsCard';
import FormModal from '../../components/Modal/FormModal/FormModal';
import SearchBar from '../../components/ui/SearchBar/SearchBar';
import FilterChips from '../../components/ui/FilterChips/FilterChips';
import { UIDGenerator } from '../../utils/UIDGenerator';
import { sanitizeInput, verifyInput } from '../../utils/InputSanitize';
import LoaderSpinner from '../../components/LoaderSpinner/LoaderSpinner';

export default function Lessons({ userData }) {
  const { courseUID } = useParams();
  const navigate = useNavigate();

  const [courseData, setCourseData] = useState({});
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const addLessonModalRef = useRef(null);
  const titleRef = useRef(null);
  const descriptionRef = useRef(null);
  const buttonRef = useRef(null);
  const placeholderTitleRef = useRef(null);
  const placeholderDescriptionRef = useRef(null);

  const [lessonInputData, setLessonInputData] = useState({});

  useEffect(() => {
    setLoading(true);

    get(ref(db, `courses/${userData.uid}/${courseUID}`)).then((snapshot) => {
      if (snapshot.exists()) {
        setCourseData(snapshot.val());
      } else {
        navigate('/main/dashboard');
      }
      setLoading(false);
    });

    const lessonsRef = ref(db, `courses/${userData.uid}/${courseUID}/Lessons`);
    onValue(
      lessonsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setLessons(Object.values(snapshot.val()));
        } else {
          setLessons([]);
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Lessons listener notice:', err.message);
        setLoading(false);
      }
    );

    const courseRef = ref(db, `courses/${userData.uid}/${courseUID}`);
    onValue(
      courseRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setCourseData(snapshot.val());
        } else {
          navigate('/main/dashboard');
        }
      },
      () => {}
    );

    return () => {
      off(lessonsRef);
      off(courseRef);
    };
  }, [userData.uid, courseUID, navigate]);

  const totalMaterialsCount = useMemo(
    () => lessons.reduce((acc, l) => acc + (Number(l.totalMaterials) || 0), 0),
    [lessons]
  );

  const filterOptions = useMemo(() => {
    const completedCount = lessons.filter(
      (l) => l.complete || ((l.totalMaterials || 0) > 0 && l.completedMaterials === l.totalMaterials)
    ).length;
    return [
      { id: 'all', label: 'All' },
      { id: 'pending', label: 'In Progress', count: lessons.length - completedCount, color: '#3b82f6' },
      { id: 'completed', label: 'Completed', count: completedCount, color: '#10b981' }
    ];
  }, [lessons]);

  const filteredLessons = useMemo(() => {
    return lessons.filter((lesson) => {
      const matchesSearch =
        (lesson.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lesson.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      const isComplete =
        lesson.complete ||
        ((lesson.totalMaterials || 0) > 0 && lesson.completedMaterials === lesson.totalMaterials);
      if (activeFilter === 'completed') return isComplete;
      if (activeFilter === 'pending') return !isComplete;
      return true;
    });
  }, [lessons, searchTerm, activeFilter]);

  const handleSearch = useCallback((debouncedQuery) => {
    setSearchTerm(debouncedQuery || '');
  }, []);

  function addLesson(data) {
    if (!data.title || !data.description) return;

    if (buttonRef.current) buttonRef.current.disabled = true;
    const uid = UIDGenerator();

    const lessonData = {
      ...data,
      uid,
      createdAt: new Date().toISOString()
    };

    lessonApi
      .create(courseUID, lessonData)
      .then(() => {
        addLessonModalRef.current.closeModal();
        setLessonInputData({});
      })
      .catch((error) => {
        alert(error.message);
      })
      .finally(() => {
        if (buttonRef.current) buttonRef.current.disabled = false;
      });
  }

  function openAddLessonModal() {
    addLessonModalRef.current.openModal();
    setLessonInputData({});
  }

  const courseAccent =
    courseData?.color && courseData.color.toLowerCase() !== '#ffffff'
      ? courseData.color
      : '#3b82f6';

  return (
    <>
      <Header
        userData={userData}
        title={courseData?.title || 'Lessons'}
        icon="folder"
      />

      <DPLayout>
        <div className="lessons-page-wrapper">
          <span className="back-button" onClick={() => navigate('/main/course')}>
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Courses
          </span>

          {/* Row 1: Search + New Lesson */}
          <div className="telemetry-toolbar-row">
            <SearchBar
              placeholder="Search lessons in this course..."
              onSearch={handleSearch}
            />
            <button type="button" className="site-button" onClick={openAddLessonModal}>
              <span className="material-symbols-outlined">add</span>
              New Lesson
            </button>
          </div>

          {/* Row 2: Monospace Telemetry + Filters */}
          <div className="telemetry-meta-filter-bar">
            <div className="telemetry-meta-counts">
              <span>{lessons.length} lessons</span>
              <span className="telemetry-meta-divider">|</span>
              <span>{totalMaterialsCount} notes total</span>
            </div>

            <FilterChips
              options={filterOptions}
              activeId={activeFilter}
              onChange={setActiveFilter}
            />
          </div>

          {/* Row 3: Column Headers */}
          <div className="telemetry-list-columns-header">
            <span>LESSON / OVERVIEW</span>
            <span style={{ textAlign: 'right' }}>NOTES</span>
            <span style={{ textAlign: 'right' }}>UPDATED</span>
            <span style={{ width: '56px' }} />
          </div>

          {/* Row 4: Connected List */}
          {loading ? (
            <LoaderSpinner />
          ) : lessons.length > 0 ? (
            filteredLessons.length > 0 ? (
              <section className="telemetry-list-container">
                {filteredLessons.map((lesson, index) => (
                  <LessonCard
                    key={lesson.uid || index}
                    lesson={lesson}
                    title={lesson.title}
                    description={lesson.description}
                    totalCompletedMaterials={lesson.completedMaterials}
                    totalMaterials={lesson.totalMaterials}
                    color={courseAccent}
                    userData={userData}
                    courseUID={courseUID}
                    courseData={courseData}
                    onClick={() =>
                      navigate(`/main/course/${courseUID}/lesson/${lesson.uid}/materials`)
                    }
                  />
                ))}
              </section>
            ) : (
              <div className="empty-container">
                <h3>No matching lessons</h3>
                <p>No lessons matched your current search or filter.</p>
              </div>
            )
          ) : (
            <div className="empty-container">
              <span className="material-symbols-outlined">folder</span>
              <h3>No lessons in this course yet</h3>
              <p>Create a lesson to upload or write study notes, flashcards, and quizzes.</p>
              <button type="button" className="site-button" onClick={openAddLessonModal}>
                <span className="material-symbols-outlined">add</span>
                New Lesson
              </button>
            </div>
          )}
        </div>
      </DPLayout>

      <FormModal
        ref={addLessonModalRef}
        header="New Lesson"
        title="Create Lesson"
        icon="add"
        subtitle="Add a new lesson module for this course."
        buttonName="Create Lesson"
        buttonCallback={() => {
          addLesson({
            ...lessonInputData,
            title: sanitizeInput(lessonInputData.title),
            description: sanitizeInput(lessonInputData.description)
          });
        }}
        disabled={
          !lessonInputData.title ||
          !lessonInputData.description ||
          lessonInputData.title.length > 50 ||
          lessonInputData.description.length > 150
        }
        onClose={() => {
          addLessonModalRef.current.closeModal();
          setLessonInputData({});
        }}
        buttonRef={buttonRef}
      >
        <label htmlFor="lesson-title">Lesson Title:</label>
        <input
          ref={placeholderTitleRef}
          type="text"
          id="lesson-title"
          placeholder="e.g., Vector Fields & Curl Theorem"
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
          placeholder="Brief overview or #tags"
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
    </>
  );
}
