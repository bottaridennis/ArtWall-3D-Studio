/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { useRoomStore } from './store/useRoomStore';
import { Navbar } from './components/layout/Navbar';
import { LeftSidebar } from './components/layout/LeftSidebar';
import { RightInspector } from './components/layout/RightInspector';
import { ViewportContainer } from './components/viewport/ViewportContainer';
import { AutoLayoutModal } from './components/dialogs/AutoLayoutModal';
import { AddArtworkModal } from './components/dialogs/AddArtworkModal';
import { ProjectModal } from './components/dialogs/ProjectModal';
import { HelpModal } from './components/dialogs/HelpModal';
import { HangingGuideModal } from './components/dialogs/HangingGuideModal';
import { Toasts } from './components/ui/Toasts';

const isTypingTarget = (t: EventTarget | null) =>
  t instanceof HTMLInputElement ||
  t instanceof HTMLTextAreaElement ||
  t instanceof HTMLSelectElement ||
  (t instanceof HTMLElement && t.isContentEditable);

export default function App() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const s = useRoomStore.getState();
      const anyModal =
        s.layoutModalOpen || s.addArtworkModalOpen || s.projectModalOpen || s.helpModalOpen || s.guideModalOpen;
      if (anyModal) return;

      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
        return;
      }
      if (mod && key === 'y') {
        e.preventDefault();
        s.redo();
        return;
      }
      if (mod && key === 'd') {
        e.preventDefault();
        s.duplicateSelected();
        return;
      }
      if (mod && key === 's') {
        e.preventDefault();
        s.setProjectModalOpen(true);
        return;
      }
      if (mod) return;

      switch (e.key) {
        case 'Escape':
          s.clearSelection();
          s.setLeftPanelOpen(false);
          s.setRightPanelOpen(false);
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          s.deleteSelected();
          break;
        case 'ArrowLeft':
        case 'ArrowRight':
        case 'ArrowUp':
        case 'ArrowDown': {
          if (!s.selectedId) return;
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy = e.key === 'ArrowUp' ? step : e.key === 'ArrowDown' ? -step : 0;
          s.nudgeSelected(dx, dy);
          break;
        }
        case '1':
          s.setViewMode('3d');
          break;
        case '2':
          s.setViewMode('2d_wall');
          break;
        case '3':
          s.setViewMode('2d_plan');
          break;
        case '?':
          s.setHelpModalOpen(true);
          break;
        case 'n':
        case 'N':
          s.setAddArtworkModalOpen(true);
          break;
        case 'l':
        case 'L':
          s.setLayoutModalOpen(true);
          break;
        case 'g':
        case 'G':
          s.toggleGrid();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col w-screen h-dvh bg-ink-950 text-ink-100 overflow-hidden">
      <Navbar />

      <div className="flex-1 flex min-h-0 relative">
        <LeftSidebar />
        <ViewportContainer />
        <RightInspector />
      </div>

      <AutoLayoutModal />
      <AddArtworkModal />
      <ProjectModal />
      <HelpModal />
      <HangingGuideModal />
      <Toasts />
    </div>
  );
}
