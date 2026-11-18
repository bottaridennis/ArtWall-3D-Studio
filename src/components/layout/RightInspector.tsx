/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import { CustomNumberInput } from '../ui/CustomNumberInput';
import { CustomColorPicker } from '../ui/CustomColorPicker';
import { Section, Divider, Switch, Stat } from '../ui/Section';
import { SidePanel } from './SidePanel';
import { FRAME_COLOR_OPTIONS } from '../../constants/presets';
import { getArtworkTotalDimensions, getWallObstacles } from '../../utils/geometry';
import {
  Copy,
  Trash2,
  AlignHorizontalJustifyCenter,
  Eye,
  Sparkles,
  Frame,
  Link2,
  Unlink2,
  X,
  MousePointerClick,
  Armchair,
  DoorOpen,
  AppWindow,
  Image as ImageIcon,
  PanelTop,
  RotateCw,
  Crosshair,
  BrickWall,
  Keyboard,
} from 'lucide-react';

const MAT_COLORS = [
  { name: 'Bianco', value: '#ffffff' },
  { name: 'Avorio', value: '#f5f0e6' },
  { name: 'Grigio Perla', value: '#d4d4d8' },
  { name: 'Nero', value: '#18181b' },
  { name: 'Sabbia', value: '#e7ded4' },
];

const OPENING_COLORS = [
  { name: 'Antracite', value: '#3f3f46' },
  { name: 'Nero', value: '#18181b' },
  { name: 'Bianco', value: '#f5f5f4' },
  { name: 'Rovere', value: '#b58d62' },
  { name: 'Noce', value: '#5c3d2e' },
];

