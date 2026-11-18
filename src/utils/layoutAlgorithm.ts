/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Wall,
  Artwork,
  ProjectedObstacle,
  LayoutProposal,
  LayoutArtworkPlacement,
  LayoutStrategyType,
} from '../types/room';
import { getArtworkTotalDimensions, checkAABBCollision } from './geometry';
import { CURATED_ARTWORKS } from '../constants/presets';

export interface LayoutOptions {
  safetyMarginObstacles: number; // cm (e.g. 15-20)
  safetyMarginCeiling: number; // cm (e.g. 25)
  safetyMarginFloor: number; // cm (e.g. 40)
  interArtSpacing: number; // cm (e.g. 8-10)
  targetEyeLevel: number; // cm from floor (e.g. 150)
}

const DEFAULT_OPTIONS: LayoutOptions = {
  safetyMarginObstacles: 15,
  safetyMarginCeiling: 25,
  safetyMarginFloor: 40,
  interArtSpacing: 8,
  targetEyeLevel: 150,
};

/**
 * Validates whether a placement box fits cleanly on the wall without colliding with obstacles or wall borders
 */
export function isPlacementValid(
  box: { uMin: number; uMax: number; vMin: number; vMax: number },
  wall: Wall,
  obstacles: ProjectedObstacle[],
  otherBoxes: Array<{ uMin: number; uMax: number; vMin: number; vMax: number }>,
  options: LayoutOptions
): boolean {
  // Check wall boundaries
  if (box.uMin < 15) return false;
  if (box.uMax > wall.length - 15) return false;
  if (box.vMin < options.safetyMarginFloor) return false;
  if (box.vMax > wall.height - options.safetyMarginCeiling) return false;

  // Check collision with obstacles
  for (const obs of obstacles) {
    const obsBox = {
      uMin: obs.uMin - options.safetyMarginObstacles,
      uMax: obs.uMax + options.safetyMarginObstacles,
      vMin: obs.vMin - (obs.vMin > 0 ? options.safetyMarginObstacles : 0),
      vMax: obs.vMax + options.safetyMarginObstacles,
    };
    // Touching the safety margin is allowed (tolerance avoids float/equality rejects)
    if (checkAABBCollision(box, obsBox, -0.5)) {
      return false;
    }
  }

  // Check collision with other artworks in the same layout
  for (const other of otherBoxes) {
    if (checkAABBCollision(box, other, options.interArtSpacing / 2 - 0.5)) {
      return false;
    }
  }

  return true;
}

/**
 * Build rich candidate artworks pool from user artworks + curated museum collection
 */
function getArtworksPool(artworks: Artwork[], wallId: string): Artwork[] {
  // Priority: artworks already on this wall, then artworks from other walls,
  // finally the curated collection to fill the gaps.
  const onWall = (artworks || []).filter((a) => a.wallId === wallId);
  const others = (artworks || []).filter((a) => a.wallId !== wallId);
  const pool: Artwork[] = [...onWall, ...others];

  for (const preset of CURATED_ARTWORKS) {
    if (pool.length >= 8) break;
    if (!pool.some((a) => a.imageUrl === preset.url)) {
      pool.push({
        id: `art-pool-${preset.id}`,
        name: preset.title,
        imageUrl: preset.url,
        wallId,
        u: 0,
        elevationY: 0,
        width: preset.defaultWidth,
        height: preset.defaultHeight,
        frame: preset.defaultFrame,
      });
    }
  }

  return pool;
}

/**
 * Generate automatic layout proposals for a given wall considering furniture and obstacles
 */
