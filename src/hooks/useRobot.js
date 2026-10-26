import { useEffect, useRef, useState } from 'react';
import { createSimulator } from '../lib/robot/simulator.js';
import { connectRos } from '../lib/robot/rosLink.js';
import { START, SPEED, TURN } from '../lib/mapConfig.js';

const INITIAL = { x: START.x, y: START.y, heading: START.heading, speed: 0 };

/**
 * One interface over two data sources:
 *  - built-in simulator (default), or
 *  - a live ROS robot through rosbridge when `rosUrl` is given.
 * Returns { robot, battery, link: { kind, status } }.
 */
export function useRobot({ rosUrl, mode, paused, estop, goal, keys, resetKey, onGoalReached, onLinkChange }) {
  const [robot, setRobot] = useState(INITIAL);
  const [battery, setBattery] = useState(100);
  const [status, setStatus] = useState(rosUrl ? 'connecting' : 'simulated');

  const ctrl = useRef({});
  ctrl.current = { mode, paused, estop, goal, keys };
  const cbs = useRef({});
  cbs.current = { onGoalReached, onLinkChange };
  const sim = useRef(null);
  const robotSpeed = useRef(0);
  const ros = useRef(null);

  // Mission reset (INITIATE)
  useEffect(() => {
    sim.current?.reset();
    ros.current?.sendCommand('initiate');
    setRobot(INITIAL);
    setBattery(100);
  }, [resetKey]);

  // Simulator loop
  useEffect(() => {
    if (rosUrl) return undefined;
    sim.current = createSimulator();
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const prev = sim.current.state;
      const s = sim.current.step(dt, ctrl.current);
      if (s.x !== prev.x || s.y !== prev.y || s.heading !== prev.heading || s.speed !== robotSpeed.current) {
        robotSpeed.current = s.speed;
        setRobot({ x: s.x, y: s.y, heading: s.heading, speed: s.speed });
      }
      setBattery((b) => (Math.abs(b - s.battery) > 0.05 ? s.battery : b));
      if (s.goalReached) cbs.current.onGoalReached?.();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [rosUrl]);

  // ROS link
  useEffect(() => {
    if (!rosUrl) return undefined;
    const link = connectRos(rosUrl, {
      onStatus: (s) => { setStatus(s); cbs.current.onLinkChange?.(s); },
      onPose: (p) => setRobot(p),
      onBattery: (b) => setBattery(b),
    });
    ros.current = link;
    return () => { link.close(); ros.current = null; };
  }, [rosUrl]);

  // Forward operator intent to the robot (ROS mode only)
  useEffect(() => { ros.current?.sendCommand(mode.toLowerCase()); }, [mode]);
  useEffect(() => { ros.current?.sendCommand(paused ? 'pause' : 'resume'); }, [paused]);
  useEffect(() => { ros.current?.sendCommand(estop ? 'estop' : 'release'); }, [estop]);
  useEffect(() => { if (goal) ros.current?.sendGoal(goal); }, [goal]);
  useEffect(() => {
    if (!rosUrl) return undefined;
    const id = setInterval(() => {
      if (!ros.current || ctrl.current.mode !== 'MANUAL') return;
      const { keys: k, estop: e } = ctrl.current;
      const lin = e ? 0 : ((k.has('w') ? 1 : 0) - (k.has('s') ? 1 : 0)) * SPEED;
      const ang = e ? 0 : ((k.has('a') ? 1 : 0) - (k.has('d') ? 1 : 0)) * TURN;
      ros.current.sendCmdVel(lin, ang);
    }, 100);
    return () => clearInterval(id);
  }, [rosUrl]);

  return { robot, battery, link: { kind: rosUrl ? 'ros' : 'sim', status } };
}
