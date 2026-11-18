/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import { ProjectData } from '../../types/room';
import {
  Folder,
  Download,
  Upload,
  Plus,
  Trash2,
  X,
  FileText,
  RotateCcw,
  Check,
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'artwall_saved_projects_v1';

export const ProjectModal: React.FC = () => {
  const {
    projectModalOpen,
    loadProject,
    resetToTemplate,
    exportProjectJSON,
    setProjectModalOpen,
  } = useRoomStore();

  const [savedProjects, setSavedProjects] = useState<ProjectData[]>([]);
  const [newProjectName, setNewProjectName] = useState('La Mia Stanza 3D');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved list on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        setSavedProjects(JSON.parse(raw));
      }
    } catch (e) {
      console.error(e);
    }
  }, [projectModalOpen]);

  if (!projectModalOpen) return null;

  const handleSaveCurrent = () => {
    try {
      const jsonStr = exportProjectJSON();
      const project: ProjectData = JSON.parse(jsonStr);
      project.name = newProjectName || 'Progetto Stanza';
      project.updatedAt = new Date().toISOString();

      const existing = savedProjects.filter((p) => p.id !== project.id);
      const updated = [project, ...existing];
      setSavedProjects(updated);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedProjects.filter((p) => p.id !== id);
    setSavedProjects(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  };

  const handleExportFile = () => {
    const jsonStr = exportProjectJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `artwall-progetto-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.room && parsed.furniture && parsed.artworks) {
          loadProject(parsed);
          setProjectModalOpen(false);
        }
      } catch (err) {
        alert('File di progetto non valido');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl flex flex-col overflow-hidden text-neutral-100">
        {/* Header */}
        <div className="h-14 px-6 border-b border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Folder className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-wide">
                Gestione Progetti e Modelli
              </h2>
              <p className="text-[11px] text-neutral-400">
                Salva, carica, esporta in JSON o carica layout preimpostati
              </p>
            </div>
          </div>
          <button
            onClick={() => setProjectModalOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6 max-h-[75vh] overflow-y-auto">
          {/* Quick Preconfigured Templates */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
              Modelli di Stanza Predefiniti
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => {
                  resetToTemplate('living-sofa');
                  setProjectModalOpen(false);
                }}
                className="p-3.5 rounded-lg border border-neutral-800 hover:border-cyan-500/60 bg-neutral-950/60 hover:bg-neutral-950 text-left transition-all group"
              >
                <p className="text-xs font-semibold text-white group-hover:text-cyan-400">
                  Soggiorno Moderno con Divano
                </p>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Stanza rettangolare 5×4m con divano 3 posti, madia, finestra e quadri d'autore.
                </p>
              </button>

              <button
                onClick={() => {
                  resetToTemplate('l-shaped-gallery');
                  setProjectModalOpen(false);
                }}
                className="p-3.5 rounded-lg border border-neutral-800 hover:border-cyan-500/60 bg-neutral-950/60 hover:bg-neutral-950 text-left transition-all group"
              >
                <p className="text-xs font-semibold text-white group-hover:text-cyan-400">
                  Stanza Irregolare ad "L"
                </p>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Layout poligonale a 6 pareti per galleria d'arte con panca e vetrata a nastro.
                </p>
              </button>
            </div>
          </div>

          {/* Save Current Project */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
              Salva Progetto Attuale
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Nome del progetto..."
                className="flex-1 h-9 px-3 rounded-md bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-cyan-500 font-sans"
              />
              <button
                onClick={handleSaveCurrent}
                className="px-4 h-9 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-md shadow transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Salva
              </button>
            </div>
          </div>

          {/* Saved Projects in Browser */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
              Progetti Salvati nel Browser ({savedProjects.length})
            </h3>
            {savedProjects.length === 0 ? (
              <p className="text-xs text-neutral-500 italic py-2">
                Nessun progetto salvato in locale.
              </p>
            ) : (
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                {savedProjects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      loadProject(p);
                    }}
                    className="p-3 rounded-lg border border-neutral-800 bg-neutral-950/70 hover:bg-neutral-900 hover:border-neutral-700 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="text-xs font-semibold text-white">{p.name}</p>
                      <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                        {new Date(p.updatedAt).toLocaleString('it-IT')} · {p.artworks?.length || 0} Quadri · {p.furniture?.length || 0} Mobili
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleDelete(p.id, e)}
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-950 text-neutral-400 hover:text-red-400 transition-colors"
                        title="Elimina"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Export / Import File */}
          <div className="pt-4 border-t border-neutral-800 flex items-center justify-between gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Importa JSON
            </button>

            <button
              onClick={handleExportFile}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Esporta Progetto JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
