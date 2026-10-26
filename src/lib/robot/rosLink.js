// Thin roslibjs adapter. Subscribes to the robot's pose/battery and publishes
// drive commands. Topic names follow common ROS conventions and can be remapped here.
import { Ros, Topic } from 'roslib';

export const TOPICS = {
  odom: { name: '/odom', type: 'nav_msgs/msg/Odometry' },
  battery: { name: '/battery_state', type: 'sensor_msgs/msg/BatteryState' },
  cmdVel: { name: '/cmd_vel', type: 'geometry_msgs/msg/Twist' },
  goal: { name: '/goal_pose', type: 'geometry_msgs/msg/PoseStamped' },
  command: { name: '/insight/command', type: 'std_msgs/msg/String' }, // pause | resume | estop | release | initiate | auto | manual
};

const yawFromQuaternion = (q) => 2 * Math.atan2(q.z, q.w); // planar robot: only z/w are non-zero

/**
 * Connect to a rosbridge websocket.
 * handlers: { onStatus('connecting'|'connected'|'closed'|'error'), onPose({x,y,heading,speed}), onBattery(percent) }
 */
export function connectRos(url, { onStatus, onPose, onBattery }) {
  const ros = new Ros({ url });
  const topic = (t) => new Topic({ ros, name: t.name, messageType: t.type });

  const odom = topic(TOPICS.odom);
  const battery = topic(TOPICS.battery);
  const cmdVel = topic(TOPICS.cmdVel);
  const goal = topic(TOPICS.goal);
  const command = topic(TOPICS.command);

  onStatus('connecting');
  ros.on('connection', () => {
    onStatus('connected');
    odom.subscribe((m) => {
      const p = m.pose.pose;
      onPose({
        x: p.position.x,
        y: p.position.y,
        heading: yawFromQuaternion(p.orientation),
        speed: m.twist?.twist?.linear?.x ?? 0,
      });
    });
    battery.subscribe((m) => onBattery(m.percentage <= 1 ? m.percentage * 100 : m.percentage));
  });
  ros.on('close', () => onStatus('closed'));
  ros.on('error', () => onStatus('error'));

  return {
    sendCmdVel: (linear, angular) =>
      cmdVel.publish({ linear: { x: linear, y: 0, z: 0 }, angular: { x: 0, y: 0, z: angular } }),
    sendGoal: ({ x, y }) =>
      goal.publish({
        header: { frame_id: 'map' },
        pose: { position: { x, y, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } },
      }),
    sendCommand: (data) => command.publish({ data }),
    close: () => {
      odom.unsubscribe();
      battery.unsubscribe();
      ros.close();
    },
  };
}
