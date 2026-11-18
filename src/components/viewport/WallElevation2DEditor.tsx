/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useMemo } from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import {
  getWallObstacles,
  getArtworkTotalDimensions,
  checkAABBCollision,
} from '../../utils/geometry';
import { Artwork, ProjectedObstacle } from '../../types/room';
import {
  Sparkles,
  Maximize2,
  AlignCenter,
  Eye,
  Layers,
  AlertTriangle,
} from 'lucide-react';

export const WallElevation2DEditor: React.FC = () => {
  const {
    room,
    furniture,
    doors,
    windows,
    artworks,
    activeWallId,
    selectedId,
    showDimensions,
    snapToGrid,
    gridSize,
    getWalls,
    setActiveWall,
    select,
    moveArtwork,
    setLayoutModalOpen,
  } = useRoomStore();

  const walls = useMemo(() => getWalls(), [room.vertices, room.height, getWalls]);
  const activeWall = useMemo(
    () => walls.find((w) => w.id === activeWallId) || walls[0],
    [walls, activeWallId]
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    artworkId: string;
    startMouseX: number;
    startMouseY: number;
    startU: number;
    startElevationY: number;
    scale: number;
  } | null>(null);

  // Compute obstacles on this wall
  const obstacles = useMemo(() => {
    if (!activeWall) return [];
    return getWallObstacles(activeWall, furniture, doors, windows);
  }, [activeWall, furniture, doors, windows]);

  // Artworks on this wall
  const wallArtworks = useMemo(() => {
    if (!activeWall) return [];
    return artworks.filter((a) => a.wallId === activeWall.id);
  }, [artworks, activeWall]);

  if (!activeWall) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-400">
        Nessuna parete selezionata
      </div>
    );
  }

  // Visual scaling: Fit wall inside container with margins
  const wallW = activeWall.length; // cm
  const wallH = activeWall.height; // cm

  // Standard dimensions for viewBox
  const paddingX = 60;
  const paddingY = 60;
  const viewBoxW = wallW + paddingX * 2;
  const viewBoxH = wallH + paddingY * 2;

  // Check collision for each artwork
  const collisionMap = useMemo(() => {
    const map = new Map<string, boolean>();
    wallArtworks.forEach((art) => {
      const { totalWidth, totalHeight } = getArtworkTotalDimensions(art);
      const artBox = {
        uMin: art.u,
        uMax: art.u + totalWidth,
        vMin: art.elevationY,
        vMax: art.elevationY + totalHeight,
      };

      let collides = false;
      // Collide with obstacles
      for (const obs of obstacles) {
        if (checkAABBCollision(artBox, obs)) {
          collides = true;
          break;
        }
      }
      // Collide with other artworks
      if (!collides) {
        for (const other of wallArtworks) {
          if (other.id === art.id) continue;
          const otherDim = getArtworkTotalDimensions(other);
          const otherBox = {
            uMin: other.u,
            uMax: other.u + otherDim.totalWidth,
            vMin: other.elevationY,
            vMax: other.elevationY + otherDim.totalHeight,
          };
          if (checkAABBCollision(artBox, otherBox)) {
            collides = true;
            break;
          }
        }
      }
      // Out of wall bounds
      if (
        artBox.uMin < 0 ||
        artBox.uMax > wallW ||
        artBox.vMin < 0 ||
        artBox.vMax > wallH
      ) {
        collides = true;
      }
      map.set(art.id, collides);
    });
    return map;
  }, [wallArtworks, obstacles, wallW, wallH]);

  // Selected artwork metrics
  const selectedArtwork = wallArtworks.find((a) => a.id === selectedId);
  const selectedDims = selectedArtwork ? getArtworkTotalDimensions(selectedArtwork) : null;

  // Handle Drag Start
  const handlePointerDownArt = (art: Artwork, e: React.PointerEvent) => {
    e.stopPropagation();
    select(art.id, 'artwork');
    const svgRect = containerRef.current?.getBoundingClientRect();
    if (!svgRect) return;

    const scale = viewBoxW / svgRect.width;

    setDragState({
      artworkId: art.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startU: art.u,
      startElevationY: art.elevationY,
      scale,
    });

    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState) return;
    const dx = (e.clientX - dragState.startMouseX) * dragState.scale;
    // Note: in SVG elevation, Y is inverted (0 is top in SVG, but floor 0 is bottom)
    const dy = (dragState.startMouseY - e.clientY) * dragState.scale;

    let targetU = dragState.startU + dx;
    let targetY = dragState.startElevationY + dy;

    if (snapToGrid) {
      targetU = Math.round(targetU / gridSize) * gridSize;
      targetY = Math.round(targetY / gridSize) * gridSize;
    }

    targetU = Math.max(0, Math.min(wallW - 20, targetU));
    targetY = Math.max(0, Math.min(wallH - 20, targetY));

    moveArtwork(dragState.artworkId, targetU, targetY, activeWall.id);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragState) {
      (e.target as Element).releasePointerCapture(e.pointerId);
      setDragState(null);
    }
  };

  // Helper Quick Alignments
  const alignCenter = () => {
    if (!selectedArtwork || !selectedDims) return;
    const newU = (wallW - selectedDims.totalWidth) / 2;
    moveArtwork(selectedArtwork.id, Math.round(newU), selectedArtwork.elevationY);
  };

  const alignEyeLevel = () => {
    if (!selectedArtwork || !selectedDims) return;
    const newElevation = 150 - selectedDims.totalHeight / 2;
    moveArtwork(selectedArtwork.id, selectedArtwork.u, Math.max(20, Math.round(newElevation)));
  };

  const alignAboveFurniture = () => {
    if (!selectedArtwork || !selectedDims) return;
    const furn = obstacles.find((o) => o.type === 'furniture');
    if (!furn) return;
    const newU = (furn.uMin + furn.uMax) / 2 - selectedDims.totalWidth / 2;
    const newElevation = furn.vMax + 20;
    moveArtwork(selectedArtwork.id, Math.round(newU), Math.round(newElevation));
  };

  return (
    <div className="w-full h-full flex flex-col bg-neutral-950 overflow-hidden select-none">
      {/* Wall Navigation Toolbar */}
      <div className="h-12 px-4 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Parete Attiva:
          </span>
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
            {walls.map((w) => {
              const isActive = w.id === activeWall.id;
              return (
                <button
                  key={w.id}
                  onClick={() => setActiveWall(w.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-all ${
                    isActive
                      ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                  }`}
                >
                  {w.name}
                  <span className="ml-1.5 text-[10px] font-mono text-neutral-500">
                    {Math.round(w.length)} cm
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Tools */}
        <div className="flex items-center gap-2">
          {selectedArtwork && (
            <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 p-1 rounded-lg">
              <button
                onClick={alignCenter}
                title="Centra orizzontalmente sulla parete"
                className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 rounded transition-colors"
              >
                <AlignCenter className="w-3.5 h-3.5 text-neutral-400" />
                Centra X
              </button>
              <button
                onClick={alignEyeLevel}
                title="Allinea a 150cm (Altezza Occhi Galleria)"
                className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 rounded transition-colors"
              >
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                150 cm Occhi
              </button>
              {obstacles.some((o) => o.type === 'furniture') && (
                <button
                  onClick={alignAboveFurniture}
                  title="Allinea sopra il mobile"
                  className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                >
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Sopra Mobile
                </button>
              )}
            </div>
          )}

          <button
            onClick={() => setLayoutModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-md shadow transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Disposizione Automatica
          </button>
        </div>
      </div>

      {/* Main Elevation SVG Canvas */}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="flex-1 w-full relative flex items-center justify-center p-6 bg-neutral-950 overflow-hidden"
      >
        <svg
          viewBox={`${-paddingX} ${-paddingY} ${viewBoxW} ${viewBoxH}`}
          className="w-full h-full max-h-[82vh] drop-shadow-2xl select-none"
          style={{ touchAction: 'none' }}
          onClick={() => select(null, null)}
        >
          <defs>
            {/* Grid Pattern */}
            <pattern
              id="wallGrid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="rgba(255, 255, 255, 0.04)"
                strokeWidth="0.8"
              />
            </pattern>
            {/* Furniture diagonal stripes */}
            <pattern
              id="furnitureHatch"
              width="10"
              height="10"
              patternTransform="rotate(45 0 0)"
              patternUnits="userSpaceOnUse"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="10"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="2"
              />
            </pattern>
          </defs>

          {/* Wall Background */}
          <rect
            x={0}
            y={0}
            width={wallW}
            height={wallH}
            fill="#1e2229"
            stroke="#334155"
            strokeWidth="2"
            rx="2"
          />

          {/* Wall Grid Overlay */}
          <rect
            x={0}
            y={0}
            width={wallW}
            height={wallH}
            fill="url(#wallGrid)"
          />

          {/* Floor baseline & Ceiling line */}
          <line
            x1={-30}
            y1={wallH}
            x2={wallW + 30}
            y2={wallH}
            stroke="#64748b"
            strokeWidth="3"
            strokeDasharray="4 2"
          />
          <text
            x={wallW / 2}
            y={wallH + 22}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="12"
            fontFamily="monospace"
          >
            LINEA DEL PAVIMENTO (0 cm)
          </text>

          <line
            x1={-30}
            y1={0}
            x2={wallW + 30}
            y2={0}
            stroke="#475569"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <text
            x={wallW / 2}
            y={-15}
            textAnchor="middle"
            fill="#64748b"
            fontSize="12"
            fontFamily="monospace"
          >
            SOFFITTO ({Math.round(wallH)} cm)
          </text>

          {/* Wall corner edge markers */}
          <text
            x={0}
            y={wallH + 40}
            textAnchor="start"
            fill="#64748b"
            fontSize="11"
            fontFamily="monospace"
          >
            Angolo SX (0 cm)
          </text>
          <text
            x={wallW}
            y={wallH + 40}
            textAnchor="end"
            fill="#64748b"
            fontSize="11"
            fontFamily="monospace"
          >
            Angolo DX ({Math.round(wallW)} cm)
          </text>

          {/* Standard Eye-level Guideline (150cm) */}
          <line
            x1={0}
            y1={wallH - 150}
            x2={wallW}
            y2={wallH - 150}
            stroke="rgba(245, 158, 11, 0.4)"
            strokeWidth="1"
            strokeDasharray="6 4"
          />
          <text
            x={10}
            y={wallH - 154}
            fill="#f59e0b"
            fontSize="10"
            fontFamily="monospace"
          >
            Altezza Occhi Galleria (150 cm)
          </text>

          {/* Obstacles (Doors, Windows, Furniture) */}
          {obstacles.map((obs) => {
            const obsW = obs.uMax - obs.uMin;
            const obsH = obs.vMax - obs.vMin;
            const obsX = obs.uMin;
            // In SVG, Y=0 is ceiling, Y=wallH is floor
            const obsY = wallH - obs.vMax;

            if (obs.type === 'furniture') {
              return (
                <g key={obs.id}>
                  {/* Furniture Silhouette Box */}
                  <rect
                    x={obsX}
                    y={obsY}
                    width={obsW}
                    height={obsH}
                    fill={obs.color || '#607274'}
                    fillOpacity="0.85"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    rx="3"
                  />
                  <rect
                    x={obsX}
                    y={obsY}
                    width={obsW}
                    height={obsH}
                    fill="url(#furnitureHatch)"
                    rx="3"
                  />
                  {/* Furniture label */}
                  <text
                    x={obsX + obsW / 2}
                    y={obsY + obsH / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="600"
                    fontFamily="sans-serif"
                    className="drop-shadow"
                  >
                    {obs.name} ({Math.round(obsW)}×{Math.round(obsH)} cm)
                  </text>
                  {/* Safety boundary dashed clearance */}
                  <rect
                    x={obsX - 10}
                    y={obsY - 15}
                    width={obsW + 20}
                    height={obsH + 15}
                    fill="none"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="1"
                    strokeDasharray="2 4"
                  />
                </g>
              );
            }

            if (obs.type === 'door') {
              return (
                <g key={obs.id}>
                  <rect
                    x={obsX}
                    y={obsY}
                    width={obsW}
                    height={obsH}
                    fill="#18181b"
                    stroke={obs.color || '#52525b'}
                    strokeWidth="2.5"
                  />
                  <text
                    x={obsX + obsW / 2}
                    y={obsY + obsH / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#a1a1aa"
                    fontSize="11"
                    fontFamily="sans-serif"
                  >
                    {obs.name} ({Math.round(obsW)}×{Math.round(obsH)} cm)
                  </text>
                </g>
              );
            }

            if (obs.type === 'window') {
              return (
                <g key={obs.id}>
                  <rect
                    x={obsX}
                    y={obsY}
                    width={obsW}
                    height={obsH}
                    fill="#0f172a"
                    stroke={obs.color || '#38bdf8'}
                    strokeWidth="2.5"
                  />
                  <rect
                    x={obsX + 4}
                    y={obsY + 4}
                    width={obsW - 8}
                    height={obsH - 8}
                    fill="rgba(56, 189, 248, 0.15)"
                  />
                  <text
                    x={obsX + obsW / 2}
                    y={obsY + obsH / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#7dd3fc"
                    fontSize="11"
                    fontFamily="sans-serif"
                  >
                    {obs.name} (Davanzale {Math.round(obs.vMin)} cm)
                  </text>
                </g>
              );
            }

            return null;
          })}

          {/* Wall Artworks */}
          {wallArtworks.map((art) => {
            const isSelected = selectedId === art.id;
            const hasCollision = collisionMap.get(art.id) || false;
            const dims = getArtworkTotalDimensions(art);
            const artX = art.u;
            const artY = wallH - (art.elevationY + dims.totalHeight);

            const frameW = art.frame.enabled ? art.frame.width : 0;
            const matW = art.frame.enabled ? art.frame.matWidth : 0;
            const outerBorder = frameW + matW;

            return (
              <g
                key={art.id}
                onPointerDown={(e) => handlePointerDownArt(art, e)}
                className="cursor-move group"
              >
                {/* Outer Frame */}
                {art.frame.enabled && (
                  <rect
                    x={artX}
                    y={artY}
                    width={dims.totalWidth}
                    height={dims.totalHeight}
                    fill={art.frame.color}
                    rx="1"
                  />
                )}

                {/* Passepartout */}
                {art.frame.enabled && matW > 0 && (
                  <rect
                    x={artX + frameW}
                    y={artY + frameW}
                    width={dims.totalWidth - frameW * 2}
                    height={dims.totalHeight - frameW * 2}
                    fill={art.frame.matColor || '#ffffff'}
                  />
                )}

                {/* Canvas Art Image */}
                <image
                  href={art.imageUrl}
                  x={artX + outerBorder}
                  y={artY + outerBorder}
                  width={art.width}
                  height={art.height}
                  preserveAspectRatio="xMidYMid slice"
                />

                {/* Selection & Collision Border */}
                <rect
                  x={artX - 2}
                  y={artY - 2}
                  width={dims.totalWidth + 4}
                  height={dims.totalHeight + 4}
                  fill="none"
                  stroke={
                    hasCollision
                      ? '#ef4444'
                      : isSelected
                      ? '#38bdf8'
                      : 'rgba(255,255,255,0.2)'
                  }
                  strokeWidth={isSelected || hasCollision ? '2.5' : '1'}
                  strokeDasharray={hasCollision ? '4 2' : 'none'}
                  rx="2"
                />

                {/* Collision Warning Badge */}
                {hasCollision && (
                  <g transform={`translate(${artX + dims.totalWidth - 14}, ${artY - 8})`}>
                    <circle cx="8" cy="8" r="8" fill="#ef4444" />
                    <text
                      x="8"
                      y="11"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                    >
                      !
                    </text>
                  </g>
                )}

                {/* Art Title & Size Badge */}
                <text
                  x={artX + dims.totalWidth / 2}
                  y={artY + dims.totalHeight + 14}
                  textAnchor="middle"
                  fill={isSelected ? '#38bdf8' : '#cbd5e1'}
                  fontSize="10"
                  fontFamily="sans-serif"
                  fontWeight="600"
                >
                  {art.name} ({Math.round(art.width)}×{Math.round(art.height)})
                </text>
              </g>
            );
          })}

          {/* Dimension Guidelines (Quote) for Selected Artwork */}
          {selectedArtwork && selectedDims && showDimensions && (
            <g className="pointer-events-none font-mono text-[11px]">
              {/* Distance to Floor */}
              <line
                x1={selectedArtwork.u + selectedDims.totalWidth / 2}
                y1={wallH - selectedArtwork.elevationY}
                x2={selectedArtwork.u + selectedDims.totalWidth / 2}
                y2={wallH}
                stroke="#38bdf8"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
              <rect
                x={selectedArtwork.u + selectedDims.totalWidth / 2 + 6}
                y={wallH - selectedArtwork.elevationY / 2 - 8}
                width="64"
                height="16"
                fill="#09090b"
                stroke="#38bdf8"
                strokeWidth="0.8"
                rx="3"
              />
              <text
                x={selectedArtwork.u + selectedDims.totalWidth / 2 + 38}
                y={wallH - selectedArtwork.elevationY / 2 + 4}
                textAnchor="middle"
                fill="#38bdf8"
                fontSize="9"
                fontWeight="600"
              >
                {Math.round(selectedArtwork.elevationY)} cm
              </text>

              {/* Distance to Ceiling */}
              <line
                x1={selectedArtwork.u + selectedDims.totalWidth / 2}
                y1={wallH - (selectedArtwork.elevationY + selectedDims.totalHeight)}
                x2={selectedArtwork.u + selectedDims.totalWidth / 2}
                y2={0}
                stroke="#94a3b8"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
              <rect
                x={selectedArtwork.u + selectedDims.totalWidth / 2 + 6}
                y={(wallH - (selectedArtwork.elevationY + selectedDims.totalHeight)) / 2 - 8}
                width="64"
                height="16"
                fill="#09090b"
                stroke="#64748b"
                strokeWidth="0.8"
                rx="3"
              />
              <text
                x={selectedArtwork.u + selectedDims.totalWidth / 2 + 38}
                y={(wallH - (selectedArtwork.elevationY + selectedDims.totalHeight)) / 2 + 4}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="9"
              >
                {Math.round(wallH - (selectedArtwork.elevationY + selectedDims.totalHeight))} cm
              </text>

              {/* Distance to Left Wall Corner */}
              <line
                x1={0}
                y1={wallH - selectedArtwork.elevationY - selectedDims.totalHeight / 2}
                x2={selectedArtwork.u}
                y2={wallH - selectedArtwork.elevationY - selectedDims.totalHeight / 2}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <text
                x={selectedArtwork.u / 2}
                y={wallH - selectedArtwork.elevationY - selectedDims.totalHeight / 2 - 4}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="9"
              >
                SX: {Math.round(selectedArtwork.u)} cm
              </text>

              {/* Distance to Right Wall Corner */}
              <line
                x1={selectedArtwork.u + selectedDims.totalWidth}
                y1={wallH - selectedArtwork.elevationY - selectedDims.totalHeight / 2}
                x2={wallW}
                y2={wallH - selectedArtwork.elevationY - selectedDims.totalHeight / 2}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <text
                x={(selectedArtwork.u + selectedDims.totalWidth + wallW) / 2}
                y={wallH - selectedArtwork.elevationY - selectedDims.totalHeight / 2 - 4}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="9"
              >
                DX: {Math.round(wallW - (selectedArtwork.u + selectedDims.totalWidth))} cm
              </text>
            </g>
          )}
        </svg>

        {/* Floating collision alert if any artwork has issues */}
        {Array.from(collisionMap.values()).some(Boolean) && (
          <div className="absolute bottom-4 left-6 flex items-center gap-2 bg-red-950/90 border border-red-500/50 text-red-200 text-xs px-3 py-1.5 rounded-lg shadow-lg backdrop-blur">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>
              Attenzione: uno o più quadri si sovrappongono a mobili, porte, finestre o superano i limiti della parete.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
