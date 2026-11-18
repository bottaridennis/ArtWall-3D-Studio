/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import { ViewMode } from '../../types/room';
import {
  Box,
  Frame,
  LayoutGrid,
  Sparkles,
  FolderOpen,
  Plus,
  Undo2,
  Redo2,
  HelpCircle,
  PanelLeft,
  SlidersHorizontal,
  ClipboardList,
} from 'lucide-react';

const VIEWS: { id: ViewMode; label: string; short: string; icon: React.ElementType; key: string }[] = [
  { id: '3d', label: 'Vista 3D', short: '3D', icon: Box, key: '1' },
  { id: '2d_wall', label: 'Parete', short: 'Parete', icon: Frame, key: '2' },
  { id: '2d_plan', label: 'Pianta', short: 'Pianta', icon: LayoutGrid, key: '3' },
];

export const Logo: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
    <rect width="64" height="64" rx="14" fill="#1c1c21" />
    <rect x="12" y="14" width="40" height="30" rx="2" fill="none" stroke="#e3b866" strokeWidth="4" />
    <rect x="19" y="21" width="26" height="16" fill="#e3b866" opacity=".35" />
    <path d="M8 52h48" stroke="#e3b866" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

export const Navbar: React.FC = () => {
  const viewMode = useRoomStore((s) => s.viewMode);
  const canUndo = useRoomStore((s) => s.past.length > 0);
  const canRedo = useRoomStore((s) => s.future.length > 0);
  const leftPanelOpen = useRoomStore((s) => s.leftPanelOpen);
  const rightPanelOpen = useRoomStore((s) => s.rightPanelOpen);
  const hasSelection = useRoomStore((s) => !!s.selectedId);
  const {
    setViewMode,
    undo,
    redo,
    setLayoutModalOpen,
    setAddArtworkModalOpen,
    setProjectModalOpen,
    setHelpModalOpen,
    setGuideModalOpen,
    setLeftPanelOpen,
    setRightPanelOpen,
  } = useRoomStore.getState();

  return (
    <header className="h-14 px-2 sm:px-3 panel border-b flex items-center gap-2 shrink-0 z-30 relative">
      {/* Left: drawer toggle + brand */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
        <button
          className="icon-btn lg:hidden"
          data-active={leftPanelOpen}
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          aria-label="Apri libreria"
        >
          <PanelLeft className="w-4.5 h-4.5" />
        </button>
        <Logo className="w-8 h-8 shrink-0 hidden sm:block" />
        <div className="leading-none min-w-0 hidden sm:block">
          <h1 className="display text-[22px] text-ink-100 leading-none">
            ArtWall <span className="italic text-brass-400">Studio</span>
          </h1>
          <p className="text-[10.5px] text-ink-400 mt-1 hidden xl:block">Progetta pareti, appendi arte</p>
        </div>
      </div>

      {/* Center: view switch */}
      <nav className="seg shrink-0" aria-label="Modalità di visualizzazione">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            data-active={viewMode === v.id}
            onClick={() => setViewMode(v.id)}
            className="seg-item"
            title={`${v.label} (${v.key})`}
          >
            <v.icon className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{v.label}</span>
            <span className="md:hidden hidden min-[400px]:inline">{v.short}</span>
          </button>
        ))}
      </nav>

      {/* Right: actions */}
      <div className="flex items-center justify-end gap-1 sm:gap-1.5 flex-1 min-w-0">
        <div className="flex items-center">
          <button className="icon-btn" onClick={undo} disabled={!canUndo} title="Annulla (Ctrl+Z)" aria-label="Annulla">
            <Undo2 className="w-4 h-4" />
          </button>
          <button className="icon-btn hidden min-[420px]:inline-flex" onClick={redo} disabled={!canRedo} title="Ripeti (Ctrl+Shift+Z)" aria-label="Ripeti">
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
        <div className="hidden md:block w-px h-5 bg-white/8 mx-1" />
        <button
          className="icon-btn hidden md:inline-flex"
          onClick={() => setGuideModalOpen(true)}
          title="Guida di montaggio"
          aria-label="Guida di montaggio"
        >
          <ClipboardList className="w-4 h-4" />
        </button>
        <button className="icon-btn hidden md:inline-flex" onClick={() => setHelpModalOpen(true)} title="Aiuto e scorciatoie (?)" aria-label="Aiuto">
          <HelpCircle className="w-4 h-4" />
        </button>
        <button className="btn btn-ghost btn-sm hidden xl:inline-flex" onClick={() => setProjectModalOpen(true)}>
          <FolderOpen className="w-4 h-4" />
          Progetti
        </button>
        <button className="icon-btn xl:hidden" onClick={() => setProjectModalOpen(true)} title="Progetti" aria-label="Progetti">
          <FolderOpen className="w-4 h-4" />
        </button>
        <button className="btn btn-secondary btn-sm hidden lg:inline-flex" onClick={() => setAddArtworkModalOpen(true)}>
          <Plus className="w-3.5 h-3.5" />
          Quadro
        </button>
        <button
          className="btn btn-primary btn-sm hidden sm:inline-flex"
          onClick={() => setLayoutModalOpen(true)}
          title="Disposizione automatica (L)"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Disposizione automatica</span>
          <span className="lg:hidden">Auto</span>
        </button>
        <button
          className="icon-btn lg:hidden relative"
          data-active={rightPanelOpen}
          onClick={() => setRightPanelOpen(!rightPanelOpen)}
          aria-label="Apri proprietà"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {hasSelection && !rightPanelOpen && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brass-400" />
          )}
        </button>
      </div>
    </header>
  );
};
