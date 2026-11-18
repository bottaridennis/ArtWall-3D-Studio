/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import {
  RoomConfig,
  Wall,
  Door,
  Window,
  Furniture,
  Artwork,
  ViewMode,
  SelectableType,
  Point2D,
  LayoutProposal,
  ProjectData,
} from '../types/room';
import {
  createRectangleVertices,
  computeWallsFromVertices,
  getArtworkTotalDimensions,
} from '../utils/geometry';
import { LayoutOptions } from '../utils/layoutAlgorithm';
import { CURATED_ARTWORKS, FURNITURE_PRESETS } from '../constants/presets';

interface RoomStoreState {
  room: RoomConfig;
  doors: Door[];
  windows: Window[];
  furniture: Furniture[];
  artworks: Artwork[];

  // Selection
  selectedId: string | null;
  selectedType: SelectableType;
  selectedVertexIndex: number | null;
  activeWallId: string;

  // Viewport Settings
  viewMode: ViewMode;
  showDimensions: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number; // cm
  cameraResetKey: number;

  // Layout Generation
  layoutModalOpen: boolean;
  addArtworkModalOpen: boolean;
  projectModalOpen: boolean;
  layoutOptions: LayoutOptions;

  // Computed helper
  getWalls: () => Wall[];

  // Actions: Room
  setRoomDimensions: (width: number, length: number, height: number) => void;
  setRoomHeight: (height: number) => void;
  setRoomShapeType: (shapeType: 'rectangular' | 'polygon') => void;
  setVertices: (vertices: Point2D[]) => void;
  updateVertex: (index: number, point: Point2D) => void;
  addVertex: (point: Point2D, afterIndex: number) => void;
  removeVertex: (index: number) => void;
  setWallColor: (color: string) => void;
  setFloorColor: (color: string, material?: RoomConfig['floorMaterial']) => void;

  // Actions: Selection & Navigation
  select: (id: string | null, type: SelectableType, vertexIndex?: number | null) => void;
  clearSelection: () => void;
  setActiveWall: (wallId: string) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleDimensions: () => void;
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;
  resetCamera: () => void;
  setLayoutModalOpen: (open: boolean) => void;
  setAddArtworkModalOpen: (open: boolean) => void;
  setProjectModalOpen: (open: boolean) => void;
  setLayoutOptions: (options: Partial<LayoutOptions>) => void;

  // Actions: Furniture
  addFurniture: (item: Omit<Furniture, 'id'>) => Furniture;
  updateFurniture: (id: string, partial: Partial<Furniture>) => void;
  removeFurniture: (id: string) => void;
  duplicateFurniture: (id: string) => Furniture | null;

  // Actions: Artworks
  addArtwork: (item: Omit<Artwork, 'id'>) => Artwork;
  updateArtwork: (id: string, partial: Partial<Artwork>) => void;
  removeArtwork: (id: string) => void;
  duplicateArtwork: (id: string) => Artwork | null;
  moveArtwork: (id: string, u: number, elevationY: number, wallId?: string) => void;

  // Actions: Openings
  addDoor: (door: Omit<Door, 'id'>) => Door;
  updateDoor: (id: string, partial: Partial<Door>) => void;
  removeDoor: (id: string) => void;
  addWindow: (win: Omit<Window, 'id'>) => Window;
  updateWindow: (id: string, partial: Partial<Window>) => void;
  removeWindow: (id: string) => void;

  // Actions: Layout & Proposals
  applyProposal: (proposal: LayoutProposal) => void;

  // Actions: Project Management
  loadProject: (project: ProjectData) => void;
  resetToTemplate: (templateId: string) => void;
  exportProjectJSON: () => string;
}

// Initial default room setup (5m x 4m, 2.8m high)
const DEFAULT_WIDTH = 500;
const DEFAULT_LENGTH = 400;
const DEFAULT_HEIGHT = 280;

const initialVertices = createRectangleVertices(DEFAULT_WIDTH, DEFAULT_LENGTH);

const initialRoom: RoomConfig = {
  shapeType: 'rectangular',
  width: DEFAULT_WIDTH,
  length: DEFAULT_LENGTH,
  height: DEFAULT_HEIGHT,
  vertices: initialVertices,
  wallColor: '#f5f5f0',
  floorColor: '#bfa07d',
  floorMaterial: 'wood',
};

