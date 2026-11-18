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

export default function App() {
  const {
    selectedId,
    selectedType,
    removeFurniture,
    duplicateFurniture,
    removeArtwork,
    duplicateArtwork,
    removeDoor,
    removeWindow,
    clearSelection,
  } = useRoomStore();

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === 'Escape') {
        clearSelection();
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!selectedId || !selectedType) return;
        if (selectedType === 'furniture') removeFurniture(selectedId);
        else if (selectedType === 'artwork') removeArtwork(selectedId);
        else if (selectedType === 'door') removeDoor(selectedId);
        else if (selectedType === 'window') removeWindow(selectedId);
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (!selectedId || !selectedType) return;
        if (selectedType === 'furniture') duplicateFurniture(selectedId);
        else if (selectedType === 'artwork') duplicateArtwork(selectedId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedId,
    selectedType,
    removeFurniture,
    duplicateFurniture,
    removeArtwork,
    duplicateArtwork,
    removeDoor,
    removeWindow,
    clearSelection,
  ]);

  return (
    <div className="flex flex-col w-screen h-screen bg-neutral-950 text-neutral-100 overflow-hidden font-sans select-none">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Studio Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Control Tools */}
        <LeftSidebar />

        {/* Center Workspace (3D / 2D Wall Elevation / 2D Floor Plan) */}
        <ViewportContainer />

        {/* Right Inspector & Element Properties */}
        <RightInspector />
      </div>

      {/* Dialogs and Modals */}
      <AutoLayoutModal />
      <AddArtworkModal />
      <ProjectModal />
    </div>
  );
}
