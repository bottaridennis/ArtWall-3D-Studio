/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useThree, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useRoomStore } from '../../store/useRoomStore';
import { cmToM, wallCoordsTo3D, getArtworkTotalDimensions, getBounds, wallPointAt } from '../../utils/geometry';
import { createFloorTexture } from '../../utils/textures';
import { downloadFile } from '../../utils/files';
import { Wall, Furniture, Artwork, Door, Window, RoomConfig } from '../../types/room';

THREE.Cache.enabled = true;

const WALL_THICKNESS = 0.15; // m
const SELECT_COLOR = '#e3b866';

/* ------------------------------------------------------------------ */
/* Camera                                                              */
/* ------------------------------------------------------------------ */

function CameraController({ walls, room }: { walls: Wall[]; room: RoomConfig }) {
  const { camera, size } = useThree();
  const controlsRef = useRef<any>(null);
  const resetKey = useRoomStore((s) => s.cameraResetKey);
  const preset = useRoomStore((s) => s.cameraPreset);
  const activeWallId = useRoomStore((s) => s.activeWallId);
  const roomRef = useRef({ walls, room, activeWallId });
  roomRef.current = { walls, room, activeWallId };

  useEffect(() => {
    const { walls, room, activeWallId } = roomRef.current;
    const b = getBounds(room.vertices);
    const cx = cmToM((b.minX + b.maxX) / 2);
    const cz = cmToM((b.minY + b.maxY) / 2);
    const spanX = cmToM(b.maxX - b.minX);
    const spanZ = cmToM(b.maxY - b.minY);
    const h = cmToM(room.height);
    const persp = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const fov = (persp.fov * Math.PI) / 180;

    let pos = new THREE.Vector3();
    let target = new THREE.Vector3(cx, h * 0.38, cz);

    if (preset === 'top') {
      const span = Math.max(spanX / aspect, spanZ);
      const dist = span / (2 * Math.tan(fov / 2)) + h + 1;
      pos.set(cx, dist, cz + 0.001);
      target.set(cx, 0, cz);
    } else if (preset === 'wall') {
      const wall = walls.find((w) => w.id === activeWallId) || walls[0];
      if (wall) {
        const mid = wallPointAt(wall, wall.length / 2);
        const eye = Math.min(1.5, h * 0.55);
        const needed = Math.max(cmToM(wall.length) / aspect, h) * 0.62 / Math.tan(fov / 2);
        const dist = Math.max(1.6, needed);
        target.set(cmToM(mid.x), eye, cmToM(mid.y));
        pos.set(target.x + wall.normal.x * dist, eye, target.z + wall.normal.y * dist);
      }
    } else {
      const dist = (Math.max(spanX, spanZ) * 1.15 + 1.2) / Math.min(1, Math.max(0.45, aspect));
      pos.set(cx + dist * 0.62, h * 1.55 + 0.6, cz + dist * 0.88);
    }

    camera.position.copy(pos);
    camera.lookAt(target);
    if (controlsRef.current) {
      controlsRef.current.target.copy(target);
      controlsRef.current.update();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, preset]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={0.6}
      maxDistance={40}
      maxPolarAngle={Math.PI / 2 - 0.02}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Wall cut-away: hide walls that stand between camera and room        */
/* ------------------------------------------------------------------ */

function useHiddenWalls(walls: Wall[]) {
  const [hidden, setHidden] = useState<string>('');
  const lastRef = useRef('');
  useFrame(({ camera }) => {
    const ids: string[] = [];
    for (const w of walls) {
      const mid = wallPointAt(w, w.length / 2);
      const dx = camera.position.x - cmToM(mid.x);
      const dz = camera.position.z - cmToM(mid.y);
      // Camera is on the outer side of this wall
      if (dx * w.normal.x + dz * w.normal.y < -0.05) ids.push(w.id);
    }
    const key = ids.join(',');
    if (key !== lastRef.current) {
      lastRef.current = key;
      setHidden(key);
    }
  });
  return useMemo(() => new Set(hidden ? hidden.split(',') : []), [hidden]);
}


/* ------------------------------------------------------------------ */
/* Labels: canvas-texture sprites (no extra React roots, always crisp) */
/* ------------------------------------------------------------------ */

function Label3D({
  text,
  accent,
  position,
  height = 0.032,
  visible = true,
}: {
  text: string;
  accent?: string;
  position: [number, number, number];
  height?: number;
  visible?: boolean;
}) {
  const { texture, aspect } = useMemo(() => {
    const scale = 3;
    const fontSize = 22 * scale;
    const padX = 14 * scale;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
    ctx.font = font;
    const accentW = accent ? ctx.measureText('  ' + accent).width : 0;
    const w = Math.ceil(ctx.measureText(text).width + accentW + padX * 2);
    const h = Math.ceil(fontSize * 1.75);
    canvas.width = w;
    canvas.height = h;
    ctx.font = font;
    ctx.fillStyle = 'rgba(11,11,13,0.86)';
    ctx.strokeStyle = 'rgba(227,184,102,0.45)';
    ctx.lineWidth = 2 * scale;
    const r = h / 2;
    ctx.beginPath();
    ctx.roundRect(1, 1, w - 2, h - 2, r);
    ctx.fill();
    ctx.stroke();
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ececf1';
    ctx.fillText(text, padX, h / 2 + scale);
    if (accent) {
      ctx.fillStyle = '#e8c27d';
      ctx.fillText('  ' + accent, padX + ctx.measureText(text).width, h / 2 + scale);
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return { texture: t, aspect: w / h };
  }, [text, accent]);
  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <sprite position={position} scale={[height * aspect, height, 1]} visible={visible} renderOrder={999} raycast={() => null}>
      <spriteMaterial map={texture} depthTest={false} depthWrite={false} transparent sizeAttenuation={false} />
    </sprite>
  );
}

/* ------------------------------------------------------------------ */
/* Floor                                                               */
/* ------------------------------------------------------------------ */

function RoomFloor({ room, onClick }: { room: RoomConfig; onClick: (e: ThreeEvent<MouseEvent>) => void }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const v = room.vertices;
    if (v.length < 3) return s;
    s.moveTo(cmToM(v[0].x), -cmToM(v[0].y));
    for (let i = 1; i < v.length; i++) s.lineTo(cmToM(v[i].x), -cmToM(v[i].y));
    s.closePath();
    return s;
  }, [room.vertices]);

  const texture = useMemo(() => createFloorTexture(room.floorMaterial, room.floorColor), [room.floorMaterial, room.floorColor]);
  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={onClick}>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial map={texture} roughness={room.floorMaterial === 'tile' ? 0.35 : 0.75} metalness={0.02} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Walls (extruded, with real openings for doors & windows)            */
/* ------------------------------------------------------------------ */

function buildWallGeometry(wall: Wall, doors: Door[], windows: Window[]) {
  const len = cmToM(wall.length);
  const h = cmToM(wall.height);
  const ext = WALL_THICKNESS / 2; // close the outer corner gaps

  // Door notches along the bottom edge (merged & clamped)
  const notches = doors
    .map((d) => ({ a: Math.max(0.03, cmToM(d.u)), b: Math.min(len - 0.03, cmToM(d.u + d.width)), top: Math.min(h - 0.03, cmToM(d.height)) }))
    .filter((n) => n.b - n.a > 0.05)
    .sort((x, y) => x.a - y.a);
  const merged: typeof notches = [];
  for (const n of notches) {
    const last = merged[merged.length - 1];
    if (last && n.a <= last.b + 0.02) {
      last.b = Math.max(last.b, n.b);
      last.top = Math.max(last.top, n.top);
    } else merged.push({ ...n });
  }

  const shape = new THREE.Shape();
  shape.moveTo(-ext, 0);
  for (const n of merged) {
    shape.lineTo(n.a, 0);
    shape.lineTo(n.a, n.top);
    shape.lineTo(n.b, n.top);
    shape.lineTo(n.b, 0);
  }
  shape.lineTo(len + ext, 0);
  shape.lineTo(len + ext, h);
  shape.lineTo(-ext, h);
  shape.closePath();

  // Window holes (skip overlapping ones to keep triangulation valid)
  const placed: { a: number; b: number; c: number; d: number }[] = merged.map((n) => ({ a: n.a, b: n.b, c: 0, d: n.top }));
  for (const w of windows) {
    const a = Math.max(0.04, cmToM(w.u));
    const b = Math.min(len - 0.04, cmToM(w.u + w.width));
    const c = Math.max(0.04, cmToM(w.elevationY));
    const d = Math.min(h - 0.04, cmToM(w.elevationY + w.height));
    if (b - a < 0.05 || d - c < 0.05) continue;
    const overlaps = placed.some((p) => !(b + 0.02 < p.a || a - 0.02 > p.b || d + 0.02 < p.c || c - 0.02 > p.d));
    if (overlaps) continue;
    placed.push({ a, b, c, d });
    const hole = new THREE.Path();
    hole.moveTo(a, c);
    hole.lineTo(a, d);
    hole.lineTo(b, d);
    hole.lineTo(b, c);
    hole.closePath();
    shape.holes.push(hole);
  }

  const geo = new THREE.ExtrudeGeometry(shape, { depth: WALL_THICKNESS, bevelEnabled: false });
  geo.translate(0, 0, -WALL_THICKNESS / 2);
  return geo;
}

function WallMesh({
  wall,
  doors,
  windows,
  color,
  isSelected,
  hidden,
  showLabel,
  onSelect,
}: {
  wall: Wall;
  doors: Door[];
  windows: Window[];
  color: string;
  isSelected: boolean;
  hidden: boolean;
  showLabel: boolean;
  onSelect: () => void;
}) {
  const geometry = useMemo(() => buildWallGeometry(wall, doors, windows), [wall, doors, windows]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const rotY = -Math.atan2(wall.uDir.y, wall.uDir.x);

  return (
    <group position={[cmToM(wall.uOrigin.x), 0, cmToM(wall.uOrigin.y)]} rotation={[0, rotY, 0]}>
      <mesh
        geometry={geometry}
        castShadow={!hidden}
        receiveShadow
        raycast={hidden ? () => null : undefined}
        onClick={(e) => {
          if (e.delta > 4) return;
          e.stopPropagation();
          onSelect();
        }}
      >
        <meshStandardMaterial
          key={hidden ? 'ghost' : 'solid'}
          color={color}
          roughness={0.92}
          metalness={0}
          transparent={hidden}
          opacity={hidden ? 0.07 : 1}
          depthWrite={!hidden}
          emissive={isSelected ? SELECT_COLOR : '#000000'}
          emissiveIntensity={isSelected ? 0.18 : 0}
        />
      </mesh>
      {/* Baseboard (inside face) */}
      {!hidden && (
        <mesh position={[cmToM(wall.length) / 2, 0.04, WALL_THICKNESS / 2 + 0.006]} receiveShadow>
          <boxGeometry args={[cmToM(wall.length), 0.08, 0.012]} />
          <meshStandardMaterial color={new THREE.Color(color).multiplyScalar(0.93)} roughness={0.6} />
        </mesh>
      )}
      {showLabel && (
        <Label3D text={wall.name} accent={`${Math.round(wall.length)} cm`} position={[cmToM(wall.length) / 2, cmToM(wall.height) + 0.14, 0]} visible={!hidden} />
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Furniture                                                           */
/* ------------------------------------------------------------------ */

type FurnitureKind = 'sofa' | 'bed' | 'table' | 'shelf' | 'box';
const kindOf = (name: string): FurnitureKind => {
  const n = name.toLowerCase();
  if (n.includes('divano') || n.includes('sofa') || n.includes('poltrona')) return 'sofa';
  if (n.includes('letto')) return 'bed';
  if (n.includes('tavol') || n.includes('console') || n.includes('scrivania')) return 'table';
  if (n.includes('librer') || n.includes('scaffal')) return 'shelf';
  return 'box';
};

function FurnitureModel({ item, color, emissive }: { item: Furniture; color: string; emissive: number }) {
  const w = cmToM(item.width);
  const h = cmToM(item.height);
  const d = cmToM(item.depth);
  const mat = (c = color, rough = 0.7) => (
    <meshStandardMaterial color={c} roughness={rough} metalness={0.05} emissive={SELECT_COLOR} emissiveIntensity={emissive} />
  );
  const dark = useMemo(() => '#' + new THREE.Color(color).multiplyScalar(0.72).getHexString(), [color]);
  const light = useMemo(() => '#' + new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.25).getHexString(), [color]);

  switch (kindOf(item.name)) {
    case 'sofa': {
      const seatH = h * 0.5;
      const arm = Math.min(0.2, w * 0.12);
      const back = Math.min(0.22, d * 0.25);
      return (
        <group>
          <RoundedBox args={[w, seatH * 0.55, d]} radius={0.03} position={[0, seatH * 0.275, 0]} castShadow receiveShadow>
            {mat(dark)}
          </RoundedBox>
          <RoundedBox args={[w - arm * 2, seatH * 0.45, d - back]} radius={0.05} position={[0, seatH * 0.55 + seatH * 0.225, back / 2]} castShadow receiveShadow>
            {mat(light, 0.9)}
          </RoundedBox>
          <RoundedBox args={[w, h - seatH * 0.55, back]} radius={0.05} position={[0, seatH * 0.55 + (h - seatH * 0.55) / 2, -d / 2 + back / 2]} castShadow receiveShadow>
            {mat(color, 0.85)}
          </RoundedBox>
          {[-1, 1].map((s) => (
            <RoundedBox key={s} args={[arm, h * 0.68, d]} radius={0.04} position={[s * (w / 2 - arm / 2), h * 0.34, 0]} castShadow receiveShadow>
              {mat(color, 0.85)}
            </RoundedBox>
          ))}
        </group>
      );
    }
    case 'bed': {
      const base = h * 0.35;
      return (
        <group>
          <RoundedBox args={[w, base, d]} radius={0.03} position={[0, base / 2, 0]} castShadow receiveShadow>
            {mat(dark)}
          </RoundedBox>
          <RoundedBox args={[w - 0.04, base * 0.7, d - 0.08]} radius={0.06} position={[0, base + base * 0.35, 0.02]} castShadow receiveShadow>
            {mat('#eeeae2', 0.95)}
          </RoundedBox>
          <RoundedBox args={[w, h, 0.08]} radius={0.03} position={[0, h / 2, -d / 2 + 0.04]} castShadow receiveShadow>
            {mat(color)}
          </RoundedBox>
          {[-1, 1].map((s) => (
            <RoundedBox key={s} args={[w * 0.38, 0.12, 0.4]} radius={0.05} position={[s * w * 0.23, base * 1.7 + 0.06, -d / 2 + 0.32]} castShadow>
              {mat('#ffffff', 0.95)}
            </RoundedBox>
          ))}
          <RoundedBox args={[w - 0.02, 0.05, d * 0.55]} radius={0.02} position={[0, base * 1.7 + 0.01, d * 0.2]} castShadow>
            {mat(light, 0.95)}
          </RoundedBox>
        </group>
      );
    }
    case 'table': {
      const top = 0.035;
      const leg = 0.045;
      return (
        <group>
          <RoundedBox args={[w, top, d]} radius={0.012} position={[0, h - top / 2, 0]} castShadow receiveShadow>
            {mat(color, 0.5)}
          </RoundedBox>
          {[-1, 1].flatMap((sx) =>
            [-1, 1].map((sz) => (
              <mesh key={`${sx}${sz}`} position={[sx * (w / 2 - leg), (h - top) / 2, sz * (d / 2 - leg)]} castShadow>
                <boxGeometry args={[leg, h - top, leg]} />
                {mat(dark, 0.6)}
              </mesh>
            ))
          )}
        </group>
      );
    }
    case 'shelf': {
      const t = 0.025;
      const shelves = Math.max(2, Math.round(h / 0.38));
      return (
        <group>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * (w / 2 - t / 2), h / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[t, h, d]} />
              {mat()}
            </mesh>
          ))}
          <mesh position={[0, h / 2, -d / 2 + 0.005]} receiveShadow>
            <boxGeometry args={[w, h, 0.01]} />
            {mat(dark)}
          </mesh>
          {Array.from({ length: shelves + 1 }).map((_, i) => (
            <mesh key={i} position={[0, Math.min(h - t / 2, t / 2 + (i * (h - t)) / shelves), 0]} castShadow receiveShadow>
              <boxGeometry args={[w, t, d]} />
              {mat()}
            </mesh>
          ))}
        </group>
      );
    }
    default:
      return (
        <group>
          <RoundedBox args={[w, h, d]} radius={Math.min(0.025, w / 4, h / 4, d / 4)} position={[0, h / 2, 0]} castShadow receiveShadow>
            {mat()}
          </RoundedBox>
          {/* subtle front split line for cabinets */}
          {h > 0.4 && w > 0.5 && (
            <mesh position={[0, h / 2, d / 2 + 0.001]}>
              <planeGeometry args={[0.006, h * 0.85]} />
              <meshBasicMaterial color={dark} />
            </mesh>
          )}
        </group>
      );
  }
}

function FurnitureItem({
  item,
  isSelected,
  snap,
  onSelect,
}: {
  item: Furniture;
  isSelected: boolean;
  snap: boolean;
  onSelect: () => void;
}) {
  const controls = useThree((s) => s.controls) as any;
  const updateFurniture = useRoomStore((s) => s.updateFurniture);
  const drag = useRef<{ offX: number; offZ: number; startX: number; startY: number; moved: boolean; pointerId: number } | null>(null);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    document.body.style.cursor = hovered ? (isSelected ? 'grab' : 'pointer') : '';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hovered, isSelected]);

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onSelect();
    if (!e.ray.intersectPlane(plane, hit)) return;
    drag.current = {
      offX: cmToM(item.position.x) - hit.x,
      offZ: cmToM(item.position.z) - hit.z,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      pointerId: e.pointerId,
    };
    (e.target as any).setPointerCapture?.(e.pointerId);
    if (controls) controls.enabled = false;
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    const dr = drag.current;
    if (!dr) return;
    if (!dr.moved && Math.hypot(e.clientX - dr.startX, e.clientY - dr.startY) < 4) return;
    dr.moved = true;
    document.body.style.cursor = 'grabbing';
    if (!e.ray.intersectPlane(plane, hit)) return;
    let x = (hit.x + dr.offX) * 100;
    let z = (hit.z + dr.offZ) * 100;
    if (snap) {
      x = Math.round(x / 5) * 5;
      z = Math.round(z / 5) * 5;
    }
    updateFurniture(item.id, { position: { ...item.position, x: Math.round(x), z: Math.round(z) } });
  };

  const endDrag = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return;
    (e.target as any).releasePointerCapture?.(drag.current.pointerId);
    drag.current = null;
    if (controls) controls.enabled = true;
    document.body.style.cursor = hovered ? 'grab' : '';
  };

  const emissive = isSelected ? 0.12 : hovered ? 0.05 : 0;

  return (
    <group
      position={[cmToM(item.position.x), cmToM(item.position.y), cmToM(item.position.z)]}
      rotation={[0, (-item.rotationY * Math.PI) / 180, 0]}
      onPointerDown={onPointerDown}
      onClick={(e) => e.stopPropagation()}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <FurnitureModel item={item} color={item.color} emissive={emissive} />
      {isSelected && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
            <planeGeometry args={[cmToM(item.width) + 0.06, cmToM(item.depth) + 0.06]} />
            <meshBasicMaterial color={SELECT_COLOR} transparent opacity={0.18} depthWrite={false} />
          </mesh>
          <Label3D text={item.name} accent={`${item.width}×${item.depth}×${item.height}`} position={[0, cmToM(item.height) + 0.2, 0]} />
        </>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Artworks                                                            */
/* ------------------------------------------------------------------ */

const textureCache = new Map<string, Promise<THREE.Texture>>();
function loadTexture(url: string): Promise<THREE.Texture> {
  let p = textureCache.get(url);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin('anonymous');
      loader.load(
        url,
        (t) => {
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = 8;
          resolve(t);
        },
        undefined,
        reject
      );
    });
    textureCache.set(url, p);
    p.catch(() => textureCache.delete(url));
  }
  return p;
}

