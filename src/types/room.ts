/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Point2D {
  x: number; // cm
  y: number; // cm (in 2D floor plan, this maps to Z in 3D)
}

export interface Wall {
  id: string;
  name: string;
  startIndex: number;
  endIndex: number;
  p1: Point2D;
  p2: Point2D;
  length: number; // cm
  height: number; // cm
  normal: Point2D; // inward facing normal (points inside the room)
  angle: number; // radians (direction p1 -> p2)
  /** Origin of the "u" axis: the left corner as seen from inside the room */
  uOrigin: Point2D;
  /** Unit vector of the "u" axis (left -> right as seen from inside) */
  uDir: Point2D;
}

export type RoomShapeType = 'rectangular' | 'polygon';

export interface RoomConfig {
  shapeType: RoomShapeType;
  width: number; // cm (for rectangular)
  length: number; // cm (for rectangular)
  height: number; // cm
  vertices: Point2D[]; // in order (cm)
  wallColor: string;
  floorColor: string;
  floorMaterial: 'wood' | 'concrete' | 'tile' | 'light_wood';
}

export interface Door {
  id: string;
  name: string;
  wallId: string;
  u: number; // distance from wall start (cm) to left edge
  width: number; // cm (e.g. 80-90)
  height: number; // cm (e.g. 210)
  elevationY: number; // cm from floor (0 for doors)
  frameColor: string;
}

export interface Window {
  id: string;
  name: string;
  wallId: string;
  u: number; // distance from wall start (cm) to left edge
  width: number; // cm (e.g. 120)
  height: number; // cm (e.g. 140)
  elevationY: number; // cm from floor (sill height, e.g. 90)
  frameColor: string;
}

export interface Furniture {
  id: string;
  name: string;
  width: number; // cm (along local X)
  height: number; // cm (along Y)
  depth: number; // cm (along local Z)
  position: {
    x: number; // cm (3D X)
    y: number; // cm (3D Y, 0 = on floor)
    z: number; // cm (3D Z)
  };
  rotationY: number; // degrees (0, 90, 180, 270, etc.)
  color: string; // hex color for the 3D box
}

export interface FrameSettings {
  enabled: boolean;
  width: number; // cm frame border thickness (e.g. 3cm)
  depth: number; // cm frame 3D protrusion (e.g. 3cm)
  color: string; // hex color (black, white, natural oak, gold, etc.)
  matWidth: number; // cm passepartout width (e.g. 4cm)
  matColor: string; // hex color of passepartout
}

export interface Artwork {
  id: string;
  name: string;
  imageUrl: string;
  wallId: string;
  u: number; // cm, horizontal position on wall (left edge)
  elevationY: number; // cm, height from floor to bottom edge
  width: number; // cm (canvas width)
  height: number; // cm (canvas height)
  frame: FrameSettings;
}

export type ViewMode = '3d' | '2d_plan' | '2d_wall';

export type CameraPreset = 'perspective' | 'top' | 'wall';

export type SelectableType = 'furniture' | 'artwork' | 'door' | 'window' | 'wall' | 'vertex' | null;

export interface ProjectedObstacle {
  id: string;
  type: 'furniture' | 'door' | 'window';
  name: string;
  uMin: number; // cm on wall
  uMax: number; // cm on wall
  vMin: number; // cm from floor
  vMax: number; // cm from floor
  color?: string;
  depthDistance?: number; // distance from wall in 3D
}

export type LayoutStrategyType = 'furniture_centered' | 'symmetrical' | 'grid' | 'organic';

export interface LayoutArtworkPlacement {
  artworkId: string;
  name: string;
  imageUrl: string;
  width: number; // cm
  height: number; // cm
  frame: FrameSettings;
  u: number; // cm left edge
  elevationY: number; // cm bottom edge
}

export interface LayoutProposal {
  id: string;
  title: string;
  strategy: LayoutStrategyType;
  description: string;
  wallId: string;
  placements: LayoutArtworkPlacement[];
  metrics: {
    artworksCount: number;
    totalSpanWidth: number; // cm
    totalSpanHeight: number; // cm
    averageElevation: number; // cm eye-level
    targetFurnitureName?: string;
  };
}

export interface ProjectData {
  id: string;
  name: string;
  updatedAt: string;
  room: RoomConfig;
  doors: Door[];
  windows: Window[];
  furniture: Furniture[];
  artworks: Artwork[];
  activeWallId: string;
}
