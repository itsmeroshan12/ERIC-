import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader.js';
import { RobotIcon } from './Icons.jsx';
import { MAP_URL, TILT, ZONES, SENSOR, ROOM_CLIP } from '../lib/mapConfig.js';
import { buildOccupancyCanvas } from '../lib/occupancyGrid.js';

function makeRobot() {
  const g = new THREE.Group(); // invisible anchor; the icon is a DOM marker projected onto it
  g.position.z = 1;
  return g;
}

// Restricted zone: soft pink fill, thin outline, small label; optionally some red lidar returns on its edge.
function makeZone(z, center) {
  const g = new THREE.Group();
  g.position.copy(center);
  const fill = new THREE.Mesh(
    new THREE.PlaneGeometry(z.w, z.h),
    new THREE.MeshBasicMaterial({ color: 0xf4a3ae, transparent: true, opacity: 0.32, depthTest: false, depthWrite: false }),
  );
  fill.renderOrder = 1;
  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(z.w, z.h)),
    new THREE.LineBasicMaterial({ color: 0xe4727f, depthTest: false }),
  );
  edge.renderOrder = 2;

  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 56;
  const ctx = cv.getContext('2d');
  ctx.font = '600 30px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#6b3a42';
  ctx.fillText(z.label, 128, 28);
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.9 * (56 / 256)),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthTest: false, depthWrite: false }),
  );
  label.renderOrder = 3;
  g.add(fill, edge, label);

  if (z.scan) {
    let seed = 11;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const pos = [];
    for (let i = 0; i < 70; i++) {
      const t = rand();
      const onRight = i % 2 === 0;
      pos.push(onRight ? z.w / 2 + (rand() - 0.5) * 0.08 : (t - 0.5) * z.w, onRight ? (t - 0.5) * z.h : -z.h / 2 + (rand() - 0.5) * 0.08, 0.2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const dots = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xd62828, size: 2.5, sizeAttenuation: false, depthTest: false }));
    dots.renderOrder = 3;
    g.add(dots);
  }
  return g;
}

// Small grey marker for a detected obstacle (furniture cluster, cart, person...).
function makeObstacle(position) {
  const g = new THREE.Group();
  g.position.copy(position);
  const ring = new THREE.Mesh(new THREE.CircleGeometry(0.13, 20), new THREE.MeshBasicMaterial({ color: 0x9aa0ac, depthTest: false, depthWrite: false }));
  const core = new THREE.Mesh(new THREE.CircleGeometry(0.075, 20), new THREE.MeshBasicMaterial({ color: 0x555b68, depthTest: false, depthWrite: false }));
  core.position.z = 0.01;
  ring.renderOrder = 2;
  core.renderOrder = 3;
  g.add(ring, core);
  return g;
}

function makeGoal() {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.16, 0.24, 32),
    new THREE.MeshBasicMaterial({ color: 0xe53935 }),
  );
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), new THREE.MeshBasicMaterial({ color: 0xe53935 }));
  g.add(ring, dot);
  g.position.z = 1;
  return g;
}

const TRAIL_MAX = 800;
const FLOOR_3D = -1.3; // floor height of the scan, so the robot and trail sit on the floor in 3D
const BG = { grid: 0xdcdcdc, points: 0x0e1a33 };
const TRAIL_COLOR = { grid: 0x1b6dff, points: 0x6fd3ff };

// Blue (floor) to red (tall) ramp used by the 3D view.
function heightColors(positions) {
  const out = new Float32Array(positions.length);
  const c = new THREE.Color();
  for (let i = 0; i < positions.length; i += 3) {
    const t = Math.min(1, Math.max(0, (positions[i + 2] + 1.4) / 2.5));
    c.setHSL(0.62 - 0.62 * t, 0.85, 0.55);
    out[i] = c.r;
    out[i + 1] = c.g;
    out[i + 2] = c.b;
  }
  return out;
}

/**
 * renderMode: 'grid' = 2D top-down occupancy map (default), 'points' = 3D point cloud.
 */
