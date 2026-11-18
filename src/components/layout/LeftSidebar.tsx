/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import {
  FURNITURE_PRESETS,
  WALL_COLOR_OPTIONS,
  FLOOR_COLOR_OPTIONS,
} from '../../constants/presets';
import { CustomNumberInput } from '../ui/CustomNumberInput';
import { CustomColorPicker } from '../ui/CustomColorPicker';
import {
  Home,
  Box,
  Image as ImageIcon,
  DoorOpen,
  Plus,
  Sparkles,
  Layers,
  Trash2,
} from 'lucide-react';

export const LeftSidebar: React.FC = () => {
  const {
    room,
    furniture,
    artworks,
    doors,
    windows,
    selectedId,
    activeWallId,
    setRoomDimensions,
    setRoomHeight,
    setWallColor,
    setFloorColor,
    addFurniture,
    addDoor,
    addWindow,
    removeArtwork,
    select,
    setActiveWall,
    setAddArtworkModalOpen,
    setLayoutModalOpen,
    getWalls,
  } = useRoomStore();

  const [activeTab, setActiveTab] = useState<'room' | 'furniture' | 'art' | 'openings'>('furniture');
  const walls = getWalls();

  return (
    <aside className="w-80 h-full bg-neutral-900 border-r border-neutral-800 flex flex-col shrink-0 select-none z-10 text-neutral-100">
      {/* Category Tabs */}
      <div className="h-12 border-b border-neutral-800 flex items-center px-2 bg-neutral-900/90 gap-1 shrink-0">
        <button
          onClick={() => setActiveTab('furniture')}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center text-[11px] font-medium rounded-md transition-all ${
            activeTab === 'furniture'
              ? 'bg-neutral-800 text-cyan-400 shadow-sm border border-neutral-700'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-850'
          }`}
        >
          <Box className="w-3.5 h-3.5 mb-0.5" />
          Mobili 3D
        </button>

        <button
          onClick={() => setActiveTab('art')}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center text-[11px] font-medium rounded-md transition-all ${
            activeTab === 'art'
              ? 'bg-neutral-800 text-cyan-400 shadow-sm border border-neutral-700'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-850'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5 mb-0.5" />
          Quadri ({artworks.length})
        </button>

        <button
          onClick={() => setActiveTab('room')}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center text-[11px] font-medium rounded-md transition-all ${
            activeTab === 'room'
              ? 'bg-neutral-800 text-cyan-400 shadow-sm border border-neutral-700'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-850'
          }`}
        >
          <Home className="w-3.5 h-3.5 mb-0.5" />
          Stanza
        </button>

        <button
          onClick={() => setActiveTab('openings')}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center text-[11px] font-medium rounded-md transition-all ${
            activeTab === 'openings'
              ? 'bg-neutral-800 text-cyan-400 shadow-sm border border-neutral-700'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-850'
          }`}
        >
          <DoorOpen className="w-3.5 h-3.5 mb-0.5" />
          Infissi
        </button>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
        {/* TAB: MOBILI (3D COLORED BOXES) */}
        {activeTab === 'furniture' && (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                Aggiungi Mobile Box 3D
              </h3>
              <p className="text-[11px] text-neutral-400 mb-3">
                Inserisci box volumetrici per simulare gli ingombri reali di arredi e complementi
              </p>

              <div className="grid grid-cols-2 gap-2">
                {FURNITURE_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => {
                      addFurniture({
                        name: preset.name,
                        width: preset.width,
                        height: preset.height,
                        depth: preset.depth,
                        color: preset.color,
                        position: {
                          x: room.width / 2,
                          y: 0,
                          z: room.length / 2,
                        },
                        rotationY: 0,
                      });
                    }}
                    className="p-2.5 rounded-lg border border-neutral-800 hover:border-cyan-500/60 bg-neutral-950 hover:bg-neutral-850 text-left transition-all group flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="w-3 h-3 rounded" style={{ backgroundColor: preset.color }} />
                      <Plus className="w-3 h-3 text-neutral-500 group-hover:text-cyan-400" />
                    </div>
                    <p className="text-xs font-semibold text-white group-hover:text-cyan-300 truncate">
                      {preset.name}
                    </p>
                    <p className="text-[10px] font-mono text-neutral-400 mt-0.5">
                      {preset.width}×{preset.depth}×{preset.height} cm
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Existing Furniture In Room */}
            <div className="pt-2 border-t border-neutral-800/80">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                Mobili nella Stanza ({furniture.length})
              </h4>
              <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
                {furniture.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => select(f.id, 'furniture')}
                    className={`p-2 rounded-md border flex items-center justify-between cursor-pointer transition-colors ${
                      selectedId === f.id
                        ? 'bg-neutral-800 border-cyan-500/70 text-white shadow-sm'
                        : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
                      <span className="text-xs font-medium truncate">{f.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400 shrink-0">
                      {f.width}×{f.height} cm
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: QUADRI */}
        {activeTab === 'art' && (
          <div className="flex flex-col gap-4">
            <button
              onClick={() => setAddArtworkModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuovo Quadro
            </button>

            <button
              onClick={() => setLayoutModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-cyan-300 text-xs font-medium rounded-lg border border-neutral-700 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Genera Disposizioni Parete
            </button>

            {/* Artworks List */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                Opere a Parete ({artworks.length})
              </h4>
              <div className="flex flex-col gap-2">
                {artworks.map((a) => {
                  const isSelected = selectedId === a.id;
                  const wall = walls.find((w) => w.id === a.wallId);
                  return (
                    <div
                      key={a.id}
                      onClick={() => {
                        select(a.id, 'artwork');
                        setActiveWall(a.wallId);
                      }}
                      className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-neutral-800 border-cyan-500 text-white shadow-sm'
                          : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={a.imageUrl}
                          alt={a.name}
                          className="w-8 h-8 rounded object-cover border border-neutral-700 shrink-0"
                        />
                        <div className="truncate">
                          <p className="text-xs font-medium truncate">{a.name}</p>
                          <p className="text-[10px] text-neutral-400 font-mono">
                            {wall?.name || 'Parete'} · {a.width}×{a.height} cm
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeArtwork(a.id);
                        }}
                        className="w-6 h-6 flex items-center justify-center text-neutral-500 hover:text-red-400 rounded transition-colors"
                        title="Rimuovi quadro"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB: STANZA */}
        {activeTab === 'room' && (
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Dimensioni della Stanza (cm)
            </h3>

            {room.shapeType === 'rectangular' ? (
              <div className="flex flex-col gap-3">
                <CustomNumberInput
                  label="Larghezza Stanza"
                  value={room.width}
                  onChange={(w) => setRoomDimensions(w, room.length, room.height)}
                  min={200}
                  max={2000}
                  step={10}
                  unit="cm"
                />
                <CustomNumberInput
                  label="Lunghezza Stanza"
                  value={room.length}
                  onChange={(l) => setRoomDimensions(room.width, l, room.height)}
                  min={200}
                  max={2000}
                  step={10}
                  unit="cm"
                />
                <CustomNumberInput
                  label="Altezza Soffitto"
                  value={room.height}
                  onChange={(h) => setRoomHeight(h)}
                  min={200}
                  max={600}
                  step={5}
                  unit="cm"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-300">
                  <p className="font-semibold text-cyan-400 mb-1">Stanza a Forma Irregolare</p>
                  <p className="text-[11px] text-neutral-400">
                    Modifica i vertici direttamente dalla visuale <strong>Pianta 2D</strong>.
                  </p>
                </div>
                <CustomNumberInput
                  label="Altezza Soffitto"
                  value={room.height}
                  onChange={(h) => setRoomHeight(h)}
                  min={200}
                  max={600}
                  step={5}
                  unit="cm"
                />
              </div>
            )}

            {/* Wall Finishes */}
            <div className="pt-2 border-t border-neutral-800">
              <CustomColorPicker
                label="Colore Intonaco Pareti"
                value={room.wallColor}
                onChange={setWallColor}
                presetColors={WALL_COLOR_OPTIONS}
              />
            </div>

            {/* Floor Finishes */}
            <div className="pt-2 border-t border-neutral-800">
              <span className="text-xs font-medium text-neutral-400 tracking-wide block mb-2">
                Finitura Pavimento
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {FLOOR_COLOR_OPTIONS.map((f) => (
                  <button
                    key={f.name}
                    onClick={() => setFloorColor(f.value, f.material)}
                    className={`p-2 rounded border text-left text-[11px] transition-all flex items-center gap-2 ${
                      room.floorColor === f.value
                        ? 'border-cyan-500 bg-neutral-800 text-white font-medium'
                        : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: f.value }} />
                    <span className="truncate">{f.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: INFISSI (PORTE E FINESTRE) */}
        {activeTab === 'openings' && (
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              Porte e Finestre
            </h3>
            <p className="text-[11px] text-neutral-400 mb-3">
              Inserisci aperture a parete per delimitare le zone vietate al posizionamento quadri
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  addDoor({
                    name: 'Nuova Porta',
                    wallId: activeWallId || 'wall-0',
                    u: 60,
                    width: 90,
                    height: 215,
                    elevationY: 0,
                    frameColor: '#3f3f46',
                  });
                }}
                className="p-3 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 hover:border-cyan-500 rounded-lg text-left flex flex-col justify-between"
              >
                <DoorOpen className="w-4 h-4 text-cyan-400 mb-2" />
                <span className="text-xs font-semibold text-white">+ Porta Standard</span>
                <span className="text-[10px] font-mono text-neutral-400 mt-0.5">90×215 cm</span>
              </button>

              <button
                onClick={() => {
                  addWindow({
                    name: 'Nuova Finestra',
                    wallId: activeWallId || 'wall-0',
                    u: 60,
                    width: 120,
                    height: 140,
                    elevationY: 90,
                    frameColor: '#3f3f46',
                  });
                }}
                className="p-3 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 hover:border-cyan-500 rounded-lg text-left flex flex-col justify-between"
              >
                <DoorOpen className="w-4 h-4 text-amber-400 mb-2" />
                <span className="text-xs font-semibold text-white">+ Finestra</span>
                <span className="text-[10px] font-mono text-neutral-400 mt-0.5">120×140 cm</span>
              </button>
            </div>

            {/* List of current doors & windows */}
            <div className="pt-2 border-t border-neutral-800">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                Infissi Posizionati ({doors.length + windows.length})
              </h4>
              <div className="flex flex-col gap-1.5">
                {doors.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => select(d.id, 'door')}
                    className={`p-2 rounded border flex items-center justify-between cursor-pointer transition-colors ${
                      selectedId === d.id
                        ? 'bg-neutral-800 border-cyan-500 text-white'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-300'
                    }`}
                  >
                    <span className="text-xs">{d.name}</span>
                    <span className="text-[10px] font-mono text-neutral-400">{d.width}×{d.height} cm</span>
                  </div>
                ))}
                {windows.map((w) => (
                  <div
                    key={w.id}
                    onClick={() => select(w.id, 'window')}
                    className={`p-2 rounded border flex items-center justify-between cursor-pointer transition-colors ${
                      selectedId === w.id
                        ? 'bg-neutral-800 border-cyan-500 text-white'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-300'
                    }`}
                  >
                    <span className="text-xs">{w.name}</span>
                    <span className="text-[10px] font-mono text-neutral-400">{w.width}×{w.height} cm</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
