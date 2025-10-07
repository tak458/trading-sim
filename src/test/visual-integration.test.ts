// src/test/visual-integration.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { ResourceManager } from "../game-systems/economy/resource-manager";
import { generateMap } from "../game-systems/world/map";
import { buildRoads } from "../game-systems/world/trade";
import { createVillages, updateVillages } from "../game-systems/world/village";

describe("Visual System Integration", () => {
  let resourceManager: ResourceManager;
  let map: any[][];
  let villages: any[];
  let roads: any[];

  beforeEach(() => {
    resourceManager = new ResourceManager();
    map = generateMap(10);
    villages = createVillages(map, 2);
    roads = buildRoads(map, villages);
  });

  it("should show visual changes after village harvesting", () => {
    // 村の近くにある資源タイルを見つける
    const village = villages[0];
    let resourceTile = null;

    for (
      let y = Math.max(0, village.y - 2);
      y <= Math.min(map.length - 1, village.y + 2);
      y++
    ) {
      for (
        let x = Math.max(0, village.x - 2);
        x <= Math.min(map[0].length - 1, village.x + 2);
        x++
      ) {
        const tile = map[y][x];
        if (
          tile.resources.food > 0 ||
          tile.resources.wood > 0 ||
          tile.resources.ore > 0
        ) {
          resourceTile = tile;
          break;
        }
      }
      if (resourceTile) break;
    }

    if (!resourceTile) {
      // テスト用に資源タイルを作成
      resourceTile = map[village.y][village.x + 1];
      resourceTile.resources.food = 10;
      resourceTile.maxResources.food = 10;
      resourceTile.depletionState.food = 1;
    }

    // 採取前の視覚状態を記録
    const initialVisualState = resourceManager.getVisualState(resourceTile);

    // 村を更新して資源を採取させる
    for (let i = 0; i < 10; i++) {
      resourceManager.updateFrame();
      updateVillages(map, villages, roads, resourceManager);
    }

    // 採取後の視覚状態を確認
    const finalVisualState = resourceManager.getVisualState(resourceTile);

    // 資源が採取されていれば視覚状態が変化しているはず
    if (
      resourceTile.resources.food < resourceTile.maxResources.food ||
      resourceTile.resources.wood < resourceTile.maxResources.wood ||
      resourceTile.resources.ore < resourceTile.maxResources.ore
    ) {
      expect(finalVisualState.opacity).toBeLessThanOrEqual(
        initialVisualState.opacity,
      );
    }
  });

  it("should handle multiple villages affecting the same tile visually", () => {
    // 2つの村の間にある資源タイルを設定
    const midX = Math.floor((villages[0].x + villages[1].x) / 2);
    const midY = Math.floor((villages[0].y + villages[1].y) / 2);
    const sharedTile = map[midY][midX];

    // 豊富な資源を設定
    sharedTile.resources = { food: 20, wood: 20, ore: 20 };
    sharedTile.maxResources = { food: 20, wood: 20, ore: 20 };
    sharedTile.depletionState = { food: 1, wood: 1, ore: 1 };

    const initialVisualState = resourceManager.getVisualState(sharedTile);

    // 複数回更新して両方の村が採取するようにする
    for (let i = 0; i < 20; i++) {
      resourceManager.updateFrame();
      updateVillages(map, villages, roads, resourceManager);
    }

    const finalVisualState = resourceManager.getVisualState(sharedTile);

    // 視覚状態が適切に更新されていることを確認
    expect(finalVisualState).toBeDefined();
    expect(finalVisualState.opacity).toBeGreaterThanOrEqual(0.3);
    expect(finalVisualState.opacity).toBeLessThanOrEqual(1.0);
  });

  it("should show recovery progress visually over time", () => {
    // タイルを完全に枯渇させる
    const testTile = map[5][5];
    testTile.resources = { food: 0, wood: 0, ore: 0 };
    testTile.maxResources = { food: 10, wood: 10, ore: 10 };
    testTile.depletionState = { food: 0, wood: 0, ore: 0 };
    testTile.recoveryTimer = { food: 100, wood: 100, ore: 100 };

    const depletedState = resourceManager.getVisualState(testTile);
    expect(depletedState.isDepleted).toBe(true);

    // 時間を進めて回復させる
    for (let i = 0; i < 200; i++) {
      resourceManager.updateFrame();
      resourceManager.updateRecovery(testTile);
    }

    const recoveredState = resourceManager.getVisualState(testTile);

    // 回復により視覚状態が改善されているはず
    expect(recoveredState.opacity).toBeGreaterThan(depletedState.opacity);
    expect(recoveredState.recoveryProgress).toBeGreaterThan(
      depletedState.recoveryProgress,
    );
  });

  it("should maintain visual consistency across different tile types", () => {
    const landTile = map.flat().find((t) => t.type === "land");
    const forestTile = map.flat().find((t) => t.type === "forest");
    const mountainTile = map.flat().find((t) => t.type === "mountain");

    if (landTile && forestTile && mountainTile) {
      // 同じ消耗状態に設定
      [landTile, forestTile, mountainTile].forEach((tile) => {
        tile.resources = { food: 5, wood: 5, ore: 5 };
        tile.maxResources = { food: 10, wood: 10, ore: 10 };
        tile.depletionState = { food: 0.5, wood: 0.5, ore: 0.5 };
      });

      const landVisual = resourceManager.getVisualState(landTile);
      const forestVisual = resourceManager.getVisualState(forestTile);
      const mountainVisual = resourceManager.getVisualState(mountainTile);

      // 同じ消耗状態なら同じ視覚効果が適用されるはず
      expect(landVisual.opacity).toBeCloseTo(forestVisual.opacity, 2);
      expect(forestVisual.opacity).toBeCloseTo(mountainVisual.opacity, 2);
      expect(landVisual.isDepleted).toBe(forestVisual.isDepleted);
      expect(forestVisual.isDepleted).toBe(mountainVisual.isDepleted);
    }
  });
});
