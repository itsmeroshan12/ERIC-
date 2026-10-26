const MIN = 1;
const MAX = 4;

export default function ZoomSlider({ value, onChange }) {
  const step = (d) => onChange(Math.min(MAX, Math.max(MIN, +(value + d).toFixed(2))));
  return (
    <div className="zoom">
      <button onClick={() => step(0.4)} aria-label="Zoom in">+</button>
      <input
        type="range" min={MIN} max={MAX} step="0.05" value={value}
        aria-label="Zoom"
        onChange={(e) => onChange(+e.target.value)}
      />
      <button onClick={() => step(-0.4)} aria-label="Zoom out">−</button>
    </div>
  );
}
