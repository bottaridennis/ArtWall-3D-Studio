/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useMemo, useCallback } from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import { getWallObstacles, getArtworkTotalDimensions, checkAABBCollision } from '../../utils/geometry';
import { Artwork } from '../../types/room';
import {
  Sparkles,
  AlignHorizontalJustifyCenter,
  Eye,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Group,
  Image as ImageIcon,
} from 'lucide-react';

type DragTarget = { kind: 'artwork' | 'door' | 'window'; id: string };

interface DragState extends DragTarget {
  startPt: { x: number; y: number };
  startU: number;
  startV: number;
  width: number;
  height: number;
  moved: boolean;
}

const SNAP_TOLERANCE = 3; // cm

export const WallElevation2DEditor: React.FC = () => {
  const room = useRoomStore((s) => s.room);
  const furniture = useRoomStore((s) => s.furniture);
  const doors = useRoomStore((s) => s.doors);
  const windows = useRoomStore((s) => s.windows);
  const artworks = useRoomStore((s) => s.artworks);
  const activeWallId = useRoomStore((s) => s.activeWallId);
  const selectedId = useRoomStore((s) => s.selectedId);
  const showDimensions = useRoomStore((s) => s.showDimensions);
  const showGrid = useRoomStore((s) => s.showGrid);
  const snapToGrid = useRoomStore((s) => s.snapToGrid);
  const gridSize = useRoomStore((s) => s.gridSize);
  const eyeLevel = useRoomStore((s) => s.layoutOptions.targetEyeLevel);
  const {
    getWalls,
    setActiveWall,
    select,
    clearSelection,
    moveArtwork,
    updateArtwork,
    updateDoor,
    updateWindow,
    setLayoutModalOpen,
    setAddArtworkModalOpen,
  } = useRoomStore.getState();

  const walls = useMemo(() => getWalls(), [room.vertices, room.height]); // eslint-disable-line react-hooks/exhaustive-deps
  const activeIndex = Math.max(0, walls.findIndex((w) => w.id === activeWallId));
  const activeWall = walls[activeIndex];

  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });

  const obstacles = useMemo(
    () => (activeWall ? getWallObstacles(activeWall, furniture, doors, windows) : []),
    [activeWall, furniture, doors, windows]
  );

  const wallArtworks = useMemo(
    () => (activeWall ? artworks.filter((a) => a.wallId === activeWall.id) : []),
    [artworks, activeWall]
  );

  const wallW = activeWall?.length || 100;
  const wallH = activeWall?.height || 100;

  const collisionMap = useMemo(() => {
    const map = new Map<string, boolean>();
    wallArtworks.forEach((art) => {
      const { totalWidth, totalHeight } = getArtworkTotalDimensions(art);
      const box = { uMin: art.u, uMax: art.u + totalWidth, vMin: art.elevationY, vMax: art.elevationY + totalHeight };
      let collides = box.uMin < -0.5 || box.uMax > wallW + 0.5 || box.vMin < -0.5 || box.vMax > wallH + 0.5;
      if (!collides) collides = obstacles.some((obs) => checkAABBCollision(box, obs, -0.5));
      if (!collides)
        collides = wallArtworks.some((o) => {
          if (o.id === art.id) return false;
          const d = getArtworkTotalDimensions(o);
          return checkAABBCollision(box, { uMin: o.u, uMax: o.u + d.totalWidth, vMin: o.elevationY, vMax: o.elevationY + d.totalHeight }, -0.5);
        });
      map.set(art.id, collides);
    });
    return map;
  }, [wallArtworks, obstacles, wallW, wallH]);

  const toWall = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }, []);

  if (!activeWall) {
    return <div className="flex-1 flex items-center justify-center text-ink-400">Nessuna parete disponibile</div>;
  }

  // Visual scale helpers (viewBox is in cm)
  const padX = Math.max(50, wallW * 0.08);
  const padTop = Math.max(50, wallH * 0.16);
  const padBottom = Math.max(70, wallH * 0.24);
  const viewBoxW = wallW + padX * 2;
  const viewBoxH = wallH + padTop + padBottom;
  const k = Math.max(viewBoxW / 1.6, viewBoxH) / 520; // ≈ cm per screen "unit"
  const fs = (n: number) => n * k;

  const selectedArtwork = wallArtworks.find((a) => a.id === selectedId);
  const selectedDims = selectedArtwork ? getArtworkTotalDimensions(selectedArtwork) : null;
  const hasCollision = Array.from(collisionMap.values()).some(Boolean);

  /* ------------------------------ Dragging ------------------------------ */

  const startDrag = (target: DragTarget, u: number, v: number, w: number, h: number, e: React.PointerEvent) => {
    e.stopPropagation();
    if (target.kind === 'artwork') select(target.id, 'artwork');
    else select(target.id, target.kind);
    setDrag({ ...target, startPt: toWall(e.clientX, e.clientY), startU: u, startV: v, width: w, height: h, moved: false });
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const p = toWall(e.clientX, e.clientY);
    const dx = p.x - drag.startPt.x;
    const dy = drag.startPt.y - p.y; // SVG y grows downward, wall v grows upward
    if (!drag.moved && Math.hypot(dx, dy) < 1.5 * k) return;

    let u = drag.startU + dx;
    let v = drag.startV + dy;

    const gx: number[] = [];
    const gy: number[] = [];

    if (drag.kind === 'artwork') {
      // Smart guides: snap centers/edges to wall center, eye level and other artworks
      const cxCandidates = [wallW / 2];
      const cyCandidates = [eyeLevel];
      const edgeY: number[] = [];
      for (const o of wallArtworks) {
        if (o.id === drag.id) continue;
        const d = getArtworkTotalDimensions(o);
        cxCandidates.push(o.u + d.totalWidth / 2);
        cyCandidates.push(o.elevationY + d.totalHeight / 2);
        edgeY.push(o.elevationY, o.elevationY + d.totalHeight);
      }
      for (const obs of obstacles) if (obs.type === 'furniture') cxCandidates.push((obs.uMin + obs.uMax) / 2);

      const cx = u + drag.width / 2;
      const snapX = cxCandidates.find((c) => Math.abs(c - cx) < SNAP_TOLERANCE * k);
      if (snapX !== undefined) {
        u = snapX - drag.width / 2;
        gx.push(snapX);
      } else if (snapToGrid) u = Math.round(u / gridSize) * gridSize;

      const cy = v + drag.height / 2;
      const snapCY = cyCandidates.find((c) => Math.abs(c - cy) < SNAP_TOLERANCE * k);
      const snapBottom = edgeY.find((c) => Math.abs(c - v) < SNAP_TOLERANCE * k);
      const snapTop = edgeY.find((c) => Math.abs(c - (v + drag.height)) < SNAP_TOLERANCE * k);
      if (snapCY !== undefined) {
        v = snapCY - drag.height / 2;
        gy.push(snapCY);
      } else if (snapBottom !== undefined) {
        v = snapBottom;
        gy.push(snapBottom);
      } else if (snapTop !== undefined) {
        v = snapTop - drag.height;
        gy.push(snapTop);
      } else if (snapToGrid) v = Math.round(v / gridSize) * gridSize;
    } else if (snapToGrid) {
      u = Math.round(u / gridSize) * gridSize;
      v = Math.round(v / gridSize) * gridSize;
    }

    u = Math.max(0, Math.min(wallW - drag.width, u));
    v = Math.max(0, Math.min(wallH - drag.height, v));
    u = Math.round(u * 10) / 10;
    v = Math.round(v * 10) / 10;

    if (drag.kind === 'artwork') moveArtwork(drag.id, u, v, activeWall.id);
    else if (drag.kind === 'door') updateDoor(drag.id, { u });
    else updateWindow(drag.id, { u, elevationY: v });

    setGuides({ x: gx, y: gy });
    if (!drag.moved) setDrag({ ...drag, moved: true });
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!drag) return;
    try {
      (e.target as Element).releasePointerCapture?.(e.pointerId);
    } catch {
      /* noop */
    }
    setDrag(null);
    setGuides({ x: [], y: [] });
  };

  /* ------------------------------ Group tools ------------------------------ */

  const groupBox = () => {
    if (wallArtworks.length === 0) return null;
    let uMin = Infinity, uMax = -Infinity, vMin = Infinity, vMax = -Infinity;
    for (const a of wallArtworks) {
      const d = getArtworkTotalDimensions(a);
      uMin = Math.min(uMin, a.u);
      uMax = Math.max(uMax, a.u + d.totalWidth);
      vMin = Math.min(vMin, a.elevationY);
      vMax = Math.max(vMax, a.elevationY + d.totalHeight);
    }
    return { uMin, uMax, vMin, vMax };
  };

  const centerGroup = () => {
    const g = groupBox();
    if (!g) return;
    const du = (wallW - (g.uMax - g.uMin)) / 2 - g.uMin;
    const dv = eyeLevel - (g.vMin + g.vMax) / 2;
    for (const a of wallArtworks)
      updateArtwork(a.id, { u: Math.round((a.u + du) * 10) / 10, elevationY: Math.max(0, Math.round((a.elevationY + dv) * 10) / 10) });
  };

  const y = (v: number) => wallH - v; // wall v (from floor) -> svg y

  const go = (delta: number) => {
    const next = walls[(activeIndex + delta + walls.length) % walls.length];
    setActiveWall(next.id);
    clearSelection();
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Toolbar */}
      <div className="px-3 py-2 border-b hairline bg-ink-900/70 backdrop-blur flex flex-wrap items-center gap-2 justify-between z-10">
        <div className="flex items-center gap-1 min-w-0">
          <button className="icon-btn" onClick={() => go(-1)} aria-label="Parete precedente" title="Parete precedente">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="seg max-w-[52vw] sm:max-w-none overflow-x-auto">
            {walls.map((w) => (
              <button
                key={w.id}
                data-active={w.id === activeWall.id}
                onClick={() => {
                  setActiveWall(w.id);
                  clearSelection();
                }}
                className="seg-item"
              >
                {w.name.replace('Parete ', 'P')}
                <span className="font-mono text-[10.5px] text-ink-500">{Math.round(w.length)}</span>
              </button>
            ))}
          </div>
          <button className="icon-btn" onClick={() => go(1)} aria-label="Parete successiva" title="Parete successiva">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {selectedArtwork && selectedDims && (
            <>
              <button
                onClick={() => moveArtwork(selectedArtwork.id, Math.round(((wallW - selectedDims.totalWidth) / 2) * 10) / 10, selectedArtwork.elevationY)}
                className="btn btn-ghost btn-sm"
                title="Centra il quadro sulla parete"
              >
                <AlignHorizontalJustifyCenter className="w-3.5 h-3.5" /> Centra
              </button>
              <button
                onClick={() => moveArtwork(selectedArtwork.id, selectedArtwork.u, Math.max(0, Math.round(eyeLevel - selectedDims.totalHeight / 2)))}
                className="btn btn-ghost btn-sm"
                title={`Centro del quadro a ${eyeLevel} cm`}
              >
                <Eye className="w-3.5 h-3.5" /> {eyeLevel} cm
              </button>
            </>
          )}
          {wallArtworks.length > 1 && (
            <button onClick={centerGroup} className="btn btn-ghost btn-sm" title="Centra l’intero gruppo sulla parete e all’altezza occhi">
              <Group className="w-3.5 h-3.5" /> Centra gruppo
            </button>
          )}
          <button onClick={() => setAddArtworkModalOpen(true)} className="btn btn-secondary btn-sm">
            <Plus className="w-3.5 h-3.5" /> Quadro
          </button>
          <button onClick={() => setLayoutModalOpen(true)} className="btn btn-primary btn-sm">
            <Sparkles className="w-3.5 h-3.5" /> Auto layout
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0 relative p-3 sm:p-6 pb-20" onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
        <svg
          ref={svgRef}
          viewBox={`${-padX} ${-padTop} ${viewBoxW} ${viewBoxH}`}
          className="w-full h-full select-none"
          style={{ touchAction: 'none' }}
          onPointerDown={() => clearSelection()}
          role="img"
          aria-label={`Vista frontale ${activeWall.name}`}
        >
          <defs>
            <pattern id="wallGrid" width={gridSize * 2} height={gridSize * 2} patternUnits="userSpaceOnUse" y={wallH % (gridSize * 2)}>
              <path d={`M ${gridSize * 2} 0 L 0 0 0 ${gridSize * 2}`} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={0.4 * k} />
            </pattern>
            <pattern id="furnHatch" width={8 * k} height={8 * k} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2={8 * k} stroke="rgba(255,255,255,0.18)" strokeWidth={2 * k} />
            </pattern>
            <filter id="artShadow" x="-20%" y="-20%" width="140%" height="150%">
              <feDropShadow dx="0" dy={2 * k} stdDeviation={2.5 * k} floodColor="#000" floodOpacity="0.35" />
            </filter>
            <clipPath id="wallClip">
              <rect x={0} y={0} width={wallW} height={wallH} />
            </clipPath>
          </defs>

          {/* Wall surface */}
          <rect x={0} y={0} width={wallW} height={wallH} fill={room.wallColor} />
          {showGrid && <rect x={0} y={0} width={wallW} height={wallH} fill="url(#wallGrid)" />}
          {/* Floor & ceiling */}
          <rect x={-padX * 0.6} y={wallH} width={wallW + padX * 1.2} height={6 * k} fill="#2c2c33" />
          <line x1={-padX * 0.6} y1={0} x2={wallW + padX * 0.6} y2={0} stroke="#3a3a43" strokeWidth={1.5 * k} />
          <text x={-padX * 0.55} y={-6 * k} fill="#7c7c88" fontSize={fs(10)} fontFamily="Inter">
            Soffitto · {Math.round(wallH)} cm
          </text>
          <text x={-padX * 0.55} y={wallH + 20 * k} fill="#7c7c88" fontSize={fs(10)} fontFamily="Inter">
            Pavimento
          </text>
          {/* Wall width quote */}
          {showDimensions && (
            <g fontFamily="JetBrains Mono" fontSize={fs(10)} fill="#a4a4b0">
              <line x1={0} y1={wallH + 36 * k} x2={wallW} y2={wallH + 36 * k} stroke="#55555f" strokeWidth={0.8 * k} />
              <line x1={0} y1={wallH + 31 * k} x2={0} y2={wallH + 41 * k} stroke="#55555f" strokeWidth={0.8 * k} />
              <line x1={wallW} y1={wallH + 31 * k} x2={wallW} y2={wallH + 41 * k} stroke="#55555f" strokeWidth={0.8 * k} />
              <rect x={wallW / 2 - 32 * k} y={wallH + 29 * k} width={64 * k} height={14 * k} rx={3 * k} fill="#0b0b0d" />
              <text x={wallW / 2} y={wallH + 39.5 * k} textAnchor="middle">
                {Math.round(wallW)} cm
              </text>
            </g>
          )}

          {/* Eye level */}
          <line x1={0} y1={y(eyeLevel)} x2={wallW} y2={y(eyeLevel)} stroke="#c99a45" strokeOpacity={0.7} strokeWidth={0.8 * k} strokeDasharray={`${6 * k} ${4 * k}`} />
          <text x={wallW + 4 * k} y={y(eyeLevel) + 3 * k} fill="#e3b866" fontSize={fs(9)} fontFamily="JetBrains Mono">
            occhi {eyeLevel}
          </text>

          {/* Obstacles */}
          <g clipPath="url(#wallClip)">
            {obstacles.map((obs) => {
              const w = obs.uMax - obs.uMin;
              const h = obs.vMax - obs.vMin;
              const sx = obs.uMin;
              const sy = y(obs.vMax);
              if (obs.type === 'furniture') {
                return (
                  <g key={obs.id} className="pointer-events-none">
                    <rect x={sx} y={sy} width={w} height={h} fill={obs.color || '#607274'} rx={2 * k} />
                    <rect x={sx} y={sy} width={w} height={h} fill="url(#furnHatch)" rx={2 * k} />
                    <text x={sx + w / 2} y={sy + h / 2} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={fs(10)} fontWeight={600} fontFamily="Inter">
                      {obs.name}
                    </text>
                  </g>
                );
              }
              const isDoor = obs.type === 'door';
              const isSel = selectedId === obs.id;
              const item = isDoor ? doors.find((d) => d.id === obs.id) : windows.find((x) => x.id === obs.id);
              return (
                <g
                  key={obs.id}
                  className="cursor-move"
                  onPointerDown={(e) => item && startDrag({ kind: obs.type as 'door' | 'window', id: obs.id }, item.u, isDoor ? 0 : (item as any).elevationY, item.width, item.height, e)}
                >
                  <rect x={sx} y={sy} width={w} height={h} fill={isDoor ? '#26262c' : '#bfe3f5'} fillOpacity={isDoor ? 1 : 0.55} stroke={isSel ? '#e3b866' : obs.color || '#3f3f46'} strokeWidth={(isSel ? 2.5 : 2) * k} />
                  {!isDoor && (
                    <line x1={sx + w / 2} y1={sy} x2={sx + w / 2} y2={sy + h} stroke={obs.color || '#3f3f46'} strokeWidth={1.5 * k} />
                  )}
                  {isDoor && <circle cx={sx + w - 10 * k} cy={y(100)} r={2.2 * k} fill="#d4d4d8" />}
                  <text x={sx + w / 2} y={sy + Math.min(h / 2, 18 * k)} textAnchor="middle" dominantBaseline="middle" fill={isDoor ? '#a4a4b0' : '#1e3a4a'} fontSize={fs(9.5)} fontFamily="Inter" className="pointer-events-none">
                    {obs.name}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Artworks */}
          {wallArtworks.map((art) => {
            const isSelected = selectedId === art.id;
            const collision = collisionMap.get(art.id) || false;
            const dims = getArtworkTotalDimensions(art);
            const ax = art.u;
            const ay = y(art.elevationY + dims.totalHeight);
            const fw = art.frame.enabled ? art.frame.width : 0;
            const inset = art.frame.enabled ? art.frame.width + art.frame.matWidth : 0;
            return (
              <g
                key={art.id}
                onPointerDown={(e) => startDrag({ kind: 'artwork', id: art.id }, art.u, art.elevationY, dims.totalWidth, dims.totalHeight, e)}
                className={drag?.id === art.id ? 'cursor-grabbing' : 'cursor-grab'}
              >
                <g filter="url(#artShadow)">
                  {art.frame.enabled && <rect x={ax} y={ay} width={dims.totalWidth} height={dims.totalHeight} fill={art.frame.color} />}
                  {art.frame.enabled && art.frame.matWidth > 0 && (
                    <rect x={ax + fw} y={ay + fw} width={dims.totalWidth - fw * 2} height={dims.totalHeight - fw * 2} fill={art.frame.matColor || '#fff'} />
                  )}
                  <image href={art.imageUrl} x={ax + inset} y={ay + inset} width={art.width} height={art.height} preserveAspectRatio="xMidYMid slice" />
                </g>
                <rect
                  x={ax - 1.5 * k}
                  y={ay - 1.5 * k}
                  width={dims.totalWidth + 3 * k}
                  height={dims.totalHeight + 3 * k}
                  fill="none"
                  stroke={collision ? '#f07171' : isSelected ? '#e3b866' : 'transparent'}
                  strokeWidth={2 * k}
                  strokeDasharray={collision ? `${4 * k} ${3 * k}` : undefined}
                  rx={1.5 * k}
                />
                {collision && (
                  <g transform={`translate(${ax + dims.totalWidth - 6 * k}, ${ay - 6 * k})`}>
                    <circle r={7 * k} fill="#f07171" />
                    <text y={3.2 * k} textAnchor="middle" fill="#fff" fontSize={fs(9)} fontWeight={700}>
                      !
                    </text>
                  </g>
                )}
                {!isSelected && (
                  <text x={ax + dims.totalWidth / 2} y={ay + dims.totalHeight + 11 * k} textAnchor="middle" fill="#55555f" fontSize={fs(8.5)} fontFamily="Inter" className="pointer-events-none">
                    {art.name}
                  </text>
                )}
              </g>
            );
          })}

          {/* Smart guides */}
          {guides.x.map((gx, i) => (
            <line key={`gx${i}`} x1={gx} y1={-padTop * 0.4} x2={gx} y2={wallH} stroke="#e3b866" strokeWidth={0.8 * k} strokeDasharray={`${3 * k} ${2 * k}`} className="pointer-events-none" />
          ))}
          {guides.y.map((gy, i) => (
            <line key={`gy${i}`} x1={0} y1={y(gy)} x2={wallW} y2={y(gy)} stroke="#e3b866" strokeWidth={0.8 * k} strokeDasharray={`${3 * k} ${2 * k}`} className="pointer-events-none" />
          ))}

          {/* Quotes for selected artwork */}
          {selectedArtwork && selectedDims && showDimensions && (() => {
            const a = selectedArtwork;
            const d = selectedDims;
            const midX = a.u + d.totalWidth / 2;
            const midY = y(a.elevationY + d.totalHeight / 2);
            const top = y(a.elevationY + d.totalHeight);
            const bottom = y(a.elevationY);
            const Label = ({ x, y: ly, text }: { x: number; y: number; text: string }) => (
              <g>
                <rect x={x - 25 * k} y={ly - 7.5 * k} width={50 * k} height={15 * k} rx={7.5 * k} fill="#0b0b0d" stroke="#e3b866" strokeWidth={0.6 * k} />
                <text x={x} y={ly + 3.2 * k} textAnchor="middle" fill="#f1d39b" fontSize={fs(9)} fontFamily="JetBrains Mono">
                  {text}
                </text>
              </g>
            );
            const line = { stroke: '#c99a45', strokeWidth: 0.8 * k, strokeDasharray: `${3 * k} ${2 * k}` };
            return (
              <g className="pointer-events-none">
                <line x1={midX} y1={bottom} x2={midX} y2={wallH} {...line} />
                {a.elevationY > 12 && <Label x={midX} y={(bottom + wallH) / 2} text={`${Math.round(a.elevationY)} cm`} />}
                <line x1={midX} y1={0} x2={midX} y2={top} {...line} />
                {top > 12 && <Label x={midX} y={top / 2} text={`${Math.round(wallH - a.elevationY - d.totalHeight)} cm`} />}
                <line x1={0} y1={midY} x2={a.u} y2={midY} {...line} />
                {a.u > 30 && <Label x={a.u / 2} y={midY} text={`${Math.round(a.u)} cm`} />}
                <line x1={a.u + d.totalWidth} y1={midY} x2={wallW} y2={midY} {...line} />
                {wallW - a.u - d.totalWidth > 30 && (
                  <Label x={(a.u + d.totalWidth + wallW) / 2} y={midY} text={`${Math.round(wallW - a.u - d.totalWidth)} cm`} />
                )}
              </g>
            );
          })()}
        </svg>

        {wallArtworks.length === 0 && (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center pointer-events-none">
            <div className="glass rounded-2xl px-5 py-4 text-center pointer-events-auto max-w-xs">
              <ImageIcon className="w-5 h-5 text-brass-400 mx-auto mb-2" />
              <p className="text-[13px] font-semibold text-ink-100">Parete libera</p>
              <p className="text-[12px] text-ink-400 mt-1">Aggiungi un quadro o genera una composizione automatica per questa parete.</p>
              <div className="flex gap-2 justify-center mt-3">
                <button className="btn btn-secondary btn-sm" onClick={() => setAddArtworkModalOpen(true)}>
                  <Plus className="w-3.5 h-3.5" /> Quadro
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => setLayoutModalOpen(true)}>
                  <Sparkles className="w-3.5 h-3.5" /> Auto layout
                </button>
              </div>
            </div>
          </div>
        )}

        {hasCollision && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-danger/12 border border-danger/35 text-[#ffd0d0] text-[12px] px-3 py-1.5 backdrop-blur max-w-[92%]">
            <AlertTriangle className="w-3.5 h-3.5 text-danger shrink-0" />
            <span className="truncate">Alcuni quadri si sovrappongono a mobili, aperture o escono dalla parete.</span>
          </div>
        )}
      </div>
    </div>
  );
};
