import './home.css';
import { useRef, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase-config';
import { ref, onValue, off } from 'firebase/database';
import Header from '../../components/Header/Header';
import DPLayout from '../../components/DPLayout/DPLayout';
import FormModal from '../../components/Modal/FormModal/FormModal';
import LoaderSpinner from '../../components/LoaderSpinner/LoaderSpinner';
import PomodoroTimer from '../../components/Dashboard/PomodoroTimer';
import WeeklyActivityChart from '../../components/Dashboard/WeeklyActivityChart';
import { sanitizeInput, verifyInput, safeText } from '../../utils/InputSanitize';
import { UIDGenerator } from '../../utils/UIDGenerator';
import { courseApi } from '../../services/api';

const SUBJECT_PALETTE = ['#4a8bdf', '#3b82f6', '#818cf8', '#a855f7', '#f59e0b', '#ec4899'];

function countWordsFromHtml(html, fallbackText = '') {
  const source = html
    ? html.replace(/<[^>]+>/g, ' ')
    : fallbackText || '';
  const words = source.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

function formatShortDate(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getMondayOfCurrentWeek() {
  const now = new Date();
  const day = now.getDay(); // 0 (Sun) to 6 (Sat)
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() + diffToMonday);
  return monday;
}

function computeStreak(sessionsList) {
  if (!sessionsList.length) return 0;
  const dateSet = new Set(
    sessionsList
      .map((s) => s.dateKey || (s.completedAt ? s.completedAt.slice(0, 10) : null))
      .filter(Boolean)
  );
  if (dateSet.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();
  const todayKey = cursor.toISOString().slice(0, 10);
  if (!dateSet.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (dateSet.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export default function Home({ userData }) {
  const addCourseModalRef = useRef(null);
  const titleRef = useRef(null);
  const descriptionRef = useRef(null);
  const colorRef = useRef(null);
  const buttonRef = useRef(null);

  const navigate = useNavigate();

  const [coursesObj, setCoursesObj] = useState({});
  const [sessionsObj, setSessionsObj] = useState({});
  const [quizHistoryObj, setQuizHistoryObj] = useState({});
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [addCourseInputData, setAddCourseInputData] = useState({});

  useEffect(() => {
    if (!userData?.uid) return;
    setLoading(true);

    const coursesRef = ref(db, `courses/${userData.uid}`);
    const sessionsRef = ref(db, `users/${userData.uid}/studySessions`);
    const quizzesRef = ref(db, `users/${userData.uid}/quizHistory`);

    onValue(
      coursesRef,
      (snap) => {
        setCoursesObj(snap.exists() ? snap.val() : {});
        setLoading(false);
      },
      (err) => {
        console.warn('Courses listener notice:', err.message);
        setLoading(false);
      }
    );

    onValue(
      sessionsRef,
      (snap) => {
        setSessionsObj(snap.exists() ? snap.val() : {});
      },
      () => {}
    );

    onValue(
      quizzesRef,
      (snap) => {
        setQuizHistoryObj(snap.exists() ? snap.val() : {});
      },
      () => {}
    );

    return () => {
      off(coursesRef);
      off(sessionsRef);
      off(quizzesRef);
    };
  }, [userData?.uid]);

  // Flatten real courses, lessons, and materials
  const { coursesList, materialsList } = useMemo(() => {
    const cList = Object.values(coursesObj || {}).map((c, idx) => ({
      ...c,
      accentColor:
        c.color && c.color.toLowerCase() !== '#ffffff'
          ? c.color
          : SUBJECT_PALETTE[idx % SUBJECT_PALETTE.length]
    }));

    const mList = [];
    cList.forEach((course) => {
      const lessons = course.Lessons ? Object.values(course.Lessons) : [];
      lessons.forEach((lesson) => {
        const materials = lesson.Materials ? Object.values(lesson.Materials) : [];
        materials.forEach((mat) => {
          mList.push({
            ...mat,
            courseUID: course.uid,
            courseTitle: course.title,
            courseColor: course.accentColor,
            lessonUID: lesson.uid,
            lessonTitle: lesson.title,
            wordCount: countWordsFromHtml(mat.htmlContent, mat.description),
            timestamp: mat.updatedAt || mat.createdAt || null
          });
        });
      });
    });

    mList.sort((a, b) => {
      const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tB - tA;
    });

    return { coursesList: cList, materialsList: mList };
  }, [coursesObj]);

  // Compute real Pomodoro / Study Session telemetry
  const sessionStats = useMemo(() => {
    const list = Object.values(sessionsObj || {});
    const totalMinutes = list.reduce((acc, s) => acc + (Number(s.durationMinutes) || 0), 0);
    const totalHours = totalMinutes / 60;

    const todayKey = new Date().toISOString().slice(0, 10);
    const todaySessionsList = list.filter(
      (s) => (s.dateKey || (s.completedAt ? s.completedAt.slice(0, 10) : '')) === todayKey
    );
    const todayMinutes = todaySessionsList.reduce(
      (acc, s) => acc + (Number(s.durationMinutes) || 0),
      0
    );

    const monday = getMondayOfCurrentWeek();
    const dailyMinutes = [0, 0, 0, 0, 0, 0, 0]; // Mon..Sun

    list.forEach((s) => {
      if (!s.completedAt) return;
      const dt = new Date(s.completedAt);
      if (Number.isNaN(dt.getTime()) || dt < monday) return;
      const dayIdx = dt.getDay() === 0 ? 6 : dt.getDay() - 1;
      if (dayIdx >= 0 && dayIdx < 7) {
        dailyMinutes[dayIdx] += Number(s.durationMinutes) || 0;
      }
    });

    const dailyHours = dailyMinutes.map((m) => Math.round((m / 60) * 10) / 10);
    const weekHours = dailyHours.reduce((a, b) => a + b, 0);
    const streakDays = computeStreak(list);

    // Per-course hours map
    const hoursByCourse = {};
    list.forEach((s) => {
      const key = s.courseUID || '__general__';
      hoursByCourse[key] = (hoursByCourse[key] || 0) + (Number(s.durationMinutes) || 0) / 60;
    });

    return {
      totalHours,
      todayHours: todayMinutes / 60,
      todaySessions: todaySessionsList.length,
      dailyHours,
      weekHours,
      streakDays,
      hoursByCourse
    };
  }, [sessionsObj]);

  // Compute real Quiz telemetry
  const quizStats = useMemo(() => {
    const attempts = Object.values(quizHistoryObj || {}).sort((a, b) => {
      const tA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const tB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return tB - tA;
    });

    if (attempts.length > 0) {
      const avg =
        attempts.reduce((acc, q) => acc + (Number(q.percentage) || 0), 0) / attempts.length;
      return {
        avgPercentage: avg,
        recentQuizzes: attempts.slice(0, 4)
      };
    }

    // Fallback to materials marked as passed if quizHistory is empty
    const passedMaterials = materialsList.filter((m) => m.passed);
    if (passedMaterials.length > 0) {
      return {
        avgPercentage: 100,
        recentQuizzes: passedMaterials.slice(0, 4).map((m) => ({
          id: m.uid,
          materialTitle: m.title,
          courseUID: m.courseUID,
          courseColor: m.courseColor,
          completedAt: m.passedAt || m.updatedAt || m.createdAt,
          percentage: 100
        }))
      };
    }

    return {
      avgPercentage: null,
      recentQuizzes: []
    };
  }, [quizHistoryObj, materialsList]);

  // Subject breakdown (hours studied per course, or material counts per course)
  const subjectBreakdown = useMemo(() => {
    if (!coursesList.length) return [];

    const items = coursesList.map((course) => {
      const hrs = sessionStats.hoursByCourse[course.uid] || 0;
      const matCount = materialsList.filter((m) => m.courseUID === course.uid).length;
      return {
        uid: course.uid,
        title: course.title,
        color: course.accentColor,
        hours: hrs,
        materialCount: matCount,
        lessonCount: course.totalLessons || 0
      };
    });

    items.sort((a, b) => {
      if (b.hours !== a.hours) return b.hours - a.hours;
      return b.materialCount - a.materialCount;
    });

    return items;
  }, [coursesList, sessionStats.hoursByCourse, materialsList]);

  const topSubjectShort = useMemo(() => {
    if (!subjectBreakdown.length) return '—';
    const top = subjectBreakdown[0].title || '';
    const words = top.trim().split(/\s+/);
    if (words.length >= 2) {
      return words
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();
    }
    return top.slice(0, 4).toUpperCase() || '—';
  }, [subjectBreakdown]);

  function addCourse(data) {
    if (!data.title || !data.description) return;
    setIsAdding(true);
    const uid = UIDGenerator();

    const courseData = {
      ...data,
      uid,
      color: data.color || '#4a8bdf',
      title: sanitizeInput(data.title),
      description: sanitizeInput(data.description)
    };

    courseApi
      .create(courseData)
      .then(() => {
        addCourseModalRef.current.closeModal();
        setAddCourseInputData({});
      })
      .catch(console.error)
      .finally(() => {
        if (buttonRef.current) buttonRef.current.disabled = false;
        setIsAdding(false);
      });
  }

  const maxSubjectMetric = useMemo(() => {
    if (!subjectBreakdown.length) return 1;
    const maxHours = Math.max(...subjectBreakdown.map((s) => s.hours));
    if (maxHours > 0) return maxHours;
    return Math.max(1, ...subjectBreakdown.map((s) => s.materialCount || s.lessonCount || 1));
  }, [subjectBreakdown]);

  return (
    <>
      <Header userData={userData} title="Dashboard" icon="grid_view" />

      <DPLayout>
        {loading ? (
          <LoaderSpinner />
        ) : (
          <div className="studyflow-dashboard">
            {/* 1. 6-Cell Top KPI Telemetry Strip */}
            <section className="dashboard-kpi-strip" aria-label="Study Metrics Overview">
              <div className="kpi-cell">
                <span className="section-kicker">TOTAL HRS</span>
                <div className="kpi-value">
                  {sessionStats.totalHours.toFixed(1)}
                  <span className="kpi-unit">h</span>
                </div>
              </div>

              <div className="kpi-cell">
                <span className="section-kicker">THIS WEEK</span>
                <div className="kpi-value">
                  {sessionStats.weekHours.toFixed(1)}
                  <span className="kpi-unit">h</span>
                </div>
              </div>

              <div className="kpi-cell">
                <span className="section-kicker">QUIZ AVG</span>
                <div className="kpi-value is-accent">
                  {quizStats.avgPercentage !== null ? (
                    <>
                      {quizStats.avgPercentage.toFixed(1)}
                      <span className="kpi-unit">%</span>
                    </>
                  ) : (
                    '—'
                  )}
                </div>
              </div>

              <div className="kpi-cell">
                <span className="section-kicker">STREAK</span>
                <div className="kpi-value">
                  {sessionStats.streakDays}
                  <span className="kpi-unit">d</span>
                </div>
              </div>

              <div className="kpi-cell">
                <span className="section-kicker">NOTES</span>
                <div className="kpi-value">{materialsList.length}</div>
              </div>

              <div className="kpi-cell">
                <span className="section-kicker">TOP SUBJECT</span>
                <div className="kpi-value" title={subjectBreakdown[0]?.title || 'No courses yet'}>
                  {topSubjectShort}
                </div>
              </div>
            </section>

            {/* 2. Middle Row: Weekly Activity Chart + Pomodoro Focus Timer */}
            <section className="dashboard-middle-grid">
              <WeeklyActivityChart
                dailyHours={sessionStats.dailyHours}
                weekHours={sessionStats.weekHours}
              />

              <PomodoroTimer
                courses={coursesList}
                todayHours={sessionStats.todayHours}
                todaySessions={sessionStats.todaySessions}
                streakDays={sessionStats.streakDays}
              />
            </section>

            {/* 3. Bottom Row: Recent Notes | Time by Subject | Recent Quizzes */}
            <section className="dashboard-bottom-grid">
              {/* Column 1: Recent Notes */}
              <div className="dashboard-card-panel">
                <div className="dashboard-card-header">
                  <span className="section-kicker">RECENT NOTES</span>
                  <button
                    type="button"
                    className="dashboard-card-icon-btn"
                    onClick={() =>
                      coursesList.length > 0
                        ? navigate('/main/course')
                        : addCourseModalRef.current.openModal()
                    }
                    title={coursesList.length > 0 ? 'Go to Courses & Notes' : 'Create a Course'}
                  >
                    <span className="material-symbols-outlined">add</span>
                  </button>
                </div>

                {materialsList.length > 0 ? (
                  <div className="dashboard-compact-list">
                    {materialsList.slice(0, 5).map((mat) => (
                      <div
                        key={mat.uid}
                        className="dashboard-compact-row"
                        onClick={() =>
                          navigate(
                            `/main/course/${mat.courseUID}/lesson/${mat.lessonUID}/materials/${mat.uid}`
                          )
                        }
                      >
                        <span
                          className="row-accent-bar"
                          style={{ backgroundColor: mat.courseColor || '#4a8bdf' }}
                        />
                        <div className="row-main-info">
                          <span
                            className="row-title"
                            dangerouslySetInnerHTML={{ __html: safeText(mat.title) }}
                          />
                          <span className="row-meta-mono">
                            {mat.wordCount}w · {formatShortDate(mat.timestamp)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="dashboard-panel-empty">
                    <p>No study notes uploaded or created yet.</p>
                    <button
                      type="button"
                      className="site-button secondary"
                      onClick={() =>
                        coursesList.length > 0
                          ? navigate('/main/course')
                          : addCourseModalRef.current.openModal()
                      }
                    >
                      <span className="material-symbols-outlined">add</span>
                      {coursesList.length > 0 ? 'Open Courses' : 'Create First Course'}
                    </button>
                  </div>
                )}
              </div>

              {/* Column 2: Time / Activity by Subject */}
              <div className="dashboard-card-panel">
                <div className="dashboard-card-header">
                  <span className="section-kicker">TIME BY SUBJECT</span>
                  <span className="dashboard-header-meta">
                    {sessionStats.totalHours > 0
                      ? `${sessionStats.totalHours.toFixed(1)}h total`
                      : `${coursesList.length} course${coursesList.length === 1 ? '' : 's'}`}
                  </span>
                </div>

                {subjectBreakdown.length > 0 ? (
                  <div className="subject-bars-list">
                    {subjectBreakdown.slice(0, 5).map((subj) => {
                      const metricValue =
                        sessionStats.totalHours > 0
                          ? subj.hours
                          : subj.materialCount || subj.lessonCount;
                      const widthPct = Math.min(
                        100,
                        Math.max(6, Math.round((metricValue / maxSubjectMetric) * 100))
                      );
                      return (
                        <div
                          key={subj.uid}
                          className="subject-bar-item"
                          onClick={() => navigate(`/main/course/${subj.uid}`)}
                        >
                          <div className="subject-bar-top">
                            <span
                              className="subject-name"
                              dangerouslySetInnerHTML={{ __html: safeText(subj.title) }}
                            />
                            <span className="subject-hours-mono">
                              {sessionStats.totalHours > 0
                                ? `${subj.hours.toFixed(1)}h`
                                : `${subj.materialCount} note${subj.materialCount === 1 ? '' : 's'}`}
                            </span>
                          </div>
                          <div className="subject-bar-track">
                            <div
                              className="subject-bar-fill"
                              style={{
                                width: `${metricValue > 0 ? widthPct : 0}%`,
                                backgroundColor: subj.color
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="dashboard-panel-empty">
                    <p>Create a course to track study hours by subject.</p>
                    <button
                      type="button"
                      className="site-button secondary"
                      onClick={() => addCourseModalRef.current.openModal()}
                    >
                      <span className="material-symbols-outlined">add</span>
                      Add Course
                    </button>
                  </div>
                )}
              </div>

              {/* Column 3: Recent Quizzes */}
              <div className="dashboard-card-panel">
                <div className="dashboard-card-header">
                  <span className="section-kicker">RECENT QUIZZES</span>
                  <span className="dashboard-header-meta">
                    {quizStats.avgPercentage !== null
                      ? `avg ${quizStats.avgPercentage.toFixed(1)}%`
                      : 'no attempts yet'}
                  </span>
                </div>

                {quizStats.recentQuizzes.length > 0 ? (
                  <div className="recent-quizzes-wrapper">
                    <div className="dashboard-compact-list">
                      {quizStats.recentQuizzes.map((qz, idx) => {
                        const barColor =
                          qz.courseColor || SUBJECT_PALETTE[idx % SUBJECT_PALETTE.length];
                        return (
                          <div key={qz.id || idx} className="dashboard-compact-row is-quiz-row">
                            <span
                              className="row-accent-bar"
                              style={{ backgroundColor: barColor }}
                            />
                            <div className="row-main-info">
                              <span
                                className="row-title"
                                dangerouslySetInnerHTML={{
                                  __html: safeText(qz.materialTitle || 'Quiz Assessment')
                                }}
                              />
                              <span className="row-meta-mono">
                                {formatShortDate(qz.completedAt)}
                              </span>
                            </div>
                            <span
                              className={`quiz-score-readout ${
                                Number(qz.percentage) >= 80 ? 'is-high' : ''
                              }`}
                            >
                              {Math.round(Number(qz.percentage) || 0)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {subjectBreakdown.length > 0 && (
                      <div className="quiz-subject-Proportion-strip">
                        {subjectBreakdown.slice(0, 4).map((subj) => (
                          <div
                            key={subj.uid}
                            className="proportion-segment"
                            style={{ backgroundColor: subj.color }}
                            title={subj.title}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="dashboard-panel-empty">
                    <p>Complete an AI Quiz on any study note to record your score telemetry.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </DPLayout>

      <FormModal
        ref={addCourseModalRef}
        header="New Course"
        title="Create Course"
        closeDisabled={isAdding}
        icon="add"
        subtitle="Organize your lessons, notes, flashcards, and quizzes by subject."
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
          placeholder="e.g., Computer Science"
          onInput={(e) => {
            verifyInput(e.target.value, titleRef, 50);
            setAddCourseInputData({ ...addCourseInputData, title: e.target.value });
          }}
        />
        <span className="error-message" ref={titleRef}></span>

        <label>Description:</label>
        <textarea
          ref={descriptionRef}
          placeholder="Brief subject overview"
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
