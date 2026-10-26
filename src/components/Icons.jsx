const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export const GridIcon = () => (
  <svg {...base}><rect x="4" y="4" width="6.5" height="6.5" rx="1" fill="currentColor" stroke="none" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1" fill="currentColor" stroke="none" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1" fill="currentColor" stroke="none" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" fill="currentColor" stroke="none" /></svg>
);
export const MapIcon = () => (
  <svg {...base}><path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z" /><path d="M9 4v13.5M15 6.5V20" /></svg>
);
export const PinIcon = () => (
  <svg {...base}><path d="M12 21s6-5.6 6-10.5a6 6 0 1 0-12 0C6 15.4 12 21 12 21z" /><circle cx="12" cy="10.5" r="2.2" /></svg>
);
export const RegionIcon = () => (
  <svg {...base}><rect x="6" y="6" width="12" height="12" /><circle cx="6" cy="6" r="1.4" /><circle cx="18" cy="6" r="1.4" /><circle cx="6" cy="18" r="1.4" /><circle cx="18" cy="18" r="1.4" /></svg>
);
export const TargetIcon = () => (
  <svg {...base}><circle cx="12" cy="12" r="7" /><path d="M12 2v5M12 17v5M2 12h5M17 12h5" /></svg>
);
export const ChartIcon = () => (
  <svg {...base}><path d="M3 17 9 11l4 4 8-8" /><path d="M16 7h5v5" /></svg>
);
export const UserIcon = () => (
  <svg {...base}><circle cx="12" cy="8" r="3.6" /><path d="M5 20c.8-3.6 3.6-5.4 7-5.4s6.2 1.8 7 5.4" /></svg>
);
export const PauseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
);
export const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l12-7.5z" /></svg>
);
export const ArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const BatteryIcon = ({ level }) => (
  <svg width="22" height="12" viewBox="0 0 22 12"><rect x="0.5" y="0.5" width="18" height="11" rx="2.5" fill="none" stroke="currentColor" /><rect x="2" y="2" width={(15 * level) / 100} height="8" rx="1.5" fill="#25d366" /><rect x="19.5" y="3.5" width="2" height="5" rx="1" fill="currentColor" /></svg>
);
export const SignalIcon = () => (
  <svg width="14" height="12" viewBox="0 0 14 12" fill="currentColor"><rect x="0" y="8" width="2.5" height="4" rx="1" /><rect x="4" y="5" width="2.5" height="7" rx="1" /><rect x="8" y="2.5" width="2.5" height="9.5" rx="1" /><rect x="12" y="0" width="2" height="12" rx="1" opacity=".35" /></svg>
);
export const RobotIcon = () => (
  <svg viewBox="0 0 36 32" width="100%" height="100%">
    <g fill="none" stroke="#111" strokeWidth="1.6" strokeLinecap="round">
      <path d="M13 6.5a7 7 0 0 1 10 0" /><path d="M15.5 9a3.6 3.6 0 0 1 5 0" />
    </g>
    <circle cx="18" cy="11.5" r="1.3" fill="#111" />
    <rect x="3" y="14" width="30" height="10" rx="2.5" fill="#fff" stroke="#111" strokeWidth="2" />
    <rect x="8" y="17" width="12" height="4" rx="1" fill="#111" />
    <circle cx="9" cy="26.5" r="3.4" fill="#111" /><circle cx="27" cy="26.5" r="3.4" fill="#111" />
  </svg>
);
