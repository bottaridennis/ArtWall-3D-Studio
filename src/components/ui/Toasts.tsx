/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { useRoomStore } from '../../store/useRoomStore';

export const Toasts: React.FC = () => {
  const toasts = useRoomStore((s) => s.toasts);
  const dismiss = useRoomStore((s) => s.dismissToast);

  return (
    <div className="pointer-events-none fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 w-[min(92vw,420px)]" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto glass rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 text-[12.5px] text-ink-100 animate-slide-up w-full">
          {t.tone === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
          ) : t.tone === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-danger shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-brass-400 shrink-0" />
          )}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="text-ink-400 hover:text-ink-100" aria-label="Chiudi notifica">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
