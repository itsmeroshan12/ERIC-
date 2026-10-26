// Crops a raw lidar scan to the room, colours it by height and writes the map
// the dashboard loads. Source: PCL sample data "room_scan1.pcd" (data/).
//   node scripts/prepare-pcd.mjs [input.pcd] [output.pcd]
import { readFileSync, writeFileSync } from 'node:fs';
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader.js';

const input = process.argv[2] ?? 'data/room_scan1.pcd';
const output = process.argv[3] ?? 'public/media/map.pcd';
const CROP = { x: [-3.0, 3.8], y: [-2.0, 3.6] }; // metres, around the room
const CEILING_Z = 1.1; // drop the ceiling so the top-down view shows floor and walls
const FLOOR_Z = -1.25;

const raw = readFileSync(input);
const pos = new PCDLoader().parse(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength)).geometry.attributes.position.array;

const pts = [];
for (let i = 0; i < pos.length; i += 3) {
  const [x, y, z] = [pos[i], pos[i + 1], pos[i + 2]];
  if (x < CROP.x[0] || x > CROP.x[1] || y < CROP.y[0] || y > CROP.y[1]) continue;
  if (z > CEILING_Z) continue;
  pts.push([x, y, z]);
}
pts.sort((a, b) => a[2] - b[2]); // draw low points first so walls end up on top

const data = Buffer.alloc(pts.length * 16);
const f32 = new Float32Array(1);
const u32 = new Uint32Array(f32.buffer);
pts.forEach(([x, y, z], i) => {
  const t = Math.min(1, Math.max(0, (z - FLOOR_Z) / (CEILING_Z - FLOOR_Z)));
  const v = z <= FLOOR_Z ? 246 : Math.round(200 - t * 185); // floor ~white, taller structure darker
  u32[0] = (v << 16) | (v << 8) | v;
  data.writeFloatLE(x, i * 16);
  data.writeFloatLE(y, i * 16 + 4);
  data.writeFloatLE(z, i * 16 + 8);
  data.writeFloatLE(f32[0], i * 16 + 12);
});

const header = `# .PCD v0.7 - Point Cloud Data file format
VERSION 0.7
FIELDS x y z rgb
SIZE 4 4 4 4
TYPE F F F F
COUNT 1 1 1 1
WIDTH ${pts.length}
HEIGHT 1
VIEWPOINT 0 0 0 1 0 0 0
POINTS ${pts.length}
DATA binary
`;
writeFileSync(output, Buffer.concat([Buffer.from(header), data]));
console.log(`wrote ${output} (${pts.length} of ${pos.length / 3} points)`);
