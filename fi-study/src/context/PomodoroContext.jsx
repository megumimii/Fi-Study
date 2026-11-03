import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { userApi } from '../services/api';

const MODES = [
  { id: 'focus', label: 'Focus', minutes: 25 },
  { id: 'short', label: 'Short Break', minutes: 5 },
  { id: 'long', label: 'Long Break', minutes: 15 }
];

const PomodoroContext = createContext(null);

export function PomodoroProvider({ children, userData }) {
  const [mode, setMode] = useState('focus');
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [todayHours, setTodayHours] = useState(0);
  const [todaySessions, setTodaySessions] = useState(0);
  const [streakDays, setStreakDays] = useState(0);

  const activeModeObj = MODES.find((m) => m.id === mode) || MODES[0];
  const totalSeconds = activeModeObj.minutes * 60;
  const elapsedSeconds = Math.max(0, totalSeconds - secondsLeft);

  const intervalRef = useRef(null);

  async function recordFocusSession(durationMins) {
    if (durationMins <= 0 || isLogging || !userData?.uid) return;
    setIsLogging(true);
    try {
      await userApi.logStudySession({
        durationMinutes: Math.round(durationMins * 10) / 10,
        courseUID: null,
        courseTitle: 'General Study',
        completedAt: new Date().toISOString()
      });
      setTodaySessions((prev) => prev + 1);
      setTodayHours((prev) => prev + durationMins / 60);
    } catch (err) {
      console.error('Failed to log Pomodoro session:', err);
    } finally {
      setIsLogging(false);
    }
  }

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setIsRunning(false);
          if (mode === 'focus') {
            recordFocusSession(activeModeObj.minutes);
          }
          return activeModeObj.minutes * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, mode, activeModeObj.minutes]);

  function switchMode(newModeId) {
    const target = MODES.find((m) => m.id === newModeId);
    if (!target) return;
    setIsRunning(false);
    setMode(newModeId);
    setSecondsLeft(target.minutes * 60);
  }

  function toggleRun() {
    setIsRunning((prev) => !prev);
  }

  function handleReset() {
    setIsRunning(false);
    setSecondsLeft(activeModeObj.minutes * 60);
  }

  async function handleLogPartial() {
    const elapsedMins = elapsedSeconds / 60;
    if (elapsedMins < 1) return;
    setIsRunning(false);
    await recordFocusSession(elapsedMins);
    setSecondsLeft(activeModeObj.minutes * 60);
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const progressFraction = totalSeconds > 0 ? (totalSeconds - secondsLeft) / totalSeconds : 0;

  const value = {
    MODES,
    mode,
    activeModeObj,
    secondsLeft,
    totalSeconds,
    elapsedSeconds,
    progressFraction,
    timeString: `${mm}:${ss}`,
    isRunning,
    isLogging,
    todayHours,
    todaySessions,
    streakDays,
    setTodayHours,
    setTodaySessions,
    setStreakDays,
    switchMode,
    toggleRun,
    handleReset,
    handleLogPartial
  };

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}

export function usePomodoro() {
  const context = useContext(PomodoroContext);
  if (!context) {
    throw new Error('usePomodoro must be used within a PomodoroProvider');
  }
  return context;
}

