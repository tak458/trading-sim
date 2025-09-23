// src/map.ts
import { createNoise2D } from "simplex-noise";

export type Tile = {
  height: number;
  type: "water" | "land" | "forest" | "mountain";
  resources: { food: number; wood: number; ore: number };
};

const noise2D = createNoise2D(Math.random);

export function generateMap(size: number): Tile[][] {
  const map: Tile[][] = [];

  for (let y = 0; y < size; y++) {
    map[y] = [];
    for (let x = 0; x < size; x++) {
      const nx = x / size - 0.5;
      const ny = y / size - 0.5;

      // -1.0 ～ 1.0 → 0 ～ 1 に正規化
      const h = (noise2D(nx * 2, ny * 2) + 1) / 2;

      let type: Tile["type"];
      let resources = { food: 0, wood: 0, ore: 0 };

      if (h < 0.3) {
        type = "water";
      } else if (h < 0.5) {
        type = "land";
        resources.food = Math.floor(Math.random() * 10);
      } else if (h < 0.7) {
        type = "forest";
        resources.wood = Math.floor(Math.random() * 10);
      } else {
        type = "mountain";
        resources.ore = Math.floor(Math.random() * 10);
      }

      map[y][x] = { height: h, type, resources };
    }
  }

  return map;
}
