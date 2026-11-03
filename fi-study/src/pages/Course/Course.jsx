import './course.css';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase-config';
import { ref, get, onValue, off } from 'firebase/database';

import Header from '../../components/Header/Header';
import DPLayout from '../../components/DPLayout/DPLayout';
import CourseCard from '../../components/CourseCard/CourseCard';
import FormModal from '../../components/Modal/FormModal/FormModal';
import SearchBar from '../../components/ui/SearchBar/SearchBar';
import FilterChips from '../../components/ui/FilterChips/FilterChips';
import { UIDGenerator } from '../../utils/UIDGenerator';
import { sanitizeInput, verifyInput } from '../../utils/InputSanitize';
import { courseApi } from '../../services/api';
import LoaderSpinner from '../../components/LoaderSpinner/LoaderSpinner';

const SUBJECT_PALETTE = ['#4a8bdf', '#3b82f6', '#818cf8', '#a855f7', '#f59e0b', '#ec4899'];

export default function Courses({ userData }) {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [addCourseInputData, setAddCourseInputData] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [isAdding, setIsAdding] = useState(false);

  const addCourseModalRef = useRef(null);
  const titleRef = useRef(null);
  const descriptionRef = useRef(null);
  const colorRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    const coursesRefPath = ref(db, `courses/${userData.uid}`);

    get(coursesRefPath)
      .then((snap) => {
        if (snap.exists()) {
          setCourses(Object.values(snap.val()));
        } else {
          setCourses([]);
        }
      })
      .catch((err) => console.warn('Course fetch notice:', err.message))
      .finally(() => setLoading(false));

    onValue(
      coursesRefPath,
      (snap) => {
        if (snap.exists()) {
          setCourses(Object.values(snap.val()));
        } else {
          setCourses([]);
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Realtime courses listener notice:', err.message);
        setLoading(false);
      }
    );

    return () => off(coursesRefPath);
  }, [userData.uid]);

  const totalLessonsCount = useMemo(
    () => courses.reduce((acc, c) => acc + (Number(c.totalLessons) || 0), 0),
    [courses]
  );

  const filterOptions = useMemo(() => {
    const completedCount = courses.filter(
      (c) => (c.totalLessons || 0) > 0 && c.totalCompletedLessons === c.totalLessons
    ).length;
    return [
      { id: 'all', label: 'All' },
      { id: 'in-progress', label: 'In Progress', count: courses.length - completedCount, color: '#3b82f6' },
      { id: 'completed', label: 'Completed', count: completedCount, color: '#10b981' }
    ];
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch =
        (course.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (course.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      const isCompleted =
        (course.totalLessons || 0) > 0 && course.totalCompletedLessons === course.totalLessons;
      if (activeFilter === 'completed') return isCompleted;
      if (activeFilter === 'in-progress') return !isCompleted;
      return true;
    });
  }, [courses, searchTerm, activeFilter]);

  const handleSearch = useCallback((debouncedQuery) => {
    setSearchTerm(debouncedQuery || '');
  }, []);

  function addCourse(data) {
    if (!data.title || !data.description) return;

    setIsAdding(true);
    const uid = UIDGenerator();

    const courseData = {
      ...data,
      uid,
      color: data.color || '#4a8bdf',
      totalLessons: 0,
      totalCompletedLessons: 0,
      title: sanitizeInput(data.title),
      description: sanitizeInput(data.description)
    };

    courseApi
      .create(courseData)
      .then(() => addCourseModalRef.current.closeModal())
      .finally(() => {
        setAddCourseInputData({});
        setIsAdding(false);
      })
      .catch(console.error);
  }

  return (
    <>
      <Header userData={userData} title="My Courses" icon="menu_book" />

      <DPLayout>
        <div id="course-page-wrapper">
          {/* Row 1: Search + Primary CTA */}
          <div className="telemetry-toolbar-row">
            <SearchBar
              placeholder="Search courses, subjects, descriptions..."
              onSearch={handleSearch}
            />
            <button
              type="button"
              className="site-button"
              onClick={() => addCourseModalRef.current.openModal()}
            >
              <span className="material-symbols-outlined">add</span>
              New Course
            </button>
          </div>

          {/* Row 2: Monospace Summary + Filter Chips */}
          <div className="telemetry-meta-filter-bar">
            <div className="telemetry-meta-counts">
              <span>{courses.length} courses</span>
              <span className="telemetry-meta-divider">|</span>
              <span>{totalLessonsCount} lessons total</span>
            </div>

            <FilterChips
              options={filterOptions}
              activeId={activeFilter}
              onChange={setActiveFilter}
            />
          </div>

          {/* Row 3: Table-List Column Headers */}
          <div className="telemetry-list-columns-header">
            <span>COURSE / DESCRIPTION</span>
            <span style={{ textAlign: 'right' }}>LESSONS</span>
            <span style={{ textAlign: 'right' }}>UPDATED</span>
            <span style={{ width: '56px' }} />
          </div>

          {/* Row 4: Connected Horizontal List */}
          {loading ? (
            <LoaderSpinner />
          ) : courses.length > 0 ? (
            filteredCourses.length > 0 ? (
              <section className="telemetry-list-container">
                {filteredCourses.map((course, idx) => {
                  const resolvedColor =
                    course.color && course.color.toLowerCase() !== '#ffffff'
                      ? course.color
                      : SUBJECT_PALETTE[idx % SUBJECT_PALETTE.length];
                  return (
                    <CourseCard
                      key={course.uid}
                      uid={course.uid}
                      userUID={userData.uid}
                      courseData={course}
                      icon="folder"
                      iconColor={resolvedColor}
                      title={course.title}
                      description={course.description}
                      totalLessons={course.totalLessons}
                      totalCompletedLessons={course.totalCompletedLessons}
                      onClick={() => navigate(`/main/course/${course.uid}`)}
                    />
                  );
                })}
              </section>
            ) : (
              <div className="empty-container">
                <h3>No matching courses</h3>
                <p>No courses matched your current search or filter.</p>
              </div>
            )
          ) : (
            <div className="empty-container">
              <span className="material-symbols-outlined">menu_book</span>
              <h3>No courses yet</h3>
              <p>Create your first course to organize your lessons, study notes, flashcards, and quizzes.</p>
              <button
                type="button"
                className="site-button"
                onClick={() => addCourseModalRef.current.openModal()}
              >
                <span className="material-symbols-outlined">add</span>
                New Course
              </button>
            </div>
          )}
        </div>
      </DPLayout>

      <FormModal
        ref={addCourseModalRef}
        header="New Course"
        title="Create Course"
        icon="add"
        closeDisabled={isAdding}
        subtitle="Add a new subject or course to organize your study materials."
        buttonName="Create Course"
        buttonCallback={() => addCourse(addCourseInputData)}
        disabled={
          !addCourseInputData.title ||
          !addCourseInputData.description ||
          addCourseInputData.title.length > 50 ||
          addCourseInputData.description.length > 150 ||
          isAdding
        }
        onClose={() => {
          setAddCourseInputData({});
          addCourseModalRef.current.closeModal();
        }}
        buttonRef={buttonRef}
      >
        <label>Course Title:</label>
        <input
          ref={titleRef}
          type="text"
          placeholder="e.g., Mathematics"
          onInput={(e) => {
            verifyInput(e.target.value, titleRef, 50);
            setAddCourseInputData({ ...addCourseInputData, title: e.target.value });
          }}
        />
        <span className="error-message" ref={titleRef}></span>

        <label>Description:</label>
        <textarea
          ref={descriptionRef}
          placeholder="Brief description or #tags"
          onInput={(e) => {
            verifyInput(e.target.value, descriptionRef, 150);
            setAddCourseInputData({ ...addCourseInputData, description: e.target.value });
          }}
        />
        <span className="error-message" ref={descriptionRef}></span>

        <label>Subject Color:</label>
        <input
          ref={colorRef}
          type="color"
          defaultValue="#4a8bdf"
          onChange={(e) => setAddCourseInputData({ ...addCourseInputData, color: e.target.value })}
        />
      </FormModal>
    </>
  );
}
