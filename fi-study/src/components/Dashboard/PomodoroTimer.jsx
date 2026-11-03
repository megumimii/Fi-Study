import { useEffect } from 'react';
import { usePomodoro } from '../../context/PomodoroContext';
import './pomodoro-timer.css';

export default function PomodoroTimer({
  todayHours = 0,
  todaySessions = 0,
  streakDays = 0
}) {
  const {
    MODES,
    mode,
    timeString,
    isRunning,
    isLogging,
    elapsedSeconds,
    progressFraction,
    switchMode,
    toggleRun,
    handleReset,
    handleLogPartial,
    setTodayHours,
    setTodaySessions,
    setStreakDays
  } = usePomodoro();

  useEffect(() => {
    if (typeof todayHours === 'number') setTodayHours(todayHours);
    if (typeof todaySessions === 'number') setTodaySessions(todaySessions);
    if (typeof streakDays === 'number') setStreakDays(streakDays);
  }, [todayHours, todaySessions, streakDays, setTodayHours, setTodaySessions, setStreakDays]);

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressFraction);

  return (
    <div className="pomodoro-panel">
      <div className="pomodoro-header">
        <span className="section-kicker">FOCUS TIMER</span>
        <span className="pomodoro-sessions-readout">{todaySessions} sessions</span>
      </div>

      <div className="pomodoro-mode-Bar">
        <div className="pomodoro-mode-tabs" role="tablist">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`pomodoro-mode-tab ${mode === m.id ? 'active' : ''}`}
              onClick={() => switchMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pomodoro-ring-stage">
        <div className="pomodoro-ring-container">
          <svg className="pomodoro-ring-svg" viewBox="0 0 116 116">
            <circle
              className="pomodoro-ring-track"
              cx="58"
              cy="58"
              r={radius}
              fill="none"
              strokeWidth="3"
            />
            <circle
              className="pomodoro-ring-progress"
              cx="58"
              cy="58"
              r={radius}
              fill="none"
              strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="pomodoro-time-readout">
            <span>{timeString}</span>
          </div>
        </div>

        <div className="pomodoro-controls">
          <button
            type="button"
            className={`pomodoro-start-btn ${isRunning ? 'is-running' : ''}`}
            onClick={toggleRun}
            disabled={isLogging}
          >
            <span className="material-symbols-outlined">
              {isRunning ? 'pause' : 'play_arrow'}
            </span>
            <span>{isRunning ? 'Pause' : 'Start'}</span>
          </button>

          <button
            type="button"
            className="pomodoro-reset-btn"
            onClick={handleReset}
            title="Reset timer"
            aria-label="Reset timer"
          >
            <span className="material-symbols-outlined">refresh</span>
          </button>

          {mode === 'focus' && elapsedSeconds >= 60 && (
            <button
              type="button"
              className="pomodoro-log-btn"
              onClick={handleLogPartial}
              disabled={isLogging}
              title="Log elapsed focus time to your dashboard"
            >
              <span className="material-symbols-outlined">check</span>
              <span>Log {Math.round(elapsedSeconds / 60)}m</span>
            </button>
          )}
        </div>
      </div>

      <div className="pomodoro-telemetry-footer">
        <div className="pomodoro-telemetry-row">
          <span className="telemetry-key">Today</span>
          <span className="telemetry-val">{todayHours.toFixed(1)}h</span>
        </div>
        <div className="pomodoro-telemetry-row">
          <span className="telemetry-key">Sessions</span>
          <span className="telemetry-val">{todaySessions}</span>
        </div>
        <div className="pomodoro-telemetry-row">
          <span className="telemetry-key">Streak</span>
          <span className="telemetry-val is-accent">
            <span className="material-symbols-outlined">local_fire_department</span>
            {streakDays}d
          </span>
        </div>
      </div>
    </div>
  );
}
