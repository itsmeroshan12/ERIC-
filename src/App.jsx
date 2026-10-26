import { useCallback, useEffect, useRef, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import MapView from './components/MapView.jsx';
import CameraView from './components/CameraView.jsx';
import ZoomSlider from './components/ZoomSlider.jsx';
import EmergencyStop from './components/EmergencyStop.jsx';
import DPad from './components/DPad.jsx';
import Telemetry from './components/Telemetry.jsx';
import Toasts from './components/Toasts.jsx';
import { MissionStatus, QuickGoal, ModeToggle, Initiate } from './components/StatusPanel.jsx';
import { useRobot } from './hooks/useRobot.js';
import { useToasts } from './hooks/useToasts.js';

// ROS mode is opt-in:  ?ros  (ws://localhost:9090)  or  ?ros=ws://host:9090
function resolveRosUrl() {
  const q = new URLSearchParams(window.location.search);
  if (q.has('ros')) return q.get('ros') || 'ws://localhost:9090';
  return import.meta.env.VITE_ROSBRIDGE_URL || null;
}
const ROS_URL = resolveRosUrl();

const LINK_TOAST = {
  connected: ['Connected to ROS', 'ok'],
  closed: ['ROS connection lost', 'bad'],
  error: ['Cannot reach rosbridge', 'bad'],
};

export default function App() {
  const [mode, setMode] = useState('AUTO');
  const [paused, setPaused] = useState(false);
  const [estop, setEstop] = useState(false);
  const [goal, setGoal] = useState(null);
  const [pickGoal, setPickGoal] = useState(false);
  const [started, setStarted] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [pressed, setPressed] = useState(() => new Set());
  const [mainView, setMainView] = useState('map'); // which view fills the screen
  const [zoom, setZoom] = useState({ map: 1, camera: 1 });
  const [telemetryOpen, setTelemetryOpen] = useState(false);
  const [renderMode, setRenderMode] = useState('grid'); // 'grid' occupancy map or raw 'points'
  const { toasts, push } = useToasts();

  const goalRef = useRef(null);
  goalRef.current = goal;

  const { robot, battery, link } = useRobot({
    rosUrl: ROS_URL,
    mode, paused, estop, goal, keys: pressed, resetKey,
    onGoalReached: () => {
      if (!goalRef.current) return;
      goalRef.current = null;
      setGoal(null);
      push('Goal reached', 'ok');
    },
    onLinkChange: (s) => LINK_TOAST[s] && push(...LINK_TOAST[s]),
  });

  const press = useCallback((k) => setPressed((s) => (s.has(k) ? s : new Set(s).add(k))), []);
  const release = useCallback((k) => setPressed((s) => {
    if (!s.has(k)) return s;
    const n = new Set(s);
    n.delete(k);
    return n;
  }), []);

  const togglePause = useCallback(() => {
    push(paused ? 'Mission resumed' : 'Mission paused');
    setPaused(!paused);
  }, [paused, push]);
  const toggleEstop = useCallback(() => {
    push(estop ? 'Emergency stop released' : 'Emergency stop engaged', estop ? 'info' : 'bad');
    setEstop(!estop);
  }, [estop, push]);
  const changeMode = useCallback((m) => {
    setMode(m);
    setPickGoal(false);
    push(`${m === 'AUTO' ? 'Autonomous' : 'Manual'} mode`);
  }, [push]);
  const changeRenderMode = useCallback((m) => {
    setRenderMode(m);
    push(m === 'points' ? '3D point cloud · drag to orbit' : '2D map');
  }, [push]);
  const swapViews = useCallback(() => {
    setPickGoal(false);
    setMainView((v) => (v === 'map' ? 'camera' : 'map'));
  }, []);
  const initiate = () => {
    setStarted(true);
    setResetKey((k) => k + 1);
    setGoal(null);
    setPaused(false);
    setEstop(false);
    setMode('AUTO');
    push('Mission 1234 restarted');
  };

  // Keyboard: WASD drive; Space pause, E e-stop, M mode, V swap views, T telemetry
  const actions = useRef({});
  actions.current = { togglePause, toggleEstop, swapViews, mode, changeMode, renderMode, changeRenderMode };
  useEffect(() => {
    const typing = (e) => e.target instanceof HTMLElement && e.target.tagName === 'INPUT' && e.target.type !== 'range';
    const down = (e) => {
      if (typing(e) || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if ('wasd'.includes(key) && key.length === 1) return press(key);
      const a = actions.current;
      if (key === ' ') { e.preventDefault(); a.togglePause(); }
      else if (key === 'e') a.toggleEstop();
      else if (key === 'm') a.changeMode(a.mode === 'AUTO' ? 'MANUAL' : 'AUTO');
      else if (key === 'v') a.swapViews();
      else if (key === 't') setTelemetryOpen((o) => !o);
      else if (key === 'p') a.changeRenderMode(a.renderMode === 'grid' ? 'points' : 'grid');
    };
    const up = (e) => { if (e.key.length === 1) release(e.key.toLowerCase()); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [press, release]);

  const halted = estop || (mode === 'AUTO' && paused);
  const pipView = mainView === 'map' ? 'camera' : 'map';
  const viewClass = (v) => `view view-${v} ${mainView === v ? 'is-main' : 'is-pip'}`;
  const linkDown = link.kind === 'ros' && link.status !== 'connected';

  return (
    <div className="app">
      <Sidebar />
      <main className={`stage ${mainView === 'map' && renderMode === 'points' ? 'dark-map' : ''}`}>
        <div className={viewClass('map')}>
          <MapView
            robot={robot}
            goal={goal}
            zoom={zoom.map}
            trailKey={resetKey}
            renderMode={renderMode}
            pickGoal={pickGoal && mainView === 'map'}
            onPickGoal={(g) => {
              setGoal(g);
              setPickGoal(false);
              setMode('AUTO');
              setPaused(false);
              push('Goal set · navigating');
            }}
          />
        </div>
        <div className={viewClass('camera')}>
          <CameraView halted={halted} zoom={zoom.camera} />
        </div>

        <button className="pip-hit" onClick={swapViews} aria-label={`Enter ${pipView} view`}>
          <span className="pip-tip">Click to enter {pipView} view</span>
        </button>

        <div className="hud tl">
          <MissionStatus paused={paused} onTogglePause={togglePause} />
          <QuickGoal active={pickGoal} onClick={() => mainView === 'map' && setPickGoal((p) => !p)} />
        </div>
        <div className="hud tc">
          <TopBar
            battery={Math.round(battery)}
            signal={linkDown ? 'Lost' : 'Strong'}
            failsafe={estop ? 'Tripped' : 'Okay'}
            system={estop ? 'Halted' : linkDown ? 'Offline' : battery < 20 ? 'Low battery' : 'Okay'}
            view={mainView === 'map' ? 'Map View' : 'Camera View'}
            renderMode={renderMode}
            onRenderMode={changeRenderMode}
          />
        </div>
        <div className="hud tr">
          <ModeToggle mode={mode} onChange={changeMode} />
          <Initiate onClick={initiate} running={started} />
        </div>

        <div className="hud bl">
          <ZoomSlider value={zoom[mainView]} onChange={(v) => setZoom((z) => ({ ...z, [mainView]: v }))} />
        </div>
        <div className="hud bc">
          <Telemetry
            open={telemetryOpen}
            onToggle={() => setTelemetryOpen((o) => !o)}
            robot={robot}
            battery={battery}
            link={link}
            mode={mode}
            halted={halted}
          />
        </div>
        <div className="hud br">
          <EmergencyStop engaged={estop} onToggle={toggleEstop} />
          <DPad disabled={mode !== 'MANUAL' || estop} pressed={pressed} onPress={press} onRelease={release} />
        </div>

        <Toasts toasts={toasts} />
        {estop && <div className="banner" role="alert">Emergency stop engaged</div>}
      </main>
    </div>
  );
}
