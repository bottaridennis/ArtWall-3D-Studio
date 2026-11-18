/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import { FURNITURE_PRESETS, WALL_COLOR_OPTIONS, FLOOR_COLOR_OPTIONS, FurniturePreset } from '../../constants/presets';
import { CustomNumberInput } from '../ui/CustomNumberInput';
import { CustomColorPicker } from '../ui/CustomColorPicker';
import { Section, Divider, Stat, EmptyState } from '../ui/Section';
import { SidePanel } from './SidePanel';
import {
  calculatePolygonArea,
  calculatePolygonPerimeter,
  getBounds,
  getArtworkTotalDimensions,
} from '../../utils/geometry';
import {
  Home,
  Armchair,
  Image as ImageIcon,
  DoorOpen,
  Plus,
  Sparkles,
  Trash2,
  AppWindow,
  Square,
  Shapes,
  X,
  Check,
} from 'lucide-react';

type Tab = 'art' | 'furniture' | 'room' | 'openings';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'art', label: 'Quadri', icon: ImageIcon },
  { id: 'furniture', label: 'Arredi', icon: Armchair },
  { id: 'openings', label: 'Infissi', icon: DoorOpen },
  { id: 'room', label: 'Stanza', icon: Home },
];

const CATEGORY_LABELS: Record<FurniturePreset['category'] | 'all', string> = {
  all: 'Tutti',
  sedute: 'Sedute',
  contenimento: 'Contenitori',
  tavoli: 'Tavoli',
  zona_notte: 'Notte',
};

/** Mini top-down proportional preview of a furniture footprint */
const Footprint: React.FC<{ w: number; d: number; color: string }> = ({ w, d, color }) => {
  const max = Math.max(w, d);
  const sw = (w / max) * 30;
  const sd = (d / max) * 30;
  return (
    <svg viewBox="0 0 36 36" className="w-9 h-9 shrink-0">
      <rect x={18 - sw / 2} y={18 - sd / 2} width={sw} height={sd} rx="2.5" fill={color} opacity="0.9" />
      <rect x={18 - sw / 2} y={18 - sd / 2} width={sw} height={sd} rx="2.5" fill="none" stroke="rgba(255,255,255,.25)" />
    </svg>
  );
};