// Initial default furniture
const initialFurniture: Furniture[] = [
  {
    id: 'furn-sofa-1',
    name: 'Divano 3 Posti',
    width: 230,
    height: 85,
    depth: 95,
    position: { x: 250, y: 0, z: 50 },
    rotationY: 0,
    color: '#607274',
  },
  {
    id: 'furn-sideboard-1',
    name: 'Madia Rovere',
    width: 180,
    height: 75,
    depth: 45,
    position: { x: 475, y: 0, z: 200 },
    rotationY: 90,
    color: '#b08968',
  },
];

// Initial default door and window
const initialDoors: Door[] = [
  {
    id: 'door-1',
    name: 'Porta d’Ingresso',
    wallId: 'wall-2', // North / Back wall
    u: 80,
    width: 90,
    height: 215,
    elevationY: 0,
    frameColor: '#3f3f46',
  },
];

const initialWindows: Window[] = [
  {
    id: 'win-1',
    name: 'Finestra Panoramica',
    wallId: 'wall-3', // West / Left wall
    u: 140,
    width: 130,
    height: 140,
    elevationY: 90,
    frameColor: '#3f3f46',
  },
];

// Initial default artworks hung over the sofa on wall-0
const initialArtworks: Artwork[] = [
  {
    id: 'art-1',
    name: CURATED_ARTWORKS[0].title,
    imageUrl: CURATED_ARTWORKS[0].url,
    wallId: 'wall-0',
    u: 175,
    elevationY: 120,
    width: 90,
    height: 65,
    frame: {
      enabled: true,
      width: 3,
      depth: 3,
      color: '#18181b',
      matWidth: 4,
      matColor: '#ffffff',
    },
  },
  {
    id: 'art-2',
    name: CURATED_ARTWORKS[2].title,
    imageUrl: CURATED_ARTWORKS[2].url,
    wallId: 'wall-0',
    u: 285,
    elevationY: 120,
    width: 70,
    height: 90,
    frame: {
      enabled: true,
      width: 2.5,
      depth: 3,
      color: '#18181b',
      matWidth: 3,
      matColor: '#ffffff',
    },
  },
];

