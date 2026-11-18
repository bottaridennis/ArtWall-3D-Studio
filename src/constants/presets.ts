/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FrameSettings, Furniture } from '../types/room';

export interface ArtPreset {
  id: string;
  title: string;
  artist: string;
  url: string;
  defaultWidth: number; // cm
  defaultHeight: number; // cm
  defaultFrame: FrameSettings;
}

export const CURATED_ARTWORKS: ArtPreset[] = [
  {
    id: 'art-kandinsky',
    title: 'Composizione VIII',
    artist: 'Wassily Kandinsky',
    url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1000&q=80',
    defaultWidth: 100,
    defaultHeight: 70,
    defaultFrame: {
      enabled: true,
      width: 3,
      depth: 3,
      color: '#18181b', // nero grafite
      matWidth: 4,
      matColor: '#fafafa',
    },
  },
  {
    id: 'art-monet',
    title: 'Ninfee e Riflessi',
    artist: 'Claude Monet',
    url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1000&q=80',
    defaultWidth: 90,
    defaultHeight: 90,
    defaultFrame: {
      enabled: true,
      width: 4,
      depth: 3.5,
      color: '#c29b68', // rovere dorato
      matWidth: 5,
      matColor: '#f5f5f4',
    },
  },
  {
    id: 'art-abstract-minimal',
    title: 'Armonia Geometrica',
    artist: 'Collezione Bauhaus',
    url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1000&q=80',
    defaultWidth: 60,
    defaultHeight: 80,
    defaultFrame: {
      enabled: true,
      width: 2.5,
      depth: 3,
      color: '#27272a',
      matWidth: 3,
      matColor: '#ffffff',
    },
  },
  {
    id: 'art-botanical',
    title: 'Studio Botanico Terracotta',
    artist: 'Arte Contemporanea',
    url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1000&q=80',
    defaultWidth: 50,
    defaultHeight: 70,
    defaultFrame: {
      enabled: true,
      width: 2,
      depth: 2.5,
      color: '#8b5e3c', // noce naturale
      matWidth: 4,
      matColor: '#fafaf9',
    },
  },
  {
    id: 'art-arch-blackwhite',
    title: 'Spazio e Prospettiva',
    artist: 'Fotografia Architetturale',
    url: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=1000&q=80',
    defaultWidth: 80,
    defaultHeight: 60,
    defaultFrame: {
      enabled: true,
      width: 3,
      depth: 3,
      color: '#09090b',
      matWidth: 5,
      matColor: '#ffffff',
    },
  },
  {
    id: 'art-sunset-coast',
    title: 'Orizzonte Dorato',
    artist: 'Paesaggismo Moderno',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80',
    defaultWidth: 120,
    defaultHeight: 80,
    defaultFrame: {
      enabled: true,
      width: 3,
      depth: 3,
      color: '#3f3f46',
      matWidth: 0,
      matColor: '#ffffff',
    },
  },
  {
    id: 'art-portrait-serenity',
    title: 'Riflesso di Luce',
    artist: 'Galleria Contemporanea',
    url: 'https://images.unsplash.com/photo-1549887534-1541e9326642?auto=format&fit=crop&w=1000&q=80',
    defaultWidth: 70,
    defaultHeight: 100,
    defaultFrame: {
      enabled: true,
      width: 2.5,
      depth: 2.5,
      color: '#d4af37', // finitura oro
      matWidth: 4,
      matColor: '#fdfbf7',
    },
  },
  {
    id: 'art-zen-stones',
    title: 'Silenzio Minerale',
    artist: 'Minimalismo Nordico',
    url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1000&q=80',
    defaultWidth: 50,
    defaultHeight: 50,
    defaultFrame: {
      enabled: true,
      width: 2,
      depth: 2,
      color: '#ffffff',
      matWidth: 3,
      matColor: '#f4f4f5',
    },
  },
];

export interface FurniturePreset {
  name: string;
  width: number; // cm
  height: number; // cm
  depth: number; // cm
  color: string;
  category: 'sedute' | 'contenimento' | 'tavoli' | 'zona_notte';
}

export const FURNITURE_PRESETS: FurniturePreset[] = [
  {
    name: 'Divano 3 Posti',
    width: 230,
    height: 85,
    depth: 95,
    color: '#607274', // Grigio ardesia caldo
    category: 'sedute',
  },
  {
    name: 'Divano 2 Posti',
    width: 170,
    height: 85,
    depth: 90,
    color: '#7b8fa1', // Blu cenere
    category: 'sedute',
  },
  {
    name: 'Madia / Credenza',
    width: 180,
    height: 75,
    depth: 45,
    color: '#b08968', // Rovere caldo
    category: 'contenimento',
  },
  {
    name: 'Mobile TV Basso',
    width: 200,
    height: 45,
    depth: 45,
    color: '#393e46', // Antracite
    category: 'contenimento',
  },
  {
    name: 'Console Ingresso',
    width: 120,
    height: 85,
    depth: 35,
    color: '#7f5539', // Noce scuro
    category: 'tavoli',
  },
  {
    name: 'Tavolo da Pranzo',
    width: 180,
    height: 76,
    depth: 90,
    color: '#9c6644', // Legno massello
    category: 'tavoli',
  },
  {
    name: 'Libreria a Parete',
    width: 100,
    height: 200,
    depth: 35,
    color: '#495057', // Grigio grafite
    category: 'contenimento',
  },
  {
    name: 'Cassettiera Comò',
    width: 110,
    height: 95,
    depth: 50,
    color: '#c29b68', // Rovere
    category: 'contenimento',
  },
  {
    name: 'Letto Matrimoniale',
    width: 170,
    height: 100,
    depth: 210,
    color: '#555b6e', // Blu balena
    category: 'zona_notte',
  },
  {
    name: 'Pouf Quadrato',
    width: 60,
    height: 42,
    depth: 60,
    color: '#bf6b63', // Terracotta
    category: 'sedute',
  },
];

export const FRAME_COLOR_OPTIONS = [
  { name: 'Nero Satinato', value: '#18181b' },
  { name: 'Bianco Ottico', value: '#ffffff' },
  { name: 'Rovere Naturale', value: '#b58d62' },
  { name: 'Noce Scuro', value: '#5c3d2e' },
  { name: 'Ottone Dorato', value: '#c59b27' },
  { name: 'Alluminio Spazzolato', value: '#71717a' },
];

export const WALL_COLOR_OPTIONS = [
  { name: 'Bianco Gesso', value: '#f8fafc' },
  { name: 'Bianco Caldo', value: '#f5f5f0' },
  { name: 'Grigio Perla', value: '#e2e8f0' },
  { name: 'Sabbia', value: '#e7ded4' },
  { name: 'Salvia Chiaro', value: '#dbe4db' },
  { name: 'Argilla', value: '#decdc3' },
  { name: 'Antracite', value: '#334155' },
];

export const FLOOR_COLOR_OPTIONS = [
  { name: 'Parquet Rovere Chiaro', value: '#d4b996', material: 'wood' as const },
  { name: 'Parquet Rovere Naturale', value: '#bfa07d', material: 'wood' as const },
  { name: 'Parquet Noce Scuro', value: '#72503b', material: 'wood' as const },
  { name: 'Resina Grigio Caldo', value: '#b8b5ad', material: 'concrete' as const },
  { name: 'Gres Porcellanato Chiaro', value: '#e5e2db', material: 'tile' as const },
  { name: 'Ardesia Scura', value: '#3f4247', material: 'tile' as const },
];
