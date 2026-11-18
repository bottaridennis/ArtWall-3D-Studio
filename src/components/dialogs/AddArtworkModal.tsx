/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useMemo } from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import { CURATED_ARTWORKS, FRAME_COLOR_OPTIONS } from '../../constants/presets';
import { CustomNumberInput } from '../ui/CustomNumberInput';
import { CustomColorPicker } from '../ui/CustomColorPicker';
import { FrameSettings } from '../../types/room';
import {
  Upload,
  Image as ImageIcon,
  X,
  Plus,
  Check,
  Palette,
} from 'lucide-react';

export const AddArtworkModal: React.FC = () => {
  const {
    addArtworkModalOpen,
    activeWallId,
    getWalls,
    addArtwork,
    setAddArtworkModalOpen,
  } = useRoomStore();

  const walls = useMemo(() => getWalls(), [getWalls]);

  const [activeTab, setActiveTab] = useState<'upload' | 'curated'>('curated');
  const [title, setTitle] = useState('Nuova Opera');
  const [imageUrl, setImageUrl] = useState(CURATED_ARTWORKS[0].url);
  const [targetWallId, setTargetWallId] = useState(activeWallId || 'wall-0');
  const [width, setWidth] = useState(80);
  const [height, setHeight] = useState(60);

  const [frame, setFrame] = useState<FrameSettings>({
    enabled: true,
    width: 3,
    depth: 3,
    color: '#18181b',
    matWidth: 3,
    matColor: '#ffffff',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!addArtworkModalOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setImageUrl(event.target.result);
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectCurated = (preset: typeof CURATED_ARTWORKS[0]) => {
    setImageUrl(preset.url);
    setTitle(preset.title);
    setWidth(preset.defaultWidth);
    setHeight(preset.defaultHeight);
    setFrame(preset.defaultFrame);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addArtwork({
      name: title || 'Quadro',
      imageUrl,
      wallId: targetWallId,
      u: 100, // default position
      elevationY: 130, // eye level
      width,
      height,
      frame,
    });
    setAddArtworkModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl flex flex-col overflow-hidden text-neutral-100">
        {/* Header */}
        <div className="h-14 px-6 border-b border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-wide">
                Aggiungi Quadro alla Parete
              </h2>
              <p className="text-[11px] text-neutral-400">
                Imposta dimensioni reali, immagine e caratteristiche della cornice
              </p>
            </div>
          </div>
          <button
            onClick={() => setAddArtworkModalOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch: Collezione Curata vs Carica Immagine */}
        <div className="px-6 pt-4 pb-2 flex items-center gap-2 border-b border-neutral-800/60 bg-neutral-950/40">
          <button
            onClick={() => setActiveTab('curated')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'curated'
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Capolavori & Galleria Curata
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'upload'
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Carica la Tua Immagine (File / Foto)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* Tab 1: Curated Masterpieces */}
          {activeTab === 'curated' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CURATED_ARTWORKS.map((preset) => {
                const isSelected = imageUrl === preset.url;
                return (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectCurated(preset)}
                    className={`group relative rounded-lg border overflow-hidden cursor-pointer transition-all ${
                      isSelected
                        ? 'border-cyan-500 ring-2 ring-cyan-500/40 shadow-md'
                        : 'border-neutral-800 hover:border-neutral-700 bg-neutral-950'
                    }`}
                  >
                    <div className="aspect-4/3 w-full overflow-hidden bg-neutral-900">
                      <img
                        src={preset.url}
                        alt={preset.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-2 text-left">
                      <p className="text-xs font-semibold text-white truncate">
                        {preset.title}
                      </p>
                      <p className="text-[10px] text-neutral-400 truncate">
                        {preset.artist}
                      </p>
                      <p className="text-[10px] font-mono text-neutral-500 mt-0.5">
                        {preset.defaultWidth}×{preset.defaultHeight} cm
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 2: Custom Upload */}
          {activeTab === 'upload' && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-700 hover:border-cyan-500/70 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer bg-neutral-950/40 hover:bg-neutral-950/70 transition-all"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-400">
                <Upload className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-white">
                  Fai clic o trascina qui l'immagine del quadro
                </p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Supporta JPG, PNG, WEBP ad alta risoluzione
                </p>
              </div>
            </div>
          )}

          {/* Title & Wall destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-neutral-400 font-medium">Titolo Opera</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-8 px-3 rounded-md bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-cyan-500 font-sans"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-neutral-400 font-medium">Parete di Destinazione</label>
              <select
                value={targetWallId}
                onChange={(e) => setTargetWallId(e.target.value)}
                className="h-8 px-2.5 rounded-md bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-cyan-500 font-sans cursor-pointer"
              >
                {walls.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({Math.round(w.length)} cm)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Real Dimensions */}
          <div>
            <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
              Dimensioni Reali della Tela
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <CustomNumberInput
                label="Larghezza Tela"
                value={width}
                onChange={setWidth}
                min={20}
                max={400}
                unit="cm"
              />
              <CustomNumberInput
                label="Altezza Tela"
                value={height}
                onChange={setHeight}
                min={20}
                max={400}
                unit="cm"
              />
            </div>
          </div>

          {/* Frame & Passepartout Customization */}
          <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={frame.enabled}
                  onChange={(e) => setFrame({ ...frame, enabled: e.target.checked })}
                  className="rounded border-neutral-700 bg-neutral-900 text-cyan-500 focus:ring-0"
                />
                <span className="text-xs font-semibold text-white">Includi Cornice</span>
              </label>

              {frame.enabled && (
                <span className="text-[11px] font-mono text-neutral-400">
                  Ingombro totale: {width + (frame.width + frame.matWidth) * 2}×{height + (frame.width + frame.matWidth) * 2} cm
                </span>
              )}
            </div>

            {frame.enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-900">
                <CustomNumberInput
                  label="Spessore Bordo Cornice"
                  value={frame.width}
                  onChange={(v) => setFrame({ ...frame, width: v })}
                  min={1}
                  max={12}
                  unit="cm"
                />
                <CustomNumberInput
                  label="Passepartout (Mat)"
                  value={frame.matWidth}
                  onChange={(v) => setFrame({ ...frame, matWidth: v })}
                  min={0}
                  max={15}
                  unit="cm"
                />
                <div className="sm:col-span-2">
                  <CustomColorPicker
                    label="Finitura Cornice"
                    value={frame.color}
                    onChange={(col) => setFrame({ ...frame, color: col })}
                    presetColors={FRAME_COLOR_OPTIONS}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={() => setAddArtworkModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white rounded-lg transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg shadow-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Aggiungi alla Parete
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
