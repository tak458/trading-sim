/**
 * VillageEconomyManager のテスト
 * 要件 1.1, 5.1, 5.2, 6.1, 6.2 の検証
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VillageEconomyManager, GameTime, ResourceInfo } from '../village-economy-manager';
import { Village } from '../village';
import { Tile } from '../map';
import { DEFAULT_SUPPLY_DEMAND_CONFIG } from '../village-economy';

describe('VillageEconomyManager', () => {
  let manager: VillageEconomyManager;
  let testVillage: Village;
  let testMap: Tile[][];
  let gameTime: GameTime;

  beforeEach(() => {
    manager = new VillageEconomyManager();
    
    // テスト用の村を作成
    testVillage = {
      x: 5,
      y: 5,
      population: 20,
      storage: { food: 30, wood: 25, ore: 15 },
      collectionRadius: 2,
      economy: {
        production: { food: 0, wood: 0, ore: 0 },
        consumption: { food: 0, wood: 0, ore: 0 },
        stock: { food: 30, wood: 25, ore: 15, capacity: 100 },
        buildings: { count: 2, targetCount: 2, constructionQueue: 0 },
        supplyDemandStatus: { food: 'balanced', wood: 'balanced', ore: 'balanced' }
      },
      lastUpdateTime: 0,
      populationHistory: [10, 15, 20]
    };

    // テスト用のマップを作成（10x10）
    testMap = Array(10).fill(null).map(() => 
      Array(10).fill(null).map(() => ({
        height: 0.5,
        resources: { food: 10, wood: 8, ore: 5 },
        maxResources: { food: 20, wood: 15, ore: 10 },
        lastHarvestTime: 0
      }))
    );

    gameTime = {
      currentTime: 1000,
      deltaTime: 16
    };
  });

  describe('updateVillageEconomy', () => {
    it('should update all economic aspects of a village', () => {
      // 要件 1.4: 村の状態が変化する時にシステムは生産・消費・ストック情報を更新する
      const initialProduction = { ...testVillage.economy.production };
      
      manager.updateVillageEconomy(testVillage, gameTime, testMap);
      
      // 生産能力が更新されていることを確認
      expect(testVillage.economy.production).not.toEqual(initialProduction);
      expect(testVillage.economy.production.food).toBeGreaterThan(0);
      expect(testVillage.economy.production.wood).toBeGreaterThan(0);
      expect(testVillage.economy.production.ore).toBeGreaterThan(0);
      
      // 消費量が計算されていることを確認
      expect(testVillage.economy.consumption.food).toBeGreaterThan(0);
      
      // ストック情報が同期されていることを確認
      expect(testVillage.economy.stock.food).toBe(testVillage.storage.food);
      expect(testVillage.economy.stock.wood).toBe(testVillage.storage.wood);
      expect(testVillage.economy.stock.ore).toBe(testVillage.storage.ore);
      
      // 需給状況が評価されていることを確認
      expect(['surplus', 'balanced', 'shortage', 'critical']).toContain(testVillage.economy.supplyDemandStatus.food);
      
      // 最終更新時間が記録されていることを確認
      expect(testVillage.lastUpdateTime).toBe(gameTime.currentTime);
    });

    it('should handle errors gracefully', () => {
      // 不正なマップでエラーを発生させる
      const invalidMap: any = null;
      
      expect(() => {
        manager.updateVillageEconomy(testVillage, gameTime, invalidMap);
      }).not.toThrow();
      
      // エラー時はデフォルト値で復旧されることを確認
      expect(testVillage.economy.production.food).toBe(0);
      expect(testVillage.economy.supplyDemandStatus.food).toBe('balanced');
    });
  });

  describe('calculateProduction', () => {
    it('should calculate production based on available resources and village stats', () => {
      // 要件 5.1: 村が資源タイルにアクセスする時にシステムは村の生産能力を計算する
      const availableResources: ResourceInfo = { food: 100, wood: 80, ore: 50 };
      
      const production = manager.calculateProduction(testVillage, availableResources);
      
      expect(production.food).toBeGreaterThan(0);
      expect(production.wood).toBeGreaterThan(0);
      expect(production.ore).toBeGreaterThan(0);
      
      // 食料の生産量が最も高いことを確認（利用可能量が最も多いため）
      expect(production.food).toBeGreaterThan(production.wood);
      expect(production.food).toBeGreaterThan(production.ore);
    });

    it('should scale production with population and buildings', () => {
      const availableResources: ResourceInfo = { food: 100, wood: 80, ore: 50 };
      
      // 人口と建物数を増やした村
      const largerVillage = { 
        ...testVillage, 
        population: 40, 
        economy: { 
          ...testVillage.economy, 
          buildings: { ...testVillage.economy.buildings, count: 4 } 
        } 
      };
      
      const baseProduction = manager.calculateProduction(testVillage, availableResources);
      const scaledProduction = manager.calculateProduction(largerVillage, availableResources);
      
      // 人口と建物が多い村の方が生産量が多いことを確認
      expect(scaledProduction.food).toBeGreaterThan(baseProduction.food);
      expect(scaledProduction.wood).toBeGreaterThan(baseProduction.wood);
      expect(scaledProduction.ore).toBeGreaterThan(baseProduction.ore);
    });

    it('should handle zero available resources', () => {
      const noResources: ResourceInfo = { food: 0, wood: 0, ore: 0 };
      
      const production = manager.calculateProduction(testVillage, noResources);
      
      expect(production.food).toBe(0);
      expect(production.wood).toBe(0);
      expect(production.ore).toBe(0);
    });
  });

  describe('calculateConsumption', () => {
    it('should calculate food consumption based on population', () => {
      // 要件 2.1: 時間が経過する時にシステムは村の人口に比例して食料を消費する
      const consumption = manager.calculateConsumption(testVillage);
      
      const expectedFoodConsumption = testVillage.population * DEFAULT_SUPPLY_DEMAND_CONFIG.foodConsumptionPerPerson;
      expect(consumption.food).toBe(expectedFoodConsumption);
    });

    it('should calculate building construction consumption', () => {
      // 要件 3.1: 村が建物を建設する時にシステムは木材と鉱石を消費する
      testVillage.economy.buildings.constructionQueue = 2;
      
      const consumption = manager.calculateConsumption(testVillage);
      
      const expectedWoodConsumption = 2 * DEFAULT_SUPPLY_DEMAND_CONFIG.buildingWoodCost;
      const expectedOreConsumption = 2 * DEFAULT_SUPPLY_DEMAND_CONFIG.buildingOreCost;
      
      expect(consumption.wood).toBe(expectedWoodConsumption);
      expect(consumption.ore).toBe(expectedOreConsumption);
    });

    it('should handle zero population and no construction', () => {
      testVillage.population = 0;
      testVillage.economy.buildings.constructionQueue = 0;
      
      const consumption = manager.calculateConsumption(testVillage);
      
      expect(consumption.food).toBe(0);
      expect(consumption.wood).toBe(0);
      expect(consumption.ore).toBe(0);
    });
  });

  describe('evaluateSupplyDemand', () => {
    it('should evaluate supply demand status correctly', () => {
      // 要件 6.1: システムが村の状態を評価する時に各村の資源余剰・不足状況を判定する
      
      // 余剰状態をテスト
      testVillage.economy.production = { food: 50, wood: 40, ore: 30 };
      testVillage.economy.consumption = { food: 10, wood: 8, ore: 6 };
      testVillage.economy.stock = { food: 200, wood: 150, ore: 100, capacity: 500 };
      
      const status = manager.evaluateSupplyDemand(testVillage);
      
      expect(status.food).toBe('surplus');
      expect(status.wood).toBe('surplus');
      expect(status.ore).toBe('surplus');
    });

    it('should detect shortage conditions', () => {
      // 不足状態をテスト（生産不足だがストックは少しある）
      testVillage.economy.production = { food: 6, wood: 5, ore: 4 };
      testVillage.economy.consumption = { food: 10, wood: 8, ore: 6 };
      testVillage.economy.stock = { food: 20, wood: 15, ore: 10, capacity: 100 };
      
      const status = manager.evaluateSupplyDemand(testVillage);
      
      expect(status.food).toBe('shortage');
      expect(status.wood).toBe('shortage');
      expect(status.ore).toBe('shortage');
    });

    it('should detect critical conditions', () => {
      // 危機状態をテスト（生産が極端に不足し、ストックも危機的）
      testVillage.economy.production = { food: 1, wood: 0.5, ore: 0.3 };
      testVillage.economy.consumption = { food: 10, wood: 8, ore: 6 };
      testVillage.economy.stock = { food: 5, wood: 3, ore: 2, capacity: 100 };
      
      const status = manager.evaluateSupplyDemand(testVillage);
      
      expect(status.food).toBe('critical');
      expect(status.wood).toBe('critical');
      expect(status.ore).toBe('critical');
    });
  });

  describe('getResourceShortageVillages', () => {
    it('should identify villages with resource shortages', () => {
      // 要件 6.3: 村で資源不足が発生している時にシステムは近隣村からの供給可能性を評価する
      
      const villages: Village[] = [
        testVillage,
        {
          ...testVillage,
          x: 10,
          y: 10,
          economy: {
            ...testVillage.economy,
            supplyDemandStatus: { food: 'shortage', wood: 'balanced', ore: 'balanced' }
          }
        },
        {
          ...testVillage,
          x: 15,
          y: 15,
          economy: {
            ...testVillage.economy,
            supplyDemandStatus: { food: 'surplus', wood: 'surplus', ore: 'surplus' }
          }
        }
      ];
      
      const shortageVillages = manager.getResourceShortageVillages(villages);
      
      expect(shortageVillages).toHaveLength(1);
      expect(shortageVillages[0].x).toBe(10);
      expect(shortageVillages[0].y).toBe(10);
    });
  });

  describe('getResourceSurplusVillages', () => {
    it('should identify villages with resource surplus', () => {
      // 要件 6.2: 村に資源余剰がある時にシステムは余剰資源を他村への供給候補として識別する
      
      const villages: Village[] = [
        testVillage,
        {
          ...testVillage,
          x: 10,
          y: 10,
          economy: {
            ...testVillage.economy,
            supplyDemandStatus: { food: 'shortage', wood: 'balanced', ore: 'balanced' }
          }
        },
        {
          ...testVillage,
          x: 15,
          y: 15,
          economy: {
            ...testVillage.economy,
            supplyDemandStatus: { food: 'surplus', wood: 'surplus', ore: 'surplus' }
          }
        }
      ];
      
      const surplusVillages = manager.getResourceSurplusVillages(villages);
      
      expect(surplusVillages).toHaveLength(1);
      expect(surplusVillages[0].x).toBe(15);
      expect(surplusVillages[0].y).toBe(15);
    });
  });

  describe('integration with existing village system', () => {
    it('should maintain compatibility with existing village storage', () => {
      // 既存のstorageシステムとの互換性を確認
      const originalStorage = { ...testVillage.storage };
      
      manager.updateVillageEconomy(testVillage, gameTime, testMap);
      
      // ストレージの値が変更されていないことを確認
      expect(testVillage.storage).toEqual(originalStorage);
      
      // economyのstockが正しく同期されていることを確認
      expect(testVillage.economy.stock.food).toBe(testVillage.storage.food);
      expect(testVillage.economy.stock.wood).toBe(testVillage.storage.wood);
      expect(testVillage.economy.stock.ore).toBe(testVillage.storage.ore);
    });
  });
});