/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import { CustomNumberInput } from '../ui/CustomNumberInput';
import { CustomColorPicker } from '../ui/CustomColorPicker';
import { FRAME_COLOR_OPTIONS } from '../../constants/presets';
import {
  Copy,
  Trash2,
  AlignCenter,
  Eye,
  RotateCw,
  Sparkles,
  Compass,
  Sliders,
  Maximize2,
  Info,
} from 'lucide-react';

export const RightInspector: React.FC = () => {
  const {
    room,
    furniture,
    artworks,
    doors,
    windows,
    selectedId,
    selectedType,
    getWalls,
    updateFurniture,
    duplicateFurniture,
    removeFurniture,
    updateArtwork,
    duplicateArtwork,
    removeArtwork,
    updateDoor,
    removeDoor,
    updateWindow,
    removeWindow,
    setActiveWall,
    setViewMode,
    setLayoutModalOpen,
    clearSelection,
  } = useRoomStore();

  const walls = getWalls();

  // Find selected item
  const selectedFurniture = selectedType === 'furniture' ? furniture.find((f) => f.id === selectedId) : null;
  const selectedArtwork = selectedType === 'artwork' ? artworks.find((a) => a.id === selectedId) : null;
  const selectedDoor = selectedType === 'door' ? doors.find((d) => d.id === selectedId) : null;
  const selectedWindow = selectedType === 'window' ? windows.find((w) => w.id === selectedId) : null;
  const selectedWall = selectedType === 'wall' ? walls.find((w) => w.id === selectedId) : null;

  return (
    <aside className="w-80 h-full bg-neutral-900 border-l border-neutral-800 flex flex-col shrink-0 select-none z-10 text-neutral-100">
      {/* Inspector Header */}
      <div className="h-12 border-b border-neutral-800 px-4 flex items-center justify-between bg-neutral-900/90 shrink-0">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
            Proprietà Elemento
          </span>
        </div>
        {selectedId && (
          <button
            onClick={clearSelection}
            className="text-[11px] text-neutral-400 hover:text-white transition-colors"
          >
            Deseleziona
          </button>
        )}
      </div>

      {/* Inspector Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
        {/* CASE 1: FURNITURE SELECTED */}
        {selectedFurniture && (
          <div className="flex flex-col gap-4">
            <div>
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block mb-1">
                Mobile Box 3D
              </span>
              <input
                type="text"
                value={selectedFurniture.name}
                onChange={(e) => updateFurniture(selectedFurniture.id, { name: e.target.value })}
                className="w-full h-8 px-2.5 rounded bg-neutral-950 border border-neutral-800 text-xs font-semibold text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Dimensions */}
            <div className="flex flex-col gap-3">
              <h4 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Dimensioni Box (cm)
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <CustomNumberInput
                  label="Larghezza"
                  value={selectedFurniture.width}
                  onChange={(v) => updateFurniture(selectedFurniture.id, { width: v })}
                  min={20}
                  max={600}
                  unit="cm"
                />
                <CustomNumberInput
                  label="Profondità"
                  value={selectedFurniture.depth}
                  onChange={(v) => updateFurniture(selectedFurniture.id, { depth: v })}
                  min={20}
                  max={600}
                  unit="cm"
                />
              </div>
              <CustomNumberInput
                label="Altezza"
                value={selectedFurniture.height}
                onChange={(v) => updateFurniture(selectedFurniture.id, { height: v })}
                min={10}
                max={300}
                unit="cm"
              />
            </div>

            {/* Position 3D */}
            <div className="flex flex-col gap-3 pt-2 border-t border-neutral-800">
              <h4 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Posizione nella Stanza (cm)
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <CustomNumberInput
                  label="Posizione X"
                  value={Math.round(selectedFurniture.position.x)}
                  onChange={(v) =>
                    updateFurniture(selectedFurniture.id, {
                      position: { ...selectedFurniture.position, x: v },
                    })
                  }
                  min={-100}
                  max={room.width + 100}
                  unit="cm"
                />
                <CustomNumberInput
                  label="Posizione Z"
                  value={Math.round(selectedFurniture.position.z)}
                  onChange={(v) =>
                    updateFurniture(selectedFurniture.id, {
                      position: { ...selectedFurniture.position, z: v },
                    })
                  }
                  min={-100}
                  max={room.length + 100}
                  unit="cm"
                />
              </div>
            </div>

            {/* Rotation */}
            <div className="flex flex-col gap-2 pt-2 border-t border-neutral-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400 font-medium">Rotazione Y</span>
                <span className="text-[11px] font-mono text-cyan-400">{selectedFurniture.rotationY}°</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[0, 90, 180, 270].map((deg) => (
                  <button
                    key={deg}
                    onClick={() => updateFurniture(selectedFurniture.id, { rotationY: deg })}
                    className={`py-1 text-xs font-mono rounded border transition-colors ${
                      selectedFurniture.rotationY === deg
                        ? 'bg-neutral-800 border-cyan-500 text-white font-semibold'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div className="pt-2 border-t border-neutral-800">
              <CustomColorPicker
                label="Colore Finitura Box"
                value={selectedFurniture.color}
                onChange={(c) => updateFurniture(selectedFurniture.id, { color: c })}
              />
            </div>

            {/* Action Buttons: Duplicate & Delete */}
            <div className="pt-3 border-t border-neutral-800 flex items-center gap-2">
              <button
                onClick={() => duplicateFurniture(selectedFurniture.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-white transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Duplica
              </button>
              <button
                onClick={() => removeFurniture(selectedFurniture.id)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-700 text-xs font-medium text-red-200 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Elimina
              </button>
            </div>
          </div>
        )}

        {/* CASE 2: ARTWORK SELECTED */}
        {selectedArtwork && (
          <div className="flex flex-col gap-4">
            <div>
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block mb-1">
                Quadro a Parete
              </span>
              <input
                type="text"
                value={selectedArtwork.name}
                onChange={(e) => updateArtwork(selectedArtwork.id, { name: e.target.value })}
                className="w-full h-8 px-2.5 rounded bg-neutral-950 border border-neutral-800 text-xs font-semibold text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Target wall */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-neutral-400 font-medium">Parete</label>
              <select
                value={selectedArtwork.wallId}
                onChange={(e) => {
                  updateArtwork(selectedArtwork.id, { wallId: e.target.value });
                  setActiveWall(e.target.value);
                }}
                className="h-8 px-2.5 rounded bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {walls.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({Math.round(w.length)} cm)
                  </option>
                ))}
              </select>
            </div>

            {/* Real Canvas Dimensions */}
            <div className="flex flex-col gap-3">
              <h4 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Dimensioni Tela (cm)
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <CustomNumberInput
                  label="Larghezza"
                  value={selectedArtwork.width}
                  onChange={(v) => updateArtwork(selectedArtwork.id, { width: v })}
                  min={15}
                  max={400}
                  unit="cm"
                />
                <CustomNumberInput
                  label="Altezza"
                  value={selectedArtwork.height}
                  onChange={(v) => updateArtwork(selectedArtwork.id, { height: v })}
                  min={15}
                  max={400}
                  unit="cm"
                />
              </div>
            </div>

            {/* Position on Wall */}
            <div className="flex flex-col gap-3 pt-2 border-t border-neutral-800">
              <h4 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Posizione su Parete (cm)
              </h4>
              <CustomNumberInput
                label="Distanza da Angolo SX (u)"
                value={Math.round(selectedArtwork.u)}
                onChange={(v) => updateArtwork(selectedArtwork.id, { u: v })}
                min={0}
                max={5000}
                unit="cm"
              />
              <CustomNumberInput
                label="Altezza da Pavimento"
                value={Math.round(selectedArtwork.elevationY)}
                onChange={(v) => updateArtwork(selectedArtwork.id, { elevationY: v })}
                min={0}
                max={selectedWall ? selectedWall.height - 20 : 400}
                unit="cm"
              />
            </div>

            {/* Quick Alignments */}
            <div className="pt-2 border-t border-neutral-800 flex gap-2">
              <button
                onClick={() => {
                  const wall = walls.find((w) => w.id === selectedArtwork.wallId);
                  if (wall) {
                    const centerU = (wall.length - selectedArtwork.width) / 2;
                    updateArtwork(selectedArtwork.id, { u: Math.round(centerU) });
                  }
                }}
                className="flex-1 py-1.5 px-2 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 rounded text-[11px] text-neutral-300 hover:text-white flex items-center justify-center gap-1 transition-colors"
              >
                <AlignCenter className="w-3 h-3 text-cyan-400" />
                Centra X
              </button>
              <button
                onClick={() => {
                  const targetElevation = 150 - selectedArtwork.height / 2;
                  updateArtwork(selectedArtwork.id, { elevationY: Math.max(10, Math.round(targetElevation)) });
                }}
                className="flex-1 py-1.5 px-2 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 rounded text-[11px] text-neutral-300 hover:text-white flex items-center justify-center gap-1 transition-colors"
              >
                <Eye className="w-3 h-3 text-amber-400" />
                150cm Occhi
              </button>
            </div>

            {/* Frame Settings */}
            <div className="pt-2 border-t border-neutral-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedArtwork.frame.enabled}
                    onChange={(e) =>
                      updateArtwork(selectedArtwork.id, {
                        frame: { ...selectedArtwork.frame, enabled: e.target.checked },
                      })
                    }
                    className="rounded border-neutral-700 bg-neutral-950 text-cyan-500"
                  />
                  <span className="text-xs font-semibold text-white">Cornice & Passepartout</span>
                </label>
              </div>

              {selectedArtwork.frame.enabled && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <CustomNumberInput
                      label="Bordo Cornice"
                      value={selectedArtwork.frame.width}
                      onChange={(v) =>
                        updateArtwork(selectedArtwork.id, {
                          frame: { ...selectedArtwork.frame, width: v },
                        })
                      }
                      min={1}
                      max={12}
                      unit="cm"
                    />
                    <CustomNumberInput
                      label="Passepartout"
                      value={selectedArtwork.frame.matWidth}
                      onChange={(v) =>
                        updateArtwork(selectedArtwork.id, {
                          frame: { ...selectedArtwork.frame, matWidth: v },
                        })
                      }
                      min={0}
                      max={15}
                      unit="cm"
                    />
                  </div>

                  <CustomColorPicker
                    label="Finitura Cornice"
                    value={selectedArtwork.frame.color}
                    onChange={(c) =>
                      updateArtwork(selectedArtwork.id, {
                        frame: { ...selectedArtwork.frame, color: c },
                      })
                    }
                    presetColors={FRAME_COLOR_OPTIONS}
                  />
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-neutral-800 flex items-center gap-2">
              <button
                onClick={() => duplicateArtwork(selectedArtwork.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-white transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Duplica
              </button>
              <button
                onClick={() => removeArtwork(selectedArtwork.id)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-700 text-xs font-medium text-red-200 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Elimina
              </button>
            </div>
          </div>
        )}

        {/* CASE 3: DOOR / WINDOW SELECTED */}
        {(selectedDoor || selectedWindow) && (
          <div className="flex flex-col gap-4">
            <div>
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block mb-1">
                {selectedDoor ? 'Porta' : 'Finestra'}
              </span>
              <input
                type="text"
                value={selectedDoor ? selectedDoor.name : selectedWindow!.name}
                onChange={(e) => {
                  if (selectedDoor) updateDoor(selectedDoor.id, { name: e.target.value });
                  else updateWindow(selectedWindow!.id, { name: e.target.value });
                }}
                className="w-full h-8 px-2.5 rounded bg-neutral-950 border border-neutral-800 text-xs font-semibold text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <CustomNumberInput
                label="Larghezza"
                value={selectedDoor ? selectedDoor.width : selectedWindow!.width}
                onChange={(v) => {
                  if (selectedDoor) updateDoor(selectedDoor.id, { width: v });
                  else updateWindow(selectedWindow!.id, { width: v });
                }}
                min={40}
                max={300}
                unit="cm"
              />
              <CustomNumberInput
                label="Altezza"
                value={selectedDoor ? selectedDoor.height : selectedWindow!.height}
                onChange={(v) => {
                  if (selectedDoor) updateDoor(selectedDoor.id, { height: v });
                  else updateWindow(selectedWindow!.id, { height: v });
                }}
                min={40}
                max={300}
                unit="cm"
              />
            </div>

            <CustomNumberInput
              label="Posizione da SX (u)"
              value={selectedDoor ? selectedDoor.u : selectedWindow!.u}
              onChange={(v) => {
                if (selectedDoor) updateDoor(selectedDoor.id, { u: v });
                else updateWindow(selectedWindow!.id, { u: v });
              }}
              min={0}
              max={2000}
              unit="cm"
            />

            {selectedWindow && (
              <CustomNumberInput
                label="Altezza Davanzale (da terra)"
                value={selectedWindow.elevationY}
                onChange={(v) => updateWindow(selectedWindow.id, { elevationY: v })}
                min={0}
                max={200}
                unit="cm"
              />
            )}

            <button
              onClick={() => {
                if (selectedDoor) removeDoor(selectedDoor.id);
                else removeWindow(selectedWindow!.id);
              }}
              className="mt-4 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-700 text-xs font-medium text-red-200 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Elimina
            </button>
          </div>
        )}

        {/* CASE 4: WALL SELECTED */}
        {selectedWall && (
          <div className="flex flex-col gap-4">
            <div>
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block mb-1">
                Parete Selezionata
              </span>
              <h3 className="text-sm font-bold text-white">{selectedWall.name}</h3>
            </div>

            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg flex flex-col gap-2 font-mono text-xs text-neutral-300">
              <div className="flex justify-between">
                <span className="text-neutral-500">Lunghezza:</span>
                <span className="font-semibold text-white">{Math.round(selectedWall.length)} cm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Altezza:</span>
                <span className="font-semibold text-white">{Math.round(selectedWall.height)} cm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Superficie:</span>
                <span className="font-semibold text-white">
                  {((selectedWall.length * selectedWall.height) / 10000).toFixed(1)} m²
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setActiveWall(selectedWall.id);
                setViewMode('2d_wall');
              }}
              className="flex items-center justify-center gap-2 py-2 px-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow transition-colors"
            >
              <Compass className="w-3.5 h-3.5" />
              Passa a Vista Frontale Parete
            </button>

            <button
              onClick={() => {
                setActiveWall(selectedWall.id);
                setLayoutModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 py-2 px-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-cyan-300 text-xs font-medium rounded-lg transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Genera Disposizioni per Questa Parete
            </button>
          </div>
        )}

        {/* CASE 5: NOTHING SELECTED */}
        {!selectedId && (
          <div className="flex flex-col gap-4 text-neutral-400">
            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
              <div className="flex items-center gap-2 text-neutral-300 mb-2">
                <Info className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold">Riepilogo Scena 3D</span>
              </div>
              <div className="flex flex-col gap-1.5 text-[11px] font-mono">
                <div className="flex justify-between">
                  <span>Pareti:</span>
                  <span className="text-white">{walls.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mobili Box:</span>
                  <span className="text-white">{furniture.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Quadri appesi:</span>
                  <span className="text-white">{artworks.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Porte / Finestre:</span>
                  <span className="text-white">{doors.length + windows.length}</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] leading-relaxed text-neutral-500 space-y-2">
              <p>
                • Fai clic su qualsiasi elemento (mobile, quadro, parete) nella scena 3D o nell'editor frontale per visualizzarne e regolarne le proprietà.
              </p>
              <p>
                • In modalità <strong>Parete 2D Frontale</strong> puoi trascinare liberamente i quadri e controllare le quote millimetriche dal suolo, soffitto e arredi.
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
