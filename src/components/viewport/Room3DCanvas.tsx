/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useRoomStore } from '../../store/useRoomStore';
import { cmToM, wallCoordsTo3D, getArtworkTotalDimensions } from '../../utils/geometry';
import { Wall, Furniture, Artwork, Door, Window } from '../../types/room';

// Helper component to reset camera smoothly
function CameraController({
  resetKey,
  room,
}: {
  resetKey: number;
  room: { width: number; length: number; height: number };
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    const cx = cmToM(room.width / 2);
    const cz = cmToM(room.length / 2);
    const cy = cmToM(room.height / 3);
    const dist = Math.max(cmToM(room.width), cmToM(room.length)) * 1.05;

    camera.position.set(cx + dist * 0.65, cmToM(room.height) * 1.25, cz + dist * 0.85);
    camera.lookAt(cx, cy, cz);
    if (controlsRef.current) {
      controlsRef.current.target.set(cx, cy, cz);
      controlsRef.current.update();
    }
  }, [resetKey, camera, room.width, room.length, room.height]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      dampingFactor={0.08}
      minDistance={1.0}
      maxDistance={35}
      maxPolarAngle={Math.PI / 2 + 0.05} // prevent going below floor
    />
  );
}

// 3D Floor Mesh generated from 2D vertices polygon
function RoomFloor({
  vertices,
  color,
}: {
  vertices: Array<{ x: number; y: number }>;
  color: string;
}) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    if (vertices.length < 3) return s;
    // Note: under rotation [-Math.PI/2, 0, 0], Y_shape maps to +Z_3D when negated: -(-y) = +y
    s.moveTo(cmToM(vertices[0].x), -cmToM(vertices[0].y));
    for (let i = 1; i < vertices.length; i++) {
      s.lineTo(cmToM(vertices[i].x), -cmToM(vertices[i].y));
    }
    s.closePath();
    return s;
  }, [vertices]);

  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <mesh receiveShadow>
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial
          color={color}
          roughness={0.7}
          metalness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// 3D Wall Mesh