export function generateLayoutProposals(
  wall: Wall,
  obstacles: ProjectedObstacle[],
  artworks: Artwork[],
  customOptions?: Partial<LayoutOptions>
): LayoutProposal[] {
  const options: LayoutOptions = { ...DEFAULT_OPTIONS, ...customOptions };
  const proposals: LayoutProposal[] = [];

  // Get rich pool of candidate artworks
  const pool = getArtworksPool(artworks, wall.id);
  if (pool.length === 0) return proposals;

  const furnitureObstacles = obstacles.filter((obs) => obs.type === 'furniture');

  // Identify tall obstacles that block the vertical art hanging zone (v in [110, 230])
  const tallObstacles = obstacles.filter((obs) => obs.vMax >= 120);

  // Find unobstructed horizontal spans at hanging height
  const sortedTall = [...tallObstacles].sort((a, b) => a.uMin - b.uMin);
  const freeSpans: Array<{ uMin: number; uMax: number; width: number }> = [];
  let currentEdge = 20;

  for (const obs of sortedTall) {
    if (obs.uMin > currentEdge + 60) {
      freeSpans.push({
        uMin: currentEdge,
        uMax: obs.uMin,
        width: obs.uMin - currentEdge,
      });
    }
    if (obs.uMax > currentEdge) {
      currentEdge = obs.uMax;
    }
  }
  if (wall.length - currentEdge >= 60) {
    freeSpans.push({
      uMin: currentEdge,
      uMax: wall.length - 20,
      width: wall.length - 20 - currentEdge,
    });
  }

  freeSpans.sort((a, b) => b.width - a.width);
  const bestSpan = freeSpans[0] || {
    uMin: 25,
    uMax: wall.length - 25,
    width: wall.length - 50,
  };
  const spanCenterU = (bestSpan.uMin + bestSpan.uMax) / 2;

  // -------------------------------------------------------------
  // STRATEGY 1: CENTRATO SU MOBILE (Furniture Centered)
  // -------------------------------------------------------------
  for (const furn of furnitureObstacles) {
    const furnCenterU = (furn.uMin + furn.uMax) / 2;
    const furnWidth = furn.uMax - furn.uMin;
    const furnTopV = furn.vMax;
    const minBottomV = furnTopV + Math.max(15, options.safetyMarginObstacles);

    // 1.1 Single focal hero artwork centered over furniture
    const heroArt = pool[0];
    if (heroArt) {
      const { totalWidth, totalHeight } = getArtworkTotalDimensions(heroArt);
      const artU = furnCenterU - totalWidth / 2;
      let artBottomV = Math.max(minBottomV, options.targetEyeLevel - totalHeight / 2);
      if (artBottomV + totalHeight > wall.height - options.safetyMarginCeiling) {
        artBottomV = wall.height - options.safetyMarginCeiling - totalHeight;
      }

      const box = {
        uMin: artU,
        uMax: artU + totalWidth,
        vMin: artBottomV,
        vMax: artBottomV + totalHeight,
      };

      if (isPlacementValid(box, wall, obstacles, [], options)) {
        proposals.push({
          id: `prop-furn-hero-${furn.id}`,
          title: `Pezzo Focale su ${furn.name}`,
          strategy: 'furniture_centered',
          description: `Un'opera centrale armoniosamente allineata e proporzionata alla larghezza di ${furn.name}.`,
          wallId: wall.id,
          placements: [
            {
              artworkId: heroArt.id,
              name: heroArt.name,
              imageUrl: heroArt.imageUrl,
              width: heroArt.width,
              height: heroArt.height,
              frame: heroArt.frame,
              u: artU,
              elevationY: artBottomV,
            },
          ],
          metrics: {
            artworksCount: 1,
            totalSpanWidth: totalWidth,
            totalSpanHeight: totalHeight,
            averageElevation: artBottomV + totalHeight / 2,
            targetFurnitureName: furn.name,
          },
        });
      }
    }

    // 1.2 Diptych (Dittico armonico su mobile)
    if (pool.length >= 2) {
      const art1 = pool[0];
      const art2 = pool[1];
      const dim1 = getArtworkTotalDimensions(art1);
      const dim2 = getArtworkTotalDimensions(art2);

      const totalSpan = dim1.totalWidth + options.interArtSpacing + dim2.totalWidth;
      const startU = furnCenterU - totalSpan / 2;
      const maxHeight = Math.max(dim1.totalHeight, dim2.totalHeight);
      let bottomV = Math.max(minBottomV, options.targetEyeLevel - maxHeight / 2);
      if (bottomV + maxHeight > wall.height - options.safetyMarginCeiling) {
        bottomV = wall.height - options.safetyMarginCeiling - maxHeight;
      }

      const box1 = {
        uMin: startU,
        uMax: startU + dim1.totalWidth,
        vMin: bottomV,
        vMax: bottomV + dim1.totalHeight,
      };
      const box2 = {
        uMin: startU + dim1.totalWidth + options.interArtSpacing,
        uMax: startU + totalSpan,
        vMin: bottomV,
        vMax: bottomV + dim2.totalHeight,
      };

      if (
        isPlacementValid(box1, wall, obstacles, [], options) &&
        isPlacementValid(box2, wall, obstacles, [box1], options)
      ) {
        proposals.push({
          id: `prop-furn-diptych-${furn.id}`,
          title: `Dittico Elegante su ${furn.name}`,
          strategy: 'furniture_centered',
          description: `Due opere coordinate affiancate con interasse simmetrico rispetto al centro di ${furn.name}.`,
          wallId: wall.id,
          placements: [
            {
              artworkId: art1.id,
              name: art1.name,
              imageUrl: art1.imageUrl,
              width: art1.width,
              height: art1.height,
              frame: art1.frame,
              u: box1.uMin,
              elevationY: box1.vMin,
            },
            {
              artworkId: art2.id,
              name: art2.name,
              imageUrl: art2.imageUrl,
              width: art2.width,
              height: art2.height,
              frame: art2.frame,
              u: box2.uMin,
              elevationY: box2.vMin,
            },
          ],
          metrics: {
            artworksCount: 2,
            totalSpanWidth: totalSpan,
            totalSpanHeight: maxHeight,
            averageElevation: bottomV + maxHeight / 2,
            targetFurnitureName: furn.name,
          },
        });
      }
    }

    // 1.3 Triptych (Trittico su mobile)
    if (pool.length >= 3 && furnWidth >= 130) {
      const artSlice = pool.slice(0, 3);
      const dims = artSlice.map((a) => getArtworkTotalDimensions(a));
      const totalArtWidth = dims.reduce((acc, d) => acc + d.totalWidth, 0);
      const totalSpan = totalArtWidth + options.interArtSpacing * 2;
      const startU = furnCenterU - totalSpan / 2;
      const maxHeight = Math.max(...dims.map((d) => d.totalHeight));
      let bottomV = Math.max(minBottomV, options.targetEyeLevel - maxHeight / 2);
      if (bottomV + maxHeight > wall.height - options.safetyMarginCeiling) {
        bottomV = wall.height - options.safetyMarginCeiling - maxHeight;
      }

      let currentU = startU;
      const boxes: Array<{ uMin: number; uMax: number; vMin: number; vMax: number }> = [];
      let allValid = true;

      for (let i = 0; i < 3; i++) {
        const box = {
          uMin: currentU,
          uMax: currentU + dims[i].totalWidth,
          vMin: bottomV,
          vMax: bottomV + dims[i].totalHeight,
        };
        if (!isPlacementValid(box, wall, obstacles, boxes, options)) {
          allValid = false;
          break;
        }
        boxes.push(box);
        currentU += dims[i].totalWidth + options.interArtSpacing;
      }

      if (allValid) {
        proposals.push({
          id: `prop-furn-triptych-${furn.id}`,
          title: `Trittico Armonico su ${furn.name}`,
          strategy: 'furniture_centered',
          description: `Composizione a 3 quadri con ritmo costante, proporzionata allo sviluppo orizzontale di ${furn.name}.`,
          wallId: wall.id,
          placements: artSlice.map((art, idx) => ({
            artworkId: art.id,
            name: art.name,
            imageUrl: art.imageUrl,
            width: art.width,
            height: art.height,
            frame: art.frame,
            u: boxes[idx].uMin,
            elevationY: boxes[idx].vMin,
          })),
          metrics: {
            artworksCount: 3,
            totalSpanWidth: totalSpan,
            totalSpanHeight: maxHeight,
            averageElevation: bottomV + maxHeight / 2,
            targetFurnitureName: furn.name,
          },
        });
      }
    }
  }

  // Fallback for furniture_centered if wall has no furniture: center single or pair at eye level
  if (proposals.filter((p) => p.strategy === 'furniture_centered').length === 0) {
    const art = pool[0];
    if (art) {
      const dim = getArtworkTotalDimensions(art);
      const artU = spanCenterU - dim.totalWidth / 2;
      const artV = Math.max(options.safetyMarginFloor, options.targetEyeLevel - dim.totalHeight / 2);
      const box = { uMin: artU, uMax: artU + dim.totalWidth, vMin: artV, vMax: artV + dim.totalHeight };

      if (isPlacementValid(box, wall, obstacles, [], options)) {
        proposals.push({
          id: 'prop-furn-center-wall',
          title: 'Quadro Focale Centrale',
          strategy: 'furniture_centered',
          description: 'Posizionamento centrale calibrato sull’asse della parete ad altezza occhi standard.',
          wallId: wall.id,
          placements: [
            {
              artworkId: art.id,
              name: art.name,
              imageUrl: art.imageUrl,
              width: art.width,
              height: art.height,
              frame: art.frame,
              u: artU,
              elevationY: artV,
            },
          ],
          metrics: {
            artworksCount: 1,
            totalSpanWidth: dim.totalWidth,
            totalSpanHeight: dim.totalHeight,
            averageElevation: artV + dim.totalHeight / 2,
          },
        });
      }
    }
  }

  // -------------------------------------------------------------
  // STRATEGY 2: SIMMETRICO (Symmetrical Balance)
  // -------------------------------------------------------------
  // 2.1 Symmetrical Pair
  if (pool.length >= 2) {
    const art1 = pool[0];
    const art2 = pool[1];
    const dim1 = getArtworkTotalDimensions(art1);
    const dim2 = getArtworkTotalDimensions(art2);
    const pairWidth = dim1.totalWidth + options.interArtSpacing + dim2.totalWidth;
    const startU = spanCenterU - pairWidth / 2;
    const maxHeight = Math.max(dim1.totalHeight, dim2.totalHeight);

    // Calculate clearance if furniture is below
    let baseElevation = Math.max(options.safetyMarginFloor, options.targetEyeLevel - maxHeight / 2);
    for (const furn of furnitureObstacles) {
      if (furn.uMax >= startU && furn.uMin <= startU + pairWidth) {
        baseElevation = Math.max(baseElevation, furn.vMax + options.safetyMarginObstacles);
      }
    }

    const b1 = {
      uMin: startU,
      uMax: startU + dim1.totalWidth,
      vMin: baseElevation,
      vMax: baseElevation + dim1.totalHeight,
    };
    const b2 = {
      uMin: startU + dim1.totalWidth + options.interArtSpacing,
      uMax: startU + pairWidth,
      vMin: baseElevation,
      vMax: baseElevation + dim2.totalHeight,
    };

    if (
      isPlacementValid(b1, wall, obstacles, [], options) &&
      isPlacementValid(b2, wall, obstacles, [b1], options)
    ) {
      proposals.push({
        id: 'prop-symm-pair',
        title: 'Coppia Simmetrica a Parete',
        strategy: 'symmetrical',
        description: 'Disposizione speculare bilanciata sull’asse mediano dello spazio utile.',
        wallId: wall.id,
        placements: [
          {
            artworkId: art1.id,
            name: art1.name,
            imageUrl: art1.imageUrl,
            width: art1.width,
            height: art1.height,
            frame: art1.frame,
            u: b1.uMin,
            elevationY: b1.vMin,
          },
          {
            artworkId: art2.id,
            name: art2.name,
            imageUrl: art2.imageUrl,
            width: art2.width,
            height: art2.height,
            frame: art2.frame,
            u: b2.uMin,
            elevationY: b2.vMin,
          },
        ],
        metrics: {
          artworksCount: 2,
          totalSpanWidth: pairWidth,
          totalSpanHeight: maxHeight,
          averageElevation: baseElevation + maxHeight / 2,
        },
      });
    }
  }

  // 2.2 Symmetrical Triptych (Centerpiece flanked by two matching pieces)
  if (pool.length >= 3) {
    const center = pool[0];
    const left = pool[1];
    const right = pool[2];
    const dimC = getArtworkTotalDimensions(center);
    const dimL = getArtworkTotalDimensions(left);
    const dimR = getArtworkTotalDimensions(right);

    const tripWidth = dimL.totalWidth + dimC.totalWidth + dimR.totalWidth + options.interArtSpacing * 2;
    const startU = spanCenterU - tripWidth / 2;
    const maxHeight = Math.max(dimC.totalHeight, dimL.totalHeight, dimR.totalHeight);

    let baseElevation = Math.max(options.safetyMarginFloor, options.targetEyeLevel - maxHeight / 2);
    for (const furn of furnitureObstacles) {
      if (furn.uMax >= startU && furn.uMin <= startU + tripWidth) {
        baseElevation = Math.max(baseElevation, furn.vMax + options.safetyMarginObstacles);
      }
    }

    const bL = { uMin: startU, uMax: startU + dimL.totalWidth, vMin: baseElevation, vMax: baseElevation + dimL.totalHeight };
    const bC = { uMin: startU + dimL.totalWidth + options.interArtSpacing, uMax: startU + dimL.totalWidth + options.interArtSpacing + dimC.totalWidth, vMin: baseElevation, vMax: baseElevation + dimC.totalHeight };
    const bR = { uMin: bC.uMax + options.interArtSpacing, uMax: bC.uMax + options.interArtSpacing + dimR.totalWidth, vMin: baseElevation, vMax: baseElevation + dimR.totalHeight };

    if (
      isPlacementValid(bL, wall, obstacles, [], options) &&
      isPlacementValid(bC, wall, obstacles, [bL], options) &&
      isPlacementValid(bR, wall, obstacles, [bL, bC], options)
    ) {
      proposals.push({
        id: 'prop-symm-triptych',
        title: 'Trittico Simmetrico con Centro Focale',
        strategy: 'symmetrical',
        description: 'Grande opera centrale affiancata simmetricamente da due tele coordinate.',
        wallId: wall.id,
        placements: [
          { artworkId: left.id, name: left.name, imageUrl: left.imageUrl, width: left.width, height: left.height, frame: left.frame, u: bL.uMin, elevationY: bL.vMin },
          { artworkId: center.id, name: center.name, imageUrl: center.imageUrl, width: center.width, height: center.height, frame: center.frame, u: bC.uMin, elevationY: bC.vMin },
          { artworkId: right.id, name: right.name, imageUrl: right.imageUrl, width: right.width, height: right.height, frame: right.frame, u: bR.uMin, elevationY: bR.vMin },
        ],
        metrics: {
          artworksCount: 3,
          totalSpanWidth: tripWidth,
          totalSpanHeight: maxHeight,
          averageElevation: baseElevation + maxHeight / 2,
        },
      });
    }
  }

  // -------------------------------------------------------------
  // STRATEGY 3: GRIGLIA GEOMETRICA (Gallery Grid)
  // -------------------------------------------------------------
  // 3.1 2x2 Grid (4 artworks)
  const grid4 = pool.slice(0, 4);
  if (grid4.length < 4) return proposals;
  const dims4 = grid4.map((a) => getArtworkTotalDimensions(a));
  const col1W = Math.max(dims4[0].totalWidth, dims4[2]?.totalWidth || dims4[0].totalWidth);
  const col2W = Math.max(dims4[1].totalWidth, dims4[3]?.totalWidth || dims4[1].totalWidth);
  const row1H = Math.max(dims4[0].totalHeight, dims4[1].totalHeight);
  const row2H = Math.max(dims4[2]?.totalHeight || 60, dims4[3]?.totalHeight || 60);

  const totalGridW = col1W + options.interArtSpacing + col2W;
  const totalGridH = row1H + options.interArtSpacing + row2H;

  const startGridU = spanCenterU - totalGridW / 2;
  let startGridV = Math.max(options.safetyMarginFloor, options.targetEyeLevel - totalGridH / 2);
  for (const furn of furnitureObstacles) {
    if (furn.uMax >= startGridU && furn.uMin <= startGridU + totalGridW) {
      startGridV = Math.max(startGridV, furn.vMax + options.safetyMarginObstacles);
    }
  }

  const gb0 = { uMin: startGridU, uMax: startGridU + dims4[0].totalWidth, vMin: startGridV + row2H + options.interArtSpacing, vMax: startGridV + totalGridH };
  const gb1 = { uMin: startGridU + col1W + options.interArtSpacing, uMax: startGridU + col1W + options.interArtSpacing + dims4[1].totalWidth, vMin: startGridV + row2H + options.interArtSpacing, vMax: startGridV + totalGridH };
  const gb2 = { uMin: startGridU, uMax: startGridU + (dims4[2]?.totalWidth || col1W), vMin: startGridV, vMax: startGridV + (dims4[2]?.totalHeight || row2H) };
  const gb3 = { uMin: startGridU + col1W + options.interArtSpacing, uMax: startGridU + col1W + options.interArtSpacing + (dims4[3]?.totalWidth || col2W), vMin: startGridV, vMax: startGridV + (dims4[3]?.totalHeight || row2H) };

  const gBoxes = [gb0, gb1, gb2, gb3];
  let gridValid = true;
  for (let i = 0; i < 4; i++) {
    const others = gBoxes.filter((_, idx) => idx !== i);
    if (!isPlacementValid(gBoxes[i], wall, obstacles, others, options)) {
      gridValid = false;
      break;
    }
  }

  if (gridValid) {
    proposals.push({
      id: 'prop-grid-2x2',
      title: 'Griglia Geometrica 2×2',
      strategy: 'grid',
      description: 'Matrice quadrata calibrata con allineamenti millimetrici e fughe uniformi.',
      wallId: wall.id,
      placements: grid4.map((art, idx) => ({
        artworkId: art.id,
        name: art.name,
        imageUrl: art.imageUrl,
        width: art.width,
        height: art.height,
        frame: art.frame,
        u: gBoxes[idx].uMin,
        elevationY: gBoxes[idx].vMin,
      })),
      metrics: {
        artworksCount: 4,
        totalSpanWidth: totalGridW,
        totalSpanHeight: totalGridH,
        averageElevation: startGridV + totalGridH / 2,
      },
    });
  }

  // 3.2 1x3 Horizontal Grid
  if (pool.length >= 3) {
    const g3 = pool.slice(0, 3);
    const d3 = g3.map((a) => getArtworkTotalDimensions(a));
    const span1x3 = d3.reduce((acc, d) => acc + d.totalWidth, 0) + options.interArtSpacing * 2;
    const start1x3U = spanCenterU - span1x3 / 2;
    const maxH = Math.max(...d3.map((d) => d.totalHeight));

    let v1x3 = Math.max(options.safetyMarginFloor, options.targetEyeLevel - maxH / 2);
    for (const furn of furnitureObstacles) {
      if (furn.uMax >= start1x3U && furn.uMin <= start1x3U + span1x3) {
        v1x3 = Math.max(v1x3, furn.vMax + options.safetyMarginObstacles);
      }
    }

    let curU = start1x3U;
    const b1x3List: Array<{ uMin: number; uMax: number; vMin: number; vMax: number }> = [];
    let valid1x3 = true;

    for (let i = 0; i < 3; i++) {
      const b = { uMin: curU, uMax: curU + d3[i].totalWidth, vMin: v1x3, vMax: v1x3 + d3[i].totalHeight };
      if (!isPlacementValid(b, wall, obstacles, b1x3List, options)) {
        valid1x3 = false;
        break;
      }
      b1x3List.push(b);
      curU += d3[i].totalWidth + options.interArtSpacing;
    }

    if (valid1x3) {
      proposals.push({
        id: 'prop-grid-1x3',
        title: 'Trittico Orizzontale a Griglia 1×3',
        strategy: 'grid',
        description: 'Allineamento lineare orizzontale continuo su linea di mezzeria.',
        wallId: wall.id,
        placements: g3.map((art, idx) => ({
          artworkId: art.id,
          name: art.name,
          imageUrl: art.imageUrl,
          width: art.width,
          height: art.height,
          frame: art.frame,
          u: b1x3List[idx].uMin,
          elevationY: b1x3List[idx].vMin,
        })),
        metrics: {
          artworksCount: 3,
          totalSpanWidth: span1x3,
          totalSpanHeight: maxH,
          averageElevation: v1x3 + maxH / 2,
        },
      });
    }
  }

  // 3.3 Vertical 2x1 Grid
  if (pool.length >= 2) {
    const vertArts = pool.slice(0, 2);
    const vDims = vertArts.map((a) => getArtworkTotalDimensions(a));
    const maxW = Math.max(vDims[0].totalWidth, vDims[1].totalWidth);
    const totalH = vDims[0].totalHeight + options.interArtSpacing + vDims[1].totalHeight;
    const startVU = spanCenterU - maxW / 2;
    let baseVY = Math.max(options.safetyMarginFloor, options.targetEyeLevel - totalH / 2);

    for (const furn of furnitureObstacles) {
      if (furn.uMax >= startVU && furn.uMin <= startVU + maxW) {
        baseVY = Math.max(baseVY, furn.vMax + options.safetyMarginObstacles);
      }
    }

    const bBottom = { uMin: startVU, uMax: startVU + vDims[1].totalWidth, vMin: baseVY, vMax: baseVY + vDims[1].totalHeight };
    const bTop = { uMin: startVU, uMax: startVU + vDims[0].totalWidth, vMin: baseVY + vDims[1].totalHeight + options.interArtSpacing, vMax: baseVY + totalH };

    if (
      isPlacementValid(bBottom, wall, obstacles, [], options) &&
      isPlacementValid(bTop, wall, obstacles, [bBottom], options)
    ) {
      proposals.push({
        id: 'prop-grid-vertical-2x1',
        title: 'Colonna Verticale a Griglia 2×1',
        strategy: 'grid',
        description: 'Due opere impilate verticalmente con interasse uniforme e baricentro bilanciato.',
        wallId: wall.id,
        placements: [
          { artworkId: vertArts[0].id, name: vertArts[0].name, imageUrl: vertArts[0].imageUrl, width: vertArts[0].width, height: vertArts[0].height, frame: vertArts[0].frame, u: bTop.uMin, elevationY: bTop.vMin },
          { artworkId: vertArts[1].id, name: vertArts[1].name, imageUrl: vertArts[1].imageUrl, width: vertArts[1].width, height: vertArts[1].height, frame: vertArts[1].frame, u: bBottom.uMin, elevationY: bBottom.vMin },
        ],
        metrics: {
          artworksCount: 2,
          totalSpanWidth: maxW,
          totalSpanHeight: totalH,
          averageElevation: baseVY + totalH / 2,
        },
      });
    }
  }

  // -------------------------------------------------------------
  // STRATEGY 4: ORGANICO / SALON WALL (Salon Gallery Wall)
  // -------------------------------------------------------------
  // 4.1 Modern Salon 3 Artworks
  if (pool.length >= 3) {
    const sArts = pool.slice(0, 3);
    const sDims = sArts.map((a) => getArtworkTotalDimensions(a));

    const centerW = sDims[0].totalWidth;
    const centerH = sDims[0].totalHeight;
    const centerU = spanCenterU - centerW / 2;

    let centerV = Math.max(options.safetyMarginFloor + 15, options.targetEyeLevel - centerH / 2);
    for (const furn of furnitureObstacles) {
      if (furn.uMax >= centerU - 50 && furn.uMin <= centerU + centerW + 50) {
        centerV = Math.max(centerV, furn.vMax + options.safetyMarginObstacles + 10);
      }
    }

    const bCenter = { uMin: centerU, uMax: centerU + centerW, vMin: centerV, vMax: centerV + centerH };
    const bLeft = {
      uMin: centerU - sDims[1].totalWidth - options.interArtSpacing,
      uMax: centerU - options.interArtSpacing,
      vMin: centerV + 15,
      vMax: centerV + 15 + sDims[1].totalHeight,
    };
    const bRight = {
      uMin: centerU + centerW + options.interArtSpacing,
      uMax: centerU + centerW + options.interArtSpacing + sDims[2].totalWidth,
      vMin: centerV - 15,
      vMax: centerV - 15 + sDims[2].totalHeight,
    };

    if (
      isPlacementValid(bCenter, wall, obstacles, [], options) &&
      isPlacementValid(bLeft, wall, obstacles, [bCenter], options) &&
      isPlacementValid(bRight, wall, obstacles, [bCenter, bLeft], options)
    ) {
      const allB = [bCenter, bLeft, bRight];
      const minU = Math.min(...allB.map((b) => b.uMin));
      const maxU = Math.max(...allB.map((b) => b.uMax));
      const minV = Math.min(...allB.map((b) => b.vMin));
      const maxV = Math.max(...allB.map((b) => b.vMax));

      proposals.push({
        id: 'prop-organic-salon-3',
        title: 'Composizione Salon Dinamica a 3 Quadri',
        strategy: 'organic',
        description: 'Disposizione in stile galleria moderna con quadro focale e due satelliti sfalsati armoniosamente.',
        wallId: wall.id,
        placements: [
          { artworkId: sArts[0].id, name: sArts[0].name, imageUrl: sArts[0].imageUrl, width: sArts[0].width, height: sArts[0].height, frame: sArts[0].frame, u: bCenter.uMin, elevationY: bCenter.vMin },
          { artworkId: sArts[1].id, name: sArts[1].name, imageUrl: sArts[1].imageUrl, width: sArts[1].width, height: sArts[1].height, frame: sArts[1].frame, u: bLeft.uMin, elevationY: bLeft.vMin },
          { artworkId: sArts[2].id, name: sArts[2].name, imageUrl: sArts[2].imageUrl, width: sArts[2].width, height: sArts[2].height, frame: sArts[2].frame, u: bRight.uMin, elevationY: bRight.vMin },
        ],
        metrics: {
          artworksCount: 3,
          totalSpanWidth: maxU - minU,
          totalSpanHeight: maxV - minV,
          averageElevation: (minV + maxV) / 2,
        },
      });
    }
  }

  // 4.2 Modern Salon 4-5 Artworks
  if (pool.length >= 4) {
    const sArts4 = pool.slice(0, 4);
    const sDims4 = sArts4.map((a) => getArtworkTotalDimensions(a));

    const totalWidthEst = sDims4[0].totalWidth + sDims4[1].totalWidth + options.interArtSpacing;
    const startSalonU = spanCenterU - totalWidthEst / 2;

    let baseSalonV = Math.max(options.safetyMarginFloor, options.targetEyeLevel - 70);
    for (const furn of furnitureObstacles) {
      if (furn.uMax >= startSalonU && furn.uMin <= startSalonU + totalWidthEst) {
        baseSalonV = Math.max(baseSalonV, furn.vMax + options.safetyMarginObstacles);
      }
    }

    const b0 = { uMin: startSalonU, uMax: startSalonU + sDims4[0].totalWidth, vMin: baseSalonV + 40, vMax: baseSalonV + 40 + sDims4[0].totalHeight };
    const b1 = { uMin: startSalonU + sDims4[0].totalWidth + options.interArtSpacing, uMax: startSalonU + sDims4[0].totalWidth + options.interArtSpacing + sDims4[1].totalWidth, vMin: baseSalonV + 20, vMax: baseSalonV + 20 + sDims4[1].totalHeight };
    const b2 = { uMin: startSalonU + 10, uMax: startSalonU + 10 + sDims4[2].totalWidth, vMin: baseSalonV - 30, vMax: baseSalonV - 30 + sDims4[2].totalHeight };
    const b3 = { uMin: b1.uMin, uMax: b1.uMin + sDims4[3].totalWidth, vMin: baseSalonV - 35, vMax: baseSalonV - 35 + sDims4[3].totalHeight };

    const boxes4 = [b0, b1, b2, b3];
    let valid4 = true;
    for (let i = 0; i < 4; i++) {
      const others = boxes4.filter((_, idx) => idx !== i);
      if (!isPlacementValid(boxes4[i], wall, obstacles, others, options)) {
        valid4 = false;
        break;
      }
    }

    if (valid4) {
      const minU = Math.min(...boxes4.map((b) => b.uMin));
      const maxU = Math.max(...boxes4.map((b) => b.uMax));
      const minV = Math.min(...boxes4.map((b) => b.vMin));
      const maxV = Math.max(...boxes4.map((b) => b.vMax));

      proposals.push({
        id: 'prop-organic-salon-4',
        title: 'Galleria Salon a 4 Quadri',
        strategy: 'organic',
        description: 'Composizione sfalsata a 4 tele dal forte impatto visivo con geometrie organiche.',
        wallId: wall.id,
        placements: sArts4.map((art, idx) => ({
          artworkId: art.id,
          name: art.name,
          imageUrl: art.imageUrl,
          width: art.width,
          height: art.height,
          frame: art.frame,
          u: boxes4[idx].uMin,
          elevationY: boxes4[idx].vMin,
        })),
        metrics: {
          artworksCount: 4,
          totalSpanWidth: maxU - minU,
          totalSpanHeight: maxV - minV,
          averageElevation: (minV + maxV) / 2,
        },
      });
    }
  }

  return proposals;
}
