/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useMemo, useCallback } from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import {
  calculatePolygonArea,
  calculatePolygonPerimeter,
  getFurnitureFloorCorners,
  getBounds,
  wallPointAt,
  getArtworkTotalDimensions,
} from '../../utils/geometry';
import { Square, Shapes, Trash2, RotateCw, MousePointer2 } from 'lucide-react';

type DragState =
  | { kind: 'vertex'; index: number; moved: boolean }
  | { kind: 'furniture'; id: string; offX: number; offY: number; moved: boolean; start: { x: number; y: number } };

export const FloorPlan2DEditor: React.FC = () => {
  const room = useRoomStore((s) => s.room);
  const furniture = useRoomStore((s) => s.furniture);
  const doors = useRoomStore((s) => s.doors);
  const windows = useRoomStore((s) => s.windows);
  const artworks = useRoomStore((s) => s.artworks);
  const selectedId = useRoomStore((s) => s.selectedId);
  const selectedType = useRoomStore((s) => s.selectedType);
  const selectedVertexIndex = useRoomStore((s) => s.selectedVertexIndex);
  const snapToGrid = useRoomStore((s) => s.snapToGrid);
  const showGrid = useRoomStore((s) => s.showGrid);
  const showDimensions = useRoomStore((s) => s.showDimensions);
  const gridSize = useRoomStore((s) => s.gridSize);
  const {
    getWalls,
    setRoomShapeType,
    updateVertex,
    addVertex,
    removeVertex,
    updateFurniture,
    select,
    clearSelection,
    setActiveWall,
  } = useRoomStore.getState();

  const walls = useMemo(() => getWalls(), [room.vertices, room.height]); // eslint-disable-line react-hooks/exhaustive-deps
  const areaM2 = useMemo(() => calculatePolygonArea(room.vertices), [room.vertices]);
  const perimeterM = useMemo(() => calculatePolygonPerimeter(room.vertices), [room.vertices]);

  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoveredWall, setHoveredWall] = useState<number | null>(null);

  // Bounds are frozen while dragging so the view does not jump around
  const liveBounds = useMemo(() => {
    const pts = [...room.vertices];
    for (const f of furniture) pts.push(...getFurnitureFloorCorners(f));
    const b = getBounds(pts);
    const span = Math.max(b.maxX - b.minX, b.maxY - b.minY, 300);
    const pad = span * 0.14 + 40;
    return { minX: b.minX - pad, maxX: b.maxX + pad, minY: b.minY - pad, maxY: b.maxY + pad };
  }, [room.vertices, furniture]);
  const frozen = useRef(liveBounds);
  if (!drag) frozen.current = liveBounds;
  const bounds = frozen.current;

  const viewBoxW = bounds.maxX - bounds.minX;
  const viewBoxH = bounds.maxY - bounds.minY;
  const k = Math.max(viewBoxW, viewBoxH) / 620;
  const fs = (n: number) => n * k;

  const toPlan = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }, []);

  const snap = (v: number) => (snapToGrid ? Math.round(v / gridSize) * gridSize : Math.round(v));

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const p = toPlan(e.clientX, e.clientY);
    if (drag.kind === 'vertex') {
      updateVertex(drag.index, { x: snap(p.x), y: snap(p.y) });
      if (!drag.moved) setDrag({ ...drag, moved: true });
    } else {
      if (!drag.moved && Math.hypot(p.x - drag.start.x, p.y - drag.start.y) < 2 * k) return;
      const f = furniture.find((x) => x.id === drag.id);
      if (!f) return;
      updateFurniture(f.id, { position: { ...f.position, x: snap(p.x + drag.offX), z: snap(p.y + drag.offY) } });
      if (!drag.moved) setDrag({ ...drag, moved: true });
    }
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!drag) return;
    try {
      (e.target as Element).releasePointerCapture?.(e.pointerId);
    } catch {
      /* noop */
    }
    setDrag(null);
  };

  const selectedFurniture = selectedType === 'furniture' ? furniture.find((f) => f.id === selectedId) : null;
  const gridStep = gridSize * 10; // 50 cm squares by default

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Toolbar */}
      <div className="px-3 py-2 border-b hairline bg-ink-900/70 backdrop-blur flex flex-wrap items-center gap-2 justify-between z-10">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="seg">
            <button className="seg-item" data-active={room.shapeType === 'rectangular'} onClick={() => setRoomShapeType('rectangular')}>
              <Square className="w-3.5 h-3.5" /> Rettangolare
            </button>
            <button className="seg-item" data-active={room.shapeType === 'polygon'} onClick={() => setRoomShapeType('polygon')}>
              <Shapes className="w-3.5 h-3.5" /> Libera
            </button>
          </div>
          <div className="hidden md:flex items-center gap-3 text-[12px] text-ink-400">
            <span>
              Superficie <strong className="font-mono font-medium text-ink-100">{areaM2.toFixed(1)} m²</strong>
            </span>
            <span className="w-1 h-1 rounded-full bg-ink-600" />
            <span>
              Perimetro <strong className="font-mono font-medium text-ink-100">{perimeterM.toFixed(1)} m</strong>
            </span>
            <span className="w-1 h-1 rounded-full bg-ink-600" />
            <span>
              Altezza <strong className="font-mono font-medium text-ink-100">{room.height} cm</strong>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {selectedFurniture && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => updateFurniture(selectedFurniture.id, { rotationY: (selectedFurniture.rotationY + 90) % 360 })}
            >
              <RotateCw className="w-3.5 h-3.5" /> Ruota 90°
            </button>
          )}
          {room.shapeType === 'polygon' && selectedVertexIndex !== null && (
            <button className="btn btn-danger btn-sm" onClick={() => removeVertex(selectedVertexIndex)} disabled={room.vertices.length <= 3}>
              <Trash2 className="w-3.5 h-3.5" /> Elimina V{selectedVertexIndex + 1}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 relative p-3 sm:p-6 pb-20" onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
        <svg
          ref={svgRef}
          viewBox={`${bounds.minX} ${bounds.minY} ${viewBoxW} ${viewBoxH}`}
          className="w-full h-full select-none"
          style={{ touchAction: 'none' }}
          onPointerDown={() => clearSelection()}
          role="img"
          aria-label="Pianta della stanza"
        >
          <defs>
            <pattern id="planGrid" width={gridStep} height={gridStep} patternUnits="userSpaceOnUse">
              <path d={`M ${gridStep} 0 L 0 0 0 ${gridStep}`} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={0.8 * k} />
            </pattern>
            <pattern id="planGridFine" width={gridStep / 5} height={gridStep / 5} patternUnits="userSpaceOnUse">
              <path d={`M ${gridStep / 5} 0 L 0 0 0 ${gridStep / 5}`} fill="none" stroke="rgba(255,255,255,0.022)" strokeWidth={0.5 * k} />
            </pattern>
            <pattern id="floorFill" width={20} height={20} patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill={room.floorColor} />
              <path d="M0 20 L20 0" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
            </pattern>
          </defs>

          {showGrid && (
            <>
              <rect x={bounds.minX} y={bounds.minY} width={viewBoxW} height={viewBoxH} fill="url(#planGridFine)" />
              <rect x={bounds.minX} y={bounds.minY} width={viewBoxW} height={viewBoxH} fill="url(#planGrid)" />
            </>
          )}

          {/* Floor */}
          <polygon points={room.vertices.map((v) => `${v.x},${v.y}`).join(' ')} fill="url(#floorFill)" opacity={0.92} />

          {/* Furniture */}
          {furniture.map((f) => {
            const corners = getFurnitureFloorCorners(f);
            const isSel = selectedId === f.id;
            // Back side indicator (local -z)
            const back = [corners[0], corners[1]];
            return (
              <g
                key={f.id}
                className={drag?.kind === 'furniture' && drag.id === f.id ? 'cursor-grabbing' : 'cursor-grab'}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  select(f.id, 'furniture');
                  const p = toPlan(e.clientX, e.clientY);
                  setDrag({ kind: 'furniture', id: f.id, offX: f.position.x - p.x, offY: f.position.z - p.y, moved: false, start: p });
                  (e.currentTarget as Element).setPointerCapture(e.pointerId);
                }}
              >
                <polygon
                  points={corners.map((c) => `${c.x},${c.y}`).join(' ')}
                  fill={f.color}
                  fillOpacity={0.88}
                  stroke={isSel ? '#e3b866' : 'rgba(255,255,255,0.45)'}
                  strokeWidth={(isSel ? 2.5 : 1) * k}
                  strokeLinejoin="round"
                />
                <line x1={back[0].x} y1={back[0].y} x2={back[1].x} y2={back[1].y} stroke="rgba(0,0,0,0.45)" strokeWidth={4 * k} />
                <text
                  x={f.position.x}
                  y={f.position.z}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#fff"
                  fontSize={fs(9.5)}
                  fontWeight={600}
                  fontFamily="Inter"
                  className="pointer-events-none"
                  style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,.35)', strokeWidth: 2 * k }}
                >
                  {f.name}
                </text>
              </g>
            );
          })}

          {/* Walls */}
          {walls.map((wall, idx) => {
            const mid = wallPointAt(wall, wall.length / 2);
            const labelPos = wallPointAt(wall, wall.length / 2, -(16 + Math.abs(wall.normal.x) * 30 + Math.abs(wall.normal.y) * 6) * k);
            const isSel = selectedId === wall.id;
            const isHover = hoveredWall === idx;
            return (
              <g key={wall.id} onPointerEnter={() => setHoveredWall(idx)} onPointerLeave={() => setHoveredWall(null)}>
                <line
                  x1={wall.p1.x}
                  y1={wall.p1.y}
                  x2={wall.p2.x}
                  y2={wall.p2.y}
                  stroke={isSel ? '#e3b866' : isHover ? '#cfcfd8' : '#a4a4b0'}
                  strokeWidth={15}
                  strokeLinecap="square"
                  className="cursor-pointer"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    select(wall.id, 'wall');
                    setActiveWall(wall.id);
                  }}
                />
                {showDimensions && (
                  <g transform={`translate(${labelPos.x}, ${labelPos.y})`} className="pointer-events-none">
                    <rect x={-30 * k} y={-9 * k} width={60 * k} height={18 * k} rx={9 * k} fill="#0b0b0d" stroke="rgba(255,255,255,0.12)" strokeWidth={0.8 * k} />
                    <text y={3.5 * k} textAnchor="middle" fill="#cfcfd8" fontSize={fs(9.5)} fontFamily="JetBrains Mono">
                      {Math.round(wall.length)} cm
                    </text>
                  </g>
                )}
                {room.shapeType === 'polygon' && (
                  <g
                    transform={`translate(${mid.x}, ${mid.y})`}
                    className="cursor-copy"
                    opacity={isHover ? 1 : 0.0001}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      addVertex({ x: Math.round(mid.x), y: Math.round(mid.y) }, idx);
                    }}
                  >
                    <circle r={10 * k} fill="#e3b866" stroke="#0b0b0d" strokeWidth={2 * k} />
                    <path d={`M ${-4.5 * k} 0 H ${4.5 * k} M 0 ${-4.5 * k} V ${4.5 * k}`} stroke="#1a1407" strokeWidth={2 * k} strokeLinecap="round" />
                  </g>
                )}
              </g>
            );
          })}

          {/* Doors: gap + swing arc */}
          {doors.map((d) => {
            const wall = walls.find((w) => w.id === d.wallId);
            if (!wall) return null;
            const a = wallPointAt(wall, d.u);
            const b = wallPointAt(wall, d.u + d.width);
            const open = wallPointAt(wall, d.u, d.width);
            const isSel = selectedId === d.id;
            return (
              <g
                key={d.id}
                className="cursor-pointer"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  select(d.id, 'door');
                  setActiveWall(wall.id);
                }}
              >
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#16161a" strokeWidth={17} />
                <line x1={a.x} y1={a.y} x2={open.x} y2={open.y} stroke={isSel ? '#e3b866' : '#cfcfd8'} strokeWidth={2.5 * k} />
                <path
                  d={`M ${open.x} ${open.y} A ${d.width} ${d.width} 0 0 ${wall.normal.x * wall.uDir.y - wall.normal.y * wall.uDir.x > 0 ? 0 : 1} ${b.x} ${b.y}`}
                  fill="none"
                  stroke={isSel ? '#e3b866' : '#7c7c88'}
                  strokeWidth={1 * k}
                  strokeDasharray={`${4 * k} ${3 * k}`}
                />
              </g>
            );
          })}

          {/* Windows */}
          {windows.map((w) => {
            const wall = walls.find((x) => x.id === w.wallId);
            if (!wall) return null;
            const a = wallPointAt(wall, w.u);
            const b = wallPointAt(wall, w.u + w.width);
            const isSel = selectedId === w.id;
            return (
              <g
                key={w.id}
                className="cursor-pointer"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  select(w.id, 'window');
                  setActiveWall(wall.id);
                }}
              >
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#bfe3f5" strokeWidth={15} />
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={isSel ? '#e3b866' : '#5a9bbd'} strokeWidth={2 * k} />
              </g>
            );
          })}

          {/* Artworks: brass bars on the inner face */}
          {artworks.map((art) => {
            const wall = walls.find((w) => w.id === art.wallId);
            if (!wall) return null;
            const { totalWidth } = getArtworkTotalDimensions(art);
            const a = wallPointAt(wall, art.u, 11);
            const b = wallPointAt(wall, art.u + totalWidth, 11);
            const isSel = selectedId === art.id;
            return (
              <line
                key={art.id}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={isSel ? '#f1d39b' : '#e3b866'}
                strokeWidth={(isSel ? 6 : 4) * k}
                strokeLinecap="round"
                className="cursor-pointer"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  select(art.id, 'artwork');
                  setActiveWall(wall.id);
                }}
              >
                <title>{art.name}</title>
              </line>
            );
          })}

          {/* Vertices */}
          {room.vertices.map((v, idx) => {
            const editable = room.shapeType === 'polygon';
            const isSel = selectedVertexIndex === idx;
            return (
              <g
                key={`v-${idx}`}
                className={editable ? 'cursor-grab' : ''}
                onPointerDown={(e) => {
                  if (!editable) return;
                  e.stopPropagation();
                  select(null, 'vertex', idx);
                  setDrag({ kind: 'vertex', index: idx, moved: false });
                  (e.currentTarget as Element).setPointerCapture(e.pointerId);
                }}
              >
                {editable && <circle cx={v.x} cy={v.y} r={16 * k} fill="transparent" />}
                <circle
                  cx={v.x}
                  cy={v.y}
                  r={(editable ? (isSel ? 8 : 6.5) : 3.5) * k}
                  fill={isSel ? '#e3b866' : editable ? '#ececf1' : '#7c7c88'}
                  stroke="#0b0b0d"
                  strokeWidth={2 * k}
                />
                {editable && (
                  <text x={v.x} y={v.y - 13 * k} textAnchor="middle" fill="#e3b866" fontSize={fs(8.5)} fontFamily="JetBrains Mono" className="pointer-events-none">
                    V{idx + 1}
                  </text>
                )}
              </g>
            );
          })}

          {/* Wall names */}
          {showDimensions &&
            walls.map((wall) => {
              const p = wallPointAt(wall, wall.length / 2, 30 * k);
              return (
                <text key={`n-${wall.id}`} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill="rgba(0,0,0,0.45)" fontSize={fs(8.5)} fontFamily="Inter" fontWeight={600} className="pointer-events-none">
                  {wall.name.replace('Parete ', 'P')}
                </text>
              );
            })}
        </svg>

        <div className="absolute top-3 left-3 sm:left-6 glass rounded-xl px-3 py-2 text-[11.5px] text-ink-300 max-w-[min(92%,380px)] flex gap-2">
          <MousePointer2 className="w-3.5 h-3.5 text-brass-400 shrink-0 mt-0.5" />
          {room.shapeType === 'polygon' ? (
            <span>Trascina gli angoli per modellare la stanza; passa sopra una parete e premi “+” per aggiungere un vertice.</span>
          ) : (
            <span>Trascina gli arredi per spostarli. Passa a “Libera” per disegnare stanze a L o irregolari.</span>
          )}
        </div>
      </div>
    </div>
  );
};
