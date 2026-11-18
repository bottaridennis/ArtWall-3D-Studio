/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { RoomConfig } from '../types/room';

function shade(hex: string, amount: number): string {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amount)));
  return `#${c.getHexString()}`;
}

/** Deterministic pseudo random for stable textures */
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

/**
 * Procedural floor texture (no network needed). One texture tile = 1 m × 1 m.
 */
export function createFloorTexture(
  material: RoomConfig['floorMaterial'],
  color: string
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = rng(42);

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);

  if (material === 'wood' || material === 'light_wood') {
    // Planks 20 cm wide, staggered joints
    const plankH = size / 5;
    for (let row = 0; row < 5; row++) {
      const y = row * plankH;
      ctx.fillStyle = shade(color, (rand() - 0.5) * 0.08);
      ctx.fillRect(0, y, size, plankH);
      // grain
      for (let g = 0; g < 26; g++) {
        ctx.strokeStyle = `rgba(0,0,0,${0.03 + rand() * 0.05})`;
        ctx.lineWidth = 1 + rand() * 1.5;
        ctx.beginPath();
        const gy = y + rand() * plankH;
        ctx.moveTo(0, gy);
        for (let x = 0; x <= size; x += 32) ctx.lineTo(x, gy + Math.sin(x / 40 + g) * 2);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(0, y, size, 2);
      const offset = (row % 2) * (size / 2) + rand() * 60;
      ctx.fillRect(offset % size, y, 2, plankH);
    }
  } else if (material === 'tile') {
    // 50 × 50 cm tiles
    const t = size / 2;
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) {
        ctx.fillStyle = shade(color, (rand() - 0.5) * 0.05);
        ctx.fillRect(i * t + 2, j * t + 2, t - 4, t - 4);
      }
    ctx.strokeStyle = shade(color, -0.18);
    ctx.lineWidth = 3;
    for (let k = 0; k <= 2; k++) {
      ctx.beginPath();
      ctx.moveTo(k * t, 0);
      ctx.lineTo(k * t, size);
      ctx.moveTo(0, k * t);
      ctx.lineTo(size, k * t);
      ctx.stroke();
    }
  } else {
    // concrete / resin: soft noise
    for (let i = 0; i < 3500; i++) {
      ctx.fillStyle = `rgba(${rand() > 0.5 ? '0,0,0' : '255,255,255'},${rand() * 0.06})`;
      const r = rand() * 6;
      ctx.beginPath();
      ctx.arc(rand() * size, rand() * size, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}


