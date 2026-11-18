/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

/**
 * Docked panel on large screens, slide-over drawer on smaller ones.
 */
export const SidePanel: React.FC<{
  side: 'left' | 'right';
  open: boolean;
  onClose: () => void;
  width?: string;
  label: string;
  children: React.ReactNode;
}> = ({ side, open, onClose, width = 'w-[320px]', label, children }) => {
  const isLeft = side === 'left';
  return (
    <>
      {/* Backdrop (mobile/tablet only) */}
      <div
        className={`lg:hidden absolute inset-0 z-30 bg-black/50 backdrop-blur-[2px] transition-opacity ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        aria-label={label}
        className={`panel ${width} max-w-[88vw] h-full flex flex-col shrink-0 z-40
          absolute lg:relative top-0 ${isLeft ? 'left-0 border-r' : 'right-0 border-l'}
          transition-transform duration-300 ease-out lg:translate-x-0
          ${open ? 'translate-x-0 shadow-2xl' : isLeft ? '-translate-x-full' : 'translate-x-full'}`}
      >
        {children}
      </aside>
    </>
  );
};
