// Map-specific settings. Coordinates are metres in the scan's own frame
// (see scripts/prepare-pcd.mjs); change these when you swap in another .pcd.

export const MAP_URL = '/media/map.pcd';
export const SENSOR = { x: 0, y: 0 }; // where the lidar sat when the scan was taken
export const TILT = -0.18; // slight rotation, matching the angled floor plan in the design

// Part of the scan to show as the map (metres). Anything outside is cut off.
export const ROOM_CLIP = { x: [-3.0, 3.2], y: [-1.9, 3.4] };

// Restricted zones: thin pink outlines with a label, like the reference design.
// `scan: true` adds a sprinkle of red lidar returns along the zone's edge.
export const ZONES = [
  { label: 'Staging', x: -2.6, y: 1.9, w: 1.5, h: 1.2 },
  { label: 'Restricted', x: 0.9, y: -1.3, w: 1.9, h: 1.5, scan: true },
  { label: 'Charging', x: -2.6, y: -1.6, w: 1.1, h: 0.8 },
];

export const START = { x: 0, y: 0.2, heading: 0 };
export const WAYPOINTS = [[0, 0.2], [1.3, 0.6], [1.2, 1.9], [-0.3, 2.1], [-1, 0.9]];
export const SPEED = 0.9; // metres per second
export const TURN = 2.2; // radians per second
