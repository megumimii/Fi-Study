import CourseCard from '../../components/CourseCard/CourseCard';
import DPLayout from '../../components/DPLayout/DPLayout';
import Header from '../../components/Header/Header';
import MissingCard from '../../components/MissingCard/MissingCard';
import StatCard from '../../components/StatCard/StatCard';
import './home.css';
import { useRef, useEffect, useState } from 'react';
import { db } from '../../firebase-config';
import { ref, get, onValue, off } from 'firebase/database';
import { sanitizeInput, verifyInput } from '../../utils/InputSanitize';
import { UIDGenerator } from '../../utils/UIDGenerator';
import FormModal from '../../components/Modal/FormModal/FormModal';
import { useNavigate } from 'react-router-dom';
import { courseApi } from '../../services/api';
import LoaderSpinner from '../../components/LoaderSpinner/LoaderSpinner';

export default function Home({ userData }) {
  const addCourseModalRef = useRef(null);
  const titleRef = useRef(null);
  const descriptionRef = useRef(null);
  const colorRef = useRef(null);
  const buttonRef = useRef(null);

  const navigate = useNavigate();
  const [recentCourses, setRecentCourses] = useState([]);
  const [addCourseInputData, setAddCourseInputData] = useState({});
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // --- Fetch courses from Firebase ---
  useEffect(() => {
    setLoading(true);
    const coursesRef = ref(db, `courses/${userData.uid}`);
    get(coursesRef)
      .then((snap) => snap.exists() && setRecentCourses(snap.val()))
      .catch((err) => console.warn('Courses fetch notice:', err.message))
      .finally(() => setLoading(false));

    onValue(
      coursesRef,
      (snap) => {
        if (snap.exists()) {
          setRecentCourses(snap.val());
        } else {
          setRecentCourses({});
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Realtime courses listener notice:', err.message);
        setLoading(false);
      }
    );
    return () => off(coursesRef); //cleanup
  }, [userData.uid]);

  // --- Stats ---
  const totalCourses = recentCourses ? Object.keys(recentCourses).length : 0;
  let completedCourses = 0, totalLessonsOverall = 0, completedLessonsOverall = 0;
  if (recentCourses) {
    Object.values(recentCourses).forEach((course) => {
      const total = course.totalLessons || 0;
      const completed = course.totalCompletedLessons || 0;
      totalLessonsOverall += total;
      completedLessonsOverall += completed;
      if (total && completed === total) completedCourses += 1;
    });
  }
  const overallProgress = totalLessonsOverall ? Math.round((completedLessonsOverall / totalLessonsOverall) * 100) : 0;

  // --- Add Course ---
  function addCourse(data) {
    if (!data.title || !data.description) return;

    setIsAdding(true);
    const uid = UIDGenerator();

    if(!data.color){
      data.color = "#FFFFFF";
    }

    // --- Sanitize input only here before saving ---
    const courseData = { 
      ...data, 
      uid,
      title: sanitizeInput(data.title),
      description: sanitizeInput(data.description)
    };

    courseApi.create(courseData)
      .then(() => {
        addCourseModalRef.current.closeModal();
        setAddCourseInputData({});
      })
      .catch(console.error)
      .finally(() => buttonRef.current.disabled = false);

    setIsAdding(false);
  }

  return (
    <>
      <Header userData={userData} title="Dashboard"
        subtitle={`Welcome ${userData.firstName.split(' ')[0]}! Here is your learning progress overview.`} icon="dashboard" />
      <DPLayout>
        {/* Stats */}
        <section id="home-overview-container">
          <StatCard icon="library_books" title="Total Courses" description={`${totalCourses} Course${totalCourses !== 1 ? 's' : ''}`} iconColor="#4CAF50"/>
          <StatCard icon="quiz" title="Completed Courses" description={`${completedCourses}/${totalCourses} Completed`} iconColor="#2196F3"/>
          <StatCard icon="flash_on" title="Lessons Progress" description={`${overallProgress}%`} iconColor="#FFC107"/>
        </section>

        {/* Courses */}
        <section id="recent-courses">
          <span id="recent-courses-title-container" className="title-subtitle-container">
            <h2 className="h1-icon"><span className="material-symbols-outlined">library_books</span> Recent Courses</h2>
            <p>View your recent courses you have created.</p>
          </span>
      
            <div id={!loading ? "recent-courses-container" : "loading-container-all"}>
            {!loading ? Object.values(recentCourses).slice(0, 8).map((course) => (
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
                onClick={() => navigate(`/main/course/${course.uid}`)} />  
            ))
            :
            <LoaderSpinner/>
            }
            {!loading && Object.values(recentCourses).length < 8 &&
              <MissingCard title="Course" onClick={() => addCourseModalRef.current.openModal()} />
            }
          </div>
        </section>
      </DPLayout>

      {/* Add Course Modal */}
        <FormModal
        ref={addCourseModalRef}
        header="Add Course"
        title="Add Course"
        closeDisabled={isAdding}
        icon="add"
        subtitle="Add a new course."
        buttonName="Add Course"
        buttonCallback={() => addCourse(addCourseInputData)}
        disabled={!addCourseInputData.title || !addCourseInputData.description 
          || addCourseInputData.title.length > 50 || addCourseInputData.description.length > 150 || isAdding}
        onClose={() => {setAddCourseInputData({}); addCourseModalRef.current.closeModal();}}
        buttonRef={buttonRef}
        >
        <label>Course Title:</label>
        <input
            ref={titleRef}
            type="text"
            placeholder="e.g., 'Computer Science 101'"
            onInput={(e) => {
            verifyInput(e.target.value, titleRef, 50); // 50 char limit
            setAddCourseInputData({ ...addCourseInputData, title: e.target.value });
            }}
        />
        <span className="error-message" ref={titleRef}></span>

        <label>Description:</label>
        <textarea
            ref={descriptionRef}
            placeholder="Brief Description"
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
            defaultValue="#FFFFFF"
            onChange={(e) => setAddCourseInputData({ ...addCourseInputData, color: e.target.value })}
        />
        </FormModal>
    </>
  );
}