function WallMesh({
  wall,
  wallColor,
  isSelected,
  onSelect,
}: {
  wall: Wall;
  wallColor: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const lengthM = cmToM(wall.length);
  const heightM = cmToM(wall.height);
  const thicknessM = 0.15; // 15 cm wall thickness

  // Center position of the wall segment
  const midX = cmToM((wall.p1.x + wall.p2.x) / 2);
  const midZ = cmToM((wall.p1.y + wall.p2.y) / 2);
  const angle = Math.atan2(wall.p2.y - wall.p1.y, wall.p2.x - wall.p1.x);

  return (
    <group
      position={[midX, heightM / 2, midZ]}
      rotation={[0, -angle, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[lengthM, heightM, thicknessM]} />
        <meshStandardMaterial
          color={isSelected ? '#38bdf8' : wallColor}
          roughness={0.9}
          metalness={0.02}
        />
      </mesh>
    </group>
  );
}

// 3D Furniture Box
function FurnitureBox({
  item,
  isSelected,
  onSelect,
}: {
  item: Furniture;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const w = cmToM(item.width);
  const h = cmToM(item.height);
  const d = cmToM(item.depth);
  const posX = cmToM(item.position.x);
  const posY = cmToM(item.position.y) + h / 2;
  const posZ = cmToM(item.position.z);
  const rotY = (item.rotationY * Math.PI) / 180;

  return (
    <group
      position={[posX, posY, posZ]}
      rotation={[0, rotY, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={item.color}
          roughness={0.65}
          metalness={0.1}
          emissive={isSelected ? '#38bdf8' : '#000000'}
          emissiveIntensity={isSelected ? 0.25 : 0}
        />
      </mesh>

      {/* Subtle top edge line highlight */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
        <lineBasicMaterial
          color={isSelected ? '#38bdf8' : '#ffffff'}
          opacity={isSelected ? 0.9 : 0.2}
          transparent
        />
      </lineSegments>

      {/* Name label on hover/select */}
      {isSelected && (
        <Html position={[0, h / 2 + 0.15, 0]} center distanceFactor={8}>
          <div className="bg-neutral-900/90 text-neutral-100 text-[11px] font-mono px-2 py-0.5 rounded border border-cyan-500/50 shadow whitespace-nowrap pointer-events-none">
            {item.name} ({item.width}×{item.depth}×{item.height} cm)
          </div>
        </Html>
      )}
    </group>
  );
}

// 3D Framed Artwork hung on a wall
function ArtworkMesh({
  artwork,
  wall,
  isSelected,
  showDimensions,
  onSelect,
}: {
  artwork: Artwork;
  wall: Wall;
  isSelected: boolean;
  showDimensions: boolean;
  onSelect: () => void;
}) {
  const { totalWidth, totalHeight } = getArtworkTotalDimensions(artwork);
  const canvasW = cmToM(artwork.width);
  const canvasH = cmToM(artwork.height);
  const frameBorderM = artwork.frame.enabled ? cmToM(artwork.frame.width) : 0;
  const matBorderM = artwork.frame.enabled ? cmToM(artwork.frame.matWidth) : 0;
  const frameDepthM = artwork.frame.enabled ? cmToM(artwork.frame.depth) : 0.02;

  // Center coordinate of the artwork on the wall:
  const centerU = artwork.u + totalWidth / 2;
  const centerV = artwork.elevationY + totalHeight / 2;
  const frameDepthCm = artwork.frame.enabled ? artwork.frame.depth : 2;
  const surfaceOffsetCm = 7.5 + frameDepthCm / 2 + 0.1; // 7.5cm is half of 15cm wall thickness

  // Compute 3D position and rotation
  const { x, y, z, rotationY } = useMemo(
    () => wallCoordsTo3D(wall, centerU, centerV, surfaceOffsetCm),
    [wall, centerU, centerV, surfaceOffsetCm]
  );

  // Texture handling with fallback canvas pattern
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let active = true;
    const loader = new THREE.TextureLoader();
    loader.load(
      artwork.imageUrl,
      (loaded) => {
        if (!active) return;
        loaded.colorSpace = THREE.SRGBColorSpace;
        setTexture(loaded);
      },
      undefined,
      () => {
        // Fallback procedural canvas texture if external image load errors
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#2d3748';
          ctx.fillRect(0, 0, 512, 512);
          ctx.fillStyle = '#4a5568';
          ctx.beginPath();
          ctx.arc(256, 256, 160, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = '24px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(artwork.name, 256, 260);
          const genTex = new THREE.CanvasTexture(canvas);
          if (active) setTexture(genTex);
        }
      }
    );

    return () => {
      active = false;
    };
  }, [artwork.imageUrl, artwork.name]);

  return (
    <group
      position={[x, y, z]}
      rotation={[0, rotationY, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* 3D Frame Outer Box */}
      {artwork.frame.enabled && (
        <mesh castShadow receiveShadow position={[0, 0, 0]}>
          <boxGeometry
            args={[
              cmToM(totalWidth),
              cmToM(totalHeight),
              frameDepthM,
            ]}
          />
          <meshStandardMaterial
            color={artwork.frame.color}
            roughness={0.4}
            metalness={0.2}
            emissive={isSelected ? '#38bdf8' : '#000000'}
            emissiveIntensity={isSelected ? 0.3 : 0}
          />
        </mesh>
      )}

      {/* Mat / Passepartout */}
      {artwork.frame.enabled && artwork.frame.matWidth > 0 && (
        <mesh position={[0, 0, frameDepthM / 2 + 0.002]}>
          <planeGeometry
            args={[
              canvasW + matBorderM * 2,
              canvasH + matBorderM * 2,
            ]}
          />
          <meshStandardMaterial
            color={artwork.frame.matColor || '#fafafa'}
            roughness={0.9}
          />
        </mesh>
      )}

      {/* Canvas Painting Image Surface */}
      <mesh
        castShadow
        receiveShadow
        position={[0, 0, frameDepthM / 2 + (artwork.frame.matWidth > 0 ? 0.004 : 0.002)]}
      >
        <planeGeometry args={[canvasW, canvasH]} />
        {texture ? (
          <meshStandardMaterial map={texture} roughness={0.5} />
        ) : (
          <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
        )}
      </mesh>

      {/* Dimension Readouts in 3D */}
      {isSelected && showDimensions && (
        <Html position={[0, -cmToM(totalHeight / 2) - 0.12, 0]} center distanceFactor={7}>
          <div className="bg-neutral-900/95 text-white text-[10px] font-mono px-2 py-0.5 rounded border border-neutral-700 shadow flex items-center gap-2 whitespace-nowrap pointer-events-none">
            <span>{Math.round(artwork.width)}×{Math.round(artwork.height)} cm</span>
            <span className="text-neutral-500">·</span>
            <span className="text-amber-400">h {Math.round(artwork.elevationY)} cm dal suolo</span>
          </div>
        </Html>
      )}
    </group>
  );
}

// 3D Door Representation on Wall
function DoorMesh({ door, wall }: { door: Door; wall: Wall }) {
  const centerU = door.u + door.width / 2;
  const centerV = door.elevationY + door.height / 2;
  const { x, y, z, rotationY } = useMemo(
    () => wallCoordsTo3D(wall, centerU, centerV, 7.6),
    [wall, centerU, centerV]
  );

  return (
    <group position={[x, y, z]} rotation={[0, rotationY, 0]}>
      {/* Door frame & leaf */}
      <mesh receiveShadow>
        <boxGeometry args={[cmToM(door.width), cmToM(door.height), 0.04]} />
        <meshStandardMaterial color={door.frameColor} roughness={0.6} />
      </mesh>
      {/* Handle */}
      <mesh position={[cmToM(door.width / 2 - 8), cmToM(-10), 0.035]}>
        <boxGeometry args={[0.02, 0.1, 0.03]} />
        <meshStandardMaterial color="#d4d4d8" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

// 3D Window Representation on Wall
function WindowMesh({ win, wall }: { win: Window; wall: Wall }) {
  const centerU = win.u + win.width / 2;
  const centerV = win.elevationY + win.height / 2;
  const { x, y, z, rotationY } = useMemo(
    () => wallCoordsTo3D(wall, centerU, centerV, 7.6),
    [wall, centerU, centerV]
  );

  return (
    <group position={[x, y, z]} rotation={[0, rotationY, 0]}>
      {/* Window Frame */}
      <mesh receiveShadow>
        <boxGeometry args={[cmToM(win.width), cmToM(win.height), 0.04]} />
        <meshStandardMaterial color={win.frameColor} roughness={0.5} />
      </mesh>
      {/* Glass Pane */}
      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[cmToM(win.width - 10), cmToM(win.height - 10)]} />
        <meshPhysicalMaterial
          color="#93c5fd"
          roughness={0.1}
          metalness={0.1}
          transmission={0.85}
          transparent
          opacity={0.7}
        />
      </mesh>
    </group>
  );
}

export const Room3DCanvas: React.FC = () => {
  const {
    room,
    furniture,
    artworks,
    doors,
    windows,
    selectedId,
    showDimensions,
    cameraResetKey,
    select,
    getWalls,
  } = useRoomStore();

  const walls = useMemo(() => getWalls(), [room.vertices, room.height, getWalls]);

  return (
    <div className="w-full h-full relative bg-neutral-950 overflow-hidden">
      <Canvas
        shadows
        camera={{ fov: 45, near: 0.1, far: 100, position: [4, 3.5, 5.5] }}
        onPointerDown={(e) => {
          // Deselect on empty canvas click
          if (e.target === e.currentTarget) {
            select(null, null);
          }
        }}
      >
        <CameraController resetKey={cameraResetKey} room={room} />

        {/* Lighting */}
        <ambientLight intensity={0.85} />
        <directionalLight
          position={[cmToM(room.width) + 2, cmToM(room.height) * 1.8, cmToM(room.length) + 3]}
          intensity={1.4}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.5}
          shadow-camera-far={35}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
          shadow-bias={-0.0005}
        />
        <pointLight
          position={[cmToM(room.width / 2), cmToM(room.height) - 0.2, cmToM(room.length / 2)]}
          intensity={0.4}
          distance={15}
        />

        {/* Floor */}
        <RoomFloor vertices={room.vertices} color={room.floorColor} />

        {/* Subtle grid on ground centered on room */}
        <gridHelper
          args={[Math.max(20, Math.max(cmToM(room.width), cmToM(room.length)) * 2), 40, '#3f3f46', '#27272a']}
          position={[cmToM(room.width / 2), -0.001, cmToM(room.length / 2)]}
        />

        {/* Walls */}
        {walls.map((wall) => (
          <WallMesh
            key={wall.id}
            wall={wall}
            wallColor={room.wallColor}
            isSelected={selectedId === wall.id}
            onSelect={() => select(wall.id, 'wall')}
          />
        ))}

        {/* Doors */}
        {doors.map((door) => {
          const wall = walls.find((w) => w.id === door.wallId);
          if (!wall) return null;
          return <DoorMesh key={door.id} door={door} wall={wall} />;
        })}

        {/* Windows */}
        {windows.map((win) => {
          const wall = walls.find((w) => w.id === win.wallId);
          if (!wall) return null;
          return <WindowMesh key={win.id} win={win} wall={wall} />;
        })}

        {/* Furniture Boxes */}
        {furniture.map((item) => (
          <FurnitureBox
            key={item.id}
            item={item}
            isSelected={selectedId === item.id}
            onSelect={() => select(item.id, 'furniture')}
          />
        ))}

        {/* Artworks */}
        {artworks.map((art) => {
          const wall = walls.find((w) => w.id === art.wallId);
          if (!wall) return null;
          return (
            <ArtworkMesh
              key={art.id}
              artwork={art}
              wall={wall}
              isSelected={selectedId === art.id}
              showDimensions={showDimensions}
              onSelect={() => select(art.id, 'artwork')}
            />
          );
        })}
      </Canvas>
    </div>
  );
};
