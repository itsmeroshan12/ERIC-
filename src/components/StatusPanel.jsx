import { PauseIcon, PlayIcon, ArrowRight } from './Icons.jsx';

export function MissionStatus({ paused, onTogglePause }) {
  return (
    <div className="pill mission">
      <span className="muted">Status</span>
      <strong>{paused ? 'Paused' : 'On Mission 1234'}</strong>
      <button className="round dark" onClick={onTogglePause} aria-label={paused ? 'Resume mission' : 'Pause mission'}>
        {paused ? <PlayIcon /> : <PauseIcon />}
      </button>
    </div>
  );
}

export function QuickGoal({ active, onClick }) {
  return (
    <button className={`pill action ${active ? 'selected' : ''}`} onClick={onClick}>
      <span>{active ? 'CLICK MAP' : 'QUICK GOAL'}</span>
      <span className="round dark"><ArrowRight /></span>
    </button>
  );
}

export function ModeToggle({ mode, onChange }) {
  return (
    <div className="pill mode" role="group" aria-label="Drive mode">
      <span className="muted">MODE</span>
      <div className="segmented">
        {['AUTO', 'MANUAL'].map((m) => (
          <button key={m} className={mode === m ? 'on' : ''} onClick={() => onChange(m)}>{m}</button>
        ))}
      </div>
    </div>
  );
}

export function Initiate({ onClick, running }) {
  return (
    <button className="pill action" onClick={onClick}>
      <span>{running ? 'RESTART' : 'INITIATE'}</span>
      <span className="round dark"><ArrowRight /></span>
    </button>
  );
}
