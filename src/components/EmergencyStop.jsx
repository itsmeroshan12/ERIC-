export default function EmergencyStop({ engaged, onToggle }) {
  return (
    <button
      className={`estop ${engaged ? 'engaged' : ''}`}
      onClick={onToggle}
      aria-pressed={engaged}
      aria-label={engaged ? 'Release emergency stop' : 'Emergency stop'}
    >
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <defs>
          <path id="estop-top" d="M 17 52 A 33 33 0 0 1 83 52" />
          <path id="estop-bottom" d="M 12 52 A 38 38 0 0 0 88 52" />
        </defs>
        <circle cx="50" cy="50" r="49" fill="#f6c21c" />
        <circle cx="50" cy="50" r="49" fill="none" stroke="rgba(0,0,0,.08)" strokeWidth="2" />
        <text fontSize="7.5" fontWeight="800" fill="#1a1a1a" letterSpacing="1" textAnchor="middle">
          <textPath href="#estop-top" startOffset="50%">EMERGENCY</textPath>
        </text>
        <text fontSize="7.5" fontWeight="800" fill="#1a1a1a" letterSpacing="1" textAnchor="middle">
          <textPath href="#estop-bottom" startOffset="50%" side="right">STOP</textPath>
        </text>
        <circle cx="50" cy="50" r="31" fill={engaged ? '#8f0f0c' : '#e0201b'} />
        <g fill="none" stroke="#fff" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M33 47a17 17 0 0 1 29-9" /><path d="M63 28v11h-11" />
          <path d="M67 53a17 17 0 0 1-29 9" /><path d="M37 72V61h11" />
        </g>
      </svg>
    </button>
  );
}
