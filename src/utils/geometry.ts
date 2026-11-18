/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Point2D, Wall, Furniture, Door, Window, ProjectedObstacle, Artwork } from '../types/room';

/**
 * Convert centimeters to Three.js world units (meters: 100 cm = 1.0 m)
 */
export const cmToM = (cm: number): number => cm / 100;
export const mToCm = (m: number): number => m * 100;

/**
 * Generate vertices for a rectangular room of width x length (in cm)
 */
export function createRectangleVertices(width: number, length: number): Point2D[] {
  return [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: length },
    { x: 0, y: length },
  ];
}

/**
 * Calculate polygon area in square meters (cm^2 / 10000)
 */
export function calculatePolygonArea(vertices: Point2D[]): number {
  if (vertices.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return Math.abs(area / 2) / 10000;
}

/**
 * Calculate polygon perimeter in meters (cm / 100)
 */
export function calculatePolygonPerimeter(vertices: Point2D[]): number {
  if (vertices.length < 2) return 0;
  let perimeter = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    const dx = vertices[j].x - vertices[i].x;
    const dy = vertices[j].y - vertices[i].y;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }
  return perimeter / 100;
}

/**
 * Determine if polygon vertices are ordered clockwise
 */
export function isClockwise(vertices: Point2D[]): boolean {
  let sum = 0;
  for (let i = 0; i < vertices.length; i++) {
    const p1 = vertices[i];
    const p2 = vertices[(i + 1) % vertices.length];
    sum += (p2.x - p1.x) * (p2.y + p1.y);
  }
  return sum > 0;
}

/**
 * Signed area (cm²). Positive when vertices are ordered so that the interior
 * lies on the left of each edge in the (x, y) plane used by the floor plan.
 */
export function signedArea(vertices: Point2D[]): number {
  let a = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    a += vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y;
  }
  return a / 2;
}

/**
 * Compute walls with direction, length, inward normals and a "u" axis that always
 * runs left -> right for a viewer standing inside the room and facing the wall.
 * Works for both clockwise and counter-clockwise vertex orders.
 */
export function computeWallsFromVertices(vertices: Point2D[], height: number): Wall[] {
  if (vertices.length < 2) return [];
  const walls: Wall[] = [];
  const n = vertices.length;
  const positive = signedArea(vertices) >= 0;

  for (let i = 0; i < n; i++) {
    const p1 = vertices[i];
    const p2 = vertices[(i + 1) % n];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length <= 0.001) continue;

    const tx = dx / length;
    const ty = dy / length;
    const normal = positive ? { x: -ty, y: tx } : { x: ty, y: -tx };

    walls.push({
      id: `wall-${i}`,
      name: `Parete ${i + 1}`,
      startIndex: i,
      endIndex: (i + 1) % n,
      p1,
      p2,
      length,
      height,
      normal,
      angle: Math.atan2(dy, dx),
      uOrigin: positive ? p1 : p2,
      uDir: positive ? { x: tx, y: ty } : { x: -tx, y: -ty },
    });
  }

  return walls;
}

/** Floor-plan point (cm) of a coordinate u along the wall, offset inward by `inset` cm */
export function wallPointAt(wall: Wall, u: number, inset = 0): Point2D {
  return {
    x: wall.uOrigin.x + wall.uDir.x * u + wall.normal.x * inset,
    y: wall.uOrigin.y + wall.uDir.y * u + wall.normal.y * inset,
  };
}

/** Project a floor-plan point onto a wall: returns u along wall and inward distance */
export function projectPointOnWall(wall: Wall, p: Point2D): { u: number; dist: number } {
  const rx = p.x - wall.uOrigin.x;
  const ry = p.y - wall.uOrigin.y;
  return {
    u: rx * wall.uDir.x + ry * wall.uDir.y,
    dist: rx * wall.normal.x + ry * wall.normal.y,
  };
}

/** Bounding box of a vertex list */
export function getBounds(vertices: Point2D[]) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const v of vertices) {
    minX = Math.min(minX, v.x);
    maxX = Math.max(maxX, v.x);
    minY = Math.min(minY, v.y);
    maxY = Math.max(maxY, v.y);
  }
  if (!isFinite(minX)) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  return { minX, maxX, minY, maxY };
}

