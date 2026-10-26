// Kinematic robot simulator. Pure and DOM-free so the browser fallback and the
// mock rosbridge server (scripts/mock-rosbridge.mjs) share exactly the same behaviour.
import { START, WAYPOINTS, SPEED, TURN } from '../mapConfig.js';

const normalize = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function createSimulator() {
  let state;
  const reset = () => {
    state = { x: START.x, y: START.y, heading: START.heading, speed: 0, battery: 100, wp: 1 };
  };
  reset();

  /**
   * Advance by dt seconds.
   * ctrl: { mode: 'AUTO'|'MANUAL', paused, estop, goal: {x,y}|null, keys: Set<'w'|'a'|'s'|'d'>,
   *         cmdVel?: {linear, angular} }  (cmdVel, when given, overrides the keys in MANUAL)
   * Returns { ...state, goalReached }.
   */
  function step(dt, ctrl) {
    let linear = 0;
    let angular = 0;
    let goalReached = false;

    if (!ctrl.estop) {
      if (ctrl.mode === 'MANUAL') {
        if (ctrl.cmdVel) {
          ({ linear, angular } = ctrl.cmdVel);
        } else {
          const k = ctrl.keys ?? new Set();
          angular = ((k.has('a') ? 1 : 0) - (k.has('d') ? 1 : 0)) * TURN;
          linear = ((k.has('w') ? 1 : 0) - (k.has('s') ? 1 : 0)) * SPEED;
        }
      } else if (!ctrl.paused) {
        const t = ctrl.goal ? [ctrl.goal.x, ctrl.goal.y] : WAYPOINTS[state.wp];
        const dx = t[0] - state.x;
        const dy = t[1] - state.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.15) {
          if (ctrl.goal) goalReached = true;
          else state.wp = (state.wp + 1) % WAYPOINTS.length;
        } else {
          const diff = normalize(Math.atan2(dy, dx) - state.heading);
          angular = Math.max(-TURN, Math.min(TURN, diff / dt / 4));
          if (Math.abs(diff) < 0.6) linear = Math.min(SPEED, dist / dt);
        }
      }
    }

    state.heading = normalize(state.heading + angular * dt);
    state.x += Math.cos(state.heading) * linear * dt;
    state.y += Math.sin(state.heading) * linear * dt;
    state.speed = linear;
    state.battery = Math.max(0, state.battery - (Math.abs(linear) > 0.01 ? 0.05 : 0.005) * dt);

    return { ...state, goalReached };
  }

  return { step, reset, get state() { return state; } };
}
