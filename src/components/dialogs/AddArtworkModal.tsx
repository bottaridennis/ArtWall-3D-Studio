/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import { CURATED_ARTWORKS, FRAME_COLOR_OPTIONS } from '../../constants/presets';
import { CustomNumberInput } from '../ui/CustomNumberInput';
import { CustomColorPicker } from '../ui/CustomColorPicker';
import { Switch } from '../ui/Section';
import { Modal } from '../ui/Modal';
import { FrameSettings } from '../../types/room';
import { readImageFile } from '../../utils/files';
import { Upload, Image as ImageIcon, Plus, Check, Link2, Unlink2, Loader2 } from 'lucide-react';

const DEFAULT_FRAME: FrameSettings = { enabled: true, width: 3, depth: 3, color: '#18181b', matWidth: 4, matColor: '#ffffff' };

const SIZE_PRESETS = [
  { label: 'A4', w: 21, h: 29.7 },
  { label: 'A3', w: 29.7, h: 42 },
  { label: '30×40', w: 30, h: 40 },
  { label: '50×70', w: 50, h: 70 },
  { label: '70×100', w: 70, h: 100 },
  { label: '100×100', w: 100, h: 100 },
];

export const AddArtworkModal: React.FC = () => {
  const open = useRoomStore((s) => s.addArtworkModalOpen);
  const activeWallId = useRoomStore((s) => s.activeWallId);
  const room = useRoomStore((s) => s.room);
  const eyeLevel = useRoomStore((s) => s.layoutOptions.targetEyeLevel);
  const { getWalls, addArtwork, setAddArtworkModalOpen, notify } = useRoomStore.getState();

  const walls = useMemo(() => getWalls(), [room.vertices, room.height]); // eslint-disable-line react-hooks/exhaustive-deps

  const [tab, setTab] = useState<'curated' | 'upload'>('curated');
  const [title, setTitle] = useState(CURATED_ARTWORKS[0].title);
  const [imageUrl, setImageUrl] = useState(CURATED_ARTWORKS[0].url);
  const [targetWallId, setTargetWallId] = useState(activeWallId);
  const [width, setWidth] = useState(CURATED_ARTWORKS[0].defaultWidth);
  const [height, setHeight] = useState(CURATED_ARTWORKS[0].defaultHeight);
  const [locked, setLocked] = useState(true);
  const [frame, setFrame] = useState<FrameSettings>(CURATED_ARTWORKS[0].defaultFrame);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset the form every time the dialog opens
  useEffect(() => {
    if (!open) return;
    const p = CURATED_ARTWORKS[0];
    setTab('curated');
    setTitle(p.title);
    setImageUrl(p.url);
    setWidth(p.defaultWidth);
    setHeight(p.defaultHeight);
    setFrame(p.defaultFrame);
    setTargetWallId(activeWallId);
    setUploadedPreview(null);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const img = await readImageFile(file);
      setImageUrl(img.dataUrl);
      setUploadedPreview(img.dataUrl);
      setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' '));
      // keep the longer side, adapt the other to the real image ratio
      const ratio = img.width / img.height;
      const longSide = Math.max(width, height);
      if (ratio >= 1) {
        setWidth(longSide);
        setHeight(Math.round((longSide / ratio) * 10) / 10);
      } else {
        setHeight(longSide);
        setWidth(Math.round(longSide * ratio * 10) / 10);
      }
      if (!frame.enabled) setFrame(DEFAULT_FRAME);
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const total = {
    w: width + (frame.enabled ? (frame.width + frame.matWidth) * 2 : 0),
    h: height + (frame.enabled ? (frame.width + frame.matWidth) * 2 : 0),
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const wall = walls.find((w) => w.id === targetWallId) || walls[0];
    if (!wall) return;
    addArtwork({
      name: title.trim() || 'Senza titolo',
      imageUrl,
      wallId: wall.id,
      u: Math.max(0, Math.round(((wall.length - total.w) / 2) * 10) / 10),
      elevationY: Math.max(0, Math.round(eyeLevel - total.h / 2)),
      width,
      height,
      frame,
    });
    setAddArtworkModalOpen(false);
    notify(`“${title || 'Quadro'}” aggiunto a ${wall.name}`, 'success');
  };

  const setW = (v: number) => {
    if (locked) setHeight(Math.round(((v * height) / width) * 10) / 10);
    setWidth(v);
  };
  const setH = (v: number) => {
    if (locked) setWidth(Math.round(((v * width) / height) * 10) / 10);
    setHeight(v);
  };

  return (
    <Modal
      open={open}
      onClose={() => setAddArtworkModalOpen(false)}
      title="Aggiungi un quadro"
      subtitle="Scegli un’opera o carica una foto: verrà centrata sulla parete all’altezza occhi."
      icon={<ImageIcon className="w-4 h-4" />}
      size="lg"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={() => setAddArtworkModalOpen(false)}>
            Annulla
          </button>
          <button type="button" className="btn btn-primary" onClick={() => handleSubmit()} disabled={!imageUrl}>
            <Plus className="w-4 h-4" /> Appendi alla parete
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="grid md:grid-cols-[1fr_300px] gap-0">
        {/* Left: source */}
        <div className="p-5 sm:p-6 flex flex-col gap-4 md:border-r hairline">
          <div className="seg self-start">
            <button type="button" className="seg-item" data-active={tab === 'curated'} onClick={() => setTab('curated')}>
              Collezione
            </button>
            <button type="button" className="seg-item" data-active={tab === 'upload'} onClick={() => setTab('upload')}>
              <Upload className="w-3.5 h-3.5" /> Carica foto
            </button>
          </div>

          {tab === 'curated' ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {CURATED_ARTWORKS.map((p) => {
                const selected = imageUrl === p.url;
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => {
                      setImageUrl(p.url);
                      setTitle(p.title);
                      setWidth(p.defaultWidth);
                      setHeight(p.defaultHeight);
                      setFrame(p.defaultFrame);
                    }}
                    className={`group relative text-left rounded-xl overflow-hidden transition-all ${
                      selected ? 'ring-2 ring-brass-400 ring-offset-2 ring-offset-ink-900' : 'ring-1 ring-white/8 hover:ring-white/20'
                    }`}
                  >
                    <div className="aspect-[4/5] bg-ink-800 overflow-hidden">
                      <img src={p.url} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
                      <p className="text-[11.5px] font-semibold text-white leading-tight truncate">{p.title}</p>
                      <p className="text-[10px] text-white/60 truncate">{p.artist}</p>
                    </div>
                    {selected && (
                      <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-brass-400 text-ink-950 flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFile(e.dataTransfer.files?.[0]);
              }}
              className={`relative rounded-2xl border-2 border-dashed min-h-[260px] flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors p-6 ${
                dragOver ? 'border-brass-400 bg-brass-500/8' : 'border-white/12 hover:border-brass-500/50 bg-ink-950/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  handleFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
                className="hidden"
              />
              {uploadedPreview ? (
                <>
                  <img src={uploadedPreview} alt="" className="max-h-52 rounded-lg shadow-xl" />
                  <p className="text-[12px] text-ink-400">Clicca o trascina per sostituire</p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-brass-500/12 text-brass-400 flex items-center justify-center">
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  </div>
                  <div className="text-center">
                    <p className="text-[13px] font-semibold text-ink-100">Trascina qui la foto del tuo quadro</p>
                    <p className="text-[12px] text-ink-400 mt-0.5">oppure clicca per sceglierla · JPG, PNG, WEBP</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: settings */}
        <div className="p-5 sm:p-6 flex flex-col gap-4 bg-ink-950/30">
          <label className="flex flex-col gap-1.5">
            <span className="field-label">Titolo</span>
            <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senza titolo" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="field-label">Parete</span>
            <select className="field" value={targetWallId} onChange={(e) => setTargetWallId(e.target.value)}>
              {walls.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} — {Math.round(w.length)} cm
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Misure tela</span>
              <button type="button" onClick={() => setLocked(!locked)} className={`text-[11px] flex items-center gap-1 ${locked ? 'text-brass-400' : 'text-ink-400'}`}>
                {locked ? <Link2 className="w-3.5 h-3.5" /> : <Unlink2 className="w-3.5 h-3.5" />}
                {locked ? 'Proporzioni' : 'Libere'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <CustomNumberInput label="Larghezza" value={width} onChange={setW} min={10} max={400} />
              <CustomNumberInput label="Altezza" value={height} onChange={setH} min={10} max={400} />
            </div>
            <div className="flex flex-wrap gap-1">
              {SIZE_PRESETS.map((s) => {
                const landscape = width > height;
                return (
                  <button
                    type="button"
                    key={s.label}
                    onClick={() => {
                      setWidth(landscape ? s.h : s.w);
                      setHeight(landscape ? s.w : s.h);
                    }}
                    className="h-6 px-2 rounded-md text-[10.5px] font-mono text-ink-300 border border-white/8 hover:border-brass-500/40 hover:text-ink-100"
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-white/6" />

          <Switch checked={frame.enabled} onChange={(v) => setFrame({ ...frame, enabled: v })} label="Cornice e passepartout" />
          {frame.enabled && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <CustomNumberInput label="Cornice" value={frame.width} onChange={(v) => setFrame({ ...frame, width: v })} min={0.5} max={15} />
                <CustomNumberInput label="Passepartout" value={frame.matWidth} onChange={(v) => setFrame({ ...frame, matWidth: v })} min={0} max={20} />
              </div>
              <CustomColorPicker label="Finitura" value={frame.color} onChange={(c) => setFrame({ ...frame, color: c })} presetColors={FRAME_COLOR_OPTIONS} />
            </>
          )}
          <div className="rounded-xl bg-ink-850 border hairline px-3 py-2.5 flex items-center justify-between text-[12px]">
            <span className="text-ink-400">Ingombro totale</span>
            <span className="font-mono text-brass-300">
              {Math.round(total.w * 10) / 10} × {Math.round(total.h * 10) / 10} cm
            </span>
          </div>
        </div>
      </form>
    </Modal>
  );
};
