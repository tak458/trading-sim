import { beforeEach, describe, expect, it } from "vitest";
import { ResourceManager } from "../game-systems/economy/resource-manager";
import { generateMap, type Tile } from "../game-systems/world/map";
import { buildRoads } from "../game-systems/world/trade";
import {
  createVillages,
  updateVillages,
  type Village,
} from "../game-systems/world/village";

describe("Resource System Performance Tests", () => {
  let resourceManager: ResourceManager;

  beforeEach(() => {
    resourceManager = new ResourceManager();
  });

  describe("Large Map Performance", () => {
    it("should handle 50x50 map efficiently", () => {
      const mapSize = 50;
      const map = generateMap(mapSize);

      const startTime = Date.now();

      // Simulate 100 frames of resource updates
      for (let frame = 0; frame < 100; frame++) {
        resourceManager.updateFrame();

        for (let y = 0; y < mapSize; y++) {
          for (let x = 0; x < mapSize; x++) {
            resourceManager.updateRecovery(map[y][x]);
          }
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (less than 2 seconds)
      expect(duration).toBeLessThan(2000);

      // Verify map integrity
      let validTiles = 0;
      for (let y = 0; y < mapSize; y++) {
        for (let x = 0; x < mapSize; x++) {
          const tile = map[y][x];
          if (
            tile.resources.food >= 0 &&
            tile.resources.wood >= 0 &&
            tile.resources.ore >= 0
          ) {
            validTiles++;
          }
        }
      }

      expect(validTiles).toBe(mapSize * mapSize);
    });

    it("should handle 100x100 map with multiple villages", () => {
      const mapSize = 100;
      const villageCount = 20;

      const map = generateMap(mapSize);
      const villages = createVillages(map, villageCount);
      const roads = buildRoads(map, villages);

      const startTime = Date.now();

      // Simulate 50 frames with full system
      for (let frame = 0; frame < 50; frame++) {
        resourceManager.updateFrame();

        // Update resources (batch process for performance)
        for (let y = 0; y < mapSize; y++) {
          for (let x = 0; x < mapSize; x++) {
            resourceManager.updateRecovery(map[y][x]);
          }
        }

        // Update villages every 5 frames
        if (frame % 5 === 0) {
          updateVillages(map, villages, roads, resourceManager);
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (less than 5 seconds)
      expect(duration).toBeLessThan(5000);

      // Verify system integrity
      expect(villages.every((v) => v.population >= 10)).toBe(true);
      expect(villages.every((v) => v.storage.food >= 0)).toBe(true);
    });

    it("should scale linearly with map size", () => {
      const mapSizes = [10, 20, 30];
      const durations: number[] = [];

      for (const size of mapSizes) {
        const map = generateMap(size);

        const startTime = Date.now();

        for (let frame = 0; frame < 50; frame++) {
          resourceManager.updateFrame();

          for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
              resourceManager.updateRecovery(map[y][x]);
            }
          }
        }

        const endTime = Date.now();
        durations.push(endTime - startTime);
      }

      // Performance should scale roughly linearly with area
      const ratio1 = durations[1] / durations[0]; // 20x20 vs 10x10
      const ratio2 = durations[2] / durations[1]; // 30x30 vs 20x20

      // Ratios should be reasonable (not exponential growth)
      expect(ratio1).toBeLessThan(6); // Should be ~4 for linear scaling
      expect(ratio2).toBeLessThan(4); // Should be ~2.25 for linear scaling
    });
  });

  describe("High Frequency Operations Performance", () => {
    it("should handle rapid harvesting operations", () => {
      const tile: Tile = {
        height: 0.5,
        type: "land",
        resources: { food: 1000, wood: 1000, ore: 1000 },
        maxResources: { food: 1000, wood: 1000, ore: 1000 },
        depletionState: { food: 1, wood: 1, ore: 1 },
        recoveryTimer: { food: 0, wood: 0, ore: 0 },
        lastHarvestTime: 0,
      };

      const startTime = Date.now();

      // Perform 10,000 harvest operations
      for (let i = 0; i < 10000; i++) {
        resourceManager.harvestResource(tile, "food", 0.1);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100);

      // Verify correctness
      expect(tile.resources.food).toBeCloseTo(0, 1);
    });

    it("should handle rapid divine intervention operations", () => {
      const tile: Tile = {
        height: 0.5,
        type: "land",
        resources: { food: 500, wood: 500, ore: 500 },
        maxResources: { food: 1000, wood: 1000, ore: 1000 },
        depletionState: { food: 0.5, wood: 0.5, ore: 0.5 },
        recoveryTimer: { food: 0, wood: 0, ore: 0 },
        lastHarvestTime: 0,
      };

      const startTime = Date.now();

      // Perform 5,000 divine intervention operations
      for (let i = 0; i < 5000; i++) {
        resourceManager.divineIntervention(tile, "food", Math.random() * 1000);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (less than 50ms)
      expect(duration).toBeLessThan(50);

      // Verify tile remains valid
      expect(tile.resources.food).toBeGreaterThanOrEqual(0);
      expect(tile.resources.food).toBeLessThanOrEqual(1000);
    });

    it("should handle rapid visual state calculations", () => {
      const tiles: Tile[] = Array(1000)
        .fill(null)
        .map(() => ({
          height: Math.random(),
          type: ["land", "forest", "mountain"][
            Math.floor(Math.random() * 3)
          ] as any,
          resources: {
            food: Math.random() * 100,
            wood: Math.random() * 100,
            ore: Math.random() * 100,
          },
          maxResources: { food: 100, wood: 100, ore: 100 },
          depletionState: {
            food: Math.random(),
            wood: Math.random(),
            ore: Math.random(),
          },
          recoveryTimer: { food: 0, wood: 0, ore: 0 },
          lastHarvestTime: 0,
        }));

      const startTime = Date.now();

      // Calculate visual states for all tiles
      const visualStates = tiles.map((tile) =>
        resourceManager.getVisualState(tile),
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (less than 50ms)
      expect(duration).toBeLessThan(50);

      // Verify all visual states are valid
      expect(
        visualStates.every(
          (vs) =>
            vs.opacity >= 0.3 &&
            vs.opacity <= 1.0 &&
            vs.recoveryProgress >= 0 &&
            vs.recoveryProgress <= 1,
        ),
      ).toBe(true);
    });
  });

  describe("Memory Usage Performance", () => {
    it("should maintain stable memory usage over time", () => {
      const map = generateMap(30);
      const villages = createVillages(map, 5);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const initialMemory = process.memoryUsage().heapUsed;

      // Run extended simulation
      for (let frame = 0; frame < 1000; frame++) {
        resourceManager.updateFrame();

        // Update all tiles
        for (let y = 0; y < 30; y++) {
          for (let x = 0; x < 30; x++) {
            resourceManager.updateRecovery(map[y][x]);
          }
        }

        // Update villages periodically
        if (frame % 10 === 0) {
          updateVillages(map, villages, [], resourceManager);
        }

        // Perform some harvesting
        if (frame % 50 === 0) {
          const randomTile =
            map[Math.floor(Math.random() * 30)][Math.floor(Math.random() * 30)];
          resourceManager.harvestResource(randomTile, "food", 1);
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (less than 5MB)
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });

    it("should handle creation and destruction of many resource managers", () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Create and destroy many resource managers
      for (let i = 0; i < 1000; i++) {
        const manager = new ResourceManager({
          depletionRate: Math.random() * 0.1,
          recoveryRate: Math.random() * 0.05,
        });

        // Use the manager briefly
        const tile: Tile = {
          height: 0.5,
          type: "land",
          resources: { food: 10, wood: 5, ore: 3 },
          maxResources: { food: 10, wood: 5, ore: 3 },
          depletionState: { food: 1, wood: 1, ore: 1 },
          recoveryTimer: { food: 0, wood: 0, ore: 0 },
          lastHarvestTime: 0,
        };

        manager.harvestResource(tile, "food", 1);
        manager.updateRecovery(tile);

        // Manager should be eligible for garbage collection after this scope
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (less than 2MB)
      expect(memoryIncrease).toBeLessThan(2 * 1024 * 1024);
    });
  });

  describe("Concurrent Operations Performance", () => {
    it("should handle multiple villages on large map efficiently", () => {
      const mapSize = 50;
      const villageCount = 25;

      const map = generateMap(mapSize);
      const villages = createVillages(map, villageCount);
      const roads = buildRoads(map, villages);

      const startTime = Date.now();

      // Simulate concurrent village operations
      for (let frame = 0; frame < 100; frame++) {
        resourceManager.updateFrame();

        // Update resources for entire map
        for (let y = 0; y < mapSize; y++) {
          for (let x = 0; x < mapSize; x++) {
            resourceManager.updateRecovery(map[y][x]);
          }
        }

        // Update all villages
        updateVillages(map, villages, roads, resourceManager);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (less than 3 seconds)
      expect(duration).toBeLessThan(3000);

      // Verify all villages are still valid
      expect(
        villages.every(
          (v) =>
            v.population >= 10 &&
            v.storage.food >= 0 &&
            v.storage.wood >= 0 &&
            v.storage.ore >= 0,
        ),
      ).toBe(true);
    });

    it("should handle resource contention efficiently", () => {
      const map = generateMap(10);

      // Create many villages in close proximity
      const villages: Village[] = Array(9)
        .fill(null)
        .map((_, i) => ({
          x: 1 + (i % 3),
          y: 1 + Math.floor(i / 3),
          population: 10,
          storage: { food: 5, wood: 5, ore: 2 },
          collectionRadius: 2,
          economy: {
            production: { food: 0, wood: 0, ore: 0 },
            consumption: { food: 0, wood: 0, ore: 0 },
            stock: { food: 5, wood: 5, ore: 2, capacity: 100 },
            buildings: { count: 1, targetCount: 1, constructionQueue: 0 },
            supplyDemandStatus: {
              food: "balanced",
              wood: "balanced",
              ore: "balanced",
            },
          },
          lastUpdateTime: 0,
          populationHistory: [10],
        }));

      const startTime = Date.now();

      // Simulate resource contention
      for (let frame = 0; frame < 200; frame++) {
        resourceManager.updateFrame();

        // Update resources
        for (let y = 0; y < 10; y++) {
          for (let x = 0; x < 10; x++) {
            resourceManager.updateRecovery(map[y][x]);
          }
        }

        // All villages compete for resources
        updateVillages(map, villages, [], resourceManager);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);

      // System should remain stable
      expect(villages.every((v) => v.storage.food >= 0)).toBe(true);
    });
  });

  describe("Stress Tests", () => {
    it("should handle extreme resource depletion and recovery cycles", () => {
      const map = generateMap(20);
      const villages = createVillages(map, 10);

      const startTime = Date.now();

      // Extreme depletion and recovery cycles
      for (let cycle = 0; cycle < 10; cycle++) {
        // Depletion phase - harvest everything
        for (let y = 0; y < 20; y++) {
          for (let x = 0; x < 20; x++) {
            const tile = map[y][x];
            resourceManager.harvestResource(tile, "food", tile.resources.food);
            resourceManager.harvestResource(tile, "wood", tile.resources.wood);
            resourceManager.harvestResource(tile, "ore", tile.resources.ore);
          }
        }

        // Recovery phase - let resources recover
        for (let frame = 0; frame < 100; frame++) {
          resourceManager.updateFrame();
          for (let y = 0; y < 20; y++) {
            for (let x = 0; x < 20; x++) {
              resourceManager.updateRecovery(map[y][x]);
            }
          }
        }

        // Village operations during stress
        updateVillages(map, villages, [], resourceManager);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (less than 2 seconds)
      expect(duration).toBeLessThan(2000);

      // System should remain stable
      expect(villages.every((v) => v.population >= 10)).toBe(true);
    });

    it("should handle maximum configuration stress test", () => {
      // Use extreme configuration
      const extremeManager = new ResourceManager({
        depletionRate: 0.5,
        recoveryRate: 0.1,
        recoveryDelay: 10,
        minRecoveryThreshold: 0.01,
      });

      const map = generateMap(25);
      const villages = createVillages(map, 8);

      const startTime = Date.now();

      // Stress test with extreme configuration
      for (let frame = 0; frame < 500; frame++) {
        extremeManager.updateFrame();

        for (let y = 0; y < 25; y++) {
          for (let x = 0; x < 25; x++) {
            extremeManager.updateRecovery(map[y][x]);
          }
        }

        if (frame % 5 === 0) {
          updateVillages(map, villages, [], extremeManager);
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (less than 1.5 seconds)
      expect(duration).toBeLessThan(1500);

      // Verify system integrity
      let validTiles = 0;
      for (let y = 0; y < 25; y++) {
        for (let x = 0; x < 25; x++) {
          const tile = map[y][x];
          if (
            tile.resources.food >= 0 &&
            tile.depletionState.food >= 0 &&
            tile.depletionState.food <= 1
          ) {
            validTiles++;
          }
        }
      }

      expect(validTiles).toBe(625); // 25x25
    });
  });

  describe("Benchmark Tests", () => {
    it("should benchmark single tile operations", () => {
      const tile: Tile = {
        height: 0.5,
        type: "land",
        resources: { food: 100, wood: 100, ore: 100 },
        maxResources: { food: 100, wood: 100, ore: 100 },
        depletionState: { food: 1, wood: 1, ore: 1 },
        recoveryTimer: { food: 0, wood: 0, ore: 0 },
        lastHarvestTime: 0,
      };

      const operations = 100000;
      const startTime = Date.now();

      for (let i = 0; i < operations; i++) {
        resourceManager.updateRecovery(tile);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const operationsPerSecond = operations / (duration / 1000);

      // Should achieve at least 100,000 operations per second
      expect(operationsPerSecond).toBeGreaterThan(100000);
    });

    it("should benchmark harvest operations throughput", () => {
      const tile: Tile = {
        height: 0.5,
        type: "land",
        resources: { food: 10000, wood: 10000, ore: 10000 },
        maxResources: { food: 10000, wood: 10000, ore: 10000 },
        depletionState: { food: 1, wood: 1, ore: 1 },
        recoveryTimer: { food: 0, wood: 0, ore: 0 },
        lastHarvestTime: 0,
      };

      const operations = 50000;
      const startTime = Date.now();

      for (let i = 0; i < operations; i++) {
        resourceManager.harvestResource(tile, "food", 0.1);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const operationsPerSecond = operations / (duration / 1000);

      // Should achieve at least 50,000 harvest operations per second
      expect(operationsPerSecond).toBeGreaterThan(50000);
    });

    it("should benchmark visual state calculations", () => {
      const tiles: Tile[] = Array(10000)
        .fill(null)
        .map(() => ({
          height: Math.random(),
          type: "land" as const,
          resources: {
            food: Math.random() * 100,
            wood: Math.random() * 100,
            ore: Math.random() * 100,
          },
          maxResources: { food: 100, wood: 100, ore: 100 },
          depletionState: {
            food: Math.random(),
            wood: Math.random(),
            ore: Math.random(),
          },
          recoveryTimer: { food: 0, wood: 0, ore: 0 },
          lastHarvestTime: 0,
        }));

      const startTime = Date.now();

      tiles.forEach((tile) => {
        resourceManager.getVisualState(tile);
      });

      const endTime = Date.now();
      const duration = endTime - startTime;
      const operationsPerSecond = tiles.length / (duration / 1000);

      // Should achieve at least 10,000 visual state calculations per second
      expect(operationsPerSecond).toBeGreaterThan(10000);
    });
  });
});
