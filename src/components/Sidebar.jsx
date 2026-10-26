import { useState } from 'react';
import { GridIcon, MapIcon, PinIcon, RegionIcon, TargetIcon, ChartIcon, UserIcon } from './Icons.jsx';

const ITEMS = [
  { id: 'dashboard', label: 'Dashboard', Icon: GridIcon },
  { id: 'map', label: 'Maps', Icon: MapIcon },
  { id: 'goals', label: 'Goals', Icon: PinIcon },
  { id: 'zones', label: 'Zones', Icon: RegionIcon },
  { id: 'targets', label: 'Targets', Icon: TargetIcon },
  { id: 'analytics', label: 'Analytics', Icon: ChartIcon },
];

export default function Sidebar() {
  const [active, setActive] = useState('dashboard');
  return (
    <nav className="sidebar" aria-label="Main navigation">
      <div className="logo">
        <span>ER<i>I</i>C</span>
        <small>ROBOTICS</small>
      </div>
      <ul>
        {ITEMS.map(({ id, label, Icon }) => (
          <li key={id}>
            <button
              className={active === id ? 'active' : ''}
              title={label}
              aria-label={label}
              onClick={() => setActive(id)}
            >
              <Icon />
            </button>
          </li>
        ))}
      </ul>
      <button className="user" title="Profile" aria-label="Profile"><UserIcon /></button>
    </nav>
  );
}
