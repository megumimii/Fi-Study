import './lessons.css';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebase-config';
import { get, ref, onValue, off } from 'firebase/database';
import { lessonApi } from '../../services/api';
import { useEffect, useState, useRef } from 'react';
import Header from '../../components/Header/Header';
import DPLayout from '../../components/DPLayout/DPLayout';
import LessonCard from '../../components/LessonsCard/LessonsCard';
import FormModal from '../../components/Modal/FormModal/FormModal';
import { UIDGenerator } from '../../utils/UIDGenerator';
import { safeText, sanitizeInput, verifyInput } from '../../utils/InputSanitize';
import LoaderSpinner from '../../components/LoaderSpinner/LoaderSpinner';

export default function Lessons({ userData }) {
  const { courseUID } = useParams();
  const navigate = useNavigate();

  const [courseData, setCourseData] = useState({});
  const [lessons, setLessons] = useState([]);
  const [filteredLessons, setFilteredLessons] = useState([]);
  const [filterCount, setFilterCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const addLessonModalRef = useRef(null);
  const titleRef = useRef(null);
  const descriptionRef = useRef(null);
  const buttonRef = useRef(null);
  const errorStatusRef = useRef(null);
  const placeholderTitleRef = useRef(null);
  const placeholderDescriptionRef = useRef(null);

  const [lessonInputData, setLessonInputData] = useState({});

  useEffect(() => {
    setLoading(true);

    get(ref(db, `courses/${userData.uid}/${courseUID}`))
      .then((snapshot) => {
        if (snapshot.exists()) {
          setCourseData(snapshot.val());
        } else {
          navigate("/main/dashboard");
        }
        setLoading(false);
      });

    const lessonsRef = ref(db, `courses/${userData.uid}/${courseUID}/Lessons`);
    onValue(
      lessonsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const values = Object.values(snapshot.val());
          setLessons(values);
          setFilteredLessons(values);
          setFilterCount(values.length);
        } else {
          setLessons([]);
          setFilteredLessons([]);
          setFilterCount(0);
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
          navigate("/main/dashboard");
        }
      },
      (err) => {
        console.warn('Course listener notice:', err.message);
      }
    );

    return () => {
      off(lessonsRef);
      off(courseRef);
    };
  }, []);

  //Filter UseEffect
  useEffect(() => {
    const filtered = lessons.filter((lesson) =>
      lesson.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredLessons(filtered);
    setFilterCount(filtered.length);
  }, [searchTerm, lessons]);

  function addLesson(data) {
    if (!data.title || !data.description) return;

    buttonRef.current.disabled = true;
    const uid = UIDGenerator();

    const lessonData = {
      ...data,
      uid,
      createdAt: new Date().toISOString(),
    };

    lessonApi.create(courseUID, lessonData)
      .then(() => {
        addLessonModalRef.current.closeModal();
        setLessonInputData({});
      })
      .catch((error) => {
        if (errorStatusRef.current) {
          errorStatusRef.current.textContent = error.message;
        } else {
          alert(error.message);
        }
      })
      .finally(() => {
        if (buttonRef.current) buttonRef.current.disabled = false;
      });
  }

  function openAddLessonModal() {
    addLessonModalRef.current.openModal();
    setLessonInputData({});
  }

  return (
    <>
      <Header
        userData={userData}
        title={courseData?.title}
        subtitle={`Your Lessons on ${courseData?.title}`}
        icon="folder"
      />

      <DPLayout>
        <span className="back-button" onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined">arrow_back</span>Back
        </span>

        <section
          id="course-progress"
          style={{
            border: `1px solid ${courseData?.color}`,
            borderTop: `10px solid ${courseData?.color}`,
          }}
        >
          <span className="title-subtitle-container">
            <h2 dangerouslySetInnerHTML={{__html: safeText(courseData?.title)}}></h2>
            <p dangerouslySetInnerHTML={{__html: safeText(courseData?.description)}}></p>
          </span>

          <span className="title-subtitle-container">
            <p>
              {courseData?.totalCompletedLessons || 0} out of{" "}
              {courseData?.totalLessons || 0} lessons accomplished.
            </p>
            <div className="progress-container">
              <div
                className="progress-bar"
                style={{
                  backgroundColor: `${courseData.color}`,
                  width: `${courseData?.totalCompletedLessons / courseData?.totalLessons * 100 || 0}%`,
                }}
              ></div>
            </div>
          </span>
        </section>

        <section id="lessons-container">
          <div className="lessons-add-container">
            <span className="title-subtitle-container">
              <h2 className="h1-icon">
                <span className="material-symbols-outlined">book</span>Lessons
              </h2>
              <p>View your lessons here</p>
            </span>
            <button className="site-button" onClick={openAddLessonModal}>
              <span className="material-symbols-outlined">add</span>Add Lesson
            </button>
          </div>

          <input
            type="search"
            placeholder="Search Lessons"
            onInput={(e) => setSearchTerm(e.target.value)}
            className="search-bar"
            style={{ marginTop: `10px`, marginBottom: `10px` }}
          />

          <div className={loading || filteredLessons.length === 0 ? "loading-container-all" : "lessons-cards-container"}>
            {loading ? (
              <LoaderSpinner />
            ) : (
              <>
                {lessons.length > 0 && filteredLessons !== undefined ? (
                  filterCount > 0 ? (
                    filteredLessons.map((lesson, index) => (
                      <LessonCard
                        key={index}
                        lesson={lesson}
                        title={lesson.title}
                        description={lesson.description}
                        totalCompletedMaterials={lesson.completedMaterials}
                        totalMaterials={lesson.totalMaterials}
                        color={courseData?.color}
                        userData={userData}
                        courseUID={courseUID}
                        courseData={courseData}
                        onClick={() =>
                          navigate(`/main/course/${courseUID}/lesson/${lesson.uid}/materials`)
                        }
                      />
                    ))
                  ) : (
                    <>
                      <div className="empty-container">
                        <div className="title-subtitle-container" style={{ alignItems: `center` }}>
                          <h2>Err... There's nothing.</h2>
                          <p>No Lessons Found</p>
                        </div>
                      </div>
                    </>
                  )
                ) : (
                  <div className="empty-container">
                    <span className="material-symbols-outlined">folder</span>
                    <h2>No Lessons Found</h2>
                    <p>Click the button below to add a new lesson</p>
                    <button className="site-button" onClick={openAddLessonModal}>
                      <span className="material-symbols-outlined">add</span>Add Lesson
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </DPLayout>

      <FormModal
        ref={addLessonModalRef}
        header="Add Lesson"
        title="Add Lesson"
        icon="add"
        subtitle="Add a new lesson for this course."
        buttonName="Add Lesson"
        buttonCallback={() => {
          // sanitize only when saving
          addLesson({
            ...lessonInputData,
            title: sanitizeInput(lessonInputData.title),
            description: sanitizeInput(lessonInputData.description),
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
          placeholder="e.g., 'Introduction to React'"
          required
          onInput={(e) => {
            verifyInput(e.target.value, titleRef, 50);
            setLessonInputData({
              ...lessonInputData,
              title: e.target.value, // store raw input
            });
          }}
        />
        <span className="error-message" ref={titleRef}></span>

        <label htmlFor="lesson-desc">Lesson Description:</label>
        <textarea
          ref={placeholderDescriptionRef}
          id="lesson-desc"
          placeholder="Brief overview of your lesson"
          required
          onInput={(e) => {
            verifyInput(e.target.value, descriptionRef, 150);
            setLessonInputData({
              ...lessonInputData,
              description: e.target.value, // store raw input
            });
          }}
        ></textarea>
        <span className="error-message" ref={descriptionRef}></span>
      </FormModal>
    </>
  );
}
