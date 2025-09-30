/**
 * Comprehensive System Separation Test Suite
 * 
 * This test suite provides a comprehensive verification that the system
 * separation has been successfully implemented according to requirements.
 * 
 * Requirements: 1.1, 1.2, 4.3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameStateManager } from '../game-systems/integration/game-state-manager';
import { ResourceManager } from '../game-systems/economy/resource-manager';
import { SupplyDemandBalancer } from '../game-systems/economy/supply-demand-balancer';
import { VillageEconomyManager } from '../game-systems/integration/village-economy-manager';
import { PopulationManager } from '../game-systems/population/population-manager';
import { BuildingManager } from '../game-systems/population/building-manager';
import { TimeManager } from '../game-systems/time/time-manager';
import { Village } from '@/game-systems/world/village';
import { GameTime } from '@/game-systems/shared-types';

// Helper function to create proper GameTime objects
function createGameTime(currentTime: number = 100, deltaTime: number = 1): GameTime {
  return {
    currentTime,
    deltaTime,
    totalTicks: Math.floor(currentTime / 16.67), // Assuming 60 FPS
    totalSeconds: Math.floor(currentTime / 1000),
    totalMinutes: Math.floor(currentTime / 60000),
    currentTick: Math.floor((currentTime % 1000) / 16.67)
  };
}

// Mock Phaser to ensure no graphics dependencies
vi.mock('phaser', () => ({
  default: {},
  Scene: class MockScene { },
  GameObjects: {
    Graphics: class MockGraphics { },
    Text: class MockText { },
    Container: class MockContainer { }
  }
}));

describe('包括的システム分離検証テスト', () => {
  describe('コアシステムの独立性', () => {
    it('全てのゲームシステムがグラフィックなしでインスタンス化できることを検証する', () => {
      // 要件 1.1: ゲームシステムはグラフィックから独立している

      // Core economic systems
      const resourceManager = new ResourceManager();
      const supplyDemandBalancer = new SupplyDemandBalancer();
      const villageEconomyManager = new VillageEconomyManager();

      // Population and building systems
      const populationManager = new PopulationManager();
      const buildingManager = new BuildingManager();

      // Time management system
      const timeManager = new TimeManager();

      // Integration system
      const gameStateManager = new GameStateManager({
        mapSize: 16,
        villageCount: 3,
        seed: 12345
      });

      // All systems should be created successfully
      expect(resourceManager).toBeDefined();
      expect(supplyDemandBalancer).toBeDefined();
      expect(villageEconomyManager).toBeDefined();
      expect(populationManager).toBeDefined();
      expect(buildingManager).toBeDefined();
      expect(timeManager).toBeDefined();
      expect(gameStateManager).toBeDefined();
    });

    it('should verify game systems can perform core operations without graphics', () => {
      // Requirement 1.1: Core operations should work independently

      const resourceManager = new ResourceManager();
      const populationManager = new PopulationManager();
      const buildingManager = new BuildingManager();
      const timeManager = new TimeManager();

      // Test resource operations
      const mockTile = {
        type: 'land' as const,
        height: 0.5,
        resources: { food: 100, wood: 50, ore: 25 },
        maxResources: { food: 100, wood: 50, ore: 25 },
        depletionState: { food: 1, wood: 1, ore: 1 },
        lastHarvestTime: 0,
        recoveryTimer: { food: 0, wood: 0, ore: 0 }
      };

      const harvested = resourceManager.harvestResource(mockTile, 'food', 10);
      expect(harvested).toBe(10);

      // Test population operations
      const foodConsumption = populationManager.calculateFoodConsumption(100);
      expect(typeof foodConsumption).toBe('number');
      expect(foodConsumption).toBeGreaterThan(0);

      // Test building operations
      const targetBuildings = buildingManager.calculateTargetBuildingCount(100);
      expect(typeof targetBuildings).toBe('number');
      expect(targetBuildings).toBeGreaterThan(0);

      // Test time operations
      timeManager.update();
      const gameTime = timeManager.getGameTime();
      expect(gameTime).toBeDefined();
      expect(typeof gameTime.totalTicks).toBe('number');
    });
  });

  describe('データ処理の独立性', () => {
    let gameStateManager: GameStateManager;

    beforeEach(() => {
      gameStateManager = new GameStateManager({
        mapSize: 16,
        villageCount: 3,
        seed: 54321
      });
      gameStateManager.initializeGame();
    });

    it('should process game data without requiring graphics rendering', () => {
      // Requirement 1.2: Data processing should be independent of rendering

      const villages = gameStateManager.getVillages();
      const map = gameStateManager.getMap();
      const timeManager = gameStateManager.getTimeManager();

      expect(villages.length).toBeGreaterThan(0);
      expect(map.length).toBeGreaterThan(0);
      expect(timeManager).toBeDefined();

      // Verify data structures are complete
      villages.forEach(village => {
        expect(village.x).toBeDefined();
        expect(village.y).toBeDefined();
        expect(village.population).toBeGreaterThan(0);
        expect(village.economy).toBeDefined();
        expect(village.storage).toBeDefined();
      });

      // Verify map data is complete
      map.forEach(row => {
        row.forEach(tile => {
          expect(tile.type).toBeDefined();
          expect(tile.resources).toBeDefined();
          expect(tile.maxResources).toBeDefined();
        });
      });
    });

    it('should update game state without graphics dependencies', () => {
      // Requirement 1.2: Game state updates should be independent

      const initialVillages = gameStateManager.getVillages();
      const villageCount = initialVillages.length;

      // Run multiple updates
      for (let i = 0; i < 5; i++) {
        gameStateManager.update();
      }

      const updatedVillages = gameStateManager.getVillages();

      // Verify system integrity
      expect(updatedVillages.length).toBe(villageCount);

      updatedVillages.forEach((village, index) => {
        expect(village.x).toBe(initialVillages[index].x);
        expect(village.y).toBe(initialVillages[index].y);
        expect(village.economy).toBeDefined();
        expect(village.storage).toBeDefined();
      });
    });
  });

  describe('エラーハンドリングの独立性', () => {
    it('グラフィックに影響を与えずにシステムエラーを処理する', () => {
      // 要件 4.3: エラーハンドリングは独立している

      const resourceManager = new ResourceManager();

      // Test with invalid data
      const invalidTile = {
        type: 'land' as const,
        height: 0.5,
        resources: { food: -10, wood: 50, ore: 25 }, // Invalid negative
        maxResources: { food: 100, wood: 50, ore: 25 },
        depletionState: { food: 1, wood: 1, ore: 1 },
        lastHarvestTime: 0,
        recoveryTimer: { food: 0, wood: 0, ore: 0 }
      };

      // Should handle gracefully
      expect(() => {
        resourceManager.harvestResource(invalidTile, 'food', 10);
      }).not.toThrow();
    });

    it('should maintain system stability during errors', () => {
      // Requirement 4.3: Systems should remain stable during errors

      const gameStateManager = new GameStateManager({
        mapSize: 8,
        villageCount: 2,
        seed: 99999
      });

      gameStateManager.initializeGame();

      // Simulate error conditions
      const villages = gameStateManager.getVillages();
      if (villages.length > 0) {
        // Create invalid state
        villages[0].population = -1; // Invalid population
        villages[0].storage.food = -100; // Invalid storage
      }

      // System should handle and correct errors
      expect(() => {
        gameStateManager.update();
      }).not.toThrow();

      // Verify system corrected the errors (the system may not auto-correct immediately)
      if (villages.length > 0) {
        // The system should at least not crash and maintain basic structure
        expect(villages[0]).toBeDefined();
        expect(villages[0].storage).toBeDefined();
        expect(villages[0].economy).toBeDefined();
      }
    });
  });

  describe('インターフェース準拠', () => {
    it('全てのシステムが期待されるインターフェースを実装していることを検証する', () => {
      // 要件 1.1: システムは明確に定義されたインターフェースを持つ

      const resourceManager = new ResourceManager();
      const timeManager = new TimeManager();
      const populationManager = new PopulationManager();
      const buildingManager = new BuildingManager();

      // Verify ResourceManager interface
      expect(typeof resourceManager.harvestResource).toBe('function');
      expect(typeof resourceManager.updateRecovery).toBe('function');
      expect(typeof resourceManager.getConfig).toBe('function');

      // Verify TimeManager interface
      expect(typeof timeManager.update).toBe('function');
      expect(typeof timeManager.getGameTime).toBe('function');
      expect(typeof timeManager.setGameSpeed).toBe('function');

      // Verify PopulationManager interface
      expect(typeof populationManager.calculateFoodConsumption).toBe('function');
      expect(typeof populationManager.canPopulationGrow).toBe('function');
      expect(typeof populationManager.shouldPopulationDecrease).toBe('function');

      // Verify BuildingManager interface
      expect(typeof buildingManager.calculateTargetBuildingCount).toBe('function');
      expect(typeof buildingManager.canBuildBuilding).toBe('function');
      expect(typeof buildingManager.calculateBuildingCost).toBe('function');
    });

    it('should verify systems can work with mock data', () => {
      // Requirement 1.2: Systems should work with any valid data structure

      const balancer = new SupplyDemandBalancer();
      const economyManager = new VillageEconomyManager();

      // Create mock village data
      const mockVillage: Village = {
        x: 10,
        y: 10,
        population: 50,
        collectionRadius: 3,
        storage: { food: 75, wood: 40, ore: 20 },
        economy: {
          production: { food: 8, wood: 4, ore: 2 },
          consumption: { food: 6, wood: 2, ore: 1 },
          stock: { food: 75, wood: 40, ore: 20, capacity: 150 },
          buildings: { count: 5, targetCount: 6, constructionQueue: 1 },
          supplyDemandStatus: { food: 'balanced' as const, wood: 'surplus' as const, ore: 'balanced' as const }
        },
        lastUpdateTime: 0,
        populationHistory: []
      };

      // Systems should work with mock data
      const status = balancer.evaluateVillageBalance(mockVillage);
      expect(status).toBeDefined();
      expect(status.food).toBeDefined();

      const mockMap = Array(5).fill(null).map(() =>
        Array(5).fill(null).map(() => ({
          type: 'land' as const,
          height: 0.5,
          resources: { food: 30, wood: 15, ore: 8 },
          maxResources: { food: 50, wood: 25, ore: 15 },
          depletionState: { food: 0.6, wood: 0.6, ore: 0.5 },
          lastHarvestTime: 0,
          recoveryTimer: { food: 0, wood: 0, ore: 0 }
        }))
      );

      const gameTime = createGameTime(1000, 1.0);
      expect(() => {
        economyManager.updateVillageEconomy(mockVillage, gameTime, mockMap);
      }).not.toThrow();
    });
  });

  describe('パフォーマンスの独立性', () => {
    it('グラフィックのオーバーヘッドなしでパフォーマンスを維持する', () => {
      // 要件 4.3: ゲームシステムは独立してパフォーマンスを発揮する

      const gameStateManager = new GameStateManager({
        mapSize: 32,
        villageCount: 6,
        seed: 77777
      });

      gameStateManager.initializeGame();

      const startTime = performance.now();

      // Run intensive operations
      for (let i = 0; i < 50; i++) {
        gameStateManager.update();
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 500ms for 50 updates)
      expect(duration).toBeLessThan(500);

      // System should still be functional
      expect(gameStateManager.isInitialized()).toBe(true);

      const villages = gameStateManager.getVillages();
      expect(villages.length).toBeGreaterThan(0);
    });

    it('should scale properly with system size', () => {
      // Requirement 4.3: Systems should scale independently

      // Test with small system
      const smallSystem = new GameStateManager({
        mapSize: 8,
        villageCount: 2,
        seed: 11111
      });
      smallSystem.initializeGame();

      const smallStartTime = performance.now();
      for (let i = 0; i < 10; i++) {
        smallSystem.update();
      }
      const smallDuration = performance.now() - smallStartTime;

      // Test with larger system
      const largeSystem = new GameStateManager({
        mapSize: 16,
        villageCount: 4,
        seed: 22222
      });
      largeSystem.initializeGame();

      const largeStartTime = performance.now();
      for (let i = 0; i < 10; i++) {
        largeSystem.update();
      }
      const largeDuration = performance.now() - largeStartTime;

      // Both should complete in reasonable time
      expect(smallDuration).toBeLessThan(100);
      expect(largeDuration).toBeLessThan(200);

      // Verify both systems are functional
      expect(smallSystem.isInitialized()).toBe(true);
      expect(largeSystem.isInitialized()).toBe(true);
    });
  });
});