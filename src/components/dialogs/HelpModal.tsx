/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import { Modal } from '../ui/Modal';
import { HelpCircle, Box, Frame, LayoutGrid, Sparkles } from 'lucide-react';

const SHORTCUTS: [string[], string][] = [
  [['1'], 'Vista 3D'],
  [['2'], 'Vista frontale parete'],
  [['3'], 'Pianta'],
  [['N'], 'Nuovo quadro'],
  [['L'], 'Disposizione automatica'],
  [['G'], 'Mostra/nascondi griglia'],
  [['←', '→', '↑', '↓'], 'Sposta selezione di 1 cm (Shift: 10 cm)'],
  [['Ctrl', 'D'], 'Duplica selezione'],
  [['Canc'], 'Elimina selezione'],
  [['Ctrl', 'Z'], 'Annulla'],
  [['Ctrl', '⇧', 'Z'], 'Ripeti'],
  [['Ctrl', 'S'], 'Progetti e salvataggio'],
  [['Esc'], 'Deseleziona / chiudi'],
];

const STEPS = [
  { icon: LayoutGrid, title: 'Disegna la stanza', text: 'Imposta misure e forma nella scheda Stanza o trascina gli angoli in Pianta.' },
  { icon: Box, title: 'Aggiungi arredi e infissi', text: 'Divani, madie, porte e finestre diventano ostacoli reali per i quadri.' },
  { icon: Sparkles, title: 'Genera la composizione', text: 'L’auto layout propone griglie, simmetrie e salon wall su misura.' },
  { icon: Frame, title: 'Rifinisci e appendi', text: 'Trascina i quadri nella vista Parete e usa la guida di montaggio per i chiodi.' },
];

export const HelpModal: React.FC = () => {
  const open = useRoomStore((s) => s.helpModalOpen);
  const setOpen = useRoomStore((s) => s.setHelpModalOpen);
  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Come funziona" subtitle="Quattro passi dalla stanza vuota alla parete finita." icon={<HelpCircle className="w-4 h-4" />} size="md">
      <div className="p-5 sm:p-6 flex flex-col gap-6">
        <ol className="grid sm:grid-cols-2 gap-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card p-3.5 flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-brass-500/12 text-brass-400 flex items-center justify-center shrink-0">
                <s.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[12.5px] font-semibold text-ink-100">
                  <span className="text-brass-400 font-mono mr-1">{i + 1}.</span>
                  {s.title}
                </p>
                <p className="text-[12px] text-ink-400 mt-0.5 leading-relaxed">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <div>
          <h3 className="eyebrow mb-2">Scorciatoie da tastiera</h3>
          <div className="grid sm:grid-cols-2 gap-x-6">
            {SHORTCUTS.map(([keys, label]) => (
              <div key={label} className="flex items-center justify-between gap-3 py-1.5 border-b hairline text-[12.5px]">
                <span className="text-ink-300">{label}</span>
                <span className="flex gap-1 shrink-0">
                  {keys.map((k) => (
                    <span key={k} className="kbd">
                      {k}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