function fallbackTexture(name: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 512, 512);
  g.addColorStop(0, '#2b2b33');
  g.addColorStop(1, '#4a4038');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = 'rgba(227,184,102,.85)';
  ctx.font = 'italic 34px serif';
  ctx.textAlign = 'center';
  ctx.fillText(name.slice(0, 26), 256, 266);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function ArtworkMesh({
  artwork,
  wall,
  isSelected,
  showDimensions,
  onSelect,
}: {
  artwork: Artwork;
  wall: Wall;
  isSelected: boolean;
  showDimensions: boolean;
  onSelect: () => void;
}) {
  const { totalWidth, totalHeight } = getArtworkTotalDimensions(artwork);
  const canvasW = cmToM(artwork.width);
  const canvasH = cmToM(artwork.height);
  const enabled = artwork.frame.enabled;
  const frameW = enabled ? cmToM(artwork.frame.width) : 0;
  const matW = enabled ? cmToM(artwork.frame.matWidth) : 0;
  const depth = enabled ? cmToM(artwork.frame.depth) : 0.025;
  const tw = cmToM(totalWidth);
  const th = cmToM(totalHeight);

  const surfaceOffsetCm = WALL_THICKNESS * 50 + 0.2 + (depth * 100) / 2;
  const { x, y, z, rotationY } = useMemo(
    () => wallCoordsTo3D(wall, artwork.u + totalWidth / 2, artwork.elevationY + totalHeight / 2, surfaceOffsetCm),
    [wall, artwork.u, artwork.elevationY, totalWidth, totalHeight, surfaceOffsetCm]
  );

  const [baseTexture, setBaseTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let active = true;
    loadTexture(artwork.imageUrl)
      .then((t) => active && setBaseTexture(t))
      .catch(() => active && setBaseTexture(fallbackTexture(artwork.name)));
    return () => {
      active = false;
    };
  }, [artwork.imageUrl, artwork.name]);

  // "object-fit: cover" for the canvas surface
  const texture = useMemo(() => {
    if (!baseTexture) return null;
    const t = baseTexture.clone();
    const img = baseTexture.image as { width: number; height: number } | undefined;
    if (img && img.width && img.height) {
      const imgAspect = img.width / img.height;
      const aspect = canvasW / canvasH;
      if (imgAspect > aspect) {
        t.repeat.set(aspect / imgAspect, 1);
        t.offset.set((1 - aspect / imgAspect) / 2, 0);
      } else {
        t.repeat.set(1, imgAspect / aspect);
        t.offset.set(0, (1 - imgAspect / aspect) / 2);
      }
    }
    t.needsUpdate = true;
    return t;
  }, [baseTexture, canvasW, canvasH]);
  useEffect(() => () => texture?.dispose(), [texture]);

  const [hovered, setHovered] = useState(false);
  const front = depth / 2;

  return (
    <group
      position={[x, y, z]}
      rotation={[0, rotationY, 0]}
      onClick={(e) => {
        if (e.delta > 4) return;
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = '';
      }}
    >
      {/* Selection glow */}
      {(isSelected || hovered) && (
        <mesh position={[0, 0, -depth / 2 + 0.001]}>
          <planeGeometry args={[tw + 0.05, th + 0.05]} />
          <meshBasicMaterial color={SELECT_COLOR} transparent opacity={isSelected ? 0.85 : 0.35} />
        </mesh>
      )}

      {enabled ? (
        <>
          {/* Four frame bars */}
          {[
            [0, th / 2 - frameW / 2, tw, frameW],
            [0, -th / 2 + frameW / 2, tw, frameW],
            [-tw / 2 + frameW / 2, 0, frameW, th - frameW * 2],
            [tw / 2 - frameW / 2, 0, frameW, th - frameW * 2],
          ].map(([px, py, sw, sh], i) => (
            <mesh key={i} position={[px, py, 0]} castShadow receiveShadow>
              <boxGeometry args={[sw, sh, depth]} />
              <meshStandardMaterial color={artwork.frame.color} roughness={0.45} metalness={artwork.frame.color === '#c59b27' ? 0.6 : 0.1} />
            </mesh>
          ))}
          {/* Mat / backing */}
          <mesh position={[0, 0, front - 0.006]} receiveShadow>
            <planeGeometry args={[tw - frameW * 2 + 0.002, th - frameW * 2 + 0.002]} />
            <meshStandardMaterial color={matW > 0 ? artwork.frame.matColor || '#fafafa' : '#111'} roughness={0.95} />
          </mesh>
          {/* Canvas */}
          <mesh position={[0, 0, front - 0.004]}>
            <planeGeometry args={[canvasW, canvasH]} />
            {texture ? <meshStandardMaterial map={texture} roughness={0.55} /> : <meshStandardMaterial color="#3a3a43" />}
          </mesh>
          {/* Glass reflection */}
          <mesh position={[0, 0, front - 0.001]}>
            <planeGeometry args={[tw - frameW * 2, th - frameW * 2]} />
            <meshPhysicalMaterial transparent opacity={0.06} roughness={0.05} metalness={0} color="#ffffff" />
          </mesh>
        </>
      ) : (
        <mesh castShadow receiveShadow>
          <boxGeometry args={[canvasW, canvasH, depth]} />
          {texture ? (
            [0, 1, 2, 3].map((i) => <meshStandardMaterial key={i} attach={`material-${i}`} color="#e8e4dc" roughness={0.9} />).concat([
              <meshStandardMaterial key={4} attach="material-4" map={texture} roughness={0.6} />,
              <meshStandardMaterial key={5} attach="material-5" color="#cfc8bc" />,
            ])
          ) : (
            <meshStandardMaterial color="#3a3a43" />
          )}
        </mesh>
      )}

      {isSelected && showDimensions && (
        <Label3D text={`${Math.round(artwork.width)}×${Math.round(artwork.height)} cm`} accent={`↥ ${Math.round(artwork.elevationY)} cm`} position={[0, -th / 2 - 0.1, 0.05]} height={0.028} />
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Openings                                                            */
/* ------------------------------------------------------------------ */

function DoorMesh({ door, wall, isSelected, onSelect }: { door: Door; wall: Wall; isSelected: boolean; onSelect: () => void }) {
  const { x, z, rotationY } = useMemo(() => wallCoordsTo3D(wall, door.u + door.width / 2, 0, 0), [wall, door.u, door.width]);
  const w = cmToM(door.width);
  const h = cmToM(Math.min(door.height, wall.height - 3));
  const jamb = 0.06;
  const depth = WALL_THICKNESS + 0.03;
  const em = isSelected ? 0.3 : 0;
  return (
    <group
      position={[x, 0, z]}
      rotation={[0, rotationY, 0]}
      onClick={(e) => {
        if (e.delta > 4) return;
        e.stopPropagation();
        onSelect();
      }}
    >
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w / 2 - jamb / 2), h / 2, 0]} castShadow>
          <boxGeometry args={[jamb, h, depth]} />
          <meshStandardMaterial color={door.frameColor} roughness={0.5} emissive={SELECT_COLOR} emissiveIntensity={em} />
        </mesh>
      ))}
      <mesh position={[0, h - jamb / 2, 0]} castShadow>
        <boxGeometry args={[w, jamb, depth]} />
        <meshStandardMaterial color={door.frameColor} roughness={0.5} emissive={SELECT_COLOR} emissiveIntensity={em} />
      </mesh>
      {/* Leaf */}
      <mesh position={[0, (h - jamb) / 2, 0.02]} castShadow receiveShadow>
        <boxGeometry args={[w - jamb * 2, h - jamb, 0.04]} />
        <meshStandardMaterial color={new THREE.Color(door.frameColor).lerp(new THREE.Color('#ffffff'), 0.12)} roughness={0.55} emissive={SELECT_COLOR} emissiveIntensity={em} />
      </mesh>
      {/* Handle */}
      <mesh position={[w / 2 - jamb - 0.08, 1.02, 0.065]}>
        <boxGeometry args={[0.13, 0.018, 0.018]} />
        <meshStandardMaterial color="#d4d4d8" metalness={0.85} roughness={0.25} />
      </mesh>
    </group>
  );
}

