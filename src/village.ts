import { Tile } from "./map";
import { Road } from "./trade";

export interface Village {
  x: number;
  y: number;
  population: number;
  storage: { food: number; wood: number; ore: number };
  collectionRadius: number;
}

export function createVillages(map: Tile[][], count: number): Village[] {
  const villages: Village[] = [];
  const size = map.length;

  while (villages.length < count) {
    const x = Math.floor(Math.random() * size);
    const y = Math.floor(Math.random() * size);
    const tile = map[y][x];
    if (tile.height > 0.3 && tile.height < 0.8) {
      villages.push({
        x, y,
        population: 10,
        storage: { food: 5, wood: 5, ore: 2 },
        collectionRadius: 1
      });
    }
  }
  return villages;
}

export function updateVillages(map: Tile[][], villages: Village[], roads: Road[]) {
  // 資源収集
  for (const v of villages) {
    const radius = v.collectionRadius;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const tx = v.x + dx, ty = v.y + dy;
        if (map[ty] && map[ty][tx]) {
          const tile = map[ty][tx];
          v.storage.food += Math.min(tile.resources.food, 1);
          v.storage.wood += Math.min(tile.resources.wood, 1);
          v.storage.ore += Math.min(tile.resources.ore, 1);
        }
      }
    }

    // 村の成長（資源が豊富な場合、人口と収集範囲が拡大）
    const totalResources = v.storage.food + v.storage.wood + v.storage.ore;
    if (totalResources > 50 && v.population < 50) {
      v.population++;
      // 人口20ごとに収集範囲を1拡大（最大4まで）
      v.collectionRadius = Math.min(4, Math.floor(v.population / 20) + 2);
    }
  }

  // 簡易交易
  for (const road of roads) {
    const a = road.a, b = road.b;
    if (a.storage.food > b.storage.food + 5) {
      a.storage.food--; b.storage.food++;
      road.usage++;
    }
    if (b.storage.wood > a.storage.wood + 5) {
      b.storage.wood--; a.storage.wood++;
      road.usage++;
    }
  }
}
