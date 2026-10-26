// Minimal rosbridge v2 server that simulates the robot, so the dashboard's ROS
// mode can be demoed without a ROS install:
//   npm run mock:ros      then open http://localhost:5173/?ros=ws://localhost:9090
// Speaks just enough of the protocol: subscribe / advertise / publish.
import { WebSocketServer } from 'ws';
import { createSimulator } from '../src/lib/robot/simulator.js';

const PORT = Number(process.env.PORT ?? 9090);
const wss = new WebSocketServer({ port: PORT });
const sim = createSimulator();

const ctrl = { mode: 'AUTO', paused: false, estop: false, goal: null, cmdVel: { linear: 0, angular: 0 } };
const subs = new Map(); // topic -> Set<ws>

const publish = (topic, msg) => {
  const payload = JSON.stringify({ op: 'publish', topic, msg });
  subs.get(topic)?.forEach((ws) => ws.readyState === 1 && ws.send(payload));
};

const COMMANDS = {
  pause: () => (ctrl.paused = true),
  resume: () => (ctrl.paused = false),
  estop: () => (ctrl.estop = true),
  release: () => (ctrl.estop = false),
  auto: () => (ctrl.mode = 'AUTO'),
  manual: () => { ctrl.mode = 'MANUAL'; ctrl.cmdVel = { linear: 0, angular: 0 }; },
  initiate: () => { sim.reset(); Object.assign(ctrl, { goal: null, paused: false, estop: false, mode: 'AUTO' }); },
};

wss.on('connection', (ws) => {
  console.log('client connected');
  ws.on('close', () => subs.forEach((set) => set.delete(ws)));
  ws.on('message', (raw) => {
    const m = JSON.parse(raw);
    if (m.op === 'subscribe') {
      if (!subs.has(m.topic)) subs.set(m.topic, new Set());
      subs.get(m.topic).add(ws);
    } else if (m.op === 'unsubscribe') {
      subs.get(m.topic)?.delete(ws);
    } else if (m.op === 'publish') {
      if (m.topic === '/cmd_vel') ctrl.cmdVel = { linear: m.msg.linear.x, angular: m.msg.angular.z };
      else if (m.topic === '/goal_pose') ctrl.goal = { x: m.msg.pose.position.x, y: m.msg.pose.position.y };
      else if (m.topic === '/insight/command') COMMANDS[m.msg.data]?.();
    }
  });
});

let last = Date.now();
setInterval(() => {
  const now = Date.now();
  const dt = (now - last) / 1000;
  last = now;
  const s = sim.step(dt, ctrl);
  if (s.goalReached) ctrl.goal = null;
  publish('/odom', {
    header: { frame_id: 'map' },
    pose: { pose: { position: { x: s.x, y: s.y, z: 0 }, orientation: { x: 0, y: 0, z: Math.sin(s.heading / 2), w: Math.cos(s.heading / 2) } } },
    twist: { twist: { linear: { x: s.speed, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } } },
  });
}, 50);
setInterval(() => publish('/battery_state', { percentage: sim.state.battery / 100 }), 1000);

console.log(`mock rosbridge listening on ws://localhost:${PORT}`);
