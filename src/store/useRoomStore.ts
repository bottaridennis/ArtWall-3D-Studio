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
  CameraPreset,
} from '../types/room';
import {
  createRectangleVertices,
  computeWallsFromVertices,
  getArtworkTotalDimensions,
  getBounds,
  projectPointOnWall,
  wallPointAt,
} from '../utils/geometry';
import { LayoutOptions } from '../utils/layoutAlgorithm';
import { ROOM_TEMPLATES, SceneData } from '../constants/templates';

const AUTOSAVE_KEY = 'artwall_autosave_v1';
const HISTORY_LIMIT = 80;

export type ToastTone = 'info' | 'success' | 'error';
export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface RoomStoreState extends SceneData {
  // Selection
  selectedId: string | null;
  selectedType: SelectableType;
  selectedVertexIndex: number | null;

  // Viewport Settings
  viewMode: ViewMode;
  showDimensions: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number; // cm
  cameraResetKey: number;
  cameraPreset: CameraPreset;
  screenshotKey: number;

  // Panels & dialogs
  layoutModalOpen: boolean;
  addArtworkModalOpen: boolean;
  projectModalOpen: boolean;
  helpModalOpen: boolean;
  guideModalOpen: boolean;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  layoutOptions: LayoutOptions;

  // History
  past: SceneData[];
  future: SceneData[];

  // Toasts
  toasts: Toast[];

  // Computed helper
  getWalls: () => Wall[];

  // Actions: Room
  setRoomDimensions: (width: number, length: number, height: number) => void;
  setRoomHeight: (height: number) => void;
  setRoomShapeType: (shapeType: 'rectangular' | 'polygon') => void;
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
  resetCamera: (preset?: CameraPreset) => void;
  requestScreenshot: () => void;
  setLayoutModalOpen: (open: boolean) => void;
  setAddArtworkModalOpen: (open: boolean) => void;
  setProjectModalOpen: (open: boolean) => void;
  setHelpModalOpen: (open: boolean) => void;
  setGuideModalOpen: (open: boolean) => void;
  setLeftPanelOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
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

  // Generic helpers on the current selection
  deleteSelected: () => void;
  duplicateSelected: () => void;
  nudgeSelected: (dx: number, dy: number) => void;

  // Actions: Layout & Proposals
  applyProposal: (proposal: LayoutProposal) => void;

  // Actions: Project Management
  loadProject: (project: Partial<ProjectData>) => boolean;
  resetToTemplate: (templateId: string) => void;
  exportProjectJSON: (name?: string) => string;

  // History
  undo: () => void;
  redo: () => void;

  // Toasts
  notify: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: number) => void;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const sceneOf = (s: SceneData): SceneData => ({
  room: s.room,
  doors: s.doors,
  windows: s.windows,
  furniture: s.furniture,
  artworks: s.artworks,
  activeWallId: s.activeWallId,
});

const sceneChanged = (a: SceneData, b: SceneData) =>
  a.room !== b.room ||
  a.doors !== b.doors ||
  a.windows !== b.windows ||
  a.furniture !== b.furniture ||
  a.artworks !== b.artworks;

/** Validate & normalise an arbitrary object into a SceneData (or null if unusable) */
export function normalizeScene(raw: any): SceneData | null {
  if (!raw || typeof raw !== 'object' || !raw.room) return null;
  const room = raw.room as RoomConfig;
  const vertices: Point2D[] = Array.isArray(room.vertices) && room.vertices.length >= 3
    ? room.vertices.map((v: any) => ({ x: Number(v.x) || 0, y: Number(v.y) || 0 }))
    : createRectangleVertices(Number(room.width) || 500, Number(room.length) || 400);
  const b = getBounds(vertices);
  return {
    room: {
      shapeType: room.shapeType === 'polygon' ? 'polygon' : 'rectangular',
      width: Number(room.width) || b.maxX - b.minX,
      length: Number(room.length) || b.maxY - b.minY,
      height: Number(room.height) || 280,
      vertices,
      wallColor: room.wallColor || '#f5f5f0',
      floorColor: room.floorColor || '#bfa07d',
      floorMaterial: room.floorMaterial || 'wood',
    },
    doors: Array.isArray(raw.doors) ? raw.doors : [],
    windows: Array.isArray(raw.windows) ? raw.windows : [],
    furniture: Array.isArray(raw.furniture) ? raw.furniture : [],
    artworks: Array.isArray(raw.artworks) ? raw.artworks : [],
    activeWallId: raw.activeWallId || 'wall-0',
  };
}

