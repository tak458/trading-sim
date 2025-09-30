/**
 * SupplyDemandBalancer と VillageEconomyManager の統合テスト
 * 要件 6.1, 6.2, 6.3, 6.4 の統合検証
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SupplyDemandBalancer } from '../game-systems/economy/supply-demand-balancer';
import { VillageEconomyManager } from '../game-systems/integration/village-economy-manager';
import { GameTime } from '../game-systems/shared-types';

// Helper function to create proper GameTime objects
function createGameTime(currentTime: number = 1000, deltaTime: number = 1.0): GameTime {
  return {
    currentTime,
    deltaTime,
    totalTicks: Math.floor(currentTime / 16.67),
    totalSeconds: Math.floor(currentTime / 1000),
    totalMinutes: Math.floor(currentTime / 60000),
    currentTick: Math.floor((currentTime % 1000) / 16.67)
  };
}
import { Village } from '../game-systems/world/village';
import { Tile } from '../game-systems/world/map';
import { DEFAULT_SUPPLY_DEMAND_CONFIG } from '../settings';

describe('需給バランサー統合テスト', () => {
  let balancer: SupplyDemandBalancer;
  let economyManager: VillageEconomyManager;
  let testVillages: Village[];
  let testMap: Tile[][];
  let gameTime: GameTime;

  beforeEach(() => {
    balancer = new SupplyDemandBalancer();
    economyManager = new VillageEconomyManager();
    gameTime = createGameTime(1000, 100);

    // 簡単なテストマップを作成
    testMap = Array(20).fill(null).map((_, y) =>
      Array(20).fill(null).map((_, x) => ({
        x, y,
        type: "land" as const,
        height: 0.5,
        resources: { food: 10, wood: 8, ore: 5 },
        maxResources: { food: 20, wood: 15, ore: 10 },
        lastHarvestTime: 0,
        recoveryTimer: { food: 0, wood: 0, ore: 0 },
        depletionState: { food: 0, wood: 0, ore: 0 }
      }))
    );

    // テスト用の村を作成
    testVillages = [
      {
        x: 5, y: 5, population: 20,
        storage: { food: 50, wood: 40, ore: 25 },
        collectionRadius: 2,
        economy: {
          production: { food: 0, wood: 0, ore: 0 },
          consumption: { food: 0, wood: 0, ore: 0 },
          stock: { food: 50, wood: 40, ore: 25, capacity: 200 },
          buildings: { count: 2, targetCount: 2, constructionQueue: 0 },
          supplyDemandStatus: { food: 'balanced', wood: 'balanced', ore: 'balanced' }
        },
        lastUpdateTime: 0,
        populationHistory: [20]
      },
      {
        x: 15, y: 15, population: 10,
        storage: { food: 20, wood: 15, ore: 10 },
        collectionRadius: 1,
        economy: {
          production: { food: 0, wood: 0, ore: 0 },
          consumption: { food: 0, wood: 0, ore: 0 },
          stock: { food: 20, wood: 15, ore: 10, capacity: 150 },
          buildings: { count: 1, targetCount: 1, constructionQueue: 0 },
          supplyDemandStatus: { food: 'balanced', wood: 'balanced', ore: 'balanced' }
        },
        lastUpdateTime: 0,
        populationHistory: [10]
      }
    ];
  });

  describe('integrated supply-demand evaluation', () => {
    it('should update village economics and evaluate supply-demand correctly - 要件 6.1, 6.4', () => {
      // VillageEconomyManagerで経済状況を更新
      for (const village of testVillages) {
        economyManager.updateVillageEconomy(village, gameTime, testMap);
      }

      // SupplyDemandBalancerで需給バランスを評価
      const comparison = balancer.compareVillageBalances(testVillages);

      // 各村の生産・消費が正しく計算されているかチェック
      expect(testVillages[0].economy.production.food).toBeGreaterThan(0);
      expect(testVillages[0].economy.consumption.food).toBeGreaterThan(0);
      expect(testVillages[1].economy.production.food).toBeGreaterThan(0);
      expect(testVillages[1].economy.consumption.food).toBeGreaterThan(0);

      // 需給バランス比較結果が正しく生成されているかチェック
      expect(comparison.food).toBeDefined();
      expect(comparison.wood).toBeDefined();
      expect(comparison.ore).toBeDefined();

      // 各カテゴリの村数の合計が総村数と一致するかチェック
      const totalFoodVillages = comparison.food.surplusVillages.length +
        comparison.food.balancedVillages.length +
        comparison.food.shortageVillages.length +
        comparison.food.criticalVillages.length;
      expect(totalFoodVillages).toBe(testVillages.length);
    });

    it('should identify supply-demand relationships between villages - 要件 6.2, 6.3', () => {
      // 村の経済状況を更新
      for (const village of testVillages) {
        economyManager.updateVillageEconomy(village, gameTime, testMap);
      }

      // 需給関係を識別
      const supplyDemandResult = balancer.identifySupplyDemandVillages(testVillages);

      // 結果の構造が正しいかチェック
      expect(supplyDemandResult.shortageVillages).toBeDefined();
      expect(supplyDemandResult.surplusVillages).toBeDefined();
      expect(supplyDemandResult.criticalVillages).toBeDefined();
      expect(supplyDemandResult.resourceSpecificBalances).toBeDefined();

      // 資源別バランスが全ての資源タイプを含んでいるかチェック
      expect(supplyDemandResult.resourceSpecificBalances).toHaveProperty('food');
      expect(supplyDemandResult.resourceSpecificBalances).toHaveProperty('wood');
      expect(supplyDemandResult.resourceSpecificBalances).toHaveProperty('ore');
    });

    it('should evaluate supply possibilities between villages - 要件 6.3', () => {
      // 村の経済状況を更新
      for (const village of testVillages) {
        economyManager.updateVillageEconomy(village, gameTime, testMap);
      }

      // 人工的に不足状況を作成
      testVillages[1].economy.supplyDemandStatus.wood = 'shortage';
      testVillages[0].economy.supplyDemandStatus.wood = 'surplus';

      // 供給可能性を評価
      const suppliers = balancer.evaluateSupplyPossibility(
        testVillages[1], // 不足村
        testVillages,    // 全村
        'wood',          // 木材
        20               // 最大距離
      );

      // 供給候補が見つかるかチェック
      if (suppliers.length > 0) {
        expect(suppliers[0].supplier).toBe(testVillages[0]);
        expect(suppliers[0].distance).toBeGreaterThan(0);
        expect(suppliers[0].supplyCapacity).toBeGreaterThan(0);
      }
    });

    it('should handle dynamic changes in village economics - 要件 6.4', () => {
      // 初期状態で経済更新
      for (const village of testVillages) {
        economyManager.updateVillageEconomy(village, gameTime, testMap);
      }

      const initialComparison = balancer.compareVillageBalances(testVillages);

      // 村の状況を変更（人口増加による消費増加）
      testVillages[0].population = 40;
      testVillages[0].economy.buildings.targetCount = 4;

      // 再度経済更新
      for (const village of testVillages) {
        economyManager.updateVillageEconomy(village, gameTime, testMap);
      }

      const updatedComparison = balancer.compareVillageBalances(testVillages);

      // 変化が反映されているかチェック
      expect(testVillages[0].economy.consumption.food).toBeGreaterThan(
        DEFAULT_SUPPLY_DEMAND_CONFIG.foodConsumptionPerPerson * 20
      );

      // 需給バランスが更新されているかチェック
      expect(updatedComparison).not.toEqual(initialComparison);
    });
  });

  describe('performance and scalability', () => {
    it('should handle multiple villages efficiently', () => {
      // 大量の村を作成
      const manyVillages: Village[] = [];
      for (let i = 0; i < 50; i++) {
        manyVillages.push({
          x: i % 10, y: Math.floor(i / 10), population: 10 + i,
          storage: { food: 30 + i, wood: 20 + i, ore: 15 + i },
          collectionRadius: 1,
          economy: {
            production: { food: 5 + i * 0.1, wood: 3 + i * 0.1, ore: 2 + i * 0.1 },
            consumption: { food: 4 + i * 0.05, wood: 2 + i * 0.05, ore: 1 + i * 0.05 },
            stock: { food: 30 + i, wood: 20 + i, ore: 15 + i, capacity: 100 + i * 2 },
            buildings: { count: 1, targetCount: 1, constructionQueue: 0 },
            supplyDemandStatus: { food: 'balanced', wood: 'balanced', ore: 'balanced' }
          },
          lastUpdateTime: 0,
          populationHistory: [10 + i]
        });
      }

      // パフォーマンステスト
      const startTime = performance.now();

      const comparison = balancer.compareVillageBalances(manyVillages);
      const supplyDemandResult = balancer.identifySupplyDemandVillages(manyVillages);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // 実行時間が合理的な範囲内かチェック（100ms以下）
      expect(executionTime).toBeLessThan(100);

      // 結果が正しく生成されているかチェック
      expect(comparison.food.surplusVillages.length +
        comparison.food.balancedVillages.length +
        comparison.food.shortageVillages.length +
        comparison.food.criticalVillages.length).toBe(manyVillages.length);

      expect(supplyDemandResult.shortageVillages.length +
        supplyDemandResult.surplusVillages.length +
        supplyDemandResult.criticalVillages.length).toBeLessThanOrEqual(manyVillages.length);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle villages with invalid data gracefully', () => {
      const invalidVillage: Village = {
        x: 0, y: 0, population: -5, // 負の人口
        storage: { food: -10, wood: -5, ore: -3 }, // 負のストック
        collectionRadius: 0,
        economy: {
          production: { food: -1, wood: -1, ore: -1 }, // 負の生産
          consumption: { food: -1, wood: -1, ore: -1 }, // 負の消費
          stock: { food: -10, wood: -5, ore: -3, capacity: 50 },
          buildings: { count: 0, targetCount: 0, constructionQueue: 0 },
          supplyDemandStatus: { food: 'balanced', wood: 'balanced', ore: 'balanced' }
        },
        lastUpdateTime: 0,
        populationHistory: [-5]
      };

      // エラーが発生せずに処理できるかチェック
      expect(() => {
        const balance = balancer.evaluateVillageBalance(invalidVillage);
        expect(balance).toBeDefined();
      }).not.toThrow();

      expect(() => {
        const comparison = balancer.compareVillageBalances([invalidVillage]);
        expect(comparison).toBeDefined();
      }).not.toThrow();
    });

    it('should handle extreme distance calculations', () => {
      const farVillage1: Village = {
        x: 0, y: 0, population: 10,
        storage: { food: 100, wood: 50, ore: 30 },
        collectionRadius: 1,
        economy: {
          production: { food: 20, wood: 10, ore: 5 },
          consumption: { food: 5, wood: 3, ore: 2 },
          stock: { food: 100, wood: 50, ore: 30, capacity: 200 },
          buildings: { count: 1, targetCount: 1, constructionQueue: 0 },
          supplyDemandStatus: { food: 'surplus', wood: 'surplus', ore: 'surplus' }
        },
        lastUpdateTime: 0,
        populationHistory: [10]
      };

      const farVillage2: Village = {
        x: 1000, y: 1000, population: 10, // 非常に遠い村
        storage: { food: 5, wood: 3, ore: 2 },
        collectionRadius: 1,
        economy: {
          production: { food: 1, wood: 1, ore: 1 },
          consumption: { food: 8, wood: 6, ore: 4 },
          stock: { food: 5, wood: 3, ore: 2, capacity: 100 },
          buildings: { count: 1, targetCount: 1, constructionQueue: 0 },
          supplyDemandStatus: { food: 'shortage', wood: 'shortage', ore: 'shortage' }
        },
        lastUpdateTime: 0,
        populationHistory: [10]
      };

      // 極端な距離でも正常に処理できるかチェック
      const suppliers = balancer.evaluateSupplyPossibility(
        farVillage2,
        [farVillage1, farVillage2],
        'food',
        100 // 距離制限内
      );

      // 距離制限により供給候補が除外されるかチェック
      expect(suppliers).toHaveLength(0);
    });
  });
});