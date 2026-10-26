import { useEffect, useRef, useState } from 'react';

const SAMPLES = 60;

function Sparkline({ values, max }) {
  const pts = values
    .map((v, i) => `${(i / (SAMPLES - 1)) * 100},${28 - Math.min(1, Math.abs(v) / max) * 26}`)
    .join(' ');
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="spark" aria-hidden="true">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const LINK_LABEL = {
  simulated: 'Simulator',
  connecting: 'ROS connecting…',
  connected: 'ROS live',
  closed: 'ROS disconnected',
  error: 'ROS unreachable',
};

export default function Telemetry({ open, onToggle, robot, battery, link, mode, halted }) {
  const [speeds, setSpeeds] = useState(() => Array(SAMPLES).fill(0));
  const latest = useRef(robot);
  latest.current = robot;

  useEffect(() => {
    const id = setInterval(() => setSpeeds((s) => [...s.slice(1), latest.current.speed]), 500);
    return () => clearInterval(id);
  }, []);

  const deg = ((robot.heading * 180) / Math.PI + 360) % 360;
  const rows = [
    ['Link', LINK_LABEL[link.status] ?? link.status],
    ['Mode', halted ? `${mode} · halted` : mode],
    ['Speed', `${Math.abs(robot.speed).toFixed(2)} m/s`],
    ['Heading', `${deg.toFixed(0)}°`],
    ['Position', `${robot.x.toFixed(2)}, ${robot.y.toFixed(2)} m`],
    ['Battery', `${battery.toFixed(1)}%`],
  ];

  return (
    <div className={`telemetry ${open ? 'open' : ''}`}>
      <button className="telemetry-toggle" onClick={onToggle} aria-expanded={open}>
        <i className={`dot ${link.status === 'error' || link.status === 'closed' ? 'bad' : 'ok'}`} />
        Telemetry <kbd>T</kbd>
      </button>
      {open && (
        <div className="telemetry-body">
          <dl>
            {rows.map(([k, v]) => (
              <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
          <div className="spark-wrap">
            <span>Speed · last 30 s</span>
            <Sparkline values={speeds} max={1} />
          </div>
        </div>
      )}
    </div>
  );
}
