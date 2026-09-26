import './course.css';
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase-config';
import { ref, get, onValue, off } from 'firebase/database';

import Header from '../../components/Header/Header';
import DPLayout from '../../components/DPLayout/DPLayout';
import CourseCard from '../../components/CourseCard/CourseCard';
import FormModal from '../../components/Modal/FormModal/FormModal';
import { UIDGenerator } from '../../utils/UIDGenerator';
import { sanitizeInput, verifyInput } from '../../utils/InputSanitize';
import { courseApi } from '../../services/api';
import MissingCard from '../../components/MissingCard/MissingCard';
import LoaderSpinner from '../../components/LoaderSpinner/LoaderSpinner';

export default function Courses({ userData }) {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [filterCount, setFilterCount] = useState(0);
  const [addCourseInputData, setAddCourseInputData] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const addCourseModalRef = useRef(null);
  const titleRef = useRef(null);
  const descriptionRef = useRef(null);
  const colorRef = useRef(null);
  const buttonRef = useRef(null);

  // --- Fetch Courses ---
  useEffect(() => {

    setLoading(true);
    const coursesRefPath = ref(db, `courses/${userData.uid}`);

    get(coursesRefPath)
      .then((snap) => {
        if (snap.exists()){
          setFilteredCourses(Object.values(snap.val()));
          setCourses(Object.values(snap.val()));
        } else {
          setCourses([]);
          setFilteredCourses([]);
        }
      })
      .catch((err) => console.warn('Course fetch notice:', err.message))
      .finally(() => setLoading(false));

    onValue(
      coursesRefPath,
      (snap) => {
        if (snap.exists()) {
          setFilteredCourses(Object.values(snap.val()));
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
  }, []);

  //Filter UseEffect
  useEffect(() => {
    const filtered = courses.filter((course) =>
        course.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCourses(filtered);
    setFilterCount(filtered.length);
  }, [searchTerm, courses]);//Add Courses, so that when adding a course, the filter is updated

  // --- Add Course ---
  function addCourse(data) {

    if (!data.title || !data.description) return;

    setIsAdding(true);

    const uid = UIDGenerator();

    if(!data.color){
      data.color = "#FFFFFF";
    }

    // --- Sanitize input here before saving ---
    const courseData = { 
      ...data, 
      uid, 
      totalLessons: 0, 
      totalCompletedLessons: 0,
      title: sanitizeInput(data.title),
      description: sanitizeInput(data.description)
    };

    // --- Save via Fi-API ---
    courseApi.create(courseData)
      .then(() => addCourseModalRef.current.closeModal())
      .finally(() => {
        setAddCourseInputData({});
      })
      .catch(console.error);

    setIsAdding(false);
  }

  return (
    <>
      <Header
        userData={userData}
        title="Courses"
        subtitle="View all your courses here"
        icon="library_books"
      />

      <DPLayout>
        <div id="course-page-wrapper">
          <div id="add-course-container">
            <span className="title-subtitle-container">
              <h2 className="h1-icon">
                <span className="material-symbols-outlined">library_books</span> My Courses
              </h2>
              <p>Click "Add Course" to create a new course.</p>
            </span>
            <button className="site-button" onClick={() => addCourseModalRef.current.openModal()}>
              <span className="material-symbols-outlined">add</span> Add Course
            </button>
          </div>

          <input type="search" placeholder="Search Course..." className="search-bar" onInput={(e)=>{setSearchTerm(e.target.value || '')}}/>

          {/* Courses Grid */}
          <section id={loading || filteredCourses.length === 0 ? "loading-container-all" : "courses-container"}>
            {loading ?
              <LoaderSpinner/>
            :
            <>
              {courses.length > 0 && filteredCourses !== undefined ? (
                filterCount > 0 ? (
                  filteredCourses.map((course) => (
                      <CourseCard
                      key={course.uid}
                      uid={course.uid}
                      userUID={userData.uid}
                      courseData={course}
                      icon="folder"
                      iconColor={course.color}
                      title={course.title}
                      description={course.description}
                      totalLessons={course.totalLessons}
                      totalCompletedLessons={course.totalCompletedLessons}
                      onClick={() => navigate(`/main/course/${course.uid}`)}
                    />
                  ))
                ) : (
                  <div className="title-subtitle-container" style={{alignItems: `center`}}>
                    <h2>Err... There's nothing.</h2>
                    <p>No Courses Found</p>
                  </div>
                )
              ) : (
                <MissingCard title="Course" onClick={() => addCourseModalRef.current.openModal()} />
              )}
            </>
            }
          </section>
        </div>
      </DPLayout>

      {/* --- Add Course Modal --- */}
        <FormModal
        ref={addCourseModalRef}
        header="Add Course"
        title="Add Course"
        icon="add"
        closeDisabled={isAdding}
        subtitle="Add a new course to organize your study materials."
        buttonName="Add Course"
        buttonCallback={() => addCourse(addCourseInputData)}
        disabled={!addCourseInputData.title || !addCourseInputData.description
          || addCourseInputData.title.length > 50 || addCourseInputData.description.length > 150 || isAdding}
        onClose={() => { setAddCourseInputData({}); addCourseModalRef.current.closeModal(); }}
        buttonRef={buttonRef}
        >
        <label>Course Title:</label>
        <input
            ref={titleRef}
            type="text"
            placeholder="e.g., Computer Science 101"
            onInput={(e) => {
            verifyInput(e.target.value, titleRef, 50); // 50 char limit
            setAddCourseInputData({ ...addCourseInputData, title: e.target.value });
            }}
        />
        <span className="error-message" ref={titleRef}></span>

        <label>Description:</label>
        <textarea
            ref={descriptionRef}
            placeholder="Brief description of your course"
            onInput={(e) => {
            verifyInput(e.target.value, descriptionRef, 150); // 150 char limit
            setAddCourseInputData({ ...addCourseInputData, description: e.target.value });
            }}
        />
        <span className="error-message" ref={descriptionRef}></span>

        <label>Course Color:</label>
        <input
            ref={colorRef}
            type="color"
            defaultValue="#ffffff"
            onChange={(e) => setAddCourseInputData({ ...addCourseInputData, color: e.target.value })}
        />
        </FormModal>
    </>
  );
}
