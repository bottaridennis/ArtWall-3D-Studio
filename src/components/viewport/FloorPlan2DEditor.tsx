/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useMemo } from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import {
  calculatePolygonArea,
  calculatePolygonPerimeter,
  getFurnitureFloorCorners,
} from '../../utils/geometry';
import { Point2D } from '../../types/room';
import { CustomNumberInput } from '../ui/CustomNumberInput';
import {
  Plus,
  Trash2,
  Grid,
  Maximize,
  Compass,
  Square,
  Shapes,
} from 'lucide-react';

export const FloorPlan2DEditor: React.FC = () => {
  const {
    room,
    furniture,
    doors,
    windows,
    artworks,
    selectedVertexIndex,
    snapToGrid,
    gridSize,
    getWalls,
    setRoomDimensions,
    setRoomHeight,
    setRoomShapeType,
    updateVertex,
    addVertex,
    removeVertex,
    select,
  } = useRoomStore();

  const walls = useMemo(() => getWalls(), [room.vertices, room.height, getWalls]);
  const areaM2 = useMemo(() => calculatePolygonArea(room.vertices), [room.vertices]);
  const perimeterM = useMemo(() => calculatePolygonPerimeter(room.vertices), [room.vertices]);

  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingVertexIndex, setDraggingVertexIndex] = useState<number | null>(null);
  const [hoveredWallIndex, setHoveredWallIndex] = useState<number | null>(null);

  // Compute bounding box of floor vertices for auto-scaling viewBox
  const bounds = useMemo(() => {
    if (room.vertices.length === 0) return { minX: 0, maxX: 500, minY: 0, maxY: 400 };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const v of room.vertices) {
      if (v.x < minX) minX = v.x;
      if (v.x > maxX) maxX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.y > maxY) maxY = v.y;
    }
    // Include furniture in bounds if any
    for (const f of furniture) {
      if (f.position.x < minX) minX = f.position.x - 50;
      if (f.position.x > maxX) maxX = f.position.x + 50;
      if (f.position.z < minY) minY = f.position.z - 50;
      if (f.position.z > maxY) maxY = f.position.z + 50;
    }
    const pad = 80;
    return {
      minX: minX - pad,
      maxX: maxX + pad,
      minY: minY - pad,
      maxY: maxY + pad,
    };
  }, [room.vertices, furniture]);

  const viewBoxW = Math.max(300, bounds.maxX - bounds.minX);
  const viewBoxH = Math.max(300, bounds.maxY - bounds.minY);

  // Dragging vertex logic
  const handlePointerDownVertex = (index: number, e: React.PointerEvent) => {
    e.stopPropagation();
    select(null, 'vertex', index);
    setDraggingVertexIndex(index);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingVertexIndex === null || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = viewBoxW / rect.width;
    const scaleY = viewBoxH / rect.height;

    let targetX = bounds.minX + (e.clientX - rect.left) * scaleX;
    let targetY = bounds.minY + (e.clientY - rect.top) * scaleY;

    if (snapToGrid) {
      targetX = Math.round(targetX / gridSize) * gridSize;
      targetY = Math.round(targetY / gridSize) * gridSize;
    }

    updateVertex(draggingVertexIndex, { x: Math.round(targetX), y: Math.round(targetY) });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingVertexIndex !== null) {
      (e.target as Element).releasePointerCapture(e.pointerId);
      setDraggingVertexIndex(null);
    }
  };

  // Add vertex on wall midpoint
  const handleAddVertexOnWall = (wallIdx: number) => {
    const p1 = room.vertices[wallIdx];
    const p2 = room.vertices[(wallIdx + 1) % room.vertices.length];
    const midX = Math.round((p1.x + p2.x) / 2);
    const midY = Math.round((p1.y + p2.y) / 2);
    addVertex({ x: midX, y: midY }, wallIdx);
  };

  return (
    <div className="w-full h-full flex flex-col bg-neutral-950 overflow-hidden select-none">
      {/* Top Floor Plan Bar */}
      <div className="h-12 px-4 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          {/* Mode Switcher */}
          <div className="flex items-center p-1 bg-neutral-950 border border-neutral-800 rounded-lg">
            <button
              onClick={() => setRoomShapeType('rectangular')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-all ${
                room.shapeType === 'rectangular'
                  ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Square className="w-3.5 h-3.5" />
              Rettangolare
            </button>
            <button
              onClick={() => setRoomShapeType('polygon')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-all ${
                room.shapeType === 'polygon'
                  ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Shapes className="w-3.5 h-3.5" />
              Forma Irregolare (2D)
            </button>
          </div>

          {/* Metrics tags */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-neutral-400 font-mono">
            <span>
              Superficie: <strong className="text-white">{areaM2.toFixed(1)} m²</strong>
            </span>
            <span className="text-neutral-600">·</span>
            <span>
              Perimetro: <strong className="text-white">{perimeterM.toFixed(1)} m</strong>
            </span>
            <span className="text-neutral-600">·</span>
            <span>
              Altezza: <strong className="text-white">{room.height} cm</strong>
            </span>
          </div>
        </div>

        {/* Vertex actions in polygon mode */}
        {room.shapeType === 'polygon' && selectedVertexIndex !== null && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 font-mono">
              Vertice #{selectedVertexIndex + 1}
            </span>
            <button
              onClick={() => removeVertex(selectedVertexIndex)}
              disabled={room.vertices.length <= 3}
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-red-950/80 hover:bg-red-900 border border-red-700 text-red-200 rounded disabled:opacity-30 disabled:hover:bg-red-950 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Elimina Vertice
            </button>
          </div>
        )}
      </div>

      {/* Main Floor Plan Canvas */}
      <div
        className="flex-1 w-full relative flex items-center justify-center p-6 bg-neutral-950 overflow-hidden"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <svg
          ref={svgRef}
          viewBox={`${bounds.minX} ${bounds.minY} ${viewBoxW} ${viewBoxH}`}
          className="w-full h-full max-h-[82vh] drop-shadow-2xl select-none"
          style={{ touchAction: 'none' }}
          onClick={() => select(null, null)}
        >
          <defs>
            <pattern
              id="planGrid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="0.8"
              />
            </pattern>
          </defs>

          {/* Grid Background */}
          <rect
            x={bounds.minX}
            y={bounds.minY}
            width={viewBoxW}
            height={viewBoxH}
            fill="url(#planGrid)"
          />

          {/* Room Floor Polygon */}
          <polygon
            points={room.vertices.map((v) => `${v.x},${v.y}`).join(' ')}
            fill="#181c24"
            stroke="#475569"
            strokeWidth="3"
          />

          {/* Furniture top-down boxes */}
          {furniture.map((f) => {
            const corners = getFurnitureFloorCorners(f);
            return (
              <g
                key={f.id}
                onClick={(e) => {
                  e.stopPropagation();
                  select(f.id, 'furniture');
                }}
                className="cursor-pointer"
              >
                <polygon
                  points={corners.map((c) => `${c.x},${c.y}`).join(' ')}
                  fill={f.color}
                  fillOpacity="0.8"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
                <text
                  x={f.position.x}
                  y={f.position.z}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight="600"
                  fontFamily="sans-serif"
                >
                  {f.name}
                </text>
              </g>
            );
          })}

          {/* Wall segments with dimension text and add-vertex affordances */}
          {walls.map((wall, idx) => {
            const midX = (wall.p1.x + wall.p2.x) / 2;
            const midY = (wall.p1.y + wall.p2.y) / 2;
            const isHovered = hoveredWallIndex === idx;

            return (
              <g
                key={wall.id}
                onMouseEnter={() => setHoveredWallIndex(idx)}
                onMouseLeave={() => setHoveredWallIndex(null)}
              >
                {/* Wall segment line */}
                <line
                  x1={wall.p1.x}
                  y1={wall.p1.y}
                  x2={wall.p2.x}
                  y2={wall.p2.y}
                  stroke="#94a3b8"
                  strokeWidth="4"
                  strokeLinecap="round"
                />

                {/* Wall length badge */}
                <g transform={`translate(${midX}, ${midY})`}>
                  <rect
                    x="-32"
                    y="-11"
                    width="64"
                    height="20"
                    fill="#09090b"
                    stroke="#475569"
                    strokeWidth="1"
                    rx="4"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fill="#e2e8f0"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="600"
                  >
                    {Math.round(wall.length)} cm
                  </text>
                </g>

                {/* Add vertex button in polygon mode */}
                {room.shapeType === 'polygon' && (
                  <g
                    transform={`translate(${midX}, ${midY})`}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddVertexOnWall(idx);
                    }}
                  >
                    <circle
                      cx="0"
                      cy="0"
                      r="10"
                      fill={isHovered ? '#0ea5e9' : 'transparent'}
                      stroke={isHovered ? '#ffffff' : 'transparent'}
                      strokeWidth="1.5"
                    />
                    {isHovered && (
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="12"
                        fontWeight="bold"
                      >
                        +
                      </text>
                    )}
                  </g>
                )}
              </g>
            );
          })}

          {/* Interactive Corner Vertices */}
          {room.shapeType === 'polygon' &&
            room.vertices.map((v, idx) => {
              const isSelected = selectedVertexIndex === idx;
              return (
                <g
                  key={`vert-${idx}`}
                  onPointerDown={(e) => handlePointerDownVertex(idx, e)}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <circle
                    cx={v.x}
                    cy={v.y}
                    r={isSelected ? '9' : '7'}
                    fill={isSelected ? '#38bdf8' : '#ffffff'}
                    stroke="#09090b"
                    strokeWidth="2.5"
                  />
                  <text
                    x={v.x}
                    y={v.y - 12}
                    textAnchor="middle"
                    fill="#38bdf8"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="600"
                  >
                    V{idx + 1}
                  </text>
                </g>
              );
            })}
        </svg>

        {/* Irregular Mode Helper hint */}
        {room.shapeType === 'polygon' && (
          <div className="absolute bottom-4 left-6 bg-neutral-900/90 border border-neutral-800 text-neutral-300 text-xs px-3 py-2 rounded-lg shadow-lg backdrop-blur">
            <span className="text-cyan-400 font-semibold">Suggerimento:</span> Trascina i punti bianchi per modificare gli angoli della stanza. Passa sopra una parete per aggiungere un nuovo vertice col pulsante (+).
          </div>
        )}
      </div>
    </div>
  );
};
