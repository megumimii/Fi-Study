import './pomodoro-bottom-bar.css';
import { usePomodoro } from '../../context/PomodoroContext';

export default function PomodoroBottomBar() {
  const {
    MODES,
    mode,
    activeModeObj,
    timeString,
    isRunning,
    isLogging,
    elapsedSeconds,
    progressFraction,
    switchMode,
    toggleRun,
    handleReset,
    handleLogPartial,
    todaySessions
  } = usePomodoro();

  return (
    <aside className="pomodoro-bottom-bar" aria-label="Persistent focus timer bar">
      {/* Top Hairline Progress Strip */}
      <div className="bottom-bar-progress-track">
        <div
          className="bottom-bar-progress-fill"
          style={{ width: `${Math.min(100, Math.max(0, progressFraction * 100))}%` }}
        />
      </div>

      <div className="bottom-bar-content">
        {/* Left Section: Session Information */}
        <div className="bottom-bar-left">
          <span className={`bottom-bar-status-dot ${isRunning ? 'is-active' : ''}`} />
          <div className="bottom-bar-info">
            <span className="bottom-bar-title">
              {activeModeObj.label} Session
            </span>
            <span className="bottom-bar-subtitle">
              {isRunning ? 'Timer running' : 'Paused'} · {todaySessions} completed today
            </span>
          </div>
        </div>

        {/* Center Section: Music-Player Style Controls & Time Display */}
        <div className="bottom-bar-center">
          <div className="bottom-bar-modes" role="tablist">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`bottom-bar-mode-btn ${mode === m.id ? 'active' : ''}`}
                onClick={() => switchMode(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="bottom-bar-playback">
            <button
              type="button"
              className="bottom-bar-tool-btn"
              onClick={handleReset}
              title="Reset session"
              aria-label="Reset timer"
            >
              <span className="material-symbols-outlined">restart_alt</span>
            </button>

            <button
              type="button"
              className={`bottom-bar-play-btn ${isRunning ? 'is-running' : ''}`}
              onClick={toggleRun}
              disabled={isLogging}
              aria-label={isRunning ? 'Pause timer' : 'Start timer'}
            >
              <span className="material-symbols-outlined">
                {isRunning ? 'pause' : 'play_arrow'}
              </span>
            </button>

            <span className="bottom-bar-countdown">{timeString}</span>
          </div>
        </div>

        {/* Right Section: Quick Log & Telemetry */}
        <div className="bottom-bar-right">
          {mode === 'focus' && elapsedSeconds >= 60 && (
            <button
              type="button"
              className="bottom-bar-log-btn"
              onClick={handleLogPartial}
              disabled={isLogging}
              title="Log completed minutes"
            >
              <span className="material-symbols-outlined">check</span>
              <span>Log {Math.round(elapsedSeconds / 60)}m</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