/** Point-in-polygon test (ray casting) */
export function isPointInPolygon(p: Point2D, vertices: Point2D[]): boolean {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const a = vertices[i];
    const b = vertices[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Calculate bounding box of rotated furniture on 2D floor plane (x, z in cm)
 */
export function getFurnitureFloorCorners(furniture: Furniture): Point2D[] {
  const { width, depth, position, rotationY } = furniture;
  const rad = (rotationY * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const hw = width / 2;
  const hd = depth / 2;

  // Local 4 corners relative to furniture center
  const localCorners = [
    { x: -hw, z: -hd },
    { x: hw, z: -hd },
    { x: hw, z: hd },
    { x: -hw, z: hd },
  ];

  return localCorners.map((c) => ({
    x: position.x + (c.x * cos - c.z * sin),
    y: position.z + (c.x * sin + c.z * cos), // y maps to floor z
  }));
}

/**
 * Project a 3D furniture item onto a 2D wall elevation plane
 */
export function projectFurnitureOntoWall(
  furniture: Furniture,
  wall: Wall,
  maxWallDistanceCm = 70
): ProjectedObstacle | null {
  const corners = getFurnitureFloorCorners(furniture);
  if (wall.length < 1) return null;

  let minU = Infinity;
  let maxU = -Infinity;
  let minDist = Infinity;

  for (const c of corners) {
    const { u, dist } = projectPointOnWall(wall, c);
    minU = Math.min(minU, u);
    maxU = Math.max(maxU, u);
    minDist = Math.min(minDist, dist);
  }

  // Furniture must stand in front of the wall (inside the room) and close enough
  if (minDist > maxWallDistanceCm || minDist < -20) return null;

  const clampedMinU = Math.max(0, minU);
  const clampedMaxU = Math.min(wall.length, maxU);
  if (clampedMaxU - clampedMinU < 5) return null;

  return {
    id: furniture.id,
    type: 'furniture',
    name: furniture.name,
    uMin: clampedMinU,
    uMax: clampedMaxU,
    vMin: furniture.position.y,
    vMax: furniture.position.y + furniture.height,
    color: furniture.color,
    depthDistance: Math.max(0, minDist),
  };
}

/**
 * Collect all obstacles (furniture, doors, windows) projected onto a wall
 */
export function getWallObstacles(
  wall: Wall,
  furnitureList: Furniture[],
  doors: Door[],
  windows: Window[]
): ProjectedObstacle[] {
  const obstacles: ProjectedObstacle[] = [];

  // Doors on this wall
  for (const d of doors) {
    if (d.wallId === wall.id) {
      obstacles.push({
        id: d.id,
        type: 'door',
        name: d.name,
        uMin: d.u,
        uMax: d.u + d.width,
        vMin: 0,
        vMax: d.height,
        color: d.frameColor,
      });
    }
  }

  // Windows on this wall
  for (const w of windows) {
    if (w.wallId === wall.id) {
      obstacles.push({
        id: w.id,
        type: 'window',
        name: w.name,
        uMin: w.u,
        uMax: w.u + w.width,
        vMin: w.elevationY,
        vMax: w.elevationY + w.height,
        color: w.frameColor,
      });
    }
  }

  // Furniture projected onto wall
  for (const f of furnitureList) {
    const proj = projectFurnitureOntoWall(f, wall);
    if (proj) {
      obstacles.push(proj);
    }
  }

  return obstacles;
}

/**
 * Calculate total outer dimension of artwork including frame and passepartout
 */
export function getArtworkTotalDimensions(art: Artwork | { width: number; height: number; frame: Artwork['frame'] }) {
  const frameBorder = art.frame.enabled ? (art.frame.width + art.frame.matWidth) * 2 : 0;
  return {
    totalWidth: art.width + frameBorder,
    totalHeight: art.height + frameBorder,
    frameBorder,
  };
}

/**
 * Check if two 2D boxes intersect with optional padding
 */
export function checkAABBCollision(
  box1: { uMin: number; uMax: number; vMin: number; vMax: number },
  box2: { uMin: number; uMax: number; vMin: number; vMax: number },
  padding = 0
): boolean {
  return !(
    box1.uMax + padding < box2.uMin ||
    box1.uMin - padding > box2.uMax ||
    box1.vMax + padding < box2.vMin ||
    box1.vMin - padding > box2.vMax
  );
}

/**
 * Convert (u, v) wall coordinate to 3D world space (Three.js coordinates in meters).
 * The returned rotation makes an object's local +Z face into the room and its local +X
 * follow the u axis.
 */
export function wallCoordsTo3D(
  wall: Wall,
  u: number,
  v: number,
  surfaceOffsetCm = 7.6 // half wall thickness (7.5cm) + 1mm clearance
): { x: number; y: number; z: number; rotationY: number } {
  const p = wallPointAt(wall, u, surfaceOffsetCm);
  return {
    x: cmToM(p.x),
    y: cmToM(v),
    z: cmToM(p.y),
    rotationY: -Math.atan2(wall.uDir.y, wall.uDir.x),
  };
}

/** Clamp helper */
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
