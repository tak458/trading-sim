/**
 * 包括的なユニットテストスイート
 * タスク10: VillageEconomyManager、PopulationManager、BuildingManagerの包括的テスト
 * 要件: 全要件の検証
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VillageEconomyManager } from '../game-systems/integration/village-economy-manager';
import { BuildingManager } from '../game-systems/population/building-manager';
import { Village } from '../game-systems/world/village';
import { Tile } from '../game-systems/world/map';
import { SupplyDemandConfig, DEFAULT_SUPPLY_DEMAND_CONFIG } from '../settings';
import { PopulationManager } from '../game-systems/population/population-manager';
import { GameTime, ResourceInfo } from '../game-systems/shared-types';

describe('Comprehensive Unit Tests', () => {
  let economyManager: VillageEconomyManager;
  let populationManager: PopulationManager;
  let buildingManager: BuildingManager;
  let testVillage: Village;
  let testMap: Tile[][];
  let gameTime: GameTime;

  beforeEach(() => {
    economyManager = new VillageEconomyManager();
    populationManager = new PopulationManager();
    buildingManager = new BuildingManager();
    gameTime = {
      currentTime: 1000, deltaTime: 1.0, totalTicks: 0,
      totalSeconds: 0,
      totalMinutes: 0,
      currentTick: 0
    };

    // 標準的なテスト村を作成
    testVillage = {
      x: 5, y: 5, population: 20,
      storage: { food: 50, wood: 30, ore: 20 },
      collectionRadius: 2,
      economy: {
        production: { food: 0, wood: 0, ore: 0 },
        consumption: { food: 0, wood: 0, ore: 0 },
        stock: { food: 50, wood: 30, ore: 20, capacity: 100 },
        buildings: { count: 2, targetCount: 2, constructionQueue: 0 },
        supplyDemandStatus: { food: 'balanced', wood: 'balanced', ore: 'balanced' }
      },
      lastUpdateTime: 0,
      populationHistory: [18, 19, 20]
    };

    // テスト用マップを作成
    testMap = Array(10).fill(null).map(() =>
      Array(10).fill(null).map(() => ({
        type: 'land' as const,
        height: 0.5,
        resources: { food: 10, wood: 8, ore: 5 },
        maxResources: { food: 20, wood: 15, ore: 10 },
        depletionState: { food: 0, wood: 0, ore: 0 },
        lastHarvestTime: 0,
        recoveryTimer: { food: 0, wood: 0, ore: 0 }
      }))
    );
  });

  describe('VillageEconomyManager - 包括的テスト', () => {
    describe('生産能力計算の詳細テスト', () => {
      it('人口ボーナスが正しく適用される', () => {
        const resources: ResourceInfo = { food: 100, wood: 80, ore: 50 };

        // 小さな村（人口10）
        const smallVillage = { ...testVillage, population: 10 };
        const smallProduction = economyManager.calculateProduction(smallVillage, resources);

        // 大きな村（人口50）
        const largeVillage = { ...testVillage, population: 50 };
        const largeProduction = economyManager.calculateProduction(largeVillage, resources);

        // 人口が多い村の方が効率的な生産を行う
        expect(largeProduction.food).toBeGreaterThan(smallProduction.food);
        expect(largeProduction.wood).toBeGreaterThan(smallProduction.wood);
        expect(largeProduction.ore).toBeGreaterThan(smallProduction.ore);
      });

      it('建物ボーナスが正しく適用される', () => {
        const resources: ResourceInfo = { food: 100, wood: 80, ore: 50 };

        // 建物が少ない村
        const fewBuildings = { ...testVillage };
        fewBuildings.economy.buildings.count = 1;
        const lowProduction = economyManager.calculateProduction(fewBuildings, resources);

        // 建物が多い村
        const manyBuildings = { ...testVillage };
        manyBuildings.economy.buildings.count = 5;
        const highProduction = economyManager.calculateProduction(manyBuildings, resources);

        // 建物が多い村の方が生産効率が高い
        expect(highProduction.food).toBeGreaterThan(lowProduction.food);
        expect(highProduction.wood).toBeGreaterThan(lowProduction.wood);
        expect(highProduction.ore).toBeGreaterThan(lowProduction.ore);
      });

      it('収集範囲が生産量に影響する', () => {
        const resources: ResourceInfo = { food: 100, wood: 80, ore: 50 };

        // 狭い収集範囲
        const narrowRange = { ...testVillage, collectionRadius: 1 };
        const narrowProduction = economyManager.calculateProduction(narrowRange, resources);

        // 広い収集範囲
        const wideRange = { ...testVillage, collectionRadius: 3 };
        const wideProduction = economyManager.calculateProduction(wideRange, resources);

        // 収集範囲が広い方が生産量が多い
        expect(wideProduction.food).toBeGreaterThan(narrowProduction.food);
        expect(wideProduction.wood).toBeGreaterThan(narrowProduction.wood);
        expect(wideProduction.ore).toBeGreaterThan(narrowProduction.ore);
      });

      it('利用可能資源がゼロの場合は生産量もゼロ', () => {
        const noResources: ResourceInfo = { food: 0, wood: 0, ore: 0 };
        const production = economyManager.calculateProduction(testVillage, noResources);

        expect(production.food).toBe(0);
        expect(production.wood).toBe(0);
        expect(production.ore).toBe(0);
      });
    });

    describe('需給バランス評価の詳細テスト', () => {
      it('余剰状態を正しく判定する', () => {
        testVillage.economy.production = { food: 50, wood: 40, ore: 30 };
        testVillage.economy.consumption = { food: 10, wood: 8, ore: 6 };
        testVillage.economy.stock = { food: 300, wood: 250, ore: 200, capacity: 500 };

        const status = economyManager.evaluateSupplyDemand(testVillage);

        expect(status.food).toBe('surplus');
        expect(status.wood).toBe('surplus');
        expect(status.ore).toBe('surplus');
      });

      it('不足状態を正しく判定する', () => {
        testVillage.economy.production = { food: 6, wood: 5, ore: 4 };
        testVillage.economy.consumption = { food: 10, wood: 8, ore: 6 };
        testVillage.economy.stock = { food: 20, wood: 15, ore: 10, capacity: 100 };

        const status = economyManager.evaluateSupplyDemand(testVillage);

        expect(status.food).toBe('shortage');
        expect(status.wood).toBe('shortage');
        expect(status.ore).toBe('shortage');
      });

      it('危機状態を正しく判定する', () => {
        testVillage.economy.production = { food: 1, wood: 0.5, ore: 0.3 };
        testVillage.economy.consumption = { food: 10, wood: 8, ore: 6 };
        testVillage.economy.stock = { food: 3, wood: 2, ore: 1, capacity: 100 };

        const status = economyManager.evaluateSupplyDemand(testVillage);

        expect(status.food).toBe('critical');
        expect(status.wood).toBe('critical');
        expect(status.ore).toBe('critical');
      });

      it('消費量がゼロの場合はストック量で判定する', () => {
        testVillage.economy.production = { food: 5, wood: 3, ore: 2 };
        testVillage.economy.consumption = { food: 0, wood: 0, ore: 0 };

        // 十分なストック
        testVillage.economy.stock = { food: 100, wood: 80, ore: 60, capacity: 200 };
        let status = economyManager.evaluateSupplyDemand(testVillage);
        expect(status.food).toBe('surplus');

        // 少ないストック
        testVillage.economy.stock = { food: 3, wood: 2, ore: 1, capacity: 100 };
        status = economyManager.evaluateSupplyDemand(testVillage);
        expect(status.food).toBe('critical');
      });
    });

    describe('エラーハンドリングテスト', () => {
      it('不正なマップデータでもエラーを起こさない', () => {
        expect(() => {
          economyManager.updateVillageEconomy(testVillage, gameTime, null as any);
        }).not.toThrow();
      });

      it('負の値が含まれる村データを修正する', () => {
        testVillage.population = -5;
        testVillage.storage = { food: -10, wood: -5, ore: -3 };

        economyManager.updateVillageEconomy(testVillage, gameTime, testMap);

        expect(testVillage.population).toBeGreaterThanOrEqual(0);
        expect(testVillage.storage.food).toBeGreaterThanOrEqual(0);
        expect(testVillage.storage.wood).toBeGreaterThanOrEqual(0);
        expect(testVillage.storage.ore).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('PopulationManager - 包括的テスト', () => {
    describe('食料消費計算の詳細テスト', () => {
      it('人口規模による効率性ボーナスが適用される', () => {
        const smallConsumption = populationManager.calculateFoodConsumption(10);
        const largeConsumption = populationManager.calculateFoodConsumption(50);

        // 1人当たりの消費量は大きな村の方が効率的（少ない）
        const smallPerCapita = smallConsumption / 10;
        const largePerCapita = largeConsumption / 50;

        expect(largePerCapita).toBeLessThan(smallPerCapita);
      });

      it('極端な人口値でも安全に処理する', () => {
        expect(populationManager.calculateFoodConsumption(0)).toBe(0);
        expect(populationManager.calculateFoodConsumption(-10)).toBe(0);
        expect(populationManager.calculateFoodConsumption(1000)).toBeGreaterThan(0);
      });
    });

    describe('人口増加条件の詳細テスト', () => {
      it('全ての増加条件を満たす場合は増加可能', () => {
        testVillage.population = 50; // 上限未満
        testVillage.storage.food = 200; // 十分な食料
        testVillage.economy.production.food = 30; // 十分な生産
        testVillage.economy.supplyDemandStatus.food = 'surplus';

        expect(populationManager.canPopulationGrow(testVillage)).toBe(true);
      });

      it('人口上限に達している場合は増加不可', () => {
        testVillage.population = 100; // 上限
        testVillage.storage.food = 1000;
        testVillage.economy.production.food = 100;
        testVillage.economy.supplyDemandStatus.food = 'surplus';

        expect(populationManager.canPopulationGrow(testVillage)).toBe(false);
      });

      it('食料バッファが不足している場合は増加不可', () => {
        testVillage.population = 50;
        testVillage.storage.food = 10; // 不十分なバッファ
        testVillage.economy.production.food = 30;
        testVillage.economy.supplyDemandStatus.food = 'balanced';

        expect(populationManager.canPopulationGrow(testVillage)).toBe(false);
      });

      it('生産が将来の消費を下回る場合は増加不可', () => {
        testVillage.population = 50;
        testVillage.storage.food = 200;
        testVillage.economy.production.food = 5; // 不十分な生産
        testVillage.economy.supplyDemandStatus.food = 'balanced';

        expect(populationManager.canPopulationGrow(testVillage)).toBe(false);
      });
    });

    describe('人口減少条件の詳細テスト', () => {
      it('食料完全枯渇時は減少する', () => {
        testVillage.storage.food = 0;
        testVillage.economy.production.food = 0;
        testVillage.economy.supplyDemandStatus.food = 'critical';
        testVillage.population = 10;

        expect(populationManager.shouldPopulationDecrease(testVillage)).toBe(true);
      });

      it('生産が極端に不足し危機的状況では減少する', () => {
        const consumption = populationManager.calculateFoodConsumption(testVillage.population);
        testVillage.storage.food = 5;
        testVillage.economy.production.food = consumption * 0.2; // 30%未満
        testVillage.economy.supplyDemandStatus.food = 'critical';

        expect(populationManager.shouldPopulationDecrease(testVillage)).toBe(true);
      });

      it('最低人口（1人）では減少しない', () => {
        testVillage.population = 1;
        testVillage.storage.food = 0;
        testVillage.economy.production.food = 0;
        testVillage.economy.supplyDemandStatus.food = 'critical';

        expect(populationManager.shouldPopulationDecrease(testVillage)).toBe(false);
      });
    });

    describe('人口更新の詳細テスト', () => {
      it('食料消費が正確に実行される', () => {
        const initialFood = testVillage.storage.food;
        const expectedConsumption = populationManager.calculateFoodConsumption(testVillage.population);

        populationManager.updatePopulation(testVillage, gameTime);

        const actualConsumption = initialFood - testVillage.storage.food;
        expect(actualConsumption).toBeCloseTo(expectedConsumption * gameTime.deltaTime, 1);
      });

      it('食料不足時は利用可能分のみ消費する', () => {
        const initialFood = 5; // 消費量より少ない
        testVillage.storage.food = initialFood;

        populationManager.updatePopulation(testVillage, gameTime);

        // 利用可能分が消費されて、残りは少なくなる
        expect(testVillage.storage.food).toBeLessThan(initialFood);
        expect(testVillage.storage.food).toBeGreaterThanOrEqual(0);
      });

      it('人口履歴が正しく更新される', () => {
        const initialHistoryLength = testVillage.populationHistory.length;

        populationManager.updatePopulation(testVillage, gameTime);

        expect(testVillage.populationHistory.length).toBe(initialHistoryLength + 1);
        expect(testVillage.populationHistory[testVillage.populationHistory.length - 1]).toBe(testVillage.population);
      });

      it('人口履歴は最大10件まで保持される', () => {
        testVillage.populationHistory = Array(12).fill(0).map((_, i) => i + 1);

        populationManager.updatePopulation(testVillage, gameTime);

        expect(testVillage.populationHistory.length).toBe(10);
      });
    });
  });

  describe('BuildingManager - 包括的テスト', () => {
    describe('目標建物数計算の詳細テスト', () => {
      it('人口に比例した建物数を計算する', () => {
        expect(buildingManager.calculateTargetBuildingCount(10)).toBe(1);
        expect(buildingManager.calculateTargetBuildingCount(20)).toBe(2);
        expect(buildingManager.calculateTargetBuildingCount(50)).toBe(5);
      });

      it('最低建物数制限が適用される', () => {
        expect(buildingManager.calculateTargetBuildingCount(1)).toBe(1);
        expect(buildingManager.calculateTargetBuildingCount(5)).toBe(1);
      });

      it('最大建物数制限が適用される', () => {
        const result = buildingManager.calculateTargetBuildingCount(100);
        expect(result).toBeLessThanOrEqual(50); // 人口の半分まで
      });

      it('人口ゼロの場合は建物数ゼロ', () => {
        expect(buildingManager.calculateTargetBuildingCount(0)).toBe(0);
      });
    });

    describe('建設可能性判定の詳細テスト', () => {
      it('十分な資源がある場合は建設可能', () => {
        testVillage.storage.wood = 100;
        testVillage.storage.ore = 50;
        testVillage.economy.supplyDemandStatus.wood = 'balanced';
        testVillage.economy.supplyDemandStatus.ore = 'balanced';
        testVillage.economy.buildings.constructionQueue = 0;

        expect(buildingManager.canBuildBuilding(testVillage)).toBe(true);
      });

      it('木材不足時は建設不可', () => {
        testVillage.storage.wood = 5; // 不足
        testVillage.storage.ore = 50;

        expect(buildingManager.canBuildBuilding(testVillage)).toBe(false);
      });

      it('鉱石不足時は建設不可', () => {
        testVillage.storage.wood = 100;
        testVillage.storage.ore = 2; // 不足

        expect(buildingManager.canBuildBuilding(testVillage)).toBe(false);
      });

      it('建設後バッファ不足時は建設不可', () => {
        const cost = buildingManager.calculateBuildingCost();
        testVillage.storage.wood = cost.wood + 5; // バッファ不足
        testVillage.storage.ore = cost.ore + 3; // バッファ不足

        expect(buildingManager.canBuildBuilding(testVillage)).toBe(false);
      });

      it('需給状況が危機的な場合は建設不可', () => {
        testVillage.storage.wood = 100;
        testVillage.storage.ore = 50;
        testVillage.economy.supplyDemandStatus.wood = 'critical';

        expect(buildingManager.canBuildBuilding(testVillage)).toBe(false);
      });

      it('建設キューが満杯の場合は建設不可', () => {
        testVillage.storage.wood = 100;
        testVillage.storage.ore = 50;
        testVillage.economy.buildings.constructionQueue = 3; // 最大値

        expect(buildingManager.canBuildBuilding(testVillage)).toBe(false);
      });
    });

    describe('建物更新の詳細テスト', () => {
      it('目標建物数が正しく更新される', () => {
        testVillage.population = 30;

        buildingManager.updateBuildings(testVillage, gameTime);

        expect(testVillage.economy.buildings.targetCount).toBe(3);
      });

      it('建設可能時は資源を消費して建設キューに追加', () => {
        testVillage.economy.buildings.count = 1;
        testVillage.economy.buildings.targetCount = 3;
        testVillage.storage.wood = 100;
        testVillage.storage.ore = 50;

        const initialWood = testVillage.storage.wood;
        const initialOre = testVillage.storage.ore;

        buildingManager.updateBuildings(testVillage, gameTime);

        expect(testVillage.economy.buildings.constructionQueue).toBeGreaterThan(0);
        expect(testVillage.storage.wood).toBeLessThan(initialWood);
        expect(testVillage.storage.ore).toBeLessThan(initialOre);
      });

      it('資源不足時は建設しない', () => {
        testVillage.economy.buildings.count = 1;
        testVillage.economy.buildings.targetCount = 3;
        testVillage.storage.wood = 5; // 不足
        testVillage.storage.ore = 2; // 不足

        const initialWood = testVillage.storage.wood;
        const initialOre = testVillage.storage.ore;

        buildingManager.updateBuildings(testVillage, gameTime);

        expect(testVillage.economy.buildings.constructionQueue).toBe(0);
        expect(testVillage.storage.wood).toBe(initialWood);
        expect(testVillage.storage.ore).toBe(initialOre);
      });

      it('建設キューが時間経過で処理される', () => {
        testVillage.economy.buildings.constructionQueue = 2;
        testVillage.economy.buildings.count = 1;
        testVillage.economy.buildings.targetCount = 1; // 追加建設を防ぐ

        const longGameTime: GameTime = {
          currentTime: 100, deltaTime: 10.0, totalTicks: 0,
          totalSeconds: 0,
          totalMinutes: 0,
          currentTick: 0
        };

        buildingManager.updateBuildings(testVillage, longGameTime);

        expect(testVillage.economy.buildings.count).toBe(3);
        expect(testVillage.economy.buildings.constructionQueue).toBe(0);
      });
    });

    describe('建物統計情報テスト', () => {
      it('正確な統計情報を返す', () => {
        testVillage.storage.wood = 100;
        testVillage.storage.ore = 50;

        const stats = buildingManager.getBuildingStats(testVillage);

        expect(stats.currentCount).toBe(testVillage.economy.buildings.count);
        expect(stats.targetCount).toBe(testVillage.economy.buildings.targetCount);
        expect(stats.constructionQueue).toBe(testVillage.economy.buildings.constructionQueue);
        expect(stats.canBuild).toBe(true);
        expect(stats.buildingCost).toEqual(buildingManager.calculateBuildingCost());
        expect(stats.maxBuildable).toBeGreaterThan(0);
      });
    });
  });

  describe('カスタム設定での動作テスト', () => {
    it('カスタム設定が全マネージャーで正しく適用される', () => {
      const customConfig: SupplyDemandConfig = {
        ...DEFAULT_SUPPLY_DEMAND_CONFIG,
        foodConsumptionPerPerson: 1.0,
        buildingWoodCost: 20,
        buildingOreCost: 15,
        populationGrowthRate: 0.1,
        surplusThreshold: 2.0,
        shortageThreshold: 0.8,
        criticalThreshold: 0.3
      };

      const customEconomyManager = new VillageEconomyManager(customConfig);
      const customPopulationManager = new PopulationManager(customConfig);
      const customBuildingManager = new BuildingManager(customConfig);

      // 食料消費がカスタム設定に基づく
      const consumption = customPopulationManager.calculateFoodConsumption(10);
      expect(consumption).toBeCloseTo(10.0, 1); // 効率性ファクター込み

      // 建設コストがカスタム設定に基づく
      const cost = customBuildingManager.calculateBuildingCost();
      expect(cost.wood).toBe(20);
      expect(cost.ore).toBe(15);

      // 需給バランス判定がカスタム閾値に基づく
      testVillage.economy.production = { food: 15, wood: 10, ore: 8 };
      testVillage.economy.consumption = { food: 10, wood: 8, ore: 6 };
      testVillage.economy.stock = { food: 200, wood: 150, ore: 100, capacity: 500 };

      const status = customEconomyManager.evaluateSupplyDemand(testVillage);
      // 生産/消費比率が1.5で、カスタム余剰閾値2.0未満なのでbalanced
      expect(status.food).toBe('balanced');
    });
  });
});