/**
 * When the number/order of walls changes (vertex added/removed, shape reset),
 * wall ids (index based) shift. Re-attach every wall-mounted item to the new
 * wall that is geometrically closest to where it was hanging.
 */
function remapWallItems(
  oldWalls: Wall[],
  newWalls: Wall[],
  scene: Pick<SceneData, 'artworks' | 'doors' | 'windows'>
) {
  const relocate = <T extends { wallId: string; u: number }>(item: T, width: number): T => {
    const oldWall = oldWalls.find((w) => w.id === item.wallId);
    if (!oldWall || newWalls.length === 0) return item;
    const center = wallPointAt(oldWall, item.u + width / 2);
    let best: { wall: Wall; u: number; score: number } | null = null;
    for (const w of newWalls) {
      const { u, dist } = projectPointOnWall(w, center);
      const outside = u < 0 ? -u : u > w.length ? u - w.length : 0;
      const score = Math.abs(dist) + outside * 2;
      if (!best || score < best.score) best = { wall: w, u, score };
    }
    if (!best) return item;
    const newU = Math.max(0, Math.min(best.wall.length - width, best.u - width / 2));
    return { ...item, wallId: best.wall.id, u: Math.round(newU * 10) / 10 };
  };

  return {
    artworks: scene.artworks.map((a) => relocate(a, getArtworkTotalDimensions(a).totalWidth)),
    doors: scene.doors.map((d) => relocate(d, d.width)),
    windows: scene.windows.map((w) => relocate(w, w.width)),
  };
}

function loadAutosave(): SceneData | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return normalizeScene(JSON.parse(raw));
  } catch {
    return null;
  }
}

const initialScene: SceneData = loadAutosave() || ROOM_TEMPLATES[0].build();

let toastCounter = 0;

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

