/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import { WallElevation2DEditor } from './WallElevation2DEditor';
import { FloorPlan2DEditor } from './FloorPlan2DEditor';
import { Ruler, Grid3x3, Magnet, Camera, Box, ArrowDownToLine, Frame, Loader2, RotateCcw } from 'lucide-react';

const Room3DCanvas = lazy(() => import('./Room3DCanvas').then((m) => ({ default: m.Room3DCanvas })));

const Toolbar: React.FC = () => {
  const viewMode = useRoomStore((s) => s.viewMode);
  const showDimensions = useRoomStore((s) => s.showDimensions);
  const showGrid = useRoomStore((s) => s.showGrid);
  const snapToGrid = useRoomStore((s) => s.snapToGrid);
  const cameraPreset = useRoomStore((s) => s.cameraPreset);
  const { toggleDimensions, toggleGrid, toggleSnapToGrid, resetCamera, requestScreenshot } = useRoomStore.getState();

  return (
    <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 glass rounded-2xl p-1 flex items-center gap-0.5 max-w-[calc(100%-24px)] overflow-x-auto">
      {viewMode === '3d' && (
        <>
          <button
            className="icon-btn"
            data-active={cameraPreset === 'perspective'}
            onClick={() => resetCamera('perspective')}
            title="Vista prospettica"
            aria-label="Vista prospettica"
          >
            <Box className="w-4 h-4" />
          </button>
          <button
            className="icon-btn"
            data-active={cameraPreset === 'top'}
            onClick={() => resetCamera('top')}
            title="Vista dall’alto"
            aria-label="Vista dall'alto"
          >
            <ArrowDownToLine className="w-4 h-4" />
          </button>
          <button
            className="icon-btn"
            data-active={cameraPreset === 'wall'}
            onClick={() => resetCamera('wall')}
            title="Di fronte alla parete attiva"
            aria-label="Di fronte alla parete attiva"
          >
            <Frame className="w-4 h-4" />
          </button>
          <button className="icon-btn" onClick={() => resetCamera()} title="Ricentra la camera" aria-label="Ricentra la camera">
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-white/10 mx-1" />
        </>
      )}
      <button className="icon-btn" data-active={showDimensions} onClick={toggleDimensions} title="Quote" aria-label="Mostra quote">
        <Ruler className="w-4 h-4" />
      </button>
      <button className="icon-btn" data-active={showGrid} onClick={toggleGrid} title="Griglia (G)" aria-label="Mostra griglia">
        <Grid3x3 className="w-4 h-4" />
      </button>
      {viewMode !== '3d' && (
        <button className="icon-btn" data-active={snapToGrid} onClick={toggleSnapToGrid} title="Aggancio alla griglia" aria-label="Aggancio alla griglia">
          <Magnet className="w-4 h-4" />
        </button>
      )}
      {viewMode === '3d' && (
        <>
          <div className="w-px h-5 bg-white/10 mx-1" />
          <button className="icon-btn" onClick={requestScreenshot} title="Salva immagine PNG" aria-label="Salva immagine PNG">
            <Camera className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
};

class CanvasErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    if (this.state.error)
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-6">
          <p className="display text-2xl text-ink-100">La vista 3D non è disponibile</p>
          <p className="text-[13px] text-ink-400 max-w-sm">Il browser potrebbe non supportare WebGL. Le viste Parete e Pianta restano pienamente utilizzabili.</p>
          <button className="btn btn-secondary" onClick={() => this.setState({ error: false })}>
            Riprova
          </button>
        </div>
      );
    return this.props.children;
  }
}

export const ViewportContainer: React.FC = () => {
  const viewMode = useRoomStore((s) => s.viewMode);
  // The 3D canvas stays mounted once opened: camera, textures and state survive view switches
  const [mounted3D, setMounted3D] = React.useState(viewMode === '3d');
  React.useEffect(() => {
    if (viewMode === '3d') setMounted3D(true);
  }, [viewMode]);

  return (
    <main className="flex-1 min-w-0 h-full relative overflow-hidden viewport-bg flex flex-col">
      {mounted3D && (
        <div className={viewMode === '3d' ? 'flex-1 min-h-0 flex' : 'hidden'}>
        <CanvasErrorBoundary>
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center gap-2 text-ink-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Preparo la scena 3D…
            </div>
          }
        >
          <Room3DCanvas active={viewMode === '3d'} />
        </Suspense>
        </CanvasErrorBoundary>
        </div>
      )}
      {viewMode === '2d_wall' && <WallElevation2DEditor />}
      {viewMode === '2d_plan' && <FloorPlan2DEditor />}
      <Toolbar />
    </main>
  );
};