export const LeftSidebar: React.FC = () => {
  const room = useRoomStore((s) => s.room);
  const furniture = useRoomStore((s) => s.furniture);
  const artworks = useRoomStore((s) => s.artworks);
  const doors = useRoomStore((s) => s.doors);
  const windows = useRoomStore((s) => s.windows);
  const selectedId = useRoomStore((s) => s.selectedId);
  const activeWallId = useRoomStore((s) => s.activeWallId);
  const leftPanelOpen = useRoomStore((s) => s.leftPanelOpen);
  const {
    setRoomDimensions,
    setRoomHeight,
    setRoomShapeType,
    setWallColor,
    setFloorColor,
    addFurniture,
    removeFurniture,
    addDoor,
    addWindow,
    removeArtwork,
    removeDoor,
    removeWindow,
    select,
    setActiveWall,
    setAddArtworkModalOpen,
    setLayoutModalOpen,
    setLeftPanelOpen,
    setViewMode,
    getWalls,
  } = useRoomStore.getState();

  const [activeTab, setActiveTab] = useState<Tab>('art');
  const [category, setCategory] = useState<FurniturePreset['category'] | 'all'>('all');
  const [openingWallId, setOpeningWallId] = useState<string | null>(null);

  const walls = useMemo(() => getWalls(), [room.vertices, room.height]);
  const area = useMemo(() => calculatePolygonArea(room.vertices), [room.vertices]);
  const perimeter = useMemo(() => calculatePolygonPerimeter(room.vertices), [room.vertices]);
  const targetWallId = openingWallId && walls.some((w) => w.id === openingWallId) ? openingWallId : activeWallId;

  const wallName = (id: string) => walls.find((w) => w.id === id)?.name || 'Parete ?';

  const pickAndMaybeClose = (fn: () => void) => {
    fn();
    // keep drawer open on desktop; on mobile let the user see the result
    if (window.innerWidth < 1024) setLeftPanelOpen(false);
  };

  const addPreset = (preset: FurniturePreset) => {
    const b = getBounds(room.vertices);
    pickAndMaybeClose(() =>
      addFurniture({
        name: preset.name,
        width: preset.width,
        height: preset.height,
        depth: preset.depth,
        color: preset.color,
        position: { x: Math.round((b.minX + b.maxX) / 2), y: 0, z: Math.round((b.minY + b.maxY) / 2) },
        rotationY: 0,
      })
    );
  };

  const artworksByWall = useMemo(() => {
    return walls
      .map((w) => ({ wall: w, items: artworks.filter((a) => a.wallId === w.id) }))
      .filter((g) => g.items.length > 0);
  }, [walls, artworks]);

  const presets = FURNITURE_PRESETS.filter((p) => category === 'all' || p.category === category);

  return (
    <SidePanel side="left" open={leftPanelOpen} onClose={() => setLeftPanelOpen(false)} label="Libreria" width="w-[340px]">
      {/* Tabs */}
      <div className="h-14 px-3 border-b hairline flex items-center gap-2 shrink-0">
        <div className="seg flex-1" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={activeTab === t.id}
              data-active={activeTab === t.id}
              onClick={() => setActiveTab(t.id)}
              className="seg-item flex-1 justify-center !px-1.5"
              title={t.label}
            >
              <t.icon className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[11.5px]">{t.label}</span>
            </button>
          ))}
        </div>
        <button className="icon-btn lg:hidden" onClick={() => setLeftPanelOpen(false)} aria-label="Chiudi libreria">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 scroll-area p-4 flex flex-col gap-5">
        {/* ------------------------------ QUADRI ------------------------------ */}
        {activeTab === 'art' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn btn-primary" onClick={() => pickAndMaybeClose(() => setAddArtworkModalOpen(true))}>
                <Plus className="w-4 h-4" />
                Nuovo quadro
              </button>
              <button className="btn btn-secondary" onClick={() => pickAndMaybeClose(() => setLayoutModalOpen(true))}>
                <Sparkles className="w-3.5 h-3.5 text-brass-400" />
                Auto layout
              </button>
            </div>

            {artworks.length === 0 ? (
              <EmptyState
                icon={<ImageIcon className="w-4 h-4" />}
                title="Nessun quadro appeso"
                text="Aggiungi un’opera dalla collezione o carica una tua foto, poi lascia che l’auto layout trovi la composizione ideale."
              />
            ) : (
              artworksByWall.map(({ wall, items }) => (
                <Section
                  key={wall.id}
                  title={`${wall.name} · ${items.length}`}
                  action={
                    <button
                      className="text-[11px] text-ink-400 hover:text-brass-400 transition-colors"
                      onClick={() =>
                        pickAndMaybeClose(() => {
                          setActiveWall(wall.id);
                          setViewMode('2d_wall');
                        })
                      }
                    >
                      Apri parete →
                    </button>
                  }
                >
                  <div className="flex flex-col gap-1 -mx-1.5">
                    {items.map((a) => {
                      const dims = getArtworkTotalDimensions(a);
                      return (
                        <div
                          key={a.id}
                          data-active={selectedId === a.id}
                          onClick={() => {
                            select(a.id, 'artwork');
                            setActiveWall(a.wallId);
                          }}
                          className="row-item group"
                        >
                          <div
                            className="w-10 h-10 rounded-md shrink-0 p-[3px] shadow-md"
                            style={{ background: a.frame.enabled ? a.frame.color : 'transparent' }}
                          >
                            <img
                              src={a.imageUrl}
                              alt=""
                              loading="lazy"
                              className="w-full h-full object-cover rounded-[3px] bg-ink-800"
                              onError={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = "hidden")}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12.5px] font-medium text-ink-100 truncate">{a.name}</p>
                            <p className="text-[11px] text-ink-400 font-mono">
                              {Math.round(dims.totalWidth)}×{Math.round(dims.totalHeight)} cm · h {Math.round(a.elevationY)}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeArtwork(a.id);
                            }}
                            className="icon-btn !w-7 !h-7 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:!text-danger"
                            title="Rimuovi quadro"
                            aria-label={`Rimuovi ${a.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </Section>
              ))
            )}
          </>
        )}

        {/* ------------------------------ ARREDI ------------------------------ */}
        {activeTab === 'furniture' && (
          <>
            <Section title="Catalogo ingombri">
              <p className="text-[12px] text-ink-400 -mt-1 leading-relaxed">
                Volumi reali degli arredi: servono al generatore per non appendere quadri dietro mobili alti.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`h-7 px-2.5 rounded-full text-[11.5px] font-medium border transition-colors ${
                      category === c
                        ? 'bg-brass-500/15 border-brass-500/40 text-brass-300'
                        : 'border-white/8 text-ink-400 hover:text-ink-100'
                    }`}
                  >
                    {CATEGORY_LABELS[c]}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => addPreset(preset)}
                    className="card p-2.5 text-left flex flex-col gap-1.5 hover:border-brass-500/40 hover:bg-ink-800 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <Footprint w={preset.width} d={preset.depth} color={preset.color} />
                      <Plus className="w-3.5 h-3.5 text-ink-500 group-hover:text-brass-400" />
                    </div>
                    <p className="text-[12px] font-medium text-ink-100 leading-tight">{preset.name}</p>
                    <p className="text-[10.5px] font-mono text-ink-400">
                      {preset.width}×{preset.depth}×{preset.height}
                    </p>
                  </button>
                ))}
              </div>
            </Section>

            <Divider />

            <Section title={`Nella stanza · ${furniture.length}`}>
              {furniture.length === 0 ? (
                <p className="text-[12px] text-ink-500">Nessun arredo inserito.</p>
              ) : (
                <div className="flex flex-col gap-1 -mx-1.5">
                  {furniture.map((f) => (
                    <div key={f.id} data-active={selectedId === f.id} onClick={() => select(f.id, 'furniture')} className="row-item group">
                      <span className="w-3 h-3 rounded-[4px] shrink-0 ring-1 ring-white/15" style={{ backgroundColor: f.color }} />
                      <span className="text-[12.5px] text-ink-100 truncate flex-1">{f.name}</span>
                      <span className="text-[11px] font-mono text-ink-400 shrink-0">
                        {f.width}×{f.depth}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFurniture(f.id);
                        }}
                        className="icon-btn !w-7 !h-7 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:!text-danger"
                        aria-label={`Rimuovi ${f.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </>
        )}

        {/* ------------------------------ INFISSI ------------------------------ */}
        {activeTab === 'openings' && (
          <>
            <Section title="Aggiungi apertura">
              <p className="text-[12px] text-ink-400 -mt-1 leading-relaxed">
                Porte e finestre definiscono le zone in cui non è possibile appendere quadri.
              </p>
              <label className="flex flex-col gap-1.5">
                <span className="field-label">Parete</span>
                <select className="field" value={targetWallId} onChange={(e) => setOpeningWallId(e.target.value)}>
                  {walls.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} — {Math.round(w.length)} cm
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const wall = walls.find((w) => w.id === targetWallId);
                    addDoor({
                      name: 'Porta',
                      wallId: targetWallId,
                      u: wall ? Math.max(0, Math.round(wall.length / 2 - 45)) : 60,
                      width: 90,
                      height: 210,
                      elevationY: 0,
                      frameColor: '#3f3f46',
                    });
                  }}
                  className="card p-3 text-left flex flex-col gap-2 hover:border-brass-500/40 hover:bg-ink-800 transition-colors"
                >
                  <DoorOpen className="w-5 h-5 text-brass-400" />
                  <span className="text-[12.5px] font-semibold text-ink-100">Porta</span>
                  <span className="text-[10.5px] font-mono text-ink-400">90 × 210 cm</span>
                </button>
                <button
                  onClick={() => {
                    const wall = walls.find((w) => w.id === targetWallId);
                    addWindow({
                      name: 'Finestra',
                      wallId: targetWallId,
                      u: wall ? Math.max(0, Math.round(wall.length / 2 - 60)) : 60,
                      width: 120,
                      height: 140,
                      elevationY: 90,
                      frameColor: '#3f3f46',
                    });
                  }}
                  className="card p-3 text-left flex flex-col gap-2 hover:border-brass-500/40 hover:bg-ink-800 transition-colors"
                >
                  <AppWindow className="w-5 h-5 text-sky-glass" />
                  <span className="text-[12.5px] font-semibold text-ink-100">Finestra</span>
                  <span className="text-[10.5px] font-mono text-ink-400">120 × 140 cm</span>
                </button>
              </div>
            </Section>

            <Divider />

            <Section title={`Posizionati · ${doors.length + windows.length}`}>
              {doors.length + windows.length === 0 ? (
                <p className="text-[12px] text-ink-500">Nessuna porta o finestra.</p>
              ) : (
                <div className="flex flex-col gap-1 -mx-1.5">
                  {[...doors.map((d) => ({ ...d, kind: 'door' as const })), ...windows.map((w) => ({ ...w, kind: 'window' as const }))].map(
                    (o) => (
                      <div
                        key={o.id}
                        data-active={selectedId === o.id}
                        onClick={() => {
                          select(o.id, o.kind);
                          setActiveWall(o.wallId);
                        }}
                        className="row-item group"
                      >
                        {o.kind === 'door' ? (
                          <DoorOpen className="w-4 h-4 text-brass-400 shrink-0" />
                        ) : (
                          <AppWindow className="w-4 h-4 text-sky-glass shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[12.5px] text-ink-100 truncate">{o.name}</p>
                          <p className="text-[11px] text-ink-400">{wallName(o.wallId)}</p>
                        </div>
                        <span className="text-[11px] font-mono text-ink-400">
                          {o.width}×{o.height}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (o.kind === 'door') removeDoor(o.id);
                            else removeWindow(o.id);
                          }}
                          className="icon-btn !w-7 !h-7 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:!text-danger"
                          aria-label={`Rimuovi ${o.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}
            </Section>
          </>
        )}

        {/* ------------------------------ STANZA ------------------------------ */}
        {activeTab === 'room' && (
          <>
            <Section title="Forma">
              <div className="seg w-full">
                <button
                  data-active={room.shapeType === 'rectangular'}
                  onClick={() => setRoomShapeType('rectangular')}
                  className="seg-item flex-1 justify-center"
                >
                  <Square className="w-3.5 h-3.5" /> Rettangolare
                </button>
                <button
                  data-active={room.shapeType === 'polygon'}
                  onClick={() => {
                    setRoomShapeType('polygon');
                    setViewMode('2d_plan');
                  }}
                  className="seg-item flex-1 justify-center"
                >
                  <Shapes className="w-3.5 h-3.5" /> Irregolare
                </button>
              </div>
              {room.shapeType === 'polygon' && (
                <p className="text-[12px] text-ink-400 leading-relaxed">
                  Modifica gli angoli trascinandoli nella vista <strong className="text-ink-200">Pianta</strong>; usa il
                  “+” al centro di una parete per aggiungere un vertice.
                </p>
              )}
            </Section>

            <Section title="Dimensioni">
              {room.shapeType === 'rectangular' && (
                <div className="grid grid-cols-2 gap-2">
                  <CustomNumberInput
                    label="Larghezza"
                    value={room.width}
                    onChange={(w) => setRoomDimensions(w, room.length, room.height)}
                    min={150}
                    max={2000}
                    step={10}
                  />
                  <CustomNumberInput
                    label="Profondità"
                    value={room.length}
                    onChange={(l) => setRoomDimensions(room.width, l, room.height)}
                    min={150}
                    max={2000}
                    step={10}
                  />
                </div>
              )}
              <CustomNumberInput label="Altezza soffitto" value={room.height} onChange={setRoomHeight} min={200} max={600} step={5} />
              <div className="card p-3 flex flex-col gap-1.5">
                <Stat label="Superficie" value={`${area.toFixed(1)} m²`} />
                <Stat label="Perimetro" value={`${perimeter.toFixed(1)} m`} />
                <Stat label="Pareti" value={walls.length} />
              </div>
            </Section>

            <Divider />

            <CustomColorPicker label="Colore pareti" value={room.wallColor} onChange={setWallColor} presetColors={WALL_COLOR_OPTIONS} />

            <Divider />

            <Section title="Pavimento">
              <div className="grid grid-cols-2 gap-1.5">
                {FLOOR_COLOR_OPTIONS.map((f) => {
                  const active = room.floorColor === f.value;
                  return (
                    <button
                      key={f.name}
                      onClick={() => setFloorColor(f.value, f.material)}
                      className={`relative p-2 rounded-lg border text-left text-[11.5px] transition-colors flex items-center gap-2 ${
                        active ? 'border-brass-500/50 bg-brass-500/8 text-ink-100' : 'border-white/6 text-ink-300 hover:text-ink-100 hover:bg-white/3'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-md shrink-0 ring-1 ring-white/10" style={{ backgroundColor: f.value }} />
                      <span className="leading-tight">{f.name}</span>
                      {active && <Check className="w-3 h-3 text-brass-400 absolute top-1.5 right-1.5" />}
                    </button>
                  );
                })}
              </div>
            </Section>
          </>
        )}
      </div>
    </SidePanel>
  );
};
