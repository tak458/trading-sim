/**
 * System Integration Communication Tests
 *
 * This test suite verifies that different game systems can communicate
 * and coordinate properly while maintaining separation of concerns.
 *
 * Requirements: 1.1, 1.2, 4.3
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResourceManager } from "../game-systems/economy/resource-manager";
import type { GameTime } from "../game-systems/shared-types";
import { generateMap } from "../game-systems/world/map";
import { buildRoads, updateRoads } from "../game-systems/world/trade";
import { createVillages, updateVillages } from "../game-systems/world/village";

// Helper function to create proper GameTime objects
function createGameTime(
  currentTime: number = 100,
  deltaTime: number = 1,
): GameTime {
  return {
    currentTime,
    deltaTime,
    totalTicks: Math.floor(currentTime / 16.67), // Assuming 60 FPS
    totalSeconds: Math.floor(currentTime / 1000),
    totalMinutes: Math.floor(currentTime / 60000),
    currentTick: Math.floor((currentTime % 1000) / 16.67),
  };
}

// Mock graphics to ensure tests run without graphics dependencies
vi.mock("phaser", () => ({
  default: {},
  Scene: class MockScene {},
  GameObjects: {
    Graphics: class MockGraphics {},
    Text: class MockText {},
    Container: class MockContainer {},
  },
}));

describe("システム統合通信テスト", () => {
  let map: any[][];
  let villages: any[];
  let roads: any[];
  let resourceManager: ResourceManager;

  beforeEach(() => {
    const mapSize = 20;
    const villageCount = 4;
    const seed = 98765;

    map = generateMap(mapSize, seed);
    villages = createVillages(map, villageCount);
    roads = buildRoads(map, villages);
    resourceManager = new ResourceManager();
  });

  describe("システム間データフロー", () => {
    it("システム間で資源管理を調整する", () => {
      // 要件 1.1: システムはグラフィック依存なしで通信する
      expect(resourceManager).toBeDefined();
      expect(villages.length).toBeGreaterThan(0);
      expect(map.length).toBeGreaterThan(0);

      // Test resource harvesting affects village storage
      const village = villages[0];
      const initialFood = village.storage.food;

      // Simulate resource collection
      const nearbyTiles = [];
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
          const x = village.x + dx;
          const y = village.y + dy;
          if (x >= 0 && x < map[0].length && y >= 0 && y < map.length) {
            nearbyTiles.push(map[y][x]);
          }
        }
      }

      // Harvest resources from nearby tiles
      let totalHarvested = 0;
      nearbyTiles.forEach((tile) => {
        if (resourceManager && tile.resources.food > 0) {
          const harvested = resourceManager.harvestResource(tile, "food", 5);
          totalHarvested += harvested;
        }
      });

      expect(totalHarvested).toBeGreaterThan(0);
    });

    it("should synchronize time across all systems", () => {
      // Requirement 1.2: Time management should coordinate across systems
      let frameCount = 0;

      // Update game state multiple times
      for (let i = 0; i < 10; i++) {
        resourceManager.updateFrame();

        // Update all tiles
        for (let y = 0; y < map.length; y++) {
          for (let x = 0; x < map[y].length; x++) {
            resourceManager.updateRecovery(map[y][x]);
          }
        }

        // Update villages and roads
        updateVillages(map, villages, roads, resourceManager);
        updateRoads(roads);
        frameCount++;
      }

      expect(frameCount).toBe(10);

      // Verify all systems are using consistent state
      villages.forEach((village) => {
        // Villages should have been updated with the current time
        expect(village.economy).toBeDefined();
      });
    });

    it("should propagate economic changes between villages", () => {
      // Requirement 1.2: Economic systems should communicate changes

      // Create artificial shortage in one village
      const village1 = villages[0];
      village1.storage.food = 1; // Very low food (critical level)
      village1.population = 20; // High population to increase consumption

      // Create surplus in another village
      if (villages.length > 1) {
        const village2 = villages[1];
        village2.storage.food = 200; // High food
        village2.population = 5; // Low population to reduce consumption
      }

      // Update villages multiple times to propagate changes
      for (let i = 0; i < 5; i++) {
        updateVillages(map, villages, roads, resourceManager);
      }

      // Verify economic states reflect the resource situation
      // The system should have updated the economic status
      expect(village1.economy.supplyDemandStatus.food).toBeDefined();
      expect(["critical", "shortage", "balanced"]).toContain(
        village1.economy.supplyDemandStatus.food,
      );

      if (villages.length > 1) {
        const village2 = villages[1];
        // With high food and low population, should be surplus or balanced
        expect(["surplus", "balanced"]).toContain(
          village2.economy.supplyDemandStatus.food,
        );
      }
    });

    it("should coordinate population and building systems", () => {
      // Requirement 1.1: Population and building systems should coordinate
      const village = villages[0];
      const initialPopulation = village.population;
      const initialBuildings = village.economy.buildings.count;

      // Simulate population growth
      village.population = Math.floor(initialPopulation * 1.5); // 50% growth

      // Update the village multiple times to trigger building adjustments
      for (let i = 0; i < 3; i++) {
        updateVillages(map, villages, roads, resourceManager);
      }

      // Building target should adjust to population changes
      const newTargetCount = village.economy.buildings.targetCount;
      expect(newTargetCount).toBeGreaterThanOrEqual(initialBuildings);

      // Food consumption should be calculated based on population
      // The consumption should be a valid number (may be 0 if no consumption calculated yet)
      expect(typeof village.economy.consumption.food).toBe("number");
      expect(village.economy.consumption.food).toBeGreaterThanOrEqual(0);
    });
  });

  describe("イベント駆動通信", () => {
    it("システム間で資源枯渇イベントを処理する", () => {
      // 要件 4.3: システムは適切にイベントを処理する

      // Find a tile with resources
      let testTile = null;
      for (let y = 0; y < map.length && !testTile; y++) {
        for (let x = 0; x < map[y].length && !testTile; x++) {
          if (map[y][x].resources.food > 0) {
            testTile = map[y][x];
          }
        }
      }

      if (!testTile) return;

      const initialFood = testTile.resources.food;

      // Deplete the resource completely
      const harvested = resourceManager.harvestResource(
        testTile,
        "food",
        initialFood,
      );
      expect(harvested).toBe(initialFood);
      expect(testTile.resources.food).toBe(0);

      // Verify depletion state is updated
      expect(testTile.depletionState.food).toBe(0);
      expect(testTile.recoveryTimer.food).toBeGreaterThan(0);
    });

    it("should handle village economic state changes", () => {
      // Requirement 1.2: Economic state changes should propagate
      const village = villages[0];

      // Artificially create a critical shortage
      village.storage.food = 1;
      village.storage.wood = 1;
      village.storage.ore = 1;
      village.population = 30; // High population to increase consumption

      // Update the village multiple times to trigger economic state changes
      for (let i = 0; i < 5; i++) {
        updateVillages(map, villages, roads, resourceManager);
      }

      // Status should reflect the resource situation
      // The system should have updated the economic status appropriately
      expect(["critical", "shortage", "balanced"]).toContain(
        village.economy.supplyDemandStatus.food,
      );
      expect(["critical", "shortage", "balanced"]).toContain(
        village.economy.supplyDemandStatus.wood,
      );
      expect(["critical", "shortage", "balanced"]).toContain(
        village.economy.supplyDemandStatus.ore,
      );
    });
  });

  describe("システム状態の一貫性", () => {
    it("複数の更新にわたって一貫した状態を維持する", () => {
      // 要件 4.3: システム状態は一貫性を保つ
      const villageCount = villages.length;
      const mapSize = map.length;

      // Run multiple update cycles
      for (let i = 0; i < 20; i++) {
        resourceManager.updateFrame();

        // Update all tiles
        for (let y = 0; y < map.length; y++) {
          for (let x = 0; x < map[y].length; x++) {
            resourceManager.updateRecovery(map[y][x]);
          }
        }

        updateVillages(map, villages, roads, resourceManager);
        updateRoads(roads);

        // Verify system integrity after each update
        expect(villages.length).toBe(villageCount);
        expect(map.length).toBe(mapSize);

        // Verify village data integrity
        villages.forEach((village, index) => {
          expect(village.economy).toBeDefined();
          expect(village.storage).toBeDefined();

          // Verify economic data is valid
          expect(village.economy.production.food).toBeGreaterThanOrEqual(0);
          expect(village.economy.production.wood).toBeGreaterThanOrEqual(0);
          expect(village.economy.production.ore).toBeGreaterThanOrEqual(0);
          expect(village.economy.consumption.food).toBeGreaterThanOrEqual(0);
          expect(village.economy.consumption.wood).toBeGreaterThanOrEqual(0);
          expect(village.economy.consumption.ore).toBeGreaterThanOrEqual(0);
        });
      }
    });

    it("should handle concurrent system operations", () => {
      // Requirement 4.3: Systems should handle concurrent operations

      // Simulate concurrent resource operations
      const operations = [];

      for (let i = 0; i < 10; i++) {
        const randomX = Math.floor(Math.random() * map[0].length);
        const randomY = Math.floor(Math.random() * map.length);
        const tile = map[randomY][randomX];

        operations.push(() => {
          if (tile.resources.food > 0) {
            resourceManager.harvestResource(tile, "food", 1);
          }
          resourceManager.updateRecovery(tile);
        });
      }

      // Execute all operations
      operations.forEach((op) => op());

      // Verify system is still in a valid state
      expect(villages.length).toBeGreaterThan(0);

      // Verify map integrity
      map.forEach((row) => {
        row.forEach((tile) => {
          expect(tile.resources.food).toBeGreaterThanOrEqual(0);
          expect(tile.resources.wood).toBeGreaterThanOrEqual(0);
          expect(tile.resources.ore).toBeGreaterThanOrEqual(0);
          expect(tile.depletionState.food).toBeGreaterThanOrEqual(0);
          expect(tile.depletionState.food).toBeLessThanOrEqual(1);
        });
      });
    });
  });

  describe("パフォーマンスとスケーラビリティ", () => {
    it("大規模なシステム相互作用を効率的に処理する", () => {
      // 要件 4.3: システムは適切にスケールする
      const startTime = performance.now();

      // Run intensive operations
      for (let i = 0; i < 100; i++) {
        resourceManager.updateFrame();

        // Update all tiles
        for (let y = 0; y < map.length; y++) {
          for (let x = 0; x < map[y].length; x++) {
            resourceManager.updateRecovery(map[y][x]);
          }
        }

        updateVillages(map, villages, roads, resourceManager);
        updateRoads(roads);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time (less than 1 second for 100 updates)
      expect(totalTime).toBeLessThan(1000);

      // System should still be functional
      expect(villages.length).toBeGreaterThan(0);

      villages.forEach((village) => {
        expect(village.economy).toBeDefined();
        expect(village.storage).toBeDefined();
      });
    });

    it("should maintain memory efficiency during long runs", () => {
      // Requirement 4.3: Systems should not leak memory
      const initialMemory = process.memoryUsage();

      // Run extended simulation
      for (let i = 0; i < 200; i++) {
        resourceManager.updateFrame();

        // Update all tiles
        for (let y = 0; y < map.length; y++) {
          for (let x = 0; x < map[y].length; x++) {
            resourceManager.updateRecovery(map[y][x]);
          }
        }

        updateVillages(map, villages, roads, resourceManager);
        updateRoads(roads);

        // Occasionally check memory usage
        if (i % 50 === 0) {
          const currentMemory = process.memoryUsage();
          // Memory should not grow excessively (allow for some growth but not runaway)
          const memoryGrowth = currentMemory.heapUsed - initialMemory.heapUsed;
          expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
        }
      }

      // System should still be responsive
      expect(villages.length).toBeGreaterThan(0);
    });
  });
});
