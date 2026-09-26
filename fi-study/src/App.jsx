import { useState, useEffect } from 'react';
import { auth, db } from './firebase-config';
import { get, off, onValue, ref } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import { userApi } from './services/api';
import LandingPage from './pages/LandingPage/LandingPage';
import LoginPage from './pages/LoginRegisterPage/LoginPage';
import RegisterPage from './pages/LoginRegisterPage/RegisterPage';
import DashboardPage from './pages/DashboardPage/DashboardPage';

function App() {

  const [loggedUser, setUser] = useState(auth.currentUser);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let userDbRef = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        let profileLoaded = false;

        // Try direct RTDB read first
        try {
          userDbRef = ref(db, `users/${user.uid}`);
          const snapshot = await get(userDbRef);
          if (snapshot.exists()) {
            setUser({ ...snapshot.val(), uid: user.uid });
            profileLoaded = true;
          }
        } catch (err) {
          console.warn("RTDB client read not permitted or failed, falling back to Fi-API:", err.message);
        }

        // If RTDB read didn't populate user, use Fi-API (Admin SDK bypasses RTDB client rules)
        if (!profileLoaded) {
          try {
            const profile = await userApi.getProfile();
            if (profile) {
              setUser({ ...profile, uid: user.uid });
              profileLoaded = true;
            }
          } catch (apiErr) {
            console.error("Failed to fetch user profile from Fi-API:", apiErr.message);
            // Fallback to basic auth info so user is not blocked
            setUser({
              uid: user.uid,
              email: user.email,
              firstName: user.displayName?.split(' ')[0] || 'User',
              lastName: user.displayName?.split(' ')[1] || ''
            });
          }
        }

        // Subscribe to realtime updates if permitted, with non-crashing error handler
        try {
          userDbRef = ref(db, `users/${user.uid}`);
          onValue(
            userDbRef,
            (snapshot) => {
              if (snapshot.exists()) {
                setUser({ ...snapshot.val(), uid: user.uid });
              }
            },
            (err) => {
              console.warn("Realtime user listener notice:", err.message);
            }
          );
        } catch (e) {
          console.warn("Could not attach realtime listener:", e.message);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (userDbRef) off(userDbRef);
    };
  }, []);

  //If loading, show loading screen
  if (loading) return <div className="loading-screen"><div className="loading-spinner"></div></div>;

  return (
    <Routes>
      {loggedUser ? (
        <>
          <Route path="/main/*" element={<DashboardPage userData={loggedUser} />} />
          <Route path="/" element={<Navigate to="/main/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/main/dashboard" replace />} />
        </>
      ) : (
        <>
          {loggedUser ? <Navigate to="/main/dashboard" /> : null}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<RegisterPage />} />
          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      )}
    </Routes>
  );
}

export default App;
