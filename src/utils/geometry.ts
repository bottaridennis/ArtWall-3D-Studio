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
 * Compute walls with direction, length and normals from room vertices
 */
export function computeWallsFromVertices(vertices: Point2D[], height: number): Wall[] {
  if (vertices.length < 2) return [];
  const walls: Wall[] = [];
  const n = vertices.length;

  for (let i = 0; i < n; i++) {
    const p1 = vertices[i];
    const p2 = vertices[(i + 1) % n];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length <= 0.001) continue;

    // Normal pointing outward
    const normal = {
      x: -dy / length,
      y: dx / length,
    };

    const angle = Math.atan2(dy, dx);

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
      angle,
    });
  }

  return walls;
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
  const { p1, p2, length } = wall;

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const wallLen = Math.sqrt(dx * dx + dy * dy);
  if (wallLen < 1) return null;

  const ux = dx / wallLen;
  const uy = dy / wallLen;

  // Normal to wall line
  const nx = -uy;
  const ny = ux;

  let minU = Infinity;
  let maxU = -Infinity;
  let minPerpDist = Infinity;

  for (const c of corners) {
    const rx = c.x - p1.x;
    const ry = c.y - p1.y;

    const uProj = rx * ux + ry * uy;
    const perpDist = Math.abs(rx * nx + ry * ny);

    if (uProj < minU) minU = uProj;
    if (uProj > maxU) maxU = uProj;
    if (perpDist < minPerpDist) minPerpDist = perpDist;
  }

  // Check if furniture is close enough to this wall
  if (minPerpDist > maxWallDistanceCm) return null;

  // Check if projections overlap with the wall's segment [0, length]
  const clampedMinU = Math.max(0, minU);
  const clampedMaxU = Math.min(length, maxU);

  if (clampedMaxU - clampedMinU < 5) return null;

  return {
    id: furniture.id,
    type: 'furniture',
    name: furniture.name,
    uMin: clampedMinU,
    uMax: clampedMaxU,
    vMin: 0,
    vMax: furniture.height,
    color: furniture.color,
    depthDistance: minPerpDist,
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
 * Convert (u, v) wall coordinate to 3D world space (Three.js coordinates: X, Y, Z)
 */
export function wallCoordsTo3D(
  wall: Wall,
  u: number,
  v: number,
  surfaceOffsetCm = 7.6 // half wall thickness (7.5cm) + 1mm clearance
): { x: number; y: number; z: number; rotationY: number } {
  const { p1, p2, length } = wall;

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  // Inward normal (pointing inside the room)
  // Wall vector: (ux, uz)
  const ux = dx / len;
  const uz = dy / len;

  // For typical room polygon: inner normal is (-uz, ux) or (uz, -ux)
  // Since Three.js Y is up, X and Z are floor plane:
  const inNx = -uz;
  const inNz = ux;

  const posX = p1.x + ux * u + inNx * surfaceOffsetCm;
  const posZ = p1.y + uz * u + inNz * surfaceOffsetCm;
  const posY = v;

  // Wall angle in 3D around Y axis
  // In Three.js, rotation around Y of an object whose width is along local X
  // is -atan2(dy, dx) to match the wall segment direction (dx, dy).
  const angle = Math.atan2(dy, dx);
  const rotY = -angle;

  return {
    x: cmToM(posX),
    y: cmToM(posY),
    z: cmToM(posZ),
    rotationY: rotY,
  };
}
