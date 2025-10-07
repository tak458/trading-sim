// src/game-systems/world/map.ts
import { createNoise2D } from "simplex-noise";

export type Tile = {
  height: number;
  type: "water" | "land" | "forest" | "mountain" | "road";
  resources: { food: number; wood: number; ore: number };
  // 資源消耗プロパティ
  maxResources: { food: number; wood: number; ore: number }; // 最大資源量
  depletionState: { food: number; wood: number; ore: number }; // 消耗状態 (0-1, 0=完全消耗, 1=満タン)
  recoveryTimer: { food: number; wood: number; ore: number }; // 回復までの残り時間 (フレーム単位)
  lastHarvestTime: number; // 最後に収穫された時刻
};

// シード値を使った決定論的な乱数生成器
function createSeededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

export function generateMap(size: number, seed?: number): Tile[][] {
  // シード値が指定されていない場合はランダムなシード値を使用
  const actualSeed = seed ?? Math.floor(Math.random() * 1000000);
  const seededRandom = createSeededRandom(actualSeed);
  const noise2D = createNoise2D(seededRandom);
  const map: Tile[][] = [];

  for (let y = 0; y < size; y++) {
    map[y] = [];
    for (let x = 0; x < size; x++) {
      const nx = x / size - 0.5;
      const ny = y / size - 0.5;

      // -1.0 ～ 1.0 → 0 ～ 1 に正規化
      const h = (noise2D(nx * 2, ny * 2) + 1) / 2;

      let type: Tile["type"];
      const resources = { food: 0, wood: 0, ore: 0 };

      if (h < 0.3) {
        type = "water";
      } else if (h < 0.5) {
        type = "land";
        resources.food = Math.floor(seededRandom() * 15) + 5; // 5-19の範囲に増加
      } else if (h < 0.7) {
        type = "forest";
        resources.wood = Math.floor(seededRandom() * 10);
      } else {
        type = "mountain";
        resources.ore = Math.floor(seededRandom() * 10);
      }

      // 資源消耗プロパティを初期化
      const maxResources = { ...resources };
      const depletionState = {
        food: resources.food > 0 ? 1 : 0,
        wood: resources.wood > 0 ? 1 : 0,
        ore: resources.ore > 0 ? 1 : 0,
      };
      const recoveryTimer = { food: 0, wood: 0, ore: 0 };
      const lastHarvestTime = 0;

      map[y][x] = {
        height: h,
        type,
        resources,
        maxResources,
        depletionState,
        recoveryTimer,
        lastHarvestTime,
      };
    }
  }

  return map;
}
