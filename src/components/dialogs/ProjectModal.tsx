/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import { ProjectData } from '../../types/room';
import { ROOM_TEMPLATES } from '../../constants/templates';
import { Modal } from '../ui/Modal';
import { downloadFile } from '../../utils/files';
import { FolderOpen, Download, Upload, Save, Trash2, LayoutTemplate, Clock, RefreshCw } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'artwall_saved_projects_v1';

function readSaved(): ProjectData[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const TemplateThumb: React.FC<{ id: string }> = ({ id }) => {
  const tpl = ROOM_TEMPLATES.find((t) => t.id === id)!;
  const scene = tpl.build();
  const xs = scene.room.vertices.map((v) => v.x);
  const ys = scene.room.vertices.map((v) => v.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const pad = 40;
  return (
    <svg viewBox={`${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`} className="w-full h-full">
      <polygon points={scene.room.vertices.map((v) => `${v.x},${v.y}`).join(' ')} fill={scene.room.floorColor} stroke="#cfcfd8" strokeWidth="10" strokeLinejoin="round" />
      {scene.furniture.map((f) => {
        const rot = f.rotationY % 180 !== 0;
        const w = rot ? f.depth : f.width;
        const d = rot ? f.width : f.depth;
        return <rect key={f.id} x={f.position.x - w / 2} y={f.position.z - d / 2} width={w} height={d} rx="8" fill={f.color} />;
      })}
    </svg>
  );
};

export const ProjectModal: React.FC = () => {
  const open = useRoomStore((s) => s.projectModalOpen);
  const { loadProject, resetToTemplate, exportProjectJSON, setProjectModalOpen, notify } = useRoomStore.getState();

  const [saved, setSaved] = useState<ProjectData[]>([]);
  const [name, setName] = useState('La mia stanza');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSaved(readSaved());
      setConfirmDelete(null);
    }
  }, [open]);

  const persist = (list: ProjectData[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
      setSaved(list);
      return true;
    } catch {
      notify('Spazio del browser esaurito: esporta il progetto in JSON.', 'error');
      return false;
    }
  };

  const handleSave = (overwriteId?: string) => {
    const project: ProjectData = JSON.parse(exportProjectJSON(name.trim() || 'Progetto senza nome'));
    if (overwriteId) {
      const old = saved.find((p) => p.id === overwriteId);
      project.id = overwriteId;
      project.name = old?.name || project.name;
    } else {
      const sameName = saved.find((p) => p.name === project.name);
      if (sameName) project.id = sameName.id;
    }
    const list = [project, ...saved.filter((p) => p.id !== project.id)];
    if (persist(list)) notify(`Progetto “${project.name}” salvato`, 'success');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (loadProject(parsed)) notify(`Progetto “${parsed.name || file.name}” importato`, 'success');
        else notify('Il file non contiene un progetto ArtWall valido.', 'error');
      } catch {
        notify('File JSON non leggibile.', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <Modal
      open={open}
      onClose={() => setProjectModalOpen(false)}
      title="Progetti"
      subtitle="Il lavoro viene salvato automaticamente in questo browser. Qui puoi creare versioni, esportare e ripartire da un modello."
      icon={<FolderOpen className="w-4 h-4" />}
      size="lg"
    >
      <div className="p-5 sm:p-6 flex flex-col gap-7">
        {/* Templates */}
        <section className="flex flex-col gap-3">
          <h3 className="eyebrow flex items-center gap-2">
            <LayoutTemplate className="w-3.5 h-3.5" /> Inizia da un modello
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {ROOM_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  resetToTemplate(t.id);
                  setProjectModalOpen(false);
                }}
                className="card text-left overflow-hidden hover:border-brass-500/45 transition-colors group"
              >
                <div className="h-24 bg-ink-950 p-2 group-hover:bg-ink-800 transition-colors">
                  <TemplateThumb id={t.id} />
                </div>
                <div className="p-3">
                  <p className="text-[12.5px] font-semibold text-ink-100">{t.name}</p>
                  <p className="text-[11px] text-ink-400 mt-1 leading-snug line-clamp-3">{t.description}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Save */}
        <section className="flex flex-col gap-3">
          <h3 className="eyebrow flex items-center gap-2">
            <Save className="w-3.5 h-3.5" /> Salva una versione
          </h3>
          <div className="flex gap-2">
            <input
              className="field flex-1 !h-9"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="Nome del progetto"
              aria-label="Nome del progetto"
            />
            <button className="btn btn-primary" onClick={() => handleSave()}>
              <Save className="w-4 h-4" /> Salva
            </button>
          </div>
        </section>

        {/* Saved list */}
        <section className="flex flex-col gap-3">
          <h3 className="eyebrow flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" /> Salvati nel browser · {saved.length}
          </h3>
          {saved.length === 0 ? (
            <p className="text-[12.5px] text-ink-500">Ancora nessun progetto salvato.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {saved.map((p) => (
                <div key={p.id} className="card px-3.5 py-2.5 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-ink-100 truncate">{p.name}</p>
                    <p className="text-[11px] text-ink-400">
                      {new Date(p.updatedAt).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' })} · {p.artworks?.length || 0} quadri ·{' '}
                      {p.furniture?.length || 0} arredi
                    </p>
                  </div>
                  {confirmDelete === p.id ? (
                    <>
                      <span className="text-[11.5px] text-ink-300 hidden sm:inline">Eliminare?</span>
                      <button className="btn btn-danger btn-sm" onClick={() => persist(saved.filter((x) => x.id !== p.id))}>
                        Elimina
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(null)}>
                        No
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="icon-btn" title="Sovrascrivi con lo stato attuale" aria-label={`Sovrascrivi ${p.name}`} onClick={() => handleSave(p.id)}>
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button className="icon-btn hover:!text-danger" title="Elimina" aria-label={`Elimina ${p.name}`} onClick={() => setConfirmDelete(p.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          if (loadProject(p)) notify(`Progetto “${p.name}” aperto`, 'success');
                        }}
                      >
                        Apri
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Import / export */}
        <section className="flex flex-col sm:flex-row gap-2 pt-5 border-t hairline">
          <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleImport} className="hidden" />
          <button className="btn btn-secondary flex-1" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4" /> Importa file JSON
          </button>
          <button
            className="btn btn-secondary flex-1"
            onClick={() => {
              const json = exportProjectJSON(name);
              const slug = (name || 'progetto').toLowerCase().replace(/[^a-z0-9]+/g, '-');
              downloadFile(`artwall-${slug}.json`, new Blob([json], { type: 'application/json' }));
            }}
          >
            <Download className="w-4 h-4" /> Esporta file JSON
          </button>
        </section>
      </div>
    </Modal>
  );
};