const Header: React.FC<{
  kind: string;
  icon: React.ReactNode;
  name?: string;
  onRename?: (v: string) => void;
  title?: string;
  onDuplicate?: () => void;
  onDelete?: () => void;
}> = ({ kind, icon, name, onRename, title, onDuplicate, onDelete }) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center gap-2">
      <span className="w-6 h-6 rounded-md bg-brass-500/12 text-brass-400 flex items-center justify-center">{icon}</span>
      <span className="eyebrow flex-1">{kind}</span>
      {onDuplicate && (
        <button className="icon-btn !w-8 !h-8" onClick={onDuplicate} title="Duplica (Ctrl+D)" aria-label="Duplica">
          <Copy className="w-3.5 h-3.5" />
        </button>
      )}
      {onDelete && (
        <button className="icon-btn !w-8 !h-8 hover:!text-danger" onClick={onDelete} title="Elimina (Canc)" aria-label="Elimina">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
    {onRename ? (
      <input
        type="text"
        value={name}
        onChange={(e) => onRename(e.target.value)}
        className="w-full bg-transparent display text-[26px] leading-tight text-ink-100 focus:outline-none border-b border-transparent focus:border-brass-500/50 hover:border-white/10 transition-colors pb-0.5"
        aria-label="Nome"
      />
    ) : (
      <h2 className="display text-[26px] leading-tight text-ink-100">{title}</h2>
    )}
  </div>
);

const WallSelect: React.FC<{ value: string; onChange: (v: string) => void; walls: { id: string; name: string; length: number }[] }> = ({
  value,
  onChange,
  walls,
}) => (
  <label className="flex flex-col gap-1.5">
    <span className="field-label">Parete</span>
    <select value={value} onChange={(e) => onChange(e.target.value)} className="field">
      {walls.map((w) => (
        <option key={w.id} value={w.id}>
          {w.name} — {Math.round(w.length)} cm
        </option>
      ))}
    </select>
  </label>
);

export const RightInspector: React.FC = () => {
  const room = useRoomStore((s) => s.room);
  const furniture = useRoomStore((s) => s.furniture);
  const artworks = useRoomStore((s) => s.artworks);
  const doors = useRoomStore((s) => s.doors);
  const windows = useRoomStore((s) => s.windows);
  const selectedId = useRoomStore((s) => s.selectedId);
  const selectedType = useRoomStore((s) => s.selectedType);
  const selectedVertexIndex = useRoomStore((s) => s.selectedVertexIndex);
  const rightPanelOpen = useRoomStore((s) => s.rightPanelOpen);
  const targetEyeLevel = useRoomStore((s) => s.layoutOptions.targetEyeLevel);
  const {
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
    updateVertex,
    removeVertex,
    setActiveWall,
    setViewMode,
    setLayoutModalOpen,
    setRightPanelOpen,
    setWallColor,
    clearSelection,
    getWalls,
    resetCamera,
  } = useRoomStore.getState();

  const walls = useMemo(() => getWalls(), [room.vertices, room.height]);
  const [aspectLocked, setAspectLocked] = useState(true);
  const [hangerDrop, setHangerDrop] = useState(4);

  const selectedFurniture = selectedType === 'furniture' ? furniture.find((f) => f.id === selectedId) : null;
  const selectedArtwork = selectedType === 'artwork' ? artworks.find((a) => a.id === selectedId) : null;
  const selectedDoor = selectedType === 'door' ? doors.find((d) => d.id === selectedId) : null;
  const selectedWindow = selectedType === 'window' ? windows.find((w) => w.id === selectedId) : null;
  const selectedWall = selectedType === 'wall' ? walls.find((w) => w.id === selectedId) : null;
  const selectedVertex =
    selectedType === 'vertex' && selectedVertexIndex !== null ? room.vertices[selectedVertexIndex] : null;

  const artworkWall = selectedArtwork ? walls.find((w) => w.id === selectedArtwork.wallId) : null;
  const artDims = selectedArtwork ? getArtworkTotalDimensions(selectedArtwork) : null;
  const furnitureBelow = useMemo(() => {
    if (!artworkWall) return null;
    return getWallObstacles(artworkWall, furniture, [], []).find((o) => o.type === 'furniture') || null;
  }, [artworkWall, furniture]);

  const opening = selectedDoor || selectedWindow;
  const updateOpening = (partial: any) => {
    if (selectedDoor) updateDoor(selectedDoor.id, partial);
    else if (selectedWindow) updateWindow(selectedWindow.id, partial);
  };
  const openingWall = opening ? walls.find((w) => w.id === opening.wallId) : null;

  const nothing = !selectedFurniture && !selectedArtwork && !opening && !selectedWall && !selectedVertex;

  return (
    <SidePanel side="right" open={rightPanelOpen} onClose={() => setRightPanelOpen(false)} label="Proprietà" width="w-[320px]">
      <div className="h-14 px-4 border-b hairline flex items-center justify-between shrink-0">
        <span className="eyebrow">Proprietà</span>
        <div className="flex items-center gap-1">
          {!nothing && (
            <button onClick={clearSelection} className="btn btn-ghost btn-sm">
              Deseleziona
            </button>
          )}
          <button className="icon-btn lg:hidden" onClick={() => setRightPanelOpen(false)} aria-label="Chiudi proprietà">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 scroll-area p-4 flex flex-col gap-5" key={selectedId || selectedVertexIndex || 'none'}>
        {/* ------------------------------ ARTWORK ------------------------------ */}
        {selectedArtwork && artDims && (
          <>
            <Header
              kind="Quadro"
              icon={<ImageIcon className="w-3.5 h-3.5" />}
              name={selectedArtwork.name}
              onRename={(v) => updateArtwork(selectedArtwork.id, { name: v })}
              onDuplicate={() => duplicateArtwork(selectedArtwork.id)}
              onDelete={() => removeArtwork(selectedArtwork.id)}
            />

            {/* Preview */}
            <div className="rounded-xl bg-ink-950 border hairline p-5 flex items-center justify-center" style={{ minHeight: 150 }}>
              <div
                className="shadow-[0_18px_30px_-12px_rgba(0,0,0,.8)]"
                style={{
                  aspectRatio: `${artDims.totalWidth} / ${artDims.totalHeight}`,
                  height: artDims.totalHeight >= artDims.totalWidth ? 140 : undefined,
                  width: artDims.totalWidth > artDims.totalHeight ? '85%' : undefined,
                  background: selectedArtwork.frame.enabled ? selectedArtwork.frame.color : 'transparent',
                  padding: selectedArtwork.frame.enabled ? `${(selectedArtwork.frame.width / artDims.totalWidth) * 100}%` : 0,
                }}
              >
                <div
                  className="w-full h-full"
                  style={{
                    background: selectedArtwork.frame.enabled ? selectedArtwork.frame.matColor : 'transparent',
                    padding: selectedArtwork.frame.enabled ? `${(selectedArtwork.frame.matWidth / artDims.totalWidth) * 100}%` : 0,
                  }}
                >
                  <img src={selectedArtwork.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>

            <WallSelect
              walls={walls}
              value={selectedArtwork.wallId}
              onChange={(v) => {
                const wall = walls.find((w) => w.id === v);
                updateArtwork(selectedArtwork.id, {
                  wallId: v,
                  u: wall ? Math.max(0, Math.min(selectedArtwork.u, wall.length - artDims.totalWidth)) : selectedArtwork.u,
                });
                setActiveWall(v);
              }}
            />

            <Section
              title="Dimensioni tela"
              action={
                <button
                  onClick={() => setAspectLocked(!aspectLocked)}
                  className={`flex items-center gap-1 text-[11px] transition-colors ${aspectLocked ? 'text-brass-400' : 'text-ink-400 hover:text-ink-100'}`}
                  title={aspectLocked ? 'Proporzioni bloccate' : 'Proporzioni libere'}
                >
                  {aspectLocked ? <Link2 className="w-3.5 h-3.5" /> : <Unlink2 className="w-3.5 h-3.5" />}
                  {aspectLocked ? 'Proporzioni bloccate' : 'Libere'}
                </button>
              }
            >
              <div className="grid grid-cols-2 gap-2">
                <CustomNumberInput
                  label="Larghezza"
                  value={selectedArtwork.width}
                  onChange={(v) =>
                    updateArtwork(selectedArtwork.id, {
                      width: v,
                      ...(aspectLocked ? { height: Math.round(((v * selectedArtwork.height) / selectedArtwork.width) * 10) / 10 } : {}),
                    })
                  }
                  min={10}
                  max={400}
                />
                <CustomNumberInput
                  label="Altezza"
                  value={selectedArtwork.height}
                  onChange={(v) =>
                    updateArtwork(selectedArtwork.id, {
                      height: v,
                      ...(aspectLocked ? { width: Math.round(((v * selectedArtwork.width) / selectedArtwork.height) * 10) / 10 } : {}),
                    })
                  }
                  min={10}
                  max={400}
                />
              </div>
              <p className="text-[11.5px] text-ink-400">
                Ingombro con cornice:{' '}
                <span className="font-mono text-ink-200">
                  {Math.round(artDims.totalWidth * 10) / 10} × {Math.round(artDims.totalHeight * 10) / 10} cm
                </span>
              </p>
            </Section>

            <Section title="Posizione sulla parete">
              <div className="grid grid-cols-2 gap-2">
                <CustomNumberInput
                  label="Da sinistra"
                  value={selectedArtwork.u}
                  onChange={(v) => updateArtwork(selectedArtwork.id, { u: v })}
                  min={0}
                  max={artworkWall ? Math.max(0, artworkWall.length - 10) : 5000}
                />
                <CustomNumberInput
                  label="Da terra"
                  value={selectedArtwork.elevationY}
                  onChange={(v) => updateArtwork(selectedArtwork.id, { elevationY: v })}
                  min={0}
                  max={artworkWall ? artworkWall.height - 10 : 400}
                />
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  className="btn btn-secondary btn-sm !px-1.5"
                  onClick={() => {
                    if (artworkWall) updateArtwork(selectedArtwork.id, { u: Math.round(((artworkWall.length - artDims.totalWidth) / 2) * 10) / 10 });
                  }}
                  title="Centra orizzontalmente sulla parete"
                >
                  <AlignHorizontalJustifyCenter className="w-3.5 h-3.5" />
                  Centra
                </button>
                <button
                  className="btn btn-secondary btn-sm !px-1.5"
                  onClick={() =>
                    updateArtwork(selectedArtwork.id, {
                      elevationY: Math.max(0, Math.round(targetEyeLevel - artDims.totalHeight / 2)),
                    })
                  }
                  title={`Centro dell’opera a ${targetEyeLevel} cm (altezza occhi)`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  {targetEyeLevel}
                </button>
                <button
                  className="btn btn-secondary btn-sm !px-1.5"
                  disabled={!furnitureBelow}
                  onClick={() => {
                    if (!furnitureBelow) return;
                    updateArtwork(selectedArtwork.id, {
                      u: Math.round(((furnitureBelow.uMin + furnitureBelow.uMax) / 2 - artDims.totalWidth / 2) * 10) / 10,
                      elevationY: Math.round(furnitureBelow.vMax + 22),
                    });
                  }}
                  title={furnitureBelow ? `Centra sopra ${furnitureBelow.name}` : 'Nessun mobile contro questa parete'}
                >
                  <Armchair className="w-3.5 h-3.5" />
                  Mobile
                </button>
              </div>
            </Section>

            {/* Hanging point */}
            <div className="rounded-xl border border-brass-500/25 bg-brass-500/6 p-3.5 flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-brass-400" />
                <span className="text-[12.5px] font-semibold text-ink-100">Dove piantare il chiodo</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-ink-950/60 px-2.5 py-2">
                  <p className="text-[10.5px] text-ink-400">da sinistra</p>
                  <p className="font-mono text-[15px] text-brass-300">
                    {Math.round((selectedArtwork.u + artDims.totalWidth / 2) * 10) / 10} cm
                  </p>
                </div>
                <div className="rounded-lg bg-ink-950/60 px-2.5 py-2">
                  <p className="text-[10.5px] text-ink-400">da terra</p>
                  <p className="font-mono text-[15px] text-brass-300">
                    {Math.round((selectedArtwork.elevationY + artDims.totalHeight - hangerDrop) * 10) / 10} cm
                  </p>
                </div>
              </div>
              <CustomNumberInput
                label="Gancio sotto il bordo superiore"
                value={hangerDrop}
                onChange={setHangerDrop}
                min={0}
                max={40}
                hint="filo teso"
              />
            </div>

            <Divider />

            <Section title="Cornice e passepartout">
              <Switch
                checked={selectedArtwork.frame.enabled}
                onChange={(v) => updateArtwork(selectedArtwork.id, { frame: { ...selectedArtwork.frame, enabled: v } })}
                label="Mostra cornice"
              />
              {selectedArtwork.frame.enabled && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <CustomNumberInput
                      label="Bordo"
                      value={selectedArtwork.frame.width}
                      onChange={(v) => updateArtwork(selectedArtwork.id, { frame: { ...selectedArtwork.frame, width: v } })}
                      min={0.5}
                      max={15}
                    />
                    <CustomNumberInput
                      label="Profondità"
                      value={selectedArtwork.frame.depth}
                      onChange={(v) => updateArtwork(selectedArtwork.id, { frame: { ...selectedArtwork.frame, depth: v } })}
                      min={0.5}
                      max={12}
                    />
                  </div>
                  <CustomNumberInput
                    label="Passepartout"
                    value={selectedArtwork.frame.matWidth}
                    onChange={(v) => updateArtwork(selectedArtwork.id, { frame: { ...selectedArtwork.frame, matWidth: v } })}
                    min={0}
                    max={20}
                  />
                  <CustomColorPicker
                    label="Finitura cornice"
                    value={selectedArtwork.frame.color}
                    onChange={(c) => updateArtwork(selectedArtwork.id, { frame: { ...selectedArtwork.frame, color: c } })}
                    presetColors={FRAME_COLOR_OPTIONS}
                  />
                  {selectedArtwork.frame.matWidth > 0 && (
                    <CustomColorPicker
                      label="Colore passepartout"
                      value={selectedArtwork.frame.matColor}
                      onChange={(c) => updateArtwork(selectedArtwork.id, { frame: { ...selectedArtwork.frame, matColor: c } })}
                      presetColors={MAT_COLORS}
                    />
                  )}
                </>
              )}
            </Section>
          </>
        )}

        {/* ------------------------------ FURNITURE ------------------------------ */}
        {selectedFurniture && (
          <>
            <Header
              kind="Arredo"
              icon={<Armchair className="w-3.5 h-3.5" />}
              name={selectedFurniture.name}
              onRename={(v) => updateFurniture(selectedFurniture.id, { name: v })}
              onDuplicate={() => duplicateFurniture(selectedFurniture.id)}
              onDelete={() => removeFurniture(selectedFurniture.id)}
            />

            <Section title="Ingombro">
              <div className="grid grid-cols-2 gap-2">
                <CustomNumberInput
                  label="Larghezza"
                  value={selectedFurniture.width}
                  onChange={(v) => updateFurniture(selectedFurniture.id, { width: v })}
                  min={10}
                  max={800}
                />
                <CustomNumberInput
                  label="Profondità"
                  value={selectedFurniture.depth}
                  onChange={(v) => updateFurniture(selectedFurniture.id, { depth: v })}
                  min={10}
                  max={800}
                />
                <CustomNumberInput
                  label="Altezza"
                  value={selectedFurniture.height}
                  onChange={(v) => updateFurniture(selectedFurniture.id, { height: v })}
                  min={5}
                  max={400}
                />
                <CustomNumberInput
                  label="Da terra"
                  value={selectedFurniture.position.y}
                  onChange={(v) => updateFurniture(selectedFurniture.id, { position: { ...selectedFurniture.position, y: v } })}
                  min={0}
                  max={room.height - 10}
                  hint="pensili"
                />
              </div>
            </Section>

            <Section title="Posizione in pianta">
              <div className="grid grid-cols-2 gap-2">
                <CustomNumberInput
                  label="X"
                  value={selectedFurniture.position.x}
                  onChange={(v) => updateFurniture(selectedFurniture.id, { position: { ...selectedFurniture.position, x: v } })}
                  min={-500}
                  max={3000}
                />
                <CustomNumberInput
                  label="Y"
                  value={selectedFurniture.position.z}
                  onChange={(v) => updateFurniture(selectedFurniture.id, { position: { ...selectedFurniture.position, z: v } })}
                  min={-500}
                  max={3000}
                />
              </div>
              <p className="text-[11.5px] text-ink-400 leading-relaxed">
                Suggerimento: trascina l’arredo direttamente nella vista 3D o in pianta.
              </p>
            </Section>

            <Section
              title="Rotazione"
              action={<span className="font-mono text-[11.5px] text-brass-400">{selectedFurniture.rotationY}°</span>}
            >
              <div className="grid grid-cols-5 gap-1.5">
                {[0, 90, 180, 270].map((deg) => (
                  <button
                    key={deg}
                    onClick={() => updateFurniture(selectedFurniture.id, { rotationY: deg })}
                    className={`btn btn-sm !px-0 font-mono ${selectedFurniture.rotationY === deg ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {deg}°
                  </button>
                ))}
                <button
                  className="btn btn-secondary btn-sm !px-0"
                  title="Ruota di 15°"
                  aria-label="Ruota di 15 gradi"
                  onClick={() => updateFurniture(selectedFurniture.id, { rotationY: (selectedFurniture.rotationY + 15) % 360 })}
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </Section>

            <Divider />

            <CustomColorPicker
              label="Colore"
              value={selectedFurniture.color}
              onChange={(c) => updateFurniture(selectedFurniture.id, { color: c })}
            />
          </>
        )}

        {/* ------------------------------ DOOR / WINDOW ------------------------------ */}
        {opening && (
          <>
            <Header
              kind={selectedDoor ? 'Porta' : 'Finestra'}
              icon={selectedDoor ? <DoorOpen className="w-3.5 h-3.5" /> : <AppWindow className="w-3.5 h-3.5" />}
              name={opening.name}
              onRename={(v) => updateOpening({ name: v })}
              onDelete={() => (selectedDoor ? removeDoor(selectedDoor.id) : removeWindow(selectedWindow!.id))}
            />
            <WallSelect
              walls={walls}
              value={opening.wallId}
              onChange={(v) => {
                updateOpening({ wallId: v });
                setActiveWall(v);
              }}
            />
            <Section title="Dimensioni">
              <div className="grid grid-cols-2 gap-2">
                <CustomNumberInput label="Larghezza" value={opening.width} onChange={(v) => updateOpening({ width: v })} min={30} max={600} />
                <CustomNumberInput label="Altezza" value={opening.height} onChange={(v) => updateOpening({ height: v })} min={30} max={room.height} />
              </div>
            </Section>
            <Section title="Posizione">
              <div className="grid grid-cols-2 gap-2">
                <CustomNumberInput
                  label="Da sinistra"
                  value={opening.u}
                  onChange={(v) => updateOpening({ u: v })}
                  min={0}
                  max={openingWall ? Math.max(0, openingWall.length - opening.width) : 2000}
                />
                {selectedWindow ? (
                  <CustomNumberInput
                    label="Davanzale"
                    value={selectedWindow.elevationY}
                    onChange={(v) => updateWindow(selectedWindow.id, { elevationY: v })}
                    min={0}
                    max={Math.max(0, room.height - selectedWindow.height)}
                  />
                ) : (
                  <div />
                )}
              </div>
              {openingWall && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => updateOpening({ u: Math.round(((openingWall.length - opening.width) / 2) * 10) / 10 })}
                >
                  <AlignHorizontalJustifyCenter className="w-3.5 h-3.5" /> Centra sulla parete
                </button>
              )}
            </Section>
            <Divider />
            <CustomColorPicker
              label="Colore telaio"
              value={opening.frameColor}
              onChange={(c) => updateOpening({ frameColor: c })}
              presetColors={OPENING_COLORS}
            />
          </>
        )}

        {/* ------------------------------ WALL ------------------------------ */}
        {selectedWall && (
          <>
            <Header kind="Parete" icon={<BrickWall className="w-3.5 h-3.5" />} title={selectedWall.name} />
            <div className="card p-3.5 flex flex-col gap-2">
              <Stat label="Lunghezza" value={`${Math.round(selectedWall.length)} cm`} />
              <Stat label="Altezza" value={`${Math.round(selectedWall.height)} cm`} />
              <Stat label="Superficie" value={`${((selectedWall.length * selectedWall.height) / 10000).toFixed(1)} m²`} />
              <Stat label="Quadri" value={artworks.filter((a) => a.wallId === selectedWall.id).length} />
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setActiveWall(selectedWall.id);
                  setViewMode('2d_wall');
                }}
                className="btn btn-secondary"
              >
                <PanelTop className="w-4 h-4" /> Apri vista frontale
              </button>
              <button
                onClick={() => {
                  setActiveWall(selectedWall.id);
                  resetCamera('wall');
                }}
                className="btn btn-secondary"
              >
                <Eye className="w-4 h-4" /> Guarda questa parete in 3D
              </button>
              <button
                onClick={() => {
                  setActiveWall(selectedWall.id);
                  setLayoutModalOpen(true);
                }}
                className="btn btn-primary"
              >
                <Sparkles className="w-4 h-4" /> Genera disposizioni
              </button>
            </div>
            <Divider />
            <CustomColorPicker label="Colore pareti (tutte)" value={room.wallColor} onChange={setWallColor} />
          </>
        )}

        {/* ------------------------------ VERTEX ------------------------------ */}
        {selectedVertex && selectedVertexIndex !== null && (
          <>
            <Header kind="Vertice" icon={<Crosshair className="w-3.5 h-3.5" />} title={`Angolo V${selectedVertexIndex + 1}`} />
            <div className="grid grid-cols-2 gap-2">
              <CustomNumberInput
                label="X"
                value={selectedVertex.x}
                onChange={(v) => updateVertex(selectedVertexIndex, { ...selectedVertex, x: v })}
                min={-2000}
                max={4000}
              />
              <CustomNumberInput
                label="Y"
                value={selectedVertex.y}
                onChange={(v) => updateVertex(selectedVertexIndex, { ...selectedVertex, y: v })}
                min={-2000}
                max={4000}
              />
            </div>
            <button
              className="btn btn-danger"
              disabled={room.vertices.length <= 3}
              onClick={() => removeVertex(selectedVertexIndex)}
            >
              <Trash2 className="w-4 h-4" /> Elimina vertice
            </button>
          </>
        )}

        {/* ------------------------------ NOTHING ------------------------------ */}
        {nothing && (
          <>
            <div className="flex flex-col items-center text-center gap-3 pt-6 pb-2">
              <div className="w-12 h-12 rounded-2xl bg-ink-800 text-ink-400 flex items-center justify-center">
                <MousePointerClick className="w-5 h-5" />
              </div>
              <div>
                <p className="display text-[22px] text-ink-100">Nessuna selezione</p>
                <p className="text-[12.5px] text-ink-400 mt-1 leading-relaxed max-w-[240px]">
                  Tocca un quadro, un mobile o una parete per modificarne misure, colori e posizione.
                </p>
              </div>
            </div>
            <div className="card p-3.5 flex flex-col gap-2">
              <Stat label="Pareti" value={walls.length} />
              <Stat label="Quadri" value={artworks.length} />
              <Stat label="Arredi" value={furniture.length} />
              <Stat label="Porte e finestre" value={doors.length + windows.length} />
            </div>
            <div className="card p-3.5 flex flex-col gap-2.5 text-[12px] text-ink-300">
              <div className="flex items-center gap-2 text-ink-100 font-semibold">
                <Keyboard className="w-4 h-4 text-brass-400" /> Scorciatoie utili
              </div>
              <div className="flex items-center justify-between">
                <span>Sposta selezione</span>
                <span className="flex gap-1">
                  <span className="kbd">←</span>
                  <span className="kbd">→</span>
                  <span className="kbd">↑</span>
                  <span className="kbd">↓</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Annulla / Ripeti</span>
                <span className="flex gap-1">
                  <span className="kbd">Ctrl Z</span>
                  <span className="kbd">⇧ Z</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Duplica / Elimina</span>
                <span className="flex gap-1">
                  <span className="kbd">Ctrl D</span>
                  <span className="kbd">Canc</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Cambia vista</span>
                <span className="flex gap-1">
                  <span className="kbd">1</span>
                  <span className="kbd">2</span>
                  <span className="kbd">3</span>
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </SidePanel>
  );
};