export default function MapView({ robot, goal, zoom = 1, trailKey = 0, renderMode = 'grid', pickGoal, onPickGoal, onLoaded }) {
  const mountRef = useRef(null);
  const markerRef = useRef(null);
  const three = useRef({});
  const pickRef = useRef({ pickGoal, onPickGoal });
  pickRef.current = { pickGoal, onPickGoal };
  const latest = useRef({ robot, goal, renderMode, zoom });
  latest.current = { robot, goal, renderMode, zoom };

  useEffect(() => {
    const mount = mountRef.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    const el = renderer.domElement;

    const scene = new THREE.Scene();
    const world = new THREE.Group();
    world.rotation.z = TILT;
    scene.add(world);

    // 2D: top-down orthographic camera (pan + zoom).
    const cam2d = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 100);
    cam2d.position.set(0, 0, 50);
    const ctl2d = new OrbitControls(cam2d, el);
    ctl2d.enableRotate = false;
    ctl2d.screenSpacePanning = true;
    ctl2d.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    ctl2d.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };
    ctl2d.minZoom = 0.4;
    ctl2d.maxZoom = 8;

    // 3D: perspective camera orbiting the room (drag to rotate, right-drag to pan, wheel to zoom).
    const cam3d = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
    cam3d.up.set(0, 0, 1);
    cam3d.position.set(0.5, -8.5, 6.5);
    const ctl3d = new OrbitControls(cam3d, el);
    ctl3d.target.set(0, 0, -0.5);
    ctl3d.enableDamping = true;
    ctl3d.maxPolarAngle = Math.PI / 2 - 0.05;
    ctl3d.minDistance = 2;
    ctl3d.maxDistance = 25;
    ctl3d.enabled = false;

    const robotObj = makeRobot();
    const goalObj = makeGoal();
    goalObj.visible = false;
    // Breadcrumb trail of where the robot has been
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_MAX * 3), 3));
    trailGeo.setDrawRange(0, 0);
    const trailMat = new THREE.LineBasicMaterial({ color: TRAIL_COLOR.grid, transparent: true, opacity: 0.85, depthTest: false });
    const trailObj = new THREE.Line(trailGeo, trailMat);
    trailObj.frustumCulled = false;
    trailObj.renderOrder = 2;
    world.add(trailObj, robotObj, goalObj);

    const overlay2d = new THREE.Group(); // zones and obstacle markers: 2D map only
    world.add(overlay2d);

    let extent = { w: 60, h: 44 };
    const fit2d = () => {
      const aspect = mount.clientWidth / mount.clientHeight;
      let h = extent.h;
      let w = h * aspect;
      if (w < extent.w) {
        w = extent.w;
        h = w / aspect;
      }
      cam2d.left = -w / 2;
      cam2d.right = w / 2;
      cam2d.top = h / 2;
      cam2d.bottom = -h / 2;
      cam2d.updateProjectionMatrix();
    };
    const resize = () => {
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      cam3d.aspect = mount.clientWidth / mount.clientHeight;
      cam3d.updateProjectionMatrix();
      fit2d();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    // Switch between the 2D occupancy map and the 3D point cloud.
    const applyMode = (mode) => {
      const t = three.current;
      const is3d = mode === 'points';
      t.active = is3d ? cam3d : cam2d;
      ctl2d.enabled = !is3d;
      ctl3d.enabled = is3d;
      scene.background = new THREE.Color(BG[mode]);
      trailMat.color.set(TRAIL_COLOR[mode]);
      const baseZ = is3d ? FLOOR_3D : 1;
      t.baseZ = baseZ;
      robotObj.position.z = baseZ;
      goalObj.position.z = baseZ;
      trailObj.position.z = is3d ? FLOOR_3D + 0.05 : 0.8;
      if (t.pcd) t.pcd.visible = is3d;
      if (t.gridMesh) t.gridMesh.visible = !is3d;
      overlay2d.visible = !is3d;
      cam2d.zoom = latest.current.zoom;
      cam2d.updateProjectionMatrix();
    };
    three.current = { applyMode, cam2d, cam3d, ctl2d, ctl3d, robotObj, goalObj, trailGeo, trail: { n: 0 }, baseZ: 1, active: cam2d };
    scene.background = new THREE.Color(BG.grid);

    new PCDLoader().load(MAP_URL, (pcd) => {
      const raw = pcd.geometry.attributes.position.array;
      const grid = buildOccupancyCanvas(raw, SENSOR, { clip: ROOM_CLIP });

      // Everything is positioned relative to the centre of the shown map area.
      const gb = grid.bounds;
      const cx = gb.minX + gb.width / 2;
      const cy = gb.minY + gb.height / 2;
      const c = Math.abs(Math.cos(TILT));
      const s = Math.abs(Math.sin(TILT));
      extent = { w: gb.width * c + gb.height * s, h: gb.width * s + gb.height * c };
      const at = (x, y, z = 0) => new THREE.Vector3(x - cx, y - cy, z);

      // 3D cloud: keep only the shown room, coloured by height.
      const keep = [];
      for (let i = 0; i < raw.length; i += 3) {
        const inside = raw[i] >= ROOM_CLIP.x[0] && raw[i] <= ROOM_CLIP.x[1] && raw[i + 1] >= ROOM_CLIP.y[0] && raw[i + 1] <= ROOM_CLIP.y[1];
        if (inside) keep.push(raw[i], raw[i + 1], raw[i + 2]);
      }
      const positions = new Float32Array(keep);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(heightColors(positions), 3));
      const cloud = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.045, vertexColors: true, sizeAttenuation: true }));
      cloud.position.set(-cx, -cy, 0);
      world.add(cloud);

      const tex = new THREE.CanvasTexture(grid.canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      const gridMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(gb.width, gb.height),
        new THREE.MeshBasicMaterial({ map: tex, depthTest: false, depthWrite: false, toneMapped: false }),
      );
      gridMesh.position.copy(at(gb.minX + gb.width / 2, gb.minY + gb.height / 2, -0.5));
      gridMesh.renderOrder = -1;
      world.add(gridMesh);

      ZONES.forEach((z) => overlay2d.add(makeZone(z, at(z.x + z.w / 2, z.y + z.h / 2, 0.5))));
      grid.obstacles.forEach((o) => overlay2d.add(makeObstacle(at(o.x, o.y, 0.4))));

      Object.assign(three.current, { pcd: cloud, gridMesh, offset: { x: cx, y: cy } });
      applyMode(latest.current.renderMode);
      robotObj.position.set(latest.current.robot.x - cx, latest.current.robot.y - cy, three.current.baseZ);
      robotObj.rotation.z = latest.current.robot.heading;
      if (latest.current.goal) goalObj.position.set(latest.current.goal.x - cx, latest.current.goal.y - cy, three.current.baseZ);
      fit2d();
      onLoaded?.({ x: gb.minX, y: gb.minY, w: gb.width, h: gb.height });
    });

    // Convert a click to map coordinates (ray vs. the floor plane), ignoring drags.
    const ray = new THREE.Raycaster();
    let down = null;
    const onDown = (e) => { down = { x: e.clientX, y: e.clientY }; };
    const onUp = (e) => {
      if (!down || !pickRef.current.pickGoal) return;
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
      const r = el.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, three.current.active);
      const floor = new THREE.Plane(new THREE.Vector3(0, 0, 1), -three.current.baseZ);
      const p = new THREE.Vector3();
      if (!ray.ray.intersectPlane(floor, p)) return;
      world.worldToLocal(p);
      const off = three.current.offset || { x: 0, y: 0 };
      pickRef.current.onPickGoal({ x: p.x + off.x, y: p.y + off.y });
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);

    const v = new THREE.Vector3();
    let raf;
    const loop = () => {
      const cam = three.current.active;
      (cam === cam3d ? ctl3d : ctl2d).update();
      const m = markerRef.current;
      if (m) {
        robotObj.getWorldPosition(v).project(cam);
        const x = ((v.x + 1) / 2) * mount.clientWidth;
        const y = ((1 - v.y) / 2) * mount.clientHeight;
        m.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      }
      renderer.render(scene, cam);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      ctl2d.dispose();
      ctl3d.dispose();
      renderer.dispose();
      mount.removeChild(el);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const { robotObj, offset, baseZ } = three.current;
    if (!robotObj) return;
    const o = offset || { x: 0, y: 0 };
    robotObj.position.set(robot.x - o.x, robot.y - o.y, baseZ);
    robotObj.rotation.z = robot.heading;

    const { trailGeo, trail } = three.current;
    if (!offset || !trailGeo) return;
    const arr = trailGeo.attributes.position.array;
    const last = trail.n ? [arr[(trail.n - 1) * 3], arr[(trail.n - 1) * 3 + 1]] : null;
    const px = robot.x - o.x;
    const py = robot.y - o.y;
    if (last && Math.hypot(px - last[0], py - last[1]) < 0.04) return;
    if (trail.n >= TRAIL_MAX) {
      arr.copyWithin(0, 3);
      trail.n -= 1;
    }
    arr.set([px, py, 0], trail.n * 3);
    trail.n += 1;
    trailGeo.setDrawRange(0, trail.n);
    trailGeo.attributes.position.needsUpdate = true;
  }, [robot]);

  useEffect(() => {
    const { trailGeo, trail } = three.current;
    if (!trailGeo) return;
    trail.n = 0;
    trailGeo.setDrawRange(0, 0);
  }, [trailKey]);

  useEffect(() => {
    const { goalObj, offset, baseZ } = three.current;
    if (!goalObj) return;
    goalObj.visible = !!goal;
    if (goal) {
      const o = offset || { x: 0, y: 0 };
      goalObj.position.set(goal.x - o.x, goal.y - o.y, baseZ);
    }
  }, [goal]);

  useEffect(() => {
    three.current.applyMode?.(renderMode);
  }, [renderMode]);

  useEffect(() => {
    const { cam2d, cam3d, ctl2d } = three.current;
    if (!cam2d) return;
    cam2d.zoom = zoom;
    cam2d.updateProjectionMatrix();
    ctl2d.update();
    cam3d.zoom = zoom;
    cam3d.updateProjectionMatrix();
  }, [zoom]);

  return (
    <div ref={mountRef} className={`map ${pickGoal ? 'picking' : ''}`}>
      <div ref={markerRef} className="robot-marker"><RobotIcon /></div>
    </div>
  );
}