export const useRoomStore = create<RoomStoreState>((set, get) => ({
  ...initialScene,

  selectedId: null,
  selectedType: null,
  selectedVertexIndex: null,

  viewMode: '3d',
  showDimensions: true,
  showGrid: true,
  snapToGrid: true,
  gridSize: 5,
  cameraResetKey: 0,
  cameraPreset: 'perspective',
  screenshotKey: 0,

  layoutModalOpen: false,
  addArtworkModalOpen: false,
  projectModalOpen: false,
  helpModalOpen: false,
  guideModalOpen: false,
  leftPanelOpen: false,
  rightPanelOpen: false,
  layoutOptions: {
    safetyMarginObstacles: 15,
    safetyMarginCeiling: 25,
    safetyMarginFloor: 40,
    interArtSpacing: 8,
    targetEyeLevel: 150,
  },

  past: [],
  future: [],
  toasts: [],

  getWalls: () => {
    const { room } = get();
    return computeWallsFromVertices(room.vertices, room.height);
  },

  /* ----------------------------- Room ----------------------------- */

  setRoomDimensions: (width, length, height) => {
    set((state) => ({
      room: {
        ...state.room,
        width,
        length,
        height,
        shapeType: 'rectangular',
        vertices: createRectangleVertices(width, length),
      },
    }));
  },

  setRoomHeight: (height) => {
    set((state) => ({ room: { ...state.room, height } }));
  },

  setRoomShapeType: (shapeType) => {
    const state = get();
    if (shapeType === state.room.shapeType) return;
    if (shapeType === 'polygon') {
      set({ room: { ...state.room, shapeType } });
      return;
    }
    // Back to rectangle: use the bounding box of the current polygon
    const b = getBounds(state.room.vertices);
    const width = Math.max(100, Math.round(b.maxX - b.minX));
    const length = Math.max(100, Math.round(b.maxY - b.minY));
    const vertices = createRectangleVertices(width, length).map((v) => ({
      x: v.x + b.minX,
      y: v.y + b.minY,
    }));
    const oldWalls = state.getWalls();
    const newWalls = computeWallsFromVertices(vertices, state.room.height);
    set({
      room: { ...state.room, shapeType, width, length, vertices },
      ...remapWallItems(oldWalls, newWalls, state),
      selectedVertexIndex: null,
    });
  },

  updateVertex: (index, point) => {
    set((state) => {
      const vertices = [...state.room.vertices];
      vertices[index] = point;
      const b = getBounds(vertices);
      return {
        room: {
          ...state.room,
          vertices,
          shapeType: 'polygon',
          width: Math.round(b.maxX - b.minX),
          length: Math.round(b.maxY - b.minY),
        },
      };
    });
  },

  addVertex: (point, afterIndex) => {
    const state = get();
    const vertices = [...state.room.vertices];
    vertices.splice(afterIndex + 1, 0, point);
    const oldWalls = state.getWalls();
    const newWalls = computeWallsFromVertices(vertices, state.room.height);
    set({
      room: { ...state.room, vertices, shapeType: 'polygon' },
      ...remapWallItems(oldWalls, newWalls, state),
      selectedId: null,
      selectedType: 'vertex',
      selectedVertexIndex: afterIndex + 1,
    });
  },

  removeVertex: (index) => {
    const state = get();
    if (state.room.vertices.length <= 3) return;
    const vertices = state.room.vertices.filter((_, i) => i !== index);
    const oldWalls = state.getWalls();
    const newWalls = computeWallsFromVertices(vertices, state.room.height);
    const b = getBounds(vertices);
    set({
      room: {
        ...state.room,
        vertices,
        shapeType: 'polygon',
        width: Math.round(b.maxX - b.minX),
        length: Math.round(b.maxY - b.minY),
      },
      ...remapWallItems(oldWalls, newWalls, state),
      activeWallId: newWalls.some((w) => w.id === state.activeWallId) ? state.activeWallId : 'wall-0',
      selectedVertexIndex: null,
      selectedType: null,
    });
  },

  setWallColor: (color) => set((state) => ({ room: { ...state.room, wallColor: color } })),

  setFloorColor: (color, material) =>
    set((state) => ({
      room: {
        ...state.room,
        floorColor: color,
        floorMaterial: material || state.room.floorMaterial,
      },
    })),

  /* ---------------------- Selection & viewport --------------------- */

  select: (id, type, vertexIndex = null) => {
    set({ selectedId: id, selectedType: type, selectedVertexIndex: vertexIndex });
  },

  clearSelection: () => set({ selectedId: null, selectedType: null, selectedVertexIndex: null }),

  setActiveWall: (wallId) => set({ activeWallId: wallId }),

  setViewMode: (mode) => set({ viewMode: mode, selectedVertexIndex: null }),

  toggleDimensions: () => set((s) => ({ showDimensions: !s.showDimensions })),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleSnapToGrid: () => set((s) => ({ snapToGrid: !s.snapToGrid })),

  resetCamera: (preset) =>
    set((s) => ({
      cameraResetKey: s.cameraResetKey + 1,
      cameraPreset: preset || s.cameraPreset,
    })),

  requestScreenshot: () => set((s) => ({ screenshotKey: s.screenshotKey + 1 })),

  setLayoutModalOpen: (open) => set({ layoutModalOpen: open }),
  setAddArtworkModalOpen: (open) => set({ addArtworkModalOpen: open }),
  setProjectModalOpen: (open) => set({ projectModalOpen: open }),
  setHelpModalOpen: (open) => set({ helpModalOpen: open }),
  setGuideModalOpen: (open) => set({ guideModalOpen: open }),
  setLeftPanelOpen: (open) => set({ leftPanelOpen: open, rightPanelOpen: open ? false : get().rightPanelOpen }),
  setRightPanelOpen: (open) => set({ rightPanelOpen: open, leftPanelOpen: open ? false : get().leftPanelOpen }),

  setLayoutOptions: (options) =>
    set((state) => ({ layoutOptions: { ...state.layoutOptions, ...options } })),

  /* ---------------------------- Furniture -------------------------- */

  addFurniture: (item) => {
    const newItem: Furniture = { ...item, id: uid('furn') };
    set((state) => ({
      furniture: [...state.furniture, newItem],
      selectedId: newItem.id,
      selectedType: 'furniture',
    }));
    return newItem;
  },

  updateFurniture: (id, partial) =>
    set((state) => ({
      furniture: state.furniture.map((f) => (f.id === id ? { ...f, ...partial } : f)),
    })),

  removeFurniture: (id) =>
    set((state) => ({
      furniture: state.furniture.filter((f) => f.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      selectedType: state.selectedId === id ? null : state.selectedType,
    })),

  duplicateFurniture: (id) => {
    const item = get().furniture.find((f) => f.id === id);
    if (!item) return null;
    const duplicated: Furniture = {
      ...item,
      id: uid('furn'),
      name: `${item.name} (copia)`,
      position: { x: item.position.x + 30, y: item.position.y, z: item.position.z + 30 },
    };
    set((state) => ({
      furniture: [...state.furniture, duplicated],
      selectedId: duplicated.id,
      selectedType: 'furniture',
    }));
    return duplicated;
  },

  /* ----------------------------- Artworks -------------------------- */

  addArtwork: (item) => {
    const newItem: Artwork = { ...item, id: uid('art') };
    set((state) => ({
      artworks: [...state.artworks, newItem],
      selectedId: newItem.id,
      selectedType: 'artwork',
      activeWallId: newItem.wallId,
    }));
    return newItem;
  },

  updateArtwork: (id, partial) =>
    set((state) => ({
      artworks: state.artworks.map((a) => (a.id === id ? { ...a, ...partial } : a)),
    })),

  removeArtwork: (id) =>
    set((state) => ({
      artworks: state.artworks.filter((a) => a.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      selectedType: state.selectedId === id ? null : state.selectedType,
    })),

  duplicateArtwork: (id) => {
    const state = get();
    const item = state.artworks.find((a) => a.id === id);
    if (!item) return null;
    const { totalWidth } = getArtworkTotalDimensions(item);
    const wall = state.getWalls().find((w) => w.id === item.wallId);
    let u = item.u + totalWidth + 10;
    if (wall && u + totalWidth > wall.length) u = Math.max(0, item.u - totalWidth - 10);
    const duplicated: Artwork = { ...item, id: uid('art'), name: `${item.name} (copia)`, u };
    set((s) => ({
      artworks: [...s.artworks, duplicated],
      selectedId: duplicated.id,
      selectedType: 'artwork',
    }));
    return duplicated;
  },

  moveArtwork: (id, u, elevationY, wallId) =>
    set((state) => ({
      artworks: state.artworks.map((a) =>
        a.id !== id
          ? a
          : { ...a, u: Math.max(0, u), elevationY: Math.max(0, elevationY), wallId: wallId || a.wallId }
      ),
    })),

  /* ----------------------------- Openings -------------------------- */

  addDoor: (door) => {
    const newItem: Door = { ...door, id: uid('door') };
    set((state) => ({ doors: [...state.doors, newItem], selectedId: newItem.id, selectedType: 'door' }));
    return newItem;
  },

  updateDoor: (id, partial) =>
    set((state) => ({ doors: state.doors.map((d) => (d.id === id ? { ...d, ...partial } : d)) })),

  removeDoor: (id) =>
    set((state) => ({
      doors: state.doors.filter((d) => d.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      selectedType: state.selectedId === id ? null : state.selectedType,
    })),

  addWindow: (win) => {
    const newItem: Window = { ...win, id: uid('win') };
    set((state) => ({ windows: [...state.windows, newItem], selectedId: newItem.id, selectedType: 'window' }));
    return newItem;
  },

  updateWindow: (id, partial) =>
    set((state) => ({ windows: state.windows.map((w) => (w.id === id ? { ...w, ...partial } : w)) })),

  removeWindow: (id) =>
    set((state) => ({
      windows: state.windows.filter((w) => w.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      selectedType: state.selectedId === id ? null : state.selectedType,
    })),

  /* ------------------------ Selection helpers ---------------------- */

  deleteSelected: () => {
    const { selectedId, selectedType, selectedVertexIndex, room } = get();
    if (selectedType === 'vertex' && selectedVertexIndex !== null && room.shapeType === 'polygon') {
      get().removeVertex(selectedVertexIndex);
      return;
    }
    if (!selectedId) return;
    if (selectedType === 'furniture') get().removeFurniture(selectedId);
    else if (selectedType === 'artwork') get().removeArtwork(selectedId);
    else if (selectedType === 'door') get().removeDoor(selectedId);
    else if (selectedType === 'window') get().removeWindow(selectedId);
  },

  duplicateSelected: () => {
    const { selectedId, selectedType } = get();
    if (!selectedId) return;
    if (selectedType === 'furniture') get().duplicateFurniture(selectedId);
    else if (selectedType === 'artwork') get().duplicateArtwork(selectedId);
  },

  nudgeSelected: (dx, dy) => {
    const { selectedId, selectedType } = get();
    if (!selectedId) return;
    if (selectedType === 'artwork') {
      const a = get().artworks.find((x) => x.id === selectedId);
      if (a) get().moveArtwork(a.id, a.u + dx, a.elevationY + dy);
    } else if (selectedType === 'furniture') {
      const f = get().furniture.find((x) => x.id === selectedId);
      // In plan coordinates "up" on screen is -z
      if (f) get().updateFurniture(f.id, { position: { ...f.position, x: f.position.x + dx, z: f.position.z - dy } });
    } else if (selectedType === 'door') {
      const d = get().doors.find((x) => x.id === selectedId);
      if (d) get().updateDoor(d.id, { u: Math.max(0, d.u + dx) });
    } else if (selectedType === 'window') {
      const w = get().windows.find((x) => x.id === selectedId);
      if (w) get().updateWindow(w.id, { u: Math.max(0, w.u + dx), elevationY: Math.max(0, w.elevationY + dy) });
    }
  },

  /* ----------------------------- Layout ---------------------------- */

  applyProposal: (proposal) => {
    set((state) => {
      const usedIds = new Set(proposal.placements.map((p) => p.artworkId));
      // Artworks used by the proposal are *moved* to this wall; others on this wall are removed
      const remaining = state.artworks.filter((a) => a.wallId !== proposal.wallId && !usedIds.has(a.id));

      const newArtworks: Artwork[] = proposal.placements.map((p) => {
        const existing = state.artworks.find((a) => a.id === p.artworkId);
        return {
          id: existing ? existing.id : uid('art'),
          name: p.name,
          imageUrl: p.imageUrl,
          wallId: proposal.wallId,
          u: Math.round(p.u * 10) / 10,
          elevationY: Math.round(p.elevationY * 10) / 10,
          width: p.width,
          height: p.height,
          frame: p.frame,
        };
      });

      return {
        artworks: [...remaining, ...newArtworks],
        layoutModalOpen: false,
        activeWallId: proposal.wallId,
        selectedId: null,
        selectedType: null,
      };
    });
    get().notify(`Disposizione “${proposal.title}” applicata`, 'success');
  },

  /* --------------------------- Projects ---------------------------- */

  loadProject: (project) => {
    const scene = normalizeScene(project);
    if (!scene) return false;
    set({
      ...scene,
      selectedId: null,
      selectedType: null,
      selectedVertexIndex: null,
      projectModalOpen: false,
      cameraResetKey: get().cameraResetKey + 1,
    });
    return true;
  },

  resetToTemplate: (templateId) => {
    const tpl = ROOM_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    set({
      ...tpl.build(),
      selectedId: null,
      selectedType: null,
      selectedVertexIndex: null,
      cameraResetKey: get().cameraResetKey + 1,
    });
    get().notify(`Modello “${tpl.name}” caricato`, 'success');
  },

  exportProjectJSON: (name) => {
    const data: ProjectData = {
      id: uid('artwall'),
      name: name || `Progetto ${new Date().toLocaleDateString('it-IT')}`,
      updatedAt: new Date().toISOString(),
      ...sceneOf(get()),
    };
    return JSON.stringify(data, null, 2);
  },

  /* ---------------------------- History ---------------------------- */

  undo: () => {
    const { past, future } = get();
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    applyingHistory = true;
    set({
      ...prev,
      past: past.slice(0, -1),
      future: [sceneOf(get()), ...future].slice(0, HISTORY_LIMIT),
    });
    applyingHistory = false;
    endBurst();
    sanitizeSelection();
  },

  redo: () => {
    const { past, future } = get();
    if (future.length === 0) return;
    const next = future[0];
    applyingHistory = true;
    set({
      ...next,
      past: [...past, sceneOf(get())].slice(-HISTORY_LIMIT),
      future: future.slice(1),
    });
    applyingHistory = false;
    endBurst();
    sanitizeSelection();
  },

  /* ----------------------------- Toasts ---------------------------- */

  notify: (message, tone = 'info') => {
    const id = ++toastCounter;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, message, tone }] }));
    setTimeout(() => get().dismissToast(id), 3200);
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/* ------------------------------------------------------------------ */
/* History recorder + autosave                                         */
/* ------------------------------------------------------------------ */

let applyingHistory = false;
let burstTimer: ReturnType<typeof setTimeout> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let quotaWarned = false;

function endBurst() {
  if (burstTimer) clearTimeout(burstTimer);
  burstTimer = null;
}

function sanitizeSelection() {
  const s = useRoomStore.getState();
  if (!s.selectedId) return;
  const exists =
    s.furniture.some((x) => x.id === s.selectedId) ||
    s.artworks.some((x) => x.id === s.selectedId) ||
    s.doors.some((x) => x.id === s.selectedId) ||
    s.windows.some((x) => x.id === s.selectedId) ||
    s.getWalls().some((x) => x.id === s.selectedId);
  if (!exists) s.clearSelection();
}

useRoomStore.subscribe((state, prev) => {
  if (!sceneChanged(state, prev)) return;

  // Autosave (debounced)
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(sceneOf(useRoomStore.getState())));
    } catch {
      if (!quotaWarned) {
        quotaWarned = true;
        useRoomStore
          .getState()
          .notify('Spazio del browser esaurito: esporta il progetto in JSON per non perderlo.', 'error');
      }
    }
  }, 600);

  if (applyingHistory) return;

  // A "burst" of rapid changes (e.g. a drag) becomes a single undo step
  if (!burstTimer) {
    useRoomStore.setState((s) => ({
      past: [...s.past, sceneOf(prev)].slice(-HISTORY_LIMIT),
      future: [],
    }));
  }
  endBurst();
  burstTimer = setTimeout(() => {
    burstTimer = null;
  }, 500);
});
