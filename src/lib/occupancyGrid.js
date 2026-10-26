// Turns a lidar point cloud into a 2D occupancy-grid image, the way SLAM maps are drawn:
// free space is traced by casting a ray from the sensor to every return, obstacles are
// the cells that returns land on. Cells nothing ever saw stay "unknown".

const UNKNOWN = 0;
const FREE = 1;
const OBJECT = 2;
const WALL = 3;

const COLORS = {
  [UNKNOWN]: [220, 220, 220],
  [FREE]: [248, 248, 248],
  [OBJECT]: [125, 130, 140],
  [WALL]: [18, 18, 20],
};

/**
 * positions: flat xyz array (metres). sensor: {x, y} where the scan was taken.
 * opts: { cell, obstacleZ, wallZ, scale }
 *   obstacleZ - points above this height are obstacles (floor returns lie below it)
 *   wallZ     - obstacle cells reaching above this are walls, lower ones are objects
 *   scale     - output pixels per grid cell
 */
export function buildOccupancyCanvas(positions, sensor, { clip, cell = 0.06, obstacleZ = -0.95, wallZ = 0.2, scale = 8 } = {}) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  if (clip) {
    [minX, maxX] = clip.x;
    [minY, maxY] = clip.y;
  } else {
    for (let i = 0; i < positions.length; i += 3) {
      minX = Math.min(minX, positions[i]);
      maxX = Math.max(maxX, positions[i]);
      minY = Math.min(minY, positions[i + 1]);
      maxY = Math.max(maxY, positions[i + 1]);
    }
    const pad = 0.2;
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  }
  const cols = Math.ceil((maxX - minX) / cell);
  const rows = Math.ceil((maxY - minY) / cell);
  const grid = new Uint8Array(cols * rows);
  const topZ = new Float32Array(cols * rows).fill(-Infinity);

  const toCol = (x) => Math.min(cols - 1, Math.max(0, Math.floor((x - minX) / cell)));
  const toRow = (y) => Math.min(rows - 1, Math.max(0, Math.floor((y - minY) / cell)));
  const sc = toCol(sensor.x);
  const sr = toRow(sensor.y);

  // 1. Free space: Bresenham ray from the sensor to each return.
  const ray = (c1, r1) => {
    let c = sc, r = sr;
    const dc = Math.abs(c1 - c), dr = Math.abs(r1 - r);
    const stepC = c < c1 ? 1 : -1, stepR = r < r1 ? 1 : -1;
    let err = dc - dr;
    for (;;) {
      if (grid[r * cols + c] === UNKNOWN) grid[r * cols + c] = FREE;
      if (c === c1 && r === r1) break;
      const e2 = 2 * err;
      if (e2 > -dr) { err -= dr; c += stepC; }
      if (e2 < dc) { err += dc; r += stepR; }
    }
  };
  const hits = [];
  for (let i = 0; i < positions.length; i += 3) {
    if (positions[i] < minX || positions[i] > maxX || positions[i + 1] < minY || positions[i + 1] > maxY) continue;
    const c = toCol(positions[i]);
    const r = toRow(positions[i + 1]);
    const z = positions[i + 2];
    ray(c, r);
    if (z > obstacleZ) {
      hits.push(r * cols + c);
      topZ[r * cols + c] = Math.max(topZ[r * cols + c], z);
    }
  }

  // 2. Close small gaps between rays: fill unknown cells that are mostly surrounded by free ones.
  for (let pass = 0; pass < 2; pass++) {
    const next = grid.slice();
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        if (grid[r * cols + c] !== UNKNOWN) continue;
        let free = 0;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (grid[(r + dr) * cols + c + dc] === FREE) free++;
        if (free >= 4) next[r * cols + c] = FREE;
      }
    }
    grid.set(next);
  }

  // 3. Obstacles overwrite free space.
  for (const idx of hits) grid[idx] = topZ[idx] > wallZ ? WALL : OBJECT;

  // Returns are sparse on walls and furniture; thicken them so surfaces read as solid.
  const thick = grid.slice();
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      const v = grid[r * cols + c];
      if (v !== WALL && v !== OBJECT) continue;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const i = (r + dr) * cols + c + dc;
        if (grid[i] === FREE || grid[i] === UNKNOWN) thick[i] = v;
      }
    }
  }
  grid.set(thick);

  // Where the clip cuts through open floor (e.g. a doorway), close the room with a solid wall.
  const seesFree = (c, r, dc, dr) => {
    for (let k = 0; k <= 4; k++) {
      const cc = c + dc * k, rr = r + dr * k;
      if (cc >= 0 && cc < cols && rr >= 0 && rr < rows && grid[rr * cols + cc] === FREE) return true;
    }
    return false;
  };
  const wallOff = [];
  for (let layer = 0; layer < 3; layer++) {
    for (let r = 0; r < rows; r++) {
      if (seesFree(layer, r, 1, 0)) wallOff.push(r * cols + layer);
      if (seesFree(cols - 1 - layer, r, -1, 0)) wallOff.push(r * cols + cols - 1 - layer);
    }
    for (let c = 0; c < cols; c++) {
      if (seesFree(c, layer, 0, 1)) wallOff.push(layer * cols + c);
      if (seesFree(c, rows - 1 - layer, 0, -1)) wallOff.push((rows - 1 - layer) * cols + c);
    }
  }
  for (const i of wallOff) grid[i] = WALL;

  // Furniture is not drawn as filled area; large clusters become small obstacle markers instead.
  const obstacles = [];
  const seen = new Uint8Array(cols * rows);
  for (let start = 0; start < grid.length; start++) {
    if (grid[start] !== OBJECT || seen[start]) continue;
    const stack = [start];
    seen[start] = 1;
    let n = 0, sc2 = 0, sr2 = 0;
    while (stack.length) {
      const i = stack.pop();
      const cc = i % cols, rr = (i - cc) / cols;
      n++; sc2 += cc; sr2 += rr;
      for (const j of [i + 1, i - 1, i + cols, i - cols]) {
        if (j >= 0 && j < grid.length && !seen[j] && grid[j] === OBJECT) { seen[j] = 1; stack.push(j); }
      }
    }
    if (n >= 12) obstacles.push({ n, x: minX + (sc2 / n + 0.5) * cell, y: minY + (sr2 / n + 0.5) * cell });
  }
  obstacles.sort((a, b) => b.n - a.n);
  for (let i = 0; i < grid.length; i++) if (grid[i] === OBJECT) grid[i] = FREE;

  // 4. Rasterise, then upscale with smoothing for the soft look of SLAM map renders.
  const small = document.createElement('canvas');
  small.width = cols;
  small.height = rows;
  const sctx = small.getContext('2d');
  const img = sctx.createImageData(cols, rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const [R, G, B] = COLORS[grid[r * cols + c]];
      const o = ((rows - 1 - r) * cols + c) * 4; // row 0 is minY; image row 0 is the top (maxY)
      img.data[o] = R; img.data[o + 1] = G; img.data[o + 2] = B; img.data[o + 3] = 255;
    }
  }
  sctx.putImageData(img, 0, 0);

  const canvas = document.createElement('canvas');
  canvas.width = cols * scale;
  canvas.height = rows * scale;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.filter = 'blur(1.6px)';
  ctx.drawImage(small, 0, 0, canvas.width, canvas.height);

  return { canvas, obstacles: obstacles.slice(0, 8), bounds: { minX, minY, width: cols * cell, height: rows * cell } };
}
