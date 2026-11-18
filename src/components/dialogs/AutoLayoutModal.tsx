/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import { getWallObstacles, getArtworkTotalDimensions } from '../../utils/geometry';
import { generateLayoutProposals } from '../../utils/layoutAlgorithm';
import { LayoutProposal, LayoutStrategyType, ProjectedObstacle, Wall } from '../../types/room';
import { CustomNumberInput } from '../ui/CustomNumberInput';
import { Modal } from '../ui/Modal';
import { Sparkles, Check, SlidersHorizontal, ChevronDown, AlertTriangle, Wand2 } from 'lucide-react';

const STRATEGIES: { id: LayoutStrategyType | 'all'; label: string }[] = [
  { id: 'all', label: 'Tutte' },
  { id: 'furniture_centered', label: 'Sul mobile' },
  { id: 'symmetrical', label: 'Simmetriche' },
  { id: 'grid', label: 'Griglia' },
  { id: 'organic', label: 'Salon' },
];

const STRATEGY_LABEL: Record<LayoutStrategyType, string> = {
  furniture_centered: 'Sul mobile',
  symmetrical: 'Simmetrico',
  grid: 'Griglia',
  organic: 'Salon',
};

const WallPreview: React.FC<{
  wall: Wall;
  wallColor: string;
  obstacles: ProjectedObstacle[];
  proposal: LayoutProposal;
  eyeLevel: number;
  detailed?: boolean;
}> = ({ wall, wallColor, obstacles, proposal, eyeLevel, detailed }) => {
  const W = wall.length;
  const H = wall.height;
  const k = Math.max(W / 1.7, H) / 300;
  const pad = detailed ? 14 * k : 0;
  return (
    <svg viewBox={`${-pad} ${-pad} ${W + pad * 2} ${H + pad * 2}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <rect x={0} y={0} width={W} height={H} fill={wallColor} rx={detailed ? 2 * k : 0} />
      {detailed && (
        <line x1={0} y1={H - eyeLevel} x2={W} y2={H - eyeLevel} stroke="#c99a45" strokeOpacity={0.6} strokeWidth={0.8 * k} strokeDasharray={`${5 * k} ${4 * k}`} />
      )}
      {obstacles.map((o) => (
        <rect
          key={o.id}
          x={o.uMin}
          y={H - o.vMax}
          width={o.uMax - o.uMin}
          height={o.vMax - o.vMin}
          fill={o.type === 'window' ? '#bfe3f5' : o.type === 'door' ? '#26262c' : o.color || '#607274'}
          opacity={o.type === 'window' ? 0.7 : 0.9}
          rx={1.5 * k}
        />
      ))}
      {proposal.placements.map((p, i) => {
        const d = getArtworkTotalDimensions(p);
        const inset = p.frame.enabled ? p.frame.width + p.frame.matWidth : 0;
        const y = H - p.elevationY - d.totalHeight;
        return (
          <g key={i}>
            {p.frame.enabled && <rect x={p.u} y={y} width={d.totalWidth} height={d.totalHeight} fill={p.frame.color} />}
            {p.frame.enabled && p.frame.matWidth > 0 && (
              <rect x={p.u + p.frame.width} y={y + p.frame.width} width={d.totalWidth - p.frame.width * 2} height={d.totalHeight - p.frame.width * 2} fill={p.frame.matColor} />
            )}
            <image href={p.imageUrl} x={p.u + inset} y={y + inset} width={p.width} height={p.height} preserveAspectRatio="xMidYMid slice" />
          </g>
        );
      })}
    </svg>
  );
};

export const AutoLayoutModal: React.FC = () => {
  const open = useRoomStore((s) => s.layoutModalOpen);
  const room = useRoomStore((s) => s.room);
  const furniture = useRoomStore((s) => s.furniture);
  const doors = useRoomStore((s) => s.doors);
  const windows = useRoomStore((s) => s.windows);
  const artworks = useRoomStore((s) => s.artworks);
  const activeWallId = useRoomStore((s) => s.activeWallId);
  const layoutOptions = useRoomStore((s) => s.layoutOptions);
  const { getWalls, setActiveWall, setLayoutModalOpen, setLayoutOptions, applyProposal } = useRoomStore.getState();

  const [strategy, setStrategy] = useState<LayoutStrategyType | 'all'>('all');
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [showParams, setShowParams] = useState(false);

  useEffect(() => {
    if (open) setSelectedProposalId(null);
  }, [open, activeWallId]);

  const walls = useMemo(() => getWalls(), [room.vertices, room.height]); // eslint-disable-line react-hooks/exhaustive-deps
  const wall = walls.find((w) => w.id === activeWallId) || walls[0];

  const obstacles = useMemo(() => (wall ? getWallObstacles(wall, furniture, doors, windows) : []), [wall, furniture, doors, windows]);

  const proposals = useMemo(
    () => (open && wall ? generateLayoutProposals(wall, obstacles, artworks, layoutOptions) : []),
    [open, wall, obstacles, artworks, layoutOptions]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: proposals.length };
    for (const p of proposals) c[p.strategy] = (c[p.strategy] || 0) + 1;
    return c;
  }, [proposals]);

  const filtered = strategy === 'all' ? proposals : proposals.filter((p) => p.strategy === strategy);
  const current = filtered.find((p) => p.id === selectedProposalId) || filtered[0] || null;
  const existingOnWall = artworks.filter((a) => a.wallId === wall?.id).length;

  if (!wall) return null;

  return (
    <Modal
      open={open}
      onClose={() => setLayoutModalOpen(false)}
      title="Disposizione automatica"
      subtitle="Composizioni calcolate sugli spazi liberi della parete, tenendo conto di mobili, porte e finestre."
      icon={<Sparkles className="w-4 h-4" />}
      size="xl"
      bodyClassName="flex flex-col"
    >
      {/* Controls */}
      <div className="px-5 sm:px-6 py-3 border-b hairline flex flex-col lg:flex-row lg:items-center gap-3 justify-between bg-ink-950/30">
        <div className="seg overflow-x-auto max-w-full">
          {walls.map((w) => (
            <button key={w.id} className="seg-item" data-active={w.id === wall.id} onClick={() => setActiveWall(w.id)}>
              {w.name}
              <span className="font-mono text-[10.5px] text-ink-500">{Math.round(w.length)}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {STRATEGIES.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setStrategy(s.id);
                setSelectedProposalId(null);
              }}
              className={`h-7 px-3 rounded-full text-[12px] font-medium border whitespace-nowrap transition-colors ${
                strategy === s.id ? 'bg-brass-500/15 border-brass-500/40 text-brass-300' : 'border-white/8 text-ink-400 hover:text-ink-100'
              }`}
            >
              {s.label} <span className="opacity-60 font-mono">{counts[s.id] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col-reverse md:flex-row">
        {/* Proposal list */}
        <div className="md:w-[330px] shrink-0 md:border-r hairline p-4 flex flex-col gap-2.5 md:max-h-[62vh] md:overflow-y-auto scroll-area">
          {filtered.length === 0 ? (
            <div className="text-center py-10 px-4 text-[12.5px] text-ink-400 flex flex-col items-center gap-3">
              <Wand2 className="w-6 h-6 text-ink-500" />
              Nessuna composizione di questo tipo entra sulla parete con i margini attuali.
              <button className="btn btn-secondary btn-sm" onClick={() => setShowParams(true)}>
                Regola i parametri
              </button>
            </div>
          ) : (
            filtered.map((p) => {
              const active = current?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedProposalId(p.id)}
                  className={`text-left rounded-xl p-2.5 flex gap-3 border transition-colors ${
                    active ? 'border-brass-500/50 bg-brass-500/8' : 'border-white/6 hover:border-white/14 hover:bg-white/3'
                  }`}
                >
                  <div className="w-24 h-16 shrink-0 rounded-md overflow-hidden bg-ink-950">
                    <WallPreview wall={wall} wallColor={room.wallColor} obstacles={obstacles} proposal={p} eyeLevel={layoutOptions.targetEyeLevel} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold text-ink-100 leading-snug line-clamp-2">{p.title}</p>
                    <p className="text-[11px] text-ink-400 mt-1">
                      {STRATEGY_LABEL[p.strategy]} · {p.metrics.artworksCount} quadri · {Math.round(p.metrics.totalSpanWidth)} cm
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Preview */}
        <div className="flex-1 min-w-0 p-4 sm:p-6 flex flex-col gap-4">
          {current ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <h3 className="display text-[26px] leading-tight text-ink-100">{current.title}</h3>
                  <p className="text-[12.5px] text-ink-400 mt-1 max-w-xl">{current.description}</p>
                </div>
                <button className="btn btn-primary shrink-0" onClick={() => applyProposal(current)}>
                  <Check className="w-4 h-4" /> Applica
                </button>
              </div>
              <div className="rounded-2xl bg-ink-950 border hairline p-3 sm:p-5 h-[34vh] min-h-[200px]">
                <WallPreview wall={wall} wallColor={room.wallColor} obstacles={obstacles} proposal={current} eyeLevel={layoutOptions.targetEyeLevel} detailed />
              </div>
              <div className="flex flex-wrap gap-2 text-[12px]">
                {[
                  ['Quadri', current.metrics.artworksCount],
                  ['Larghezza gruppo', `${Math.round(current.metrics.totalSpanWidth)} cm`],
                  ['Altezza gruppo', `${Math.round(current.metrics.totalSpanHeight)} cm`],
                  ['Centro a', `${Math.round(current.metrics.averageElevation)} cm`],
                ].map(([l, v]) => (
                  <span key={l as string} className="rounded-full bg-ink-850 border hairline px-3 py-1 text-ink-400">
                    {l} <span className="font-mono text-ink-100 ml-1">{v}</span>
                  </span>
                ))}
              </div>
              {existingOnWall > 0 && (
                <p className="flex items-center gap-2 text-[12px] text-ink-400">
                  <AlertTriangle className="w-3.5 h-3.5 text-brass-400 shrink-0" />
                  Applicando, i {existingOnWall} quadri attuali di {wall.name} verranno sostituiti (Ctrl+Z per annullare).
                </p>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-ink-500 text-sm">Nessuna proposta selezionata</div>
          )}

          <div className="rounded-xl border hairline">
            <button className="w-full flex items-center justify-between px-4 py-3 text-[12.5px] font-medium text-ink-200" onClick={() => setShowParams(!showParams)}>
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-brass-400" /> Parametri di calcolo
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showParams ? 'rotate-180' : ''}`} />
            </button>
            {showParams && (
              <div className="px-4 pb-4 grid grid-cols-2 lg:grid-cols-5 gap-3">
                <CustomNumberInput label="Altezza occhi" value={layoutOptions.targetEyeLevel} onChange={(v) => setLayoutOptions({ targetEyeLevel: v })} min={120} max={180} />
                <CustomNumberInput label="Spazio tra quadri" value={layoutOptions.interArtSpacing} onChange={(v) => setLayoutOptions({ interArtSpacing: v })} min={2} max={40} />
                <CustomNumberInput label="Distanza mobili" value={layoutOptions.safetyMarginObstacles} onChange={(v) => setLayoutOptions({ safetyMarginObstacles: v })} min={5} max={60} />
                <CustomNumberInput label="Margine soffitto" value={layoutOptions.safetyMarginCeiling} onChange={(v) => setLayoutOptions({ safetyMarginCeiling: v })} min={5} max={80} />
                <CustomNumberInput label="Margine pavimento" value={layoutOptions.safetyMarginFloor} onChange={(v) => setLayoutOptions({ safetyMarginFloor: v })} min={10} max={120} />
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
