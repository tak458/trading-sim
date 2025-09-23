import { Tile } from "./map";
import { Village } from "./village";

export interface Road {
  a: Village;
  b: Village;
  path: { x: number; y: number }[];
  usage: number;
  decay: number;
}

export function buildRoads(map: Tile[][], villages: Village[]): Road[] {
  const roads: Road[] = [];
  
  // 各村から最近傍の2村を探して接続
  for (const village of villages) {
    const nearestVillages = findNearestVillages(village, villages, 2);
    
    for (const target of nearestVillages) {
      // 既に同じ道路が存在するかチェック（双方向）
      const existingRoad = roads.find(road => 
        (road.a === village && road.b === target) || 
        (road.a === target && road.b === village)
      );
      
      if (!existingRoad) {
        const path = bresenhamLine(village.x, village.y, target.x, target.y);
        roads.push({ a: village, b: target, path, usage: 0, decay: 0 });
      }
    }
  }
  
  return roads;
}

export function updateRoads(roads: Road[]) {
  for (const road of roads) {
    road.decay++;
    if (road.decay > 100) {
      road.usage = Math.max(0, road.usage - 1);
      road.decay = 0;
    }
  }
}

// ----- 最近傍村探索 -----
function findNearestVillages(village: Village, allVillages: Village[], count: number): Village[] {
  const distances = allVillages
    .filter(v => v !== village) // 自分自身を除外
    .map(v => ({
      village: v,
      distance: Math.sqrt((v.x - village.x) ** 2 + (v.y - village.y) ** 2)
    }))
    .sort((a, b) => a.distance - b.distance);
  
  return distances.slice(0, count).map(d => d.village);
}

// ----- ブレゼンハム直線アルゴリズム -----
function bresenhamLine(x0: number, y0: number, x1: number, y1: number): { x: number; y: number }[] {
  const path: { x: number; y: number }[] = [];
  
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  
  let x = x0;
  let y = y0;
  
  while (true) {
    path.push({ x, y });
    
    if (x === x1 && y === y1) break;
    
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
  
  return path;
}