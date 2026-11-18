/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import { Room3DCanvas } from './Room3DCanvas';
import { WallElevation2DEditor } from './WallElevation2DEditor';
import { FloorPlan2DEditor } from './FloorPlan2DEditor';

export const ViewportContainer: React.FC = () => {
  const { viewMode } = useRoomStore();

  return (
    <main className="flex-1 h-full relative overflow-hidden bg-neutral-950 flex flex-col">
      {viewMode === '3d' && <Room3DCanvas />}
      {viewMode === '2d_wall' && <WallElevation2DEditor />}
      {viewMode === '2d_plan' && <FloorPlan2DEditor />}
    </main>
  );
};