export const useRoomStore = create<RoomStoreState>((set, get) => ({
  room: initialRoom,
  doors: initialDoors,
  windows: initialWindows,
  furniture: initialFurniture,
  artworks: initialArtworks,

  selectedId: null,
  selectedType: null,
  selectedVertexIndex: null,
  activeWallId: 'wall-0',

  viewMode: '3d',
  showDimensions: true,
  showGrid: true,
  snapToGrid: true,
  gridSize: 10,
  cameraResetKey: 0,

  layoutModalOpen: false,
  addArtworkModalOpen: false,
  projectModalOpen: false,
  layoutOptions: {
    safetyMarginObstacles: 15,
    safetyMarginCeiling: 25,
    safetyMarginFloor: 40,
    interArtSpacing: 8,
    targetEyeLevel: 150,
  },

  getWalls: () => {
    const { room } = get();
    return computeWallsFromVertices(room.vertices, room.height);
  },

  setRoomDimensions: (width, length, height) => {
    const newVertices = createRectangleVertices(width, length);
    set((state) => ({
      room: {
        ...state.room,
        width,
        length,
        height,
        shapeType: 'rectangular',
        vertices: newVertices,
      },
    }));
  },

  setRoomHeight: (height) => {
    set((state) => ({
      room: {
        ...state.room,
        height,
      },
    }));
  },

  setRoomShapeType: (shapeType) => {
    set((state) => ({
      room: {
        ...state.room,
        shapeType,
      },
    }));
  },

  setVertices: (vertices) => {
    set((state) => ({
      room: {
        ...state.room,
        vertices,
        shapeType: 'polygon',
      },
    }));
  },

  updateVertex: (index, point) => {
    set((state) => {
      const newVertices = [...state.room.vertices];
      newVertices[index] = point;
      return {
        room: {
          ...state.room,
          vertices: newVertices,
          shapeType: 'polygon',
        },
      };
    });
  },

  addVertex: (point, afterIndex) => {
    set((state) => {
      const newVertices = [...state.room.vertices];
      newVertices.splice(afterIndex + 1, 0, point);
      return {
        room: {
          ...state.room,
          vertices: newVertices,
          shapeType: 'polygon',
        },
        selectedVertexIndex: afterIndex + 1,
      };
    });
  },

  removeVertex: (index) => {
    set((state) => {
      if (state.room.vertices.length <= 3) return state; // maintain valid polygon
      const newVertices = state.room.vertices.filter((_, i) => i !== index);
      return {
        room: {
          ...state.room,
          vertices: newVertices,
          shapeType: 'polygon',
        },
        selectedVertexIndex: null,
      };
    });
  },

  setWallColor: (color) => {
    set((state) => ({
      room: { ...state.room, wallColor: color },
    }));
  },

  setFloorColor: (color, material) => {
    set((state) => ({
      room: {
        ...state.room,
        floorColor: color,
        floorMaterial: material || state.room.floorMaterial,
      },
    }));
  },

  select: (id, type, vertexIndex = null) => {
    set({
      selectedId: id,
      selectedType: type,
      selectedVertexIndex: vertexIndex,
    });
  },

  clearSelection: () => {
    set({
      selectedId: null,
      selectedType: null,
      selectedVertexIndex: null,
    });
  },

  setActiveWall: (wallId) => {
    set({ activeWallId: wallId });
  },

  setViewMode: (mode) => {
    set({ viewMode: mode });
  },

  toggleDimensions: () => {
    set((state) => ({ showDimensions: !state.showDimensions }));
  },

  toggleGrid: () => {
    set((state) => ({ showGrid: !state.showGrid }));
  },

  toggleSnapToGrid: () => {
    set((state) => ({ snapToGrid: !state.snapToGrid }));
  },

  resetCamera: () => {
    set((state) => ({ cameraResetKey: state.cameraResetKey + 1 }));
  },

  setLayoutModalOpen: (open) => {
    set({ layoutModalOpen: open });
  },

  setAddArtworkModalOpen: (open) => {
    set({ addArtworkModalOpen: open });
  },

  setProjectModalOpen: (open) => {
    set({ projectModalOpen: open });
  },

  setLayoutOptions: (options) => {
    set((state) => ({
      layoutOptions: { ...state.layoutOptions, ...options },
    }));
  },

  addFurniture: (item) => {
    const newItem: Furniture = {
      ...item,
      id: `furn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
    set((state) => ({
      furniture: [...state.furniture, newItem],
      selectedId: newItem.id,
      selectedType: 'furniture',
    }));
    return newItem;
  },

  updateFurniture: (id, partial) => {
    set((state) => ({
      furniture: state.furniture.map((f) => (f.id === id ? { ...f, ...partial } : f)),
    }));
  },

  removeFurniture: (id) => {
    set((state) => ({
      furniture: state.furniture.filter((f) => f.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      selectedType: state.selectedId === id ? null : state.selectedType,
    }));
  },

  duplicateFurniture: (id) => {
    const item = get().furniture.find((f) => f.id === id);
    if (!item) return null;
    const duplicated: Furniture = {
      ...item,
      id: `furn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: `${item.name} (Copia)`,
      position: {
        x: item.position.x + 20,
        y: item.position.y,
        z: item.position.z + 20,
      },
    };
    set((state) => ({
      furniture: [...state.furniture, duplicated],
      selectedId: duplicated.id,
      selectedType: 'furniture',
    }));
    return duplicated;
  },

  addArtwork: (item) => {
    const newItem: Artwork = {
      ...item,
      id: `art-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
    set((state) => ({
      artworks: [...state.artworks, newItem],
      selectedId: newItem.id,
      selectedType: 'artwork',
    }));
    return newItem;
  },

  updateArtwork: (id, partial) => {
    set((state) => ({
      artworks: state.artworks.map((a) => (a.id === id ? { ...a, ...partial } : a)),
    }));
  },

  removeArtwork: (id) => {
    set((state) => ({
      artworks: state.artworks.filter((a) => a.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      selectedType: state.selectedId === id ? null : state.selectedType,
    }));
  },

  duplicateArtwork: (id) => {
    const item = get().artworks.find((a) => a.id === id);
    if (!item) return null;
    const { totalWidth } = getArtworkTotalDimensions(item);
    const duplicated: Artwork = {
      ...item,
      id: `art-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: `${item.name} (Copia)`,
      u: item.u + totalWidth + 15,
    };
    set((state) => ({
      artworks: [...state.artworks, duplicated],
      selectedId: duplicated.id,
      selectedType: 'artwork',
    }));
    return duplicated;
  },

  moveArtwork: (id, u, elevationY, wallId) => {
    set((state) => ({
      artworks: state.artworks.map((a) => {
        if (a.id !== id) return a;
        return {
          ...a,
          u: Math.max(0, u),
          elevationY: Math.max(0, elevationY),
          wallId: wallId || a.wallId,
        };
      }),
    }));
  },

  addDoor: (door) => {
    const newItem: Door = {
      ...door,
      id: `door-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
    set((state) => ({
      doors: [...state.doors, newItem],
      selectedId: newItem.id,
      selectedType: 'door',
    }));
    return newItem;
  },

  updateDoor: (id, partial) => {
    set((state) => ({
      doors: state.doors.map((d) => (d.id === id ? { ...d, ...partial } : d)),
    }));
  },

  removeDoor: (id) => {
    set((state) => ({
      doors: state.doors.filter((d) => d.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      selectedType: state.selectedId === id ? null : state.selectedType,
    }));
  },

  addWindow: (win) => {
    const newItem: Window = {
      ...win,
      id: `win-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
    set((state) => ({
      windows: [...state.windows, newItem],
      selectedId: newItem.id,
      selectedType: 'window',
    }));
    return newItem;
  },

  updateWindow: (id, partial) => {
    set((state) => ({
      windows: state.windows.map((w) => (w.id === id ? { ...w, ...partial } : w)),
    }));
  },

  removeWindow: (id) => {
    set((state) => ({
      windows: state.windows.filter((w) => w.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      selectedType: state.selectedId === id ? null : state.selectedType,
    }));
  },

  applyProposal: (proposal) => {
    set((state) => {
      // Remove previous artworks on this wall
      const remainingArtworks = state.artworks.filter((a) => a.wallId !== proposal.wallId);

      // Add new placed artworks from proposal
      const newArtworks: Artwork[] = proposal.placements.map((p, idx) => ({
        id: p.artworkId.startsWith('art-') ? p.artworkId : `art-${Date.now()}-${idx}`,
        name: p.name,
        imageUrl: p.imageUrl,
        wallId: proposal.wallId,
        u: p.u,
        elevationY: p.elevationY,
        width: p.width,
        height: p.height,
        frame: p.frame,
      }));

      return {
        artworks: [...remainingArtworks, ...newArtworks],
        layoutModalOpen: false,
        activeWallId: proposal.wallId,
        selectedId: newArtworks[0]?.id || null,
        selectedType: newArtworks[0] ? 'artwork' : null,
      };
    });
  },

  loadProject: (project) => {
    set({
      room: project.room,
      doors: project.doors,
      windows: project.windows,
      furniture: project.furniture,
      artworks: project.artworks,
      activeWallId: project.activeWallId || 'wall-0',
      selectedId: null,
      selectedType: null,
      projectModalOpen: false,
    });
  },

  resetToTemplate: (templateId) => {
    if (templateId === 'living-sofa') {
      const width = 500;
      const length = 400;
      const height = 280;
      set({
        room: {
          shapeType: 'rectangular',
          width,
          length,
          height,
          vertices: createRectangleVertices(width, length),
          wallColor: '#f5f5f0',
          floorColor: '#bfa07d',
          floorMaterial: 'wood',
        },
        furniture: [
          {
            id: 'furn-sofa-1',
            name: 'Divano 3 Posti',
            width: 230,
            height: 85,
            depth: 95,
            position: { x: 250, y: 0, z: 50 },
            rotationY: 0,
            color: '#607274',
          },
          {
            id: 'furn-sideboard-1',
            name: 'Madia Rovere',
            width: 180,
            height: 75,
            depth: 45,
            position: { x: 475, y: 0, z: 200 },
            rotationY: 90,
            color: '#b08968',
          },
        ],
        doors: [
          {
            id: 'door-1',
            name: 'Porta d’Ingresso',
            wallId: 'wall-2',
            u: 80,
            width: 90,
            height: 215,
            elevationY: 0,
            frameColor: '#3f3f46',
          },
        ],
        windows: [
          {
            id: 'win-1',
            name: 'Finestra Panoramica',
            wallId: 'wall-3',
            u: 140,
            width: 130,
            height: 140,
            elevationY: 90,
            frameColor: '#3f3f46',
          },
        ],
        artworks: [
          {
            id: 'art-1',
            name: CURATED_ARTWORKS[0].title,
            imageUrl: CURATED_ARTWORKS[0].url,
            wallId: 'wall-0',
            u: 190,
            elevationY: 125,
            width: 120,
            height: 80,
            frame: {
              enabled: true,
              width: 3,
              depth: 3,
              color: '#18181b',
              matWidth: 4,
              matColor: '#ffffff',
            },
          },
        ],
        activeWallId: 'wall-0',
        selectedId: null,
        selectedType: null,
      });
    } else if (templateId === 'l-shaped-gallery') {
      // Irregular L-shaped room
      const lVertices: Point2D[] = [
        { x: 0, y: 0 },
        { x: 600, y: 0 },
        { x: 600, y: 350 },
        { x: 350, y: 350 },
        { x: 350, y: 600 },
        { x: 0, y: 600 },
      ];
      set({
        room: {
          shapeType: 'polygon',
          width: 600,
          length: 600,
          height: 300,
          vertices: lVertices,
          wallColor: '#f8fafc',
          floorColor: '#b8b5ad',
          floorMaterial: 'concrete',
        },
        furniture: [
          {
            id: 'furn-bench',
            name: 'Panca da Galleria',
            width: 180,
            height: 45,
            depth: 55,
            position: { x: 300, y: 0, z: 175 },
            rotationY: 0,
            color: '#393e46',
          },
        ],
        doors: [
          {
            id: 'door-l1',
            name: 'Ingresso Principale',
            wallId: 'wall-4',
            u: 80,
            width: 100,
            height: 220,
            elevationY: 0,
            frameColor: '#18181b',
          },
        ],
        windows: [
          {
            id: 'win-l1',
            name: 'Vetrata a Nastro',
            wallId: 'wall-1',
            u: 80,
            width: 200,
            height: 120,
            elevationY: 110,
            frameColor: '#18181b',
          },
        ],
        artworks: [
          {
            id: 'art-g1',
            name: CURATED_ARTWORKS[1].title,
            imageUrl: CURATED_ARTWORKS[1].url,
            wallId: 'wall-0',
            u: 150,
            elevationY: 130,
            width: 90,
            height: 90,
            frame: {
              enabled: true,
              width: 3.5,
              depth: 3,
              color: '#18181b',
              matWidth: 5,
              matColor: '#ffffff',
            },
          },
          {
            id: 'art-g2',
            name: CURATED_ARTWORKS[2].title,
            imageUrl: CURATED_ARTWORKS[2].url,
            wallId: 'wall-0',
            u: 300,
            elevationY: 130,
            width: 80,
            height: 100,
            frame: {
              enabled: true,
              width: 3.5,
              depth: 3,
              color: '#18181b',
              matWidth: 5,
              matColor: '#ffffff',
            },
          },
        ],
        activeWallId: 'wall-0',
        selectedId: null,
        selectedType: null,
      });
    }
  },

  exportProjectJSON: () => {
    const { room, doors, windows, furniture, artworks, activeWallId } = get();
    const data: ProjectData = {
      id: `artwall-${Date.now()}`,
      name: `Progetto Stanza ${new Date().toLocaleDateString('it-IT')}`,
      updatedAt: new Date().toISOString(),
      room,
      doors,
      windows,
      furniture,
      artworks,
      activeWallId,
    };
    return JSON.stringify(data, null, 2);
  },
}));