function WindowMesh({ win, wall, isSelected, onSelect }: { win: Window; wall: Wall; isSelected: boolean; onSelect: () => void }) {
  const { x, y, z, rotationY } = useMemo(
    () => wallCoordsTo3D(wall, win.u + win.width / 2, win.elevationY + win.height / 2, 0),
    [wall, win.u, win.width, win.elevationY, win.height]
  );
  const w = cmToM(win.width);
  const h = cmToM(win.height);
  const f = 0.05;
  const depth = WALL_THICKNESS + 0.02;
  const em = isSelected ? 0.3 : 0;
  const frameMat = <meshStandardMaterial color={win.frameColor} roughness={0.45} emissive={SELECT_COLOR} emissiveIntensity={em} />;
  return (
    <group
      position={[x, y, z]}
      rotation={[0, rotationY, 0]}
      onClick={(e) => {
        if (e.delta > 4) return;
        e.stopPropagation();
        onSelect();
      }}
    >
      <mesh position={[0, h / 2 - f / 2, 0]}>
        <boxGeometry args={[w, f, depth]} />
        {frameMat}
      </mesh>
      <mesh position={[0, -h / 2 + f / 2, 0]}>
        <boxGeometry args={[w, f, depth]} />
        {frameMat}
      </mesh>
      {[-1, 0, 1].map((s) => (
        <mesh key={s} position={[s * (w / 2 - f / 2), 0, 0]}>
          <boxGeometry args={[s === 0 ? f * 0.7 : f, h, s === 0 ? 0.05 : depth]} />
          {frameMat}
        </mesh>
      ))}
      {/* Sill */}
      <mesh position={[0, -h / 2 - 0.015, WALL_THICKNESS / 2 + 0.03]} castShadow>
        <boxGeometry args={[w + 0.08, 0.03, 0.08]} />
        <meshStandardMaterial color="#e7e5e4" roughness={0.6} />
      </mesh>
      <mesh>
        <planeGeometry args={[w - f * 2, h - f * 2]} />
        <meshPhysicalMaterial color="#a8d8f0" transparent opacity={0.22} roughness={0.05} metalness={0.1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Screenshot                                                          */
/* ------------------------------------------------------------------ */

function ScreenshotHandler() {
  const { gl, scene, camera } = useThree();
  const key = useRoomStore((s) => s.screenshotKey);
  const notify = useRoomStore((s) => s.notify);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    gl.render(scene, camera);
    const url = gl.domElement.toDataURL('image/png');
    downloadFile(`artwall-${new Date().toISOString().slice(0, 10)}.png`, url);
    notify('Immagine salvata', 'success');
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

function Scene() {
  const room = useRoomStore((s) => s.room);
  const furniture = useRoomStore((s) => s.furniture);
  const artworks = useRoomStore((s) => s.artworks);
  const doors = useRoomStore((s) => s.doors);
  const windows = useRoomStore((s) => s.windows);
  const selectedId = useRoomStore((s) => s.selectedId);
  const showDimensions = useRoomStore((s) => s.showDimensions);
  const showGrid = useRoomStore((s) => s.showGrid);
  const snapToGrid = useRoomStore((s) => s.snapToGrid);
  const { select, clearSelection, setActiveWall, getWalls } = useRoomStore.getState();

  const walls = useMemo(() => getWalls(), [room.vertices, room.height]); // eslint-disable-line react-hooks/exhaustive-deps
  const hiddenWalls = useHiddenWalls(walls);

  const b = getBounds(room.vertices);
  const cx = cmToM((b.minX + b.maxX) / 2);
  const cz = cmToM((b.minY + b.maxY) / 2);
  const span = cmToM(Math.max(b.maxX - b.minX, b.maxY - b.minY));
  const h = cmToM(room.height);

  const openingsByWall = useMemo(() => {
    const m = new Map<string, { doors: Door[]; windows: Window[] }>();
    for (const w of walls) m.set(w.id, { doors: doors.filter((d) => d.wallId === w.id), windows: windows.filter((x) => x.wallId === w.id) });
    return m;
  }, [walls, doors, windows]);

  return (
    <>
      <CameraController walls={walls} room={room} />
      <ScreenshotHandler />

      <color attach="background" args={['#0d0d10']} />
      <fog attach="fog" args={['#0d0d10', span * 2.5 + 8, span * 5 + 20]} />

      <hemisphereLight args={['#fff6e8', '#2a2622', 0.65]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[cx + span * 0.6 + 2, h * 2.4 + 2, cz + span * 0.9 + 2]}
        intensity={1.6}
        color="#fff3df"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={span * 4 + 20}
        shadow-camera-left={-span - 2}
        shadow-camera-right={span + 2}
        shadow-camera-top={span + 2}
        shadow-camera-bottom={-span - 2}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        target-position={[cx, 0, cz]}
      />
      <pointLight position={[cx, h - 0.25, cz]} intensity={6} distance={span * 2 + 4} decay={1.6} color="#ffe9c7" />

      <RoomFloor room={room} onClick={(e) => e.delta <= 4 && clearSelection()} />

      {showGrid && (
        <gridHelper
          args={[Math.ceil(span + 8), Math.ceil(span + 8) * 2, '#2c2c33', '#1c1c21']}
          position={[cx, -0.002, cz]}
        />
      )}

      {walls.map((wall) => {
        const o = openingsByWall.get(wall.id)!;
        return (
          <WallMesh
            key={wall.id}
            wall={wall}
            doors={o.doors}
            windows={o.windows}
            color={room.wallColor}
            isSelected={selectedId === wall.id}
            hidden={hiddenWalls.has(wall.id)}
            showLabel={showDimensions}
            onSelect={() => {
              select(wall.id, 'wall');
              setActiveWall(wall.id);
            }}
          />
        );
      })}

      {doors.map((door) => {
        const wall = walls.find((w) => w.id === door.wallId);
        if (!wall || hiddenWalls.has(wall.id)) return null;
        return (
          <DoorMesh
            key={door.id}
            door={door}
            wall={wall}
            isSelected={selectedId === door.id}
            onSelect={() => {
              select(door.id, 'door');
              setActiveWall(wall.id);
            }}
          />
        );
      })}

      {windows.map((win) => {
        const wall = walls.find((w) => w.id === win.wallId);
        if (!wall || hiddenWalls.has(wall.id)) return null;
        return (
          <WindowMesh
            key={win.id}
            win={win}
            wall={wall}
            isSelected={selectedId === win.id}
            onSelect={() => {
              select(win.id, 'window');
              setActiveWall(wall.id);
            }}
          />
        );
      })}

      {furniture.map((item) => (
        <FurnitureItem
          key={item.id}
          item={item}
          snap={snapToGrid}
          isSelected={selectedId === item.id}
          onSelect={() => select(item.id, 'furniture')}
        />
      ))}

      {artworks.map((art) => {
        const wall = walls.find((w) => w.id === art.wallId);
        if (!wall || hiddenWalls.has(wall.id)) return null;
        return (
          <ArtworkMesh
            key={art.id}
            artwork={art}
            wall={wall}
            isSelected={selectedId === art.id}
            showDimensions={showDimensions}
            onSelect={() => {
              select(art.id, 'artwork');
              setActiveWall(art.wallId);
            }}
          />
        );
      })}
    </>
  );
}

export const Room3DCanvas: React.FC<{ active?: boolean }> = ({ active = true }) => {
  const clearSelection = useRoomStore((s) => s.clearSelection);
  return (
    <div className="w-full h-full relative">
      <Canvas
        shadows="percentage"
        frameloop={active ? 'always' : 'never'}
        dpr={[1, 2]}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        camera={{ fov: 45, near: 0.05, far: 120, position: [6, 4.5, 7] }}
        onPointerMissed={(e) => {
          if (e.type === 'click') clearSelection();
        }}
      >
        <Scene />
      </Canvas>
      <div className="pointer-events-none absolute top-3 left-3 hidden sm:flex items-center gap-2 text-[11px] text-ink-400 glass rounded-full px-3 py-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-brass-400" />
        Trascina per ruotare · rotella per zoom · trascina un mobile per spostarlo
      </div>
    </div>
  );
};
