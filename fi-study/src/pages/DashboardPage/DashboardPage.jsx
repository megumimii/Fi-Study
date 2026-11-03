import './dashboard-page.css';
import { Route, Routes, Navigate } from 'react-router-dom';
import DashboardSideBar from '../../components/DashboardSideBar/DashboardSideBar';
import DashboardNavbar from '../../components/DashboardNavBar/DashboardNavBar';
import PomodoroBottomBar from '../../components/Dashboard/PomodoroBottomBar';
import { PomodoroProvider } from '../../context/PomodoroContext';
import Home from '../Home/Home';
import Lessons from '../Lessons/Lessons';
import Materials from '../Materials/Materials';
import MaterialEditor from '../MaterialEditor/MaterialEditor';
import { useEffect, useState } from 'react';
import Quiz from '../Quiz/Quiz';
import Flashcards from '../Flashcards/Flashcards';
import Courses from '../Course/Course';
import Profile from '../Profile/Profile';

export default function DashboardPage({ userData }) {
  const [windowSize, setWindowSize] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowSize(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <PomodoroProvider userData={userData}>
      <div id="dashboard-page-container" style={{ flexDirection: windowSize > 1024 ? 'row' : 'column' }}>
        {windowSize > 1024 ? <DashboardSideBar userData={userData} /> : <DashboardNavbar userData={userData} />}

        <main id="main-content">
          <Routes>
            <Route path="dashboard" element={<Home userData={userData} />} />
            <Route path="course" element={<Courses userData={userData} />} />
            <Route path="course/:courseUID" element={<Lessons userData={userData} />} />
            <Route path="course/:courseUID/lesson/:lessonUID/materials" element={<Materials userData={userData} />} />
            <Route path="course/:courseUID/lesson/:lessonUID/materials/:materialUID" element={<MaterialEditor userData={userData} />} />
            <Route path="course/:courseUID/lesson/:lessonUID/materials/:materialUID/quiz" element={<Quiz userData={userData} />} />
            <Route path="course/:courseUID/lesson/:lessonUID/materials/:materialUID/flashcards" element={<Flashcards userData={userData} />} />
            <Route path="profile" element={<Profile userData={userData} />} />
            <Route path="*" element={<Navigate to="/main/dashboard" replace />} />
          </Routes>
        </main>

        <PomodoroBottomBar />
      </div>
    </PomodoroProvider>
  );
}
