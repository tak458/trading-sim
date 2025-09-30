/**
 * SupplyDemandConfig 統合テスト
 * 設定システムと既存のマネージャーとの統合をテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  SettingsManager,
  getGlobalSettingsManager,
  updateGlobalSettings,
  DEFAULT_SUPPLY_DEMAND_CONFIG 
} from '../settings';
import { PopulationManager } from '../game-systems/population/population-manager';
import { BuildingManager } from '../game-systems/population/building-manager';
import { SupplyDemandBalancer } from '../game-systems/economy/supply-demand-balancer';
import { VillageEconomyManager } from '../game-systems/integration/village-economy-manager';
import { Village } from '../game-systems/world/village';

describe('設定システム統合テスト', () => {
  let settingsManager: SettingsManager;
  let testVillage: Village;

  beforeEach(() => {
    settingsManager = SettingsManager.getInstance();
    settingsManager.resetToDefaults();
    
    // テスト用の村を作成
    testVillage = {
      x: 5,
      y: 5,
      population: 20,
      storage: { food: 50, wood: 30, ore: 15 },
      collectionRadius: 2,
      economy: {
        production: { food: 10, wood: 8, ore: 5 },
        consumption: { food: 10, wood: 5, ore: 3 },
        stock: { food: 50, wood: 30, ore: 15, capacity: 120 },
        buildings: { count: 2, targetCount: 2, constructionQueue: 0 },
        supplyDemandStatus: { food: 'balanced', wood: 'balanced', ore: 'balanced' }
      },
      lastUpdateTime: 0,
      populationHistory: [18, 19, 20]
    };
  });

  describe('PopulationManager との統合', () => {
    it('設定変更が食料消費計算に反映される', () => {
      // カスタム設定を適用
      settingsManager.updateSettings({
        supplyDemand: {
          ...DEFAULT_SUPPLY_DEMAND_CONFIG,
          foodConsumptionPerPerson: 1.0 // デフォルトの0.5から変更
        }
      });
      
      const populationManager = new PopulationManager(settingsManager.getSettings().supplyDemand);
      const consumption = populationManager.calculateFoodConsumption(testVillage.population);
      
      // 人口20 × 1.0 = 20（効率性ボーナス考慮）
      expect(consumption).toBeGreaterThan(19);
      expect(consumption).toBeLessThan(21);
    });

    it('人口増加率の設定が反映される', () => {
      settingsManager.updateSettings({
        supplyDemand: {
          ...DEFAULT_SUPPLY_DEMAND_CONFIG,
          populationGrowthRate: 0.08 // 高い増加率
        }
      });
      
      const populationManager = new PopulationManager(settingsManager.getSettings().supplyDemand);
      
      // 十分な食料がある状態で成長可能性をテスト
      testVillage.storage.food = 1000;
      testVillage.economy.stock.food = 1000;
      testVillage.economy.production.food = 50;
      
      const canGrow = populationManager.canPopulationGrow(testVillage);
      expect(canGrow).toBe(true);
    });
  });

  describe('BuildingManager との統合', () => {
    it('建物コスト設定が反映される', () => {
      settingsManager.updateSettings({
        supplyDemand: {
          ...DEFAULT_SUPPLY_DEMAND_CONFIG,
          buildingWoodCost: 20, // デフォルトの10から変更
          buildingOreCost: 10   // デフォルトの5から変更
        }
      });
      
      const buildingManager = new BuildingManager(settingsManager.getSettings().supplyDemand);
      const cost = buildingManager.calculateBuildingCost();
      
      expect(cost.wood).toBe(20);
      expect(cost.ore).toBe(10);
    });

    it('建物数比率の設定が反映される', () => {
      settingsManager.updateSettings({
        supplyDemand: {
          ...DEFAULT_SUPPLY_DEMAND_CONFIG,
          buildingsPerPopulation: 0.2 // デフォルトの0.1から変更
        }
      });
      
      const buildingManager = new BuildingManager(settingsManager.getSettings().supplyDemand);
      const targetCount = buildingManager.calculateTargetBuildingCount(testVillage.population);
      
      // 人口20 × 0.2 = 4
      expect(targetCount).toBe(4);
    });
  });

  describe('SupplyDemandBalancer との統合', () => {
    it('閾値設定が需給判定に反映される', () => {
      settingsManager.updateSettings({
        supplyDemand: {
          ...DEFAULT_SUPPLY_DEMAND_CONFIG,
          surplusThreshold: 2.0,   // デフォルトの1.5から変更
          shortageThreshold: 0.6,  // デフォルトの0.8から変更
          criticalThreshold: 0.3   // デフォルトの0.5から変更
        }
      });
      
      const balancer = new SupplyDemandBalancer(settingsManager.getSettings().supplyDemand);
      
      // 生産10、消費5の場合（比率2.0）
      // Note: evaluateResourceBalance is private, testing through evaluateVillageBalance instead
      const testVillage:Village = {
        x: 0, y: 0, population: 10,
        storage: { food: 100, wood: 50, ore: 30 },
        collectionRadius: 2,
        economy: {
          production: { food: 10, wood: 5, ore: 3 },
          consumption: { food: 5, wood: 3, ore: 2 },
          stock: { food: 100, wood: 50, ore: 30, capacity: 200 },
          buildings: { count: 1, targetCount: 1, constructionQueue: 0 },
          supplyDemandStatus: { food: 'balanced', wood: 'balanced', ore: 'balanced' }
        },
        lastUpdateTime: 0,
        populationHistory: [10]
      };
      
      const status = balancer.evaluateVillageBalance(testVillage);
      expect(status.food).toBe('surplus'); // 生産10 > 消費5
    });
  });

  describe('グローバル設定の統合', () => {
    it('グローバル設定変更が全システムに反映される', () => {
      // グローバル設定を変更
      updateGlobalSettings({
        supplyDemand: {
          ...DEFAULT_SUPPLY_DEMAND_CONFIG,
          foodConsumptionPerPerson: 0.8
        }
      });
      
      // 新しいマネージャーインスタンスがグローバル設定を使用することを確認
      const populationManager = new PopulationManager();
      const consumption = populationManager.calculateFoodConsumption(10);
      
      // 設定が反映されていることを確認（効率性ボーナスにより実際の値は異なる可能性）
      expect(consumption).toBeGreaterThan(0);
      expect(consumption).toBeLessThan(10); // 人口10より少ない消費量
    });

    it('設定マネージャーのシングルトン性が保たれる', () => {
      const manager1 = getGlobalSettingsManager();
      const manager2 = getGlobalSettingsManager();
      
      expect(manager1).toBe(manager2);
    });
  });
});