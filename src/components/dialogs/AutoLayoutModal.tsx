/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import { getWallObstacles } from '../../utils/geometry';
import { generateLayoutProposals, LayoutOptions } from '../../utils/layoutAlgorithm';
import { LayoutProposal, LayoutStrategyType } from '../../types/room';
import { CustomNumberInput } from '../ui/CustomNumberInput';
import {
  Sparkles,
  X,
  Check,
  Sliders,
  Grid,
  Columns,
  Maximize2,
  Box,
  Layers,
} from 'lucide-react';

export const AutoLayoutModal: React.FC = () => {
  const {
    room,
    furniture,
    doors,
    windows,
    artworks,
    activeWallId,
    layoutModalOpen,
    layoutOptions,
    getWalls,
    setActiveWall,
    setLayoutModalOpen,
    setLayoutOptions,
    applyProposal,
  } = useRoomStore();

  const [selectedWallId, setSelectedWallId] = useState(activeWallId || 'wall-0');
  const [selectedStrategy, setSelectedStrategy] = useState<LayoutStrategyType | 'all'>('all');
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);

  // Sync selected wall when modal opens or active wall changes
  React.useEffect(() => {
    if (layoutModalOpen && activeWallId) {
      setSelectedWallId(activeWallId);
      setSelectedProposalId(null);
    }
  }, [layoutModalOpen, activeWallId]);

  const walls = useMemo(() => getWalls(), [room.vertices, room.height, getWalls]);
  const currentWall = useMemo(
    () => walls.find((w) => w.id === selectedWallId) || walls[0],
    [walls, selectedWallId]
  );

  // Compute obstacles on selected wall
  const obstacles = useMemo(() => {
    if (!currentWall) return [];
    return getWallObstacles(currentWall, furniture, doors, windows);
  }, [currentWall, furniture, doors, windows]);

  // Generate proposals using geometric engine
  const proposals = useMemo(() => {
    if (!currentWall) return [];
    return generateLayoutProposals(currentWall, obstacles, artworks, layoutOptions);
  }, [currentWall, obstacles, artworks, layoutOptions]);

  // Dynamic counts for each strategy
  const strategyCounts = useMemo(() => {
    return {
      all: proposals.length,
      furniture_centered: proposals.filter((p) => p.strategy === 'furniture_centered').length,
      symmetrical: proposals.filter((p) => p.strategy === 'symmetrical').length,
      grid: proposals.filter((p) => p.strategy === 'grid').length,
      organic: proposals.filter((p) => p.strategy === 'organic').length,
    };
  }, [proposals]);

  // Filter proposals by strategy
  const filteredProposals = useMemo(() => {
    if (selectedStrategy === 'all') return proposals;
    return proposals.filter((p) => p.strategy === selectedStrategy);
  }, [proposals, selectedStrategy]);

  if (!layoutModalOpen) return null;

  // Resolved active proposal: prioritized within active filtered list
  const currentSelectedProposal =
    filteredProposals.find((p) => p.id === selectedProposalId) || filteredProposals[0] || null;

  const handleApply = (proposal: LayoutProposal) => {
    applyProposal(proposal);
  };

  const handleSelectStrategy = (strat: LayoutStrategyType | 'all') => {
    setSelectedStrategy(strat);
    if (strat === 'all') {
      setSelectedProposalId(proposals[0]?.id || null);
    } else {
      const first = proposals.find((p) => p.strategy === strat);
      setSelectedProposalId(first?.id || null);
    }
  };

  const handleSelectWall = (wallId: string) => {
    setSelectedWallId(wallId);
    setActiveWall(wallId);
    setSelectedProposalId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl h-[88vh] bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl flex flex-col overflow-hidden text-neutral-100">
        {/* Header */}
        <div className="h-14 px-6 border-b border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-900/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-wide">
                Generatore Geometrico di Layout Parete
              </h2>
              <p className="text-[11px] text-neutral-400">
                Calcolo automatico degli spazi liberi tenendo conto di mobili, porte e finestre
              </p>
            </div>
          </div>
          <button
            onClick={() => setLayoutModalOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Control Bar: Wall Selector & Parameters */}
        <div className="p-4 bg-neutral-950/60 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
          {/* Wall selection */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 font-medium">Parete:</span>
            <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-md border border-neutral-800">
              {walls.map((w) => (
                <button
                  key={w.id}
                  onClick={() => handleSelectWall(w.id)}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    selectedWallId === w.id
                      ? 'bg-neutral-800 text-white border border-neutral-700 font-semibold shadow-sm'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-850'
                  }`}
                >
                  {w.name} ({Math.round(w.length)} cm)
                </button>
              ))}
            </div>
          </div>

          {/* Strategy Filter Tabs with live counts */}
          <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-md border border-neutral-800">
            <button
              onClick={() => handleSelectStrategy('all')}
              className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                selectedStrategy === 'all'
                  ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700 font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Tutte ({strategyCounts.all})
            </button>
            <button
              onClick={() => handleSelectStrategy('furniture_centered')}
              className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                selectedStrategy === 'furniture_centered'
                  ? 'bg-neutral-800 text-cyan-300 shadow-sm border border-neutral-700 font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Centrato su Mobile ({strategyCounts.furniture_centered})
            </button>
            <button
              onClick={() => handleSelectStrategy('symmetrical')}
              className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                selectedStrategy === 'symmetrical'
                  ? 'bg-neutral-800 text-cyan-300 shadow-sm border border-neutral-700 font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Simmetrico ({strategyCounts.symmetrical})
            </button>
            <button
              onClick={() => handleSelectStrategy('grid')}
              className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                selectedStrategy === 'grid'
                  ? 'bg-neutral-800 text-cyan-300 shadow-sm border border-neutral-700 font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Griglia Geometrica ({strategyCounts.grid})
            </button>
            <button
              onClick={() => handleSelectStrategy('organic')}
              className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                selectedStrategy === 'organic'
                  ? 'bg-neutral-800 text-cyan-300 shadow-sm border border-neutral-700 font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Organico Salon ({strategyCounts.organic})
            </button>
          </div>
        </div>

        {/* Middle Body: Proposals List on Left, Large Interactive Schematic Preview on Right */}
        <div className="flex-1 flex overflow-hidden">
          {/* Proposals Cards List */}
          <div className="w-80 md:w-96 border-r border-neutral-800 overflow-y-auto p-4 flex flex-col gap-3 bg-neutral-950/30">
            {filteredProposals.length === 0 ? (
              <div className="p-8 text-center text-neutral-400 text-xs flex flex-col items-center gap-3">
                <p>Nessuna proposta per questa categoria su questa parete con le dimensioni attuali.</p>
                <button
                  onClick={() => handleSelectStrategy('all')}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-xs transition-colors"
                >
                  Mostra tutte le proposte ({strategyCounts.all})
                </button>
              </div>
            ) : (
              filteredProposals.map((prop) => {
                const isSelected = currentSelectedProposal?.id === prop.id;
                return (
                  <div
                    key={prop.id}
                    onClick={() => setSelectedProposalId(prop.id)}
                    className={`p-3.5 rounded-lg border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-neutral-800/90 border-cyan-500/70 shadow-lg ring-1 ring-cyan-500/40'
                        : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-850'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-white">
                        {prop.title}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-950 text-cyan-400 border border-neutral-800 uppercase">
                        {prop.strategy === 'furniture_centered'
                          ? 'Su Mobile'
                          : prop.strategy === 'symmetrical'
                          ? 'Simmetrico'
                          : prop.strategy === 'grid'
                          ? 'Griglia'
                          : 'Organico'}
                      </span>
                    </div>

                    <p className="text-[11px] text-neutral-400 line-clamp-2 mb-2.5">
                      {prop.description}
                    </p>

                    <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 border-t border-neutral-800/80 pt-2">
                      <span>{prop.metrics.artworksCount} Quadri</span>
                      <span>Ingombro: {Math.round(prop.metrics.totalSpanWidth)} cm</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Preview Section */}
          <div className="flex-1 flex flex-col bg-neutral-950 p-6 overflow-hidden">
            {currentSelectedProposal ? (
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-white">
                        {currentSelectedProposal.title}
                      </h3>
                      <p className="text-xs text-neutral-400">
                        {currentSelectedProposal.description}
                      </p>
                    </div>

                    <button
                      onClick={() => handleApply(currentSelectedProposal)}
                      className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-cyan-950 transition-all hover:scale-102"
                    >
                      <Check className="w-4 h-4" />
                      Applica Questa Disposizione
                    </button>
                  </div>

                  {/* Wall Schematic View */}
                  <div className="w-full h-72 bg-neutral-900 border border-neutral-800 rounded-lg p-4 relative flex items-center justify-center overflow-hidden">
                    <svg
                      viewBox={`0 0 ${currentWall.length} ${currentWall.height}`}
                      className="w-full h-full max-h-64 drop-shadow"
                    >
                      {/* Wall boundary */}
                      <rect
                        x="0"
                        y="0"
                        width={currentWall.length}
                        height={currentWall.height}
                        fill="#1a1e24"
                        stroke="#334155"
                        strokeWidth="1.5"
                      />

                      {/* Floor line */}
                      <line
                        x1="0"
                        y1={currentWall.height}
                        x2={currentWall.length}
                        y2={currentWall.height}
                        stroke="#64748b"
                        strokeWidth="2"
                      />

                      {/* Obstacles */}
                      {obstacles.map((obs) => {
                        const obsW = obs.uMax - obs.uMin;
                        const obsH = obs.vMax - obs.vMin;
                        const obsY = currentWall.height - obs.vMax;
                        return (
                          <g key={obs.id}>
                            <rect
                              x={obs.uMin}
                              y={obsY}
                              width={obsW}
                              height={obsH}
                              fill={obs.color || '#475569'}
                              fillOpacity="0.75"
                              stroke="#94a3b8"
                              strokeWidth="1"
                            />
                            <text
                              x={obs.uMin + obsW / 2}
                              y={obsY + obsH / 2}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill="#ffffff"
                              fontSize="11"
                              fontFamily="sans-serif"
                            >
                              {obs.name}
                            </text>
                          </g>
                        );
                      })}

                      {/* Proposal Placements */}
                      {currentSelectedProposal.placements.map((p, idx) => {
                        const pY = currentWall.height - (p.elevationY + p.height);
                        return (
                          <g key={`prev-${idx}`}>
                            <rect
                              x={p.u}
                              y={pY}
                              width={p.width}
                              height={p.height}
                              fill="#0ea5e9"
                              fillOpacity="0.4"
                              stroke="#38bdf8"
                              strokeWidth="2"
                            />
                            <text
                              x={p.u + p.width / 2}
                              y={pY + p.height / 2}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill="#ffffff"
                              fontSize="10"
                              fontWeight="600"
                              fontFamily="sans-serif"
                            >
                              {p.name}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>

                {/* Parameters Tuner Footer */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                  <CustomNumberInput
                    label="Distanza da Mobili"
                    value={layoutOptions.safetyMarginObstacles}
                    onChange={(v) => setLayoutOptions({ safetyMarginObstacles: v })}
                    min={5}
                    max={50}
                    step={1}
                    unit="cm"
                  />
                  <CustomNumberInput
                    label="Fuga tra Quadri"
                    value={layoutOptions.interArtSpacing}
                    onChange={(v) => setLayoutOptions({ interArtSpacing: v })}
                    min={3}
                    max={30}
                    step={1}
                    unit="cm"
                  />
                  <CustomNumberInput
                    label="Margine Soffitto"
                    value={layoutOptions.safetyMarginCeiling}
                    onChange={(v) => setLayoutOptions({ safetyMarginCeiling: v })}
                    min={10}
                    max={60}
                    step={1}
                    unit="cm"
                  />
                  <CustomNumberInput
                    label="Altezza Occhi Media"
                    value={layoutOptions.targetEyeLevel}
                    onChange={(v) => setLayoutOptions({ targetEyeLevel: v })}
                    min={130}
                    max={170}
                    step={1}
                    unit="cm"
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
