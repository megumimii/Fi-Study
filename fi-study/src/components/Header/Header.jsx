import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase-config';
import { ref, onValue, off } from 'firebase/database';
import { safeText } from '../../utils/InputSanitize';
import './header.css';

function computeStreakDays(sessionsObj) {
  if (!sessionsObj) return 0;
  const dateSet = new Set(
    Object.values(sessionsObj)
      .map((s) => s.dateKey || (s.completedAt ? s.completedAt.slice(0, 10) : null))
      .filter(Boolean)
  );
  if (dateSet.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();
  const todayKey = cursor.toISOString().slice(0, 10);

  // If no session today yet, check starting from yesterday so active streak isn't zeroed mid-day
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

const Header = ({ userData, title }) => {
  const [streakDays, setStreakDays] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userData?.uid) return;
    const sessionsRef = ref(db, `users/${userData.uid}/studySessions`);
    onValue(
      sessionsRef,
      (snap) => {
        setStreakDays(snap.exists() ? computeStreakDays(snap.val()) : 0);
      },
      () => {}
    );
    return () => off(sessionsRef);
  }, [userData?.uid]);

  return (
    <header id="header-container">
      <div className="header-left-breadcrumb">
        <h1
          className="header-page-title"
          dangerouslySetInnerHTML={{ __html: safeText(title) }}
        />
      </div>

      <div className="header-right-telemetry">
        <div
          className="header-streak-badge"
          onClick={() => navigate('/main/dashboard')}
          title="Active Study Streak"
        >
          <span className="material-symbols-outlined streak-icon">
            local_fire_department
          </span>
          <span>{streakDays}d</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
