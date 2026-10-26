const DIRS = [
  { pos: 'n', label: 'W', key: 'w' },
  { pos: 'w', label: 'A', key: 'a' },
  { pos: 's', label: 'S', key: 's' },
  { pos: 'e', label: 'D', key: 'd' },
];

export default function DPad({ disabled, pressed, onPress, onRelease }) {
  return (
    <div className={`dpad ${disabled ? 'disabled' : ''}`}>
      {DIRS.map(({ pos, label, key }) => (
        <button
          key={key}
          className={`dir ${pos} ${pressed.has(key) ? 'down' : ''}`}
          disabled={disabled}
          onPointerDown={() => onPress(key)}
          onPointerUp={() => onRelease(key)}
          onPointerLeave={() => onRelease(key)}
          aria-label={`Move ${label}`}
        >
          <i className="chev" />
          <span>{label}</span>
        </button>
      ))}
      <div className="hub"><span>⌘ +<br />key</span></div>
    </div>
  );
}
