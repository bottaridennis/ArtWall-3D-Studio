/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import { ViewMode } from '../../types/room';
import {
  Box,
  Compass,
  Maximize,
  Sparkles,
  Folder,
  Plus,
  Eye,
  Grid,
  Magnet,
  Camera,
  Layers,
  Palette,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    viewMode,
    showDimensions,
    showGrid,
    snapToGrid,
    setViewMode,
    toggleDimensions,
    toggleGrid,
    toggleSnapToGrid,
    resetCamera,
    setLayoutModalOpen,
    setAddArtworkModalOpen,
    setProjectModalOpen,
  } = useRoomStore();

  return (
    <header className="h-14 px-4 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between shrink-0 select-none z-20">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center text-white shadow-md shadow-cyan-900/50">
          <Layers className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
            ArtWall <span className="text-cyan-400 font-mono text-xs font-semibold">3D</span>
          </h1>
          <p className="text-[10px] text-neutral-400 hidden sm:block">
            Progettazione Stanze & Disposizione Quadri
          </p>
        </div>
      </div>

      {/* View Mode Segmented Controls */}
      <div className="flex items-center p-1 bg-neutral-950 border border-neutral-800 rounded-lg">
        <button
          onClick={() => setViewMode('3d')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            viewMode === '3d'
              ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
              : 'text-neutral-400 hover:text-white'
          }`}
          title="Vista 3D Orbitale"
        >
          <Box className="w-3.5 h-3.5 text-cyan-400" />
          <span>3D Orbit</span>
        </button>

        <button
          onClick={() => setViewMode('2d_wall')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            viewMode === '2d_wall'
              ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
              : 'text-neutral-400 hover:text-white'
          }`}
          title="Modalità Parete 2D Frontale"
        >
          <Compass className="w-3.5 h-3.5 text-amber-400" />
          <span>Parete 2D Frontale</span>
        </button>

        <button
          onClick={() => setViewMode('2d_plan')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            viewMode === '2d_plan'
              ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
              : 'text-neutral-400 hover:text-white'
          }`}
          title="Editor Pianta Stanza 2D"
        >
          <Maximize className="w-3.5 h-3.5 text-emerald-400" />
          <span>Pianta 2D</span>
        </button>
      </div>

      {/* Viewport Toggles & Actions */}
      <div className="flex items-center gap-2">
        {/* Toggle Controls */}
        <div className="hidden md:flex items-center gap-1 bg-neutral-950 p-1 border border-neutral-800 rounded-lg">
          <button
            onClick={resetCamera}
            title="Ripristina Vista Telecamera"
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-850 rounded transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleDimensions}
            title={showDimensions ? 'Nascondi Quote' : 'Mostra Quote'}
            className={`p-1.5 rounded transition-colors ${
              showDimensions ? 'text-cyan-400 bg-neutral-800' : 'text-neutral-500 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleGrid}
            title={showGrid ? 'Nascondi Griglia' : 'Mostra Griglia'}
            className={`p-1.5 rounded transition-colors ${
              showGrid ? 'text-cyan-400 bg-neutral-800' : 'text-neutral-500 hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleSnapToGrid}
            title={snapToGrid ? 'Magnetismo Griglia Attivo' : 'Magnetismo Griglia Disattivo'}
            className={`p-1.5 rounded transition-colors ${
              snapToGrid ? 'text-cyan-400 bg-neutral-800' : 'text-neutral-500 hover:text-white'
            }`}
          >
            <Magnet className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Primary Action Buttons */}
        <button
          onClick={() => setAddArtworkModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold rounded-md border border-neutral-700 transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5 text-cyan-400" />
          <span>+ Quadro</span>
        </button>

        <button
          onClick={() => setLayoutModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-md shadow-md shadow-cyan-950 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Disposizione Automatica</span>
          <span className="sm:hidden">Auto Layout</span>
        </button>

        <button
          onClick={() => setProjectModalOpen(true)}
          className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md border border-neutral-800 transition-colors"
          title="Gestione Progetti"
        >
          <Folder className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
