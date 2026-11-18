/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Artwork, Door, Furniture, RoomConfig, Window } from '../types/room';
import { createRectangleVertices } from '../utils/geometry';
import { CURATED_ARTWORKS } from './presets';

export interface SceneData {
  room: RoomConfig;
  doors: Door[];
  windows: Window[];
  furniture: Furniture[];
  artworks: Artwork[];
  activeWallId: string;
}

export interface RoomTemplate {
  id: string;
  name: string;
  description: string;
  build: () => SceneData;
}

const blackFrame = (width = 3, matWidth = 4) => ({
  enabled: true,
  width,
  depth: 3,
  color: '#18181b',
  matWidth,
  matColor: '#ffffff',
});

const livingRoom = (): SceneData => ({
  room: {
    shapeType: 'rectangular',
    width: 500,
    length: 400,
    height: 280,
    vertices: createRectangleVertices(500, 400),
    wallColor: '#f5f5f0',
    floorColor: '#bfa07d',
    floorMaterial: 'wood',
  },
  furniture: [
    {
      id: 'furn-sofa-1',
      name: 'Divano 3 Posti',
      width: 230,
      height: 85,
      depth: 95,
      position: { x: 250, y: 0, z: 50 },
      rotationY: 0,
      color: '#607274',
    },
    {
      id: 'furn-sideboard-1',
      name: 'Madia Rovere',
      width: 180,
      height: 75,
      depth: 45,
      position: { x: 475, y: 0, z: 200 },
      rotationY: 90,
      color: '#b08968',
    },
  ],
  doors: [
    {
      id: 'door-1',
      name: 'Porta d’Ingresso',
      wallId: 'wall-2',
      u: 80,
      width: 90,
      height: 215,
      elevationY: 0,
      frameColor: '#3f3f46',
    },
  ],
  windows: [
    {
      id: 'win-1',
      name: 'Finestra Panoramica',
      wallId: 'wall-3',
      u: 140,
      width: 130,
      height: 140,
      elevationY: 90,
      frameColor: '#3f3f46',
    },
  ],
  artworks: [
    {
      id: 'art-1',
      name: CURATED_ARTWORKS[0].title,
      imageUrl: CURATED_ARTWORKS[0].url,
      wallId: 'wall-0',
      u: 150,
      elevationY: 120,
      width: 90,
      height: 65,
      frame: blackFrame(3, 4),
    },
    {
      id: 'art-2',
      name: CURATED_ARTWORKS[2].title,
      imageUrl: CURATED_ARTWORKS[2].url,
      wallId: 'wall-0',
      u: 266,
      elevationY: 120,
      width: 70,
      height: 90,
      frame: blackFrame(2.5, 3),
    },
  ],
  activeWallId: 'wall-0',
});

const lGallery = (): SceneData => ({
  room: {
    shapeType: 'polygon',
    width: 600,
    length: 600,
    height: 300,
    vertices: [
      { x: 0, y: 0 },
      { x: 600, y: 0 },
      { x: 600, y: 350 },
      { x: 350, y: 350 },
      { x: 350, y: 600 },
      { x: 0, y: 600 },
    ],
    wallColor: '#f8fafc',
    floorColor: '#b8b5ad',
    floorMaterial: 'concrete',
  },
  furniture: [
    {
      id: 'furn-bench',
      name: 'Panca da Galleria',
      width: 180,
      height: 45,
      depth: 55,
      position: { x: 300, y: 0, z: 175 },
      rotationY: 0,
      color: '#393e46',
    },
  ],
  doors: [
    {
      id: 'door-l1',
      name: 'Ingresso Principale',
      wallId: 'wall-4',
      u: 80,
      width: 100,
      height: 220,
      elevationY: 0,
      frameColor: '#18181b',
    },
  ],
  windows: [
    {
      id: 'win-l1',
      name: 'Vetrata a Nastro',
      wallId: 'wall-1',
      u: 80,
      width: 200,
      height: 120,
      elevationY: 110,
      frameColor: '#18181b',
    },
  ],
  artworks: [
    {
      id: 'art-g1',
      name: CURATED_ARTWORKS[1].title,
      imageUrl: CURATED_ARTWORKS[1].url,
      wallId: 'wall-0',
      u: 150,
      elevationY: 130,
      width: 90,
      height: 90,
      frame: blackFrame(3.5, 5),
    },
    {
      id: 'art-g2',
      name: CURATED_ARTWORKS[2].title,
      imageUrl: CURATED_ARTWORKS[2].url,
      wallId: 'wall-0',
      u: 300,
      elevationY: 130,
      width: 80,
      height: 100,
      frame: blackFrame(3.5, 5),
    },
  ],
  activeWallId: 'wall-0',
});

const bedroom = (): SceneData => ({
  room: {
    shapeType: 'rectangular',
    width: 420,
    length: 380,
    height: 270,
    vertices: createRectangleVertices(420, 380),
    wallColor: '#dbe4db',
    floorColor: '#d4b996',
    floorMaterial: 'light_wood',
  },
  furniture: [
    {
      id: 'furn-bed',
      name: 'Letto Matrimoniale',
      width: 170,
      height: 100,
      depth: 210,
      position: { x: 210, y: 0, z: 110 },
      rotationY: 0,
      color: '#555b6e',
    },
    {
      id: 'furn-dresser',
      name: 'Cassettiera Comò',
      width: 110,
      height: 95,
      depth: 50,
      position: { x: 210, y: 0, z: 350 },
      rotationY: 0,
      color: '#c29b68',
    },
  ],
  doors: [
    {
      id: 'door-b1',
      name: 'Porta Camera',
      wallId: 'wall-1',
      u: 250,
      width: 80,
      height: 210,
      elevationY: 0,
      frameColor: '#f5f5f4',
    },
  ],
  windows: [
    {
      id: 'win-b1',
      name: 'Finestra',
      wallId: 'wall-3',
      u: 130,
      width: 120,
      height: 140,
      elevationY: 90,
      frameColor: '#f5f5f4',
    },
  ],
  artworks: [],
  activeWallId: 'wall-0',
});

const emptyRoom = (): SceneData => ({
  room: {
    shapeType: 'rectangular',
    width: 400,
    length: 400,
    height: 280,
    vertices: createRectangleVertices(400, 400),
    wallColor: '#f8fafc',
    floorColor: '#e5e2db',
    floorMaterial: 'tile',
  },
  furniture: [],
  doors: [],
  windows: [],
  artworks: [],
  activeWallId: 'wall-0',
});

export const ROOM_TEMPLATES: RoomTemplate[] = [
  {
    id: 'living-sofa',
    name: 'Soggiorno con divano',
    description: 'Stanza 5×4 m con divano, madia, porta, finestra e due opere già appese.',
    build: livingRoom,
  },
  {
    id: 'l-shaped-gallery',
    name: 'Galleria a “L”',
    description: 'Pianta irregolare a 6 pareti con panca centrale e vetrata a nastro.',
    build: lGallery,
  },
  {
    id: 'bedroom',
    name: 'Camera da letto',
    description: 'Letto matrimoniale e comò: ideale per testare la parete sopra la testiera.',
    build: bedroom,
  },
  {
    id: 'empty',
    name: 'Stanza vuota',
    description: 'Un cubo bianco 4×4 m da cui partire da zero.',
    build: emptyRoom,
  },
];
