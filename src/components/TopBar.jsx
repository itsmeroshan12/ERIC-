import { BatteryIcon, SignalIcon } from './Icons.jsx';

export default function TopBar({ battery, signal, failsafe, system, view, renderMode, onRenderMode }) {
  return (
    <div className="topbar">
      <div className="topbar-row">
        <span className="stat"><b>{battery}%</b> <BatteryIcon level={battery} /></span>
        <span className="stat"><SignalIcon /> <b>{signal}</b></span>
        <span className="stat">Failsafe <b>{failsafe}</b> <i className={`dot ${failsafe === 'Okay' ? 'ok' : 'bad'}`} /></span>
        <span className="stat">System <b>{system}</b> <i className={`dot ${system === 'Okay' ? 'ok' : 'bad'}`} /></span>
      </div>
      <div className="tabrow">
        <span className="tab" key={view}>{view}</span>
        {view === 'Map View' && (
          <div className="dim-toggle" role="group" aria-label="Map dimension">
            {[['grid', '2D'], ['points', '3D']].map(([mode, label]) => (
              <button key={mode} className={renderMode === mode ? 'on' : ''} onClick={() => onRenderMode(mode)}>{label}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
