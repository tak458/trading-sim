/**
 * エラーハンドリング統合テスト
 * 各マネージャークラスでのエラーハンドリング機能の統合検証
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VillageEconomyManager } from '../village-economy-manager';
import { PopulationManager } from '../population-manager';
import { BuildingManager } from '../building-manager';
import { Village } from '../village';
import { Tile } from '../map';
import { DEFAULT_SUPPLY_DEMAND_CONFIG } from '../village-economy';

describe('エラーハンドリング統合テスト', () => {
  let economyManager: VillageEconomyManager;
  let populationManager: PopulationManager;
  let buildingManager: BuildingManager;
  let testVillage: Village;
  let testMap: Tile[][];

  beforeEach(() => {
    economyManager = new VillageEconomyManager(DEFAULT_SUPPLY_DEMAND_CONFIG);
    populationManager = new PopulationManager(DEFAULT_SUPPLY_DEMAND_CONFIG);
    buildingManager = new BuildingManager(DEFAULT_SUPPLY_DEMAND_CONFIG);
    
    // テスト用の村を作成
    testVillage = {
      x: 5,
      y: 5,
      population: 10,
      storage: { food: 100, wood: 50, ore: 30 },
      collectionRadius: 2,
      lastUpdateTime: 0,
      populationHistory: [8, 9, 10],
      economy: {
        production: { food: 5, wood: 3, ore: 2 },
        consumption: { food: 2, wood: 1, ore: 1 },
        stock: { food: 100, wood: 50, ore: 30, capacity: 200 },
        buildings: { count: 2, targetCount: 3, constructionQueue: 1 },
        supplyDemandStatus: { food: 'balanced', wood: 'balanced', ore: 'balanced' }
      }
    };

    // テスト用のマップを作成
    testMap = Array(20).fill(null).map(() => 
      Array(20).fill(null).map(() => ({
        resources: { food: 10, wood: 5, ore: 3 },
        type: 'grass' as const
      }))
    );
  });

  describe('VillageEconomyManager エラーハンドリング', () => {
    it('破損した村データでも安全に処理する', () => {
      // 村データを意図的に破損させる
      testVillage.population = -10;
      testVillage.collectionRadius = NaN;
      // @ts-ignore - テスト用に意図的にundefinedを設定
      testVillage.economy = undefined;

      // エラーが発生しないことを確認
      expect(() => {
        economyManager.updateVillageEconomy(testVillage, { currentTime: 100, deltaTime: 1 }, testMap);
      }).not.toThrow();

      // データが修正されていることを確認
      expect(testVillage.population).toBeGreaterThanOrEqual(0);
      expect(isFinite(testVillage.collectionRadius)).toBe(true);
      expect(testVillage.economy).toBeDefined();
    });

    it('マップデータが不正でも安全に処理する', () => {
      // マップデータを破損させる
      const brokenMap: any = null;

      expect(() => {
        economyManager.updateVillageEconomy(testVillage, { currentTime: 100, deltaTime: 1 }, brokenMap);
      }).not.toThrow();

      // 経済データが初期化されていることを確認
      expect(testVillage.economy.production).toBeDefined();
      expect(testVillage.economy.consumption).toBeDefined();
    });

    it('計算エラーが発生してもフォールバック値を使用する', () => {
      // 極端な値を設定して計算エラーを誘発
      testVillage.population = Number.MAX_SAFE_INTEGER;
      testVillage.economy.buildings.count = Number.MAX_SAFE_INTEGER;

      economyManager.updateVillageEconomy(testVillage, { currentTime: 100, deltaTime: 1 }, testMap);

      // 結果が有限値であることを確認
      expect(isFinite(testVillage.economy.production.food)).toBe(true);
      expect(isFinite(testVillage.economy.production.wood)).toBe(true);
      expect(isFinite(testVillage.economy.production.ore)).toBe(true);
    });

    it('エラーログが適切に記録される', () => {
      testVillage.population = -5;
      
      economyManager.updateVillageEconomy(testVillage, { currentTime: 100, deltaTime: 1 }, testMap);
      
      const errorHandler = economyManager.getErrorHandler();
      const errors = errorHandler.getErrorLog();
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.villageId === '5,5')).toBe(true);
    });
  });

  describe('PopulationManager エラーハンドリング', () => {
    it('負の人口でも安全に処理する', () => {
      testVillage.population = -5;

      expect(() => {
        populationManager.updatePopulation(testVillage, { currentTime: 100, deltaTime: 1 });
      }).not.toThrow();

      expect(testVillage.population).toBeGreaterThanOrEqual(0);
    });

    it('ストレージデータが存在しなくても処理する', () => {
      // @ts-ignore - テスト用に意図的にundefinedを設定
      testVillage.storage = undefined;

      expect(() => {
        populationManager.updatePopulation(testVillage, { currentTime: 100, deltaTime: 1 });
      }).not.toThrow();

      expect(testVillage.storage).toBeDefined();
    });

    it('経済データが存在しなくても処理する', () => {
      // @ts-ignore - テスト用に意図的にundefinedを設定
      testVillage.economy = undefined;

      expect(() => {
        populationManager.updatePopulation(testVillage, { currentTime: 100, deltaTime: 1 });
      }).not.toThrow();

      expect(testVillage.economy).toBeDefined();
    });

    it('人口履歴が存在しなくても処理する', () => {
      // @ts-ignore - テスト用に意図的にundefinedを設定
      testVillage.populationHistory = undefined;

      populationManager.updatePopulation(testVillage, { currentTime: 100, deltaTime: 1 });

      expect(testVillage.populationHistory).toBeDefined();
      expect(Array.isArray(testVillage.populationHistory)).toBe(true);
    });

    it('食料消費計算でゼロ除算が発生しても安全', () => {
      // 極端な設定値でゼロ除算を誘発
      const brokenConfig = { ...DEFAULT_SUPPLY_DEMAND_CONFIG, foodConsumptionPerPerson: NaN };
      const brokenManager = new PopulationManager(brokenConfig);

      expect(() => {
        brokenManager.updatePopulation(testVillage, { currentTime: 100, deltaTime: 1 });
      }).not.toThrow();
    });
  });

  describe('BuildingManager エラーハンドリング', () => {
    it('建物データが存在しなくても処理する', () => {
      // @ts-ignore - テスト用に意図的にundefinedを設定
      testVillage.economy.buildings = undefined;

      expect(() => {
        buildingManager.updateBuildings(testVillage, { currentTime: 100, deltaTime: 1 });
      }).not.toThrow();

      expect(testVillage.economy.buildings).toBeDefined();
    });

    it('負の建物数でも安全に処理する', () => {
      testVillage.economy.buildings.count = -5;
      testVillage.economy.buildings.constructionQueue = -3;

      buildingManager.updateBuildings(testVillage, { currentTime: 100, deltaTime: 1 });

      expect(testVillage.economy.buildings.count).toBeGreaterThanOrEqual(0);
      expect(testVillage.economy.buildings.constructionQueue).toBeGreaterThanOrEqual(0);
    });

    it('資源データが破損していても処理する', () => {
      testVillage.storage.wood = NaN;
      testVillage.storage.ore = -100;

      expect(() => {
        buildingManager.updateBuildings(testVillage, { currentTime: 100, deltaTime: 1 });
      }).not.toThrow();

      expect(isFinite(testVillage.storage.wood)).toBe(true);
      expect(testVillage.storage.ore).toBeGreaterThanOrEqual(0);
    });

    it('建設コスト計算でエラーが発生しても安全', () => {
      // 設定値を破損させる
      const brokenConfig = { 
        ...DEFAULT_SUPPLY_DEMAND_CONFIG, 
        buildingWoodCost: NaN,
        buildingOreCost: Infinity
      };
      const brokenManager = new BuildingManager(brokenConfig);

      expect(() => {
        brokenManager.updateBuildings(testVillage, { currentTime: 100, deltaTime: 1 });
      }).not.toThrow();
    });
  });

  describe('統合エラーシナリオ', () => {
    it('全てのマネージャーで連続してエラーが発生しても安定', () => {
      // 村データを完全に破損させる
      testVillage.population = NaN;
      testVillage.collectionRadius = -5;
      testVillage.storage.food = Infinity;
      testVillage.storage.wood = -1000;
      testVillage.storage.ore = NaN;
      // @ts-ignore
      testVillage.economy = null;

      // 全てのマネージャーを順次実行
      expect(() => {
        economyManager.updateVillageEconomy(testVillage, { currentTime: 100, deltaTime: 1 }, testMap);
        populationManager.updatePopulation(testVillage, { currentTime: 100, deltaTime: 1 });
        buildingManager.updateBuildings(testVillage, { currentTime: 100, deltaTime: 1 });
      }).not.toThrow();

      // 最終的にデータが正常化されていることを確認
      expect(isFinite(testVillage.population)).toBe(true);
      expect(testVillage.population).toBeGreaterThanOrEqual(0);
      expect(isFinite(testVillage.collectionRadius)).toBe(true);
      expect(testVillage.collectionRadius).toBeGreaterThan(0);
      expect(testVillage.economy).toBeDefined();
      expect(isFinite(testVillage.storage.food)).toBe(true);
      expect(testVillage.storage.food).toBeGreaterThanOrEqual(0);
    });

    it('メモリ不足シミュレーション', () => {
      // 大量のエラーを発生させてメモリ使用量をテスト
      for (let i = 0; i < 100; i++) {
        const corruptedVillage = {
          ...testVillage,
          x: i,
          y: i,
          population: -i,
          storage: { food: NaN, wood: -i, ore: Infinity }
        };

        economyManager.updateVillageEconomy(corruptedVillage, { currentTime: i, deltaTime: 1 }, testMap);
      }

      // エラーログが適切に制限されていることを確認
      const errorHandler = economyManager.getErrorHandler();
      const stats = errorHandler.getErrorStatistics();
      
      expect(stats.totalErrors).toBeGreaterThan(0);
      expect(stats.totalErrors).toBeLessThan(10000); // ログサイズ制限が機能している
    });

    it('並行処理エラーシミュレーション', () => {
      // 複数の村を同時に処理してエラーハンドリングの安定性を確認
      const villages = Array(10).fill(null).map((_, i) => ({
        ...testVillage,
        x: i,
        y: i,
        population: i % 2 === 0 ? -i : NaN, // 交互にエラーを発生
        storage: { 
          food: i % 3 === 0 ? -100 : 100, 
          wood: i % 3 === 1 ? NaN : 50, 
          ore: i % 3 === 2 ? Infinity : 30 
        }
      }));

      // 全ての村を処理
      villages.forEach(village => {
        expect(() => {
          economyManager.updateVillageEconomy(village, { currentTime: 100, deltaTime: 1 }, testMap);
          populationManager.updatePopulation(village, { currentTime: 100, deltaTime: 1 });
          buildingManager.updateBuildings(village, { currentTime: 100, deltaTime: 1 });
        }).not.toThrow();

        // 各村のデータが正常化されていることを確認
        expect(isFinite(village.population)).toBe(true);
        expect(village.population).toBeGreaterThanOrEqual(0);
        expect(isFinite(village.storage.food)).toBe(true);
        expect(isFinite(village.storage.wood)).toBe(true);
        expect(isFinite(village.storage.ore)).toBe(true);
      });
    });

    it('リカバリー機能の検証', () => {
      // 村を完全に破損させる
      // @ts-ignore
      testVillage.economy = null;
      // @ts-ignore
      testVillage.storage = null;
      testVillage.population = NaN;

      // エラーハンドラーでリセット
      const errorHandler = economyManager.getErrorHandler();
      errorHandler.resetVillageEconomyToDefaults(testVillage);

      // リセット後のデータが正常であることを確認
      expect(testVillage.economy).toBeDefined();
      expect(testVillage.economy.production).toEqual({ food: 0, wood: 0, ore: 0 });
      expect(testVillage.economy.consumption).toEqual({ food: 0, wood: 0, ore: 0 });
      expect(testVillage.economy.buildings.count).toBe(0);
      expect(testVillage.economy.supplyDemandStatus).toEqual({
        food: 'balanced',
        wood: 'balanced',
        ore: 'balanced'
      });
    });
  });
});