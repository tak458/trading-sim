/**
 * System Separation Verification Tests
 *
 * This test suite verifies that game systems can operate independently
 * of graphics components, ensuring proper separation of concerns.
 *
 * Requirements: 1.1, 1.2, 4.3
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameTime } from "@/game-systems/shared-types";
import type { Village } from "@/game-systems/world/village";
import { ResourceManager } from "../game-systems/economy/resource-manager";
import { SupplyDemandBalancer } from "../game-systems/economy/supply-demand-balancer";
import { GameStateManager } from "../game-systems/integration/game-state-manager";
import { VillageEconomyManager } from "../game-systems/integration/village-economy-manager";
import { BuildingManager } from "../game-systems/population/building-manager";
import { PopulationManager } from "../game-systems/population/population-manager";
import { TimeManager } from "../game-systems/time/time-manager";
import {
  DEFAULT_RESOURCE_CONFIG,
  DEFAULT_SUPPLY_DEMAND_CONFIG,
} from "../settings";

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

// Mock graphics dependencies to ensure game systems don't depend on them
vi.mock("phaser", () => ({
  default: {},
  Scene: class MockScene {},
  GameObjects: {
    Graphics: class MockGraphics {},
    Text: class MockText {},
    Container: class MockContainer {},
  },
}));

describe("システム分離検証テスト", () => {
  describe("ゲームシステムの独立性", () => {
    it("グラフィック依存なしでResourceManagerを作成する", () => {
      // 要件 1.1: ゲームロジックはグラフィックから分離される
      const resourceManager = new ResourceManager(DEFAULT_RESOURCE_CONFIG);

      expect(resourceManager).toBeDefined();
      expect(resourceManager.getConfig()).toEqual(DEFAULT_RESOURCE_CONFIG);

      // Verify it can perform core operations without graphics
      const mockTile = {
        type: "land" as const,
        height: 0.5,
        resources: { food: 100, wood: 50, ore: 25 },
        maxResources: { food: 100, wood: 50, ore: 25 },
        depletionState: { food: 1, wood: 1, ore: 1 },
        lastHarvestTime: 0,
        recoveryTimer: { food: 0, wood: 0, ore: 0 },
      };

      const harvested = resourceManager.harvestResource(mockTile, "food", 10);
      expect(harvested).toBe(10);
      expect(mockTile.resources.food).toBe(90);
    });

    it("should create SupplyDemandBalancer without graphics dependencies", () => {
      // Requirement 1.1: Game logic should be separated from graphics
      const balancer = new SupplyDemandBalancer(DEFAULT_SUPPLY_DEMAND_CONFIG);

      expect(balancer).toBeDefined();

      // Create mock village without graphics dependencies
      const mockVillage: Village = {
        x: 10,
        y: 10,
        population: 100,
        collectionRadius: 5,
        storage: { food: 50, wood: 30, ore: 20 },
        economy: {
          production: { food: 10, wood: 5, ore: 2 },
          consumption: { food: 8, wood: 3, ore: 1 },
          stock: { food: 50, wood: 30, ore: 20, capacity: 200 },
          buildings: { count: 10, targetCount: 12, constructionQueue: 2 },
          supplyDemandStatus: {
            food: "balanced" as const,
            wood: "surplus" as const,
            ore: "shortage" as const,
          },
        },
        lastUpdateTime: 0,
        populationHistory: [],
      };

      const status = balancer.evaluateVillageBalance(mockVillage);
      expect(status).toBeDefined();
      expect(status.food).toBeDefined();
      expect(status.wood).toBeDefined();
      expect(status.ore).toBeDefined();
    });

    it("should create PopulationManager without graphics dependencies", () => {
      // Requirement 1.1: Game logic should be separated from graphics
      const populationManager = new PopulationManager();

      expect(populationManager).toBeDefined();

      // Verify it can perform operations without graphics
      const mockVillage = {
        id: 1,
        x: 10,
        y: 10,
        population: 100,
        collectionRadius: 5,
        storage: { food: 100, wood: 50, ore: 25 },
        economy: {
          production: { food: 10, wood: 5, ore: 2 },
          consumption: { food: 8, wood: 3, ore: 1 },
          stock: { food: 100, wood: 50, ore: 25, capacity: 200 },
          buildings: { count: 10, targetCount: 12, constructionQueue: 2 },
          supplyDemandStatus: {
            food: "balanced" as const,
            wood: "surplus" as const,
            ore: "shortage" as const,
          },
        },
      };

      const foodConsumption = populationManager.calculateFoodConsumption(
        mockVillage.population,
      );
      expect(typeof foodConsumption).toBe("number");
      expect(foodConsumption).toBeGreaterThanOrEqual(0);
    });

    it("should create BuildingManager without graphics dependencies", () => {
      // Requirement 1.1: Game logic should be separated from graphics
      const buildingManager = new BuildingManager();

      expect(buildingManager).toBeDefined();

      // Verify it can perform operations without graphics
      const mockVillage = {
        id: 1,
        x: 10,
        y: 10,
        population: 100,
        collectionRadius: 5,
        storage: { food: 100, wood: 50, ore: 25 },
        economy: {
          production: { food: 10, wood: 5, ore: 2 },
          consumption: { food: 8, wood: 3, ore: 1 },
          stock: { food: 100, wood: 50, ore: 25, capacity: 200 },
          buildings: { count: 10, targetCount: 12, constructionQueue: 2 },
          supplyDemandStatus: {
            food: "balanced" as const,
            wood: "surplus" as const,
            ore: "shortage" as const,
          },
        },
      };

      const targetCount = buildingManager.calculateTargetBuildingCount(
        mockVillage.population,
      );
      expect(typeof targetCount).toBe("number");
      expect(targetCount).toBeGreaterThanOrEqual(0);
    });

    it("should create TimeManager without graphics dependencies", () => {
      // Requirement 1.1: Game logic should be separated from graphics
      const timeManager = new TimeManager();

      expect(timeManager).toBeDefined();

      // Verify it can perform operations without graphics
      timeManager.update(); // Update time system
      const gameTime = timeManager.getGameTime();

      expect(gameTime).toBeDefined();
      expect(typeof gameTime.totalTicks).toBe("number");
      expect(typeof gameTime.totalSeconds).toBe("number");
      expect(typeof gameTime.totalMinutes).toBe("number");
    });
  });

  describe("統合システムの独立性", () => {
    it("グラフィック依存なしでVillageEconomyManagerを作成する", () => {
      // 要件 1.2: 統合システムはグラフィックなしで動作する
      const economyManager = new VillageEconomyManager();

      expect(economyManager).toBeDefined();

      // Create mock data without graphics dependencies
      const mockVillages: Village[] = [
        {
          x: 10,
          y: 10,
          population: 100,
          collectionRadius: 5,
          storage: { food: 100, wood: 50, ore: 25 },
          economy: {
            production: { food: 10, wood: 5, ore: 2 },
            consumption: { food: 8, wood: 3, ore: 1 },
            stock: { food: 100, wood: 50, ore: 25, capacity: 200 },
            buildings: { count: 10, targetCount: 12, constructionQueue: 2 },
            supplyDemandStatus: {
              food: "balanced" as const,
              wood: "surplus" as const,
              ore: "shortage" as const,
            },
          },
          lastUpdateTime: 0,
          populationHistory: [],
        },
      ];

      const mockMap = Array(10)
        .fill(null)
        .map(() =>
          Array(10)
            .fill(null)
            .map(() => ({
              type: "land" as const,
              height: 0.5,
              resources: { food: 50, wood: 25, ore: 10 },
              maxResources: { food: 100, wood: 50, ore: 25 },
              depletionState: { food: 0.5, wood: 0.5, ore: 0.4 },
              lastHarvestTime: 0,
              recoveryTimer: { food: 0, wood: 0, ore: 0 },
            })),
        );

      // Verify it can update without graphics
      const gameTime = createGameTime(1000, 1.0);
      economyManager.updateVillageEconomy(mockVillages[0], gameTime, mockMap);
      expect(mockVillages[0].economy).toBeDefined();
    });

    it("should create GameStateManager without graphics dependencies", async () => {
      // Requirement 1.2: Game state management should be independent of graphics
      const gameConfig = {
        mapSize: 32,
        villageCount: 4,
        seed: 12345,
      };

      const gameStateManager = new GameStateManager(gameConfig);

      expect(gameStateManager).toBeDefined();

      // Initialize without graphics
      gameStateManager.initializeGame();
      expect(gameStateManager.isInitialized()).toBe(true);

      // Verify core game data is available
      const map = gameStateManager.getMap();
      const villages = gameStateManager.getVillages();
      const timeManager = gameStateManager.getTimeManager();

      expect(map).toBeDefined();
      expect(Array.isArray(map)).toBe(true);
      expect(villages).toBeDefined();
      expect(Array.isArray(villages)).toBe(true);
      expect(timeManager).toBeDefined();

      // Verify update works without graphics
      // Wait a bit for time to pass, then update multiple times
      await new Promise((resolve) => setTimeout(resolve, 100));
      for (let i = 0; i < 5; i++) {
        gameStateManager.update();
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      const gameTime = timeManager.getGameTime();
      expect(gameTime.totalTicks).toBeGreaterThanOrEqual(0);
    });
  });

  describe("データフローの独立性", () => {
    let gameStateManager: GameStateManager;

    beforeEach(() => {
      const gameConfig = {
        mapSize: 16,
        villageCount: 3,
        seed: 54321,
      };

      gameStateManager = new GameStateManager(gameConfig);
      gameStateManager.initializeGame();
    });

    it("should process resource updates without graphics", () => {
      // Requirement 1.1: Resource processing should be independent of graphics
      const initialMap = gameStateManager.getMap();
      const initialTile = initialMap[5][5];
      const initialFood = initialTile.resources.food;

      // Simulate resource harvesting
      const resourceManager = gameStateManager.getResourceManager();
      if (resourceManager) {
        const harvested = resourceManager.harvestResource(
          initialTile,
          "food",
          10,
        );
        expect(harvested).toBeGreaterThan(0);
        expect(initialTile.resources.food).toBeLessThan(initialFood);
      }
    });

    it("should update village economies without graphics", () => {
      // Requirement 1.2: Economic calculations should be independent of graphics
      const villages = gameStateManager.getVillages();
      const initialPopulation = villages[0].population;

      // Run multiple update cycles
      for (let i = 0; i < 10; i++) {
        gameStateManager.update();
      }

      // Verify villages are being updated
      const updatedVillages = gameStateManager.getVillages();
      expect(updatedVillages).toBeDefined();
      expect(updatedVillages.length).toBe(villages.length);

      // Economy should be functioning
      const village = updatedVillages[0];
      expect(village.economy).toBeDefined();
      expect(village.economy.production).toBeDefined();
      expect(village.economy.consumption).toBeDefined();
    });

    it("should handle time progression without graphics", async () => {
      // Requirement 1.1: Time management should be independent of graphics
      const timeManager = gameStateManager.getTimeManager();
      const initialTicks = timeManager.getGameTime().totalTicks;

      // Simulate time progression with actual time passing
      await new Promise((resolve) => setTimeout(resolve, 100));
      for (let i = 0; i < 5; i++) {
        gameStateManager.update();
        await new Promise((resolve) => setTimeout(resolve, 20));
      }

      const finalTicks = timeManager.getGameTime().totalTicks;
      expect(finalTicks).toBeGreaterThanOrEqual(initialTicks);
    });

    it("should calculate supply and demand without graphics", () => {
      // Requirement 1.2: Supply/demand calculations should be independent of graphics
      const villages = gameStateManager.getVillages();

      // Verify supply/demand status is being calculated
      villages.forEach((village) => {
        expect(village.economy.supplyDemandStatus).toBeDefined();
        expect(village.economy.supplyDemandStatus.food).toMatch(
          /surplus|balanced|shortage|critical/,
        );
        expect(village.economy.supplyDemandStatus.wood).toMatch(
          /surplus|balanced|shortage|critical/,
        );
        expect(village.economy.supplyDemandStatus.ore).toMatch(
          /surplus|balanced|shortage|critical/,
        );
      });
    });
  });

  describe("エラーハンドリングの独立性", () => {
    it("グラフィックに影響を与えずにゲームシステムのエラーを処理する", () => {
      // 要件 4.3: エラーハンドリングは独立している
      const resourceManager = new ResourceManager();

      // Test with invalid tile data
      const invalidTile = {
        type: "land" as const,
        height: 0.5,
        resources: { food: -10, wood: 50, ore: 25 }, // Invalid negative resource
        maxResources: { food: 100, wood: 50, ore: 25 },
        depletionState: { food: 1, wood: 1, ore: 1 },
        lastHarvestTime: 0,
        recoveryTimer: { food: 0, wood: 0, ore: 0 },
      };

      // Should handle gracefully without throwing
      expect(() => {
        resourceManager.harvestResource(invalidTile, "food", 10);
      }).not.toThrow();
    });

    it("should handle missing data gracefully", () => {
      // Requirement 4.3: Systems should handle missing data
      const balancer = new SupplyDemandBalancer();

      // Test with empty village array
      const result = balancer.identifySupplyDemandVillages([]);

      expect(result).toBeDefined();
      expect(result.shortageVillages).toEqual([]);
      expect(result.surplusVillages).toEqual([]);
      expect(result.criticalVillages).toEqual([]);
    });
  });
});
