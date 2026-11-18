/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
  bodyClassName?: string;
}

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
};

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  icon,
  size = 'md',
  children,
  footer,
  bodyClassName = '',
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 bg-black/70 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`relative w-full ${SIZES[size]} max-h-[92dvh] sm:max-h-[88vh] bg-ink-900 rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden animate-pop-in`}
        style={{ boxShadow: 'var(--shadow-pop)' }}
      >
        <header className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-5 pb-4 border-b hairline shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            {icon && (
              <div className="mt-0.5 w-9 h-9 shrink-0 rounded-xl bg-brass-500/12 text-brass-400 flex items-center justify-center ring-1 ring-brass-500/25">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="display text-2xl leading-tight text-ink-100">{title}</h2>
              {subtitle && <p className="text-[12.5px] text-ink-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="icon-btn shrink-0" aria-label="Chiudi">
            <X className="w-4 h-4" />
          </button>
        </header>
        <div className={`flex-1 min-h-0 scroll-area ${bodyClassName}`}>{children}</div>
        {footer && (
          <footer className="px-5 sm:px-6 py-3.5 border-t hairline bg-ink-950/40 flex items-center justify-end gap-2 shrink-0">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
};
