/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import { Modal } from '../ui/Modal';
import { CustomNumberInput } from '../ui/CustomNumberInput';
import { getArtworkTotalDimensions } from '../../utils/geometry';
import { ClipboardList, Printer, Copy } from 'lucide-react';

export const HangingGuideModal: React.FC = () => {
  const open = useRoomStore((s) => s.guideModalOpen);
  const artworks = useRoomStore((s) => s.artworks);
  const room = useRoomStore((s) => s.room);
  const { setGuideModalOpen, getWalls, notify } = useRoomStore.getState();
  const [drop, setDrop] = useState(4);

  const walls = useMemo(() => getWalls(), [room.vertices, room.height]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = useMemo(
    () =>
      walls
        .map((w) => ({
          wall: w,
          rows: artworks
            .filter((a) => a.wallId === w.id)
            .sort((a, b) => a.u - b.u)
            .map((a) => {
              const d = getArtworkTotalDimensions(a);
              return {
                id: a.id,
                name: a.name,
                size: `${Math.round(d.totalWidth * 10) / 10} × ${Math.round(d.totalHeight * 10) / 10}`,
                nailX: Math.round((a.u + d.totalWidth / 2) * 10) / 10,
                nailY: Math.round((a.elevationY + d.totalHeight - drop) * 10) / 10,
                bottom: Math.round(a.elevationY * 10) / 10,
              };
            }),
        }))
        .filter((g) => g.rows.length > 0),
    [walls, artworks, drop]
  );

  const asText = () =>
    groups
      .map(
        (g) =>
          `${g.wall.name} (${Math.round(g.wall.length)} cm)\n` +
          g.rows.map((r, i) => `  ${i + 1}. ${r.name} [${r.size} cm] → chiodo a ${r.nailX} cm da sinistra, ${r.nailY} cm da terra`).join('\n')
      )
      .join('\n\n');

  return (
    <Modal
      open={open}
      onClose={() => setGuideModalOpen(false)}
      title="Guida di montaggio"
      subtitle="Le misure per piantare ogni chiodo, parete per parete. Le distanze partono dall’angolo sinistro guardando la parete."
      icon={<ClipboardList className="w-4 h-4" />}
      size="lg"
      footer={
        <>
          <button
            className="btn btn-ghost"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(asText());
                notify('Misure copiate negli appunti', 'success');
              } catch {
                notify('Impossibile copiare negli appunti', 'error');
              }
            }}
            disabled={groups.length === 0}
          >
            <Copy className="w-4 h-4" /> Copia testo
          </button>
          <button className="btn btn-primary" onClick={() => window.print()} disabled={groups.length === 0}>
            <Printer className="w-4 h-4" /> Stampa
          </button>
        </>
      }
    >
      <div className="p-5 sm:p-6 flex flex-col gap-5" id="hanging-guide">
        <div className="max-w-xs">
          <CustomNumberInput label="Distanza gancio dal bordo superiore" value={drop} onChange={setDrop} min={0} max={40} hint="misura sul retro" />
        </div>
        {groups.length === 0 ? (
          <p className="text-[13px] text-ink-400">Non ci sono ancora quadri appesi.</p>
        ) : (
          groups.map((g) => (
            <section key={g.wall.id} className="flex flex-col gap-2">
              <h3 className="display text-xl text-ink-100">
                {g.wall.name} <span className="text-ink-500 text-base">· {Math.round(g.wall.length)} cm</span>
              </h3>
              <div className="overflow-x-auto rounded-xl border hairline">
                <table className="w-full text-[12.5px]">
                  <thead className="bg-ink-850 text-ink-400 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium">#</th>
                      <th className="px-3 py-2 font-medium">Opera</th>
                      <th className="px-3 py-2 font-medium">Ingombro</th>
                      <th className="px-3 py-2 font-medium text-right">Chiodo da sx</th>
                      <th className="px-3 py-2 font-medium text-right">Chiodo da terra</th>
                      <th className="px-3 py-2 font-medium text-right">Bordo inferiore</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map((r, i) => (
                      <tr key={r.id} className="border-t hairline">
                        <td className="px-3 py-2 text-ink-500 font-mono">{i + 1}</td>
                        <td className="px-3 py-2 text-ink-100">{r.name}</td>
                        <td className="px-3 py-2 text-ink-400 font-mono whitespace-nowrap">{r.size}</td>
                        <td className="px-3 py-2 text-right font-mono text-brass-300 whitespace-nowrap">{r.nailX} cm</td>
                        <td className="px-3 py-2 text-right font-mono text-brass-300 whitespace-nowrap">{r.nailY} cm</td>
                        <td className="px-3 py-2 text-right font-mono text-ink-300 whitespace-nowrap">{r.bottom} cm</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))
        )}
      </div>
    </Modal>
  );
};
