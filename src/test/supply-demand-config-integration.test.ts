/**
 * SupplyDemandConfig 統合テスト
 * 設定システムと既存のマネージャーとの統合をテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  SupplyDemandConfigManager, 
  getGlobalConfigManager, 
  updateGlobalConfig 
} from '../supply-demand-config';
import { PopulationManager } from '../population-manager';
import { BuildingManager } from '../building-manager';
import { SupplyDemandBalancer } from '../supply-demand-balancer';
import { VillageEconomyManager } from '../village-economy-manager';
import { Village } from '../village';
import { DEFAULT_SUPPLY_DEMAND_CONFIG } from '../village-economy';

describe('設定システム統合テスト', () => {
  let configManager: SupplyDemandConfigManager;
  let testVillage: Village;

  beforeEach(() => {
    configManager = new SupplyDemandConfigManager();
    
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
      const customConfig = {
        ...DEFAULT_SUPPLY_DEMAND_CONFIG,
        foodConsumptionPerPerson: 1.0 // デフォルトの0.5から変更
      };
      
      const populationManager = new PopulationManager(customConfig);
      const consumption = populationManager.calculateFoodConsumption(testVillage.population);
      
      // 人口20 × 1.0 = 20（効率性ボーナス考慮）
      expect(consumption).toBeGreaterThan(19);
      expect(consumption).toBeLessThan(21);
    });

    it('人口増加率の設定が反映される', () => {
      const highGrowthConfig = {
        ...DEFAULT_SUPPLY_DEMAND_CONFIG,
        populationGrowthRate: 0.08 // 高い増加率
      };
      
      const populationManager = new PopulationManager(highGrowthConfig);
      
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
      const expensiveConfig = {
        ...DEFAULT_SUPPLY_DEMAND_CONFIG,
        buildingWoodCost: 20, // デフォルトの10から変更
        buildingOreCost: 10   // デフォルトの5から変更
      };
      
      const buildingManager = new BuildingManager(expensiveConfig);
      const cost = buildingManager.calculateBuildingCost();
      
      expect(cost.wood).toBe(20);
      expect(cost.ore).toBe(10);
    });

    it('建物比率設定が目標建物数に反映される', () => {
      const highBuildingConfig = {
        ...DEFAULT_SUPPLY_DEMAND_CONFIG,
        buildingsPerPopulation: 0.2 // デフォルトの0.1から変更
      };
      
      const buildingManager = new BuildingManager(highBuildingConfig);
      const targetCount = buildingManager.calculateTargetBuildingCount(testVillage.population);
      
      // 人口20 × 0.2 = 4建物
      expect(targetCount).toBe(4);
    });
  });

  describe('SupplyDemandBalancer との統合', () => {
    it('需給バランス閾値設定が評価に反映される', () => {
      const strictConfig = {
        ...DEFAULT_SUPPLY_DEMAND_CONFIG,
        surplusThreshold: 2.0,   // より厳しい余剰判定
        shortageThreshold: 0.9,  // より厳しい不足判定
        criticalThreshold: 0.4   // より厳しい危機判定
      };
      
      const balancer = new SupplyDemandBalancer(strictConfig);
      
      // 生産<消費かつストックも少ない村（不足状態）
      testVillage.economy.production.food = 8;
      testVillage.economy.consumption.food = 10; // 生産/消費比 = 0.8 < 0.9
      testVillage.economy.stock.food = 20; // ストック日数 = 2日 < 3日
      
      const balance = balancer.evaluateVillageBalance(testVillage);
      
      // 厳しい設定では、生産/消費比=0.8は不足と判定される
      expect(balance.food).toBe('shortage');
    });
  });

  describe('VillageEconomyManager との統合', () => {
    it('設定変更が経済計算全体に反映される', () => {
      const customConfig = {
        ...DEFAULT_SUPPLY_DEMAND_CONFIG,
        foodConsumptionPerPerson: 0.8,
        buildingWoodCost: 15,
        surplusThreshold: 1.8
      };
      
      const economyManager = new VillageEconomyManager(customConfig);
      
      // モックマップデータ
      const mockMap = Array(10).fill(null).map(() => 
        Array(10).fill(null).map(() => ({
          height: 0.5,
          resources: { food: 5, wood: 3, ore: 2 },
          maxResources: { food: 10, wood: 6, ore: 4 },
          lastHarvestTime: 0
        }))
      );
      
      const gameTime = { currentTime: 100, deltaTime: 1.0 };
      
      // 経済システム更新を実行
      economyManager.updateVillageEconomy(testVillage, gameTime, mockMap);
      
      // 消費量が設定に基づいて計算されているかチェック
      const expectedFoodConsumption = testVillage.population * 0.8;
      expect(testVillage.economy.consumption.food).toBeCloseTo(expectedFoodConsumption, 1);
    });
  });

  describe('グローバル設定との統合', () => {
    it('グローバル設定変更が全マネージャーに反映される', () => {
      // グローバル設定を変更
      const result = updateGlobalConfig({
        foodConsumptionPerPerson: 0.7,
        buildingWoodCost: 12
      });
      
      expect(result.isValid).toBe(true);
      
      // 新しいマネージャーインスタンスがグローバル設定を使用することを確認
      const globalConfigManager = getGlobalConfigManager();
      const config = globalConfigManager.getConfig();
      
      expect(config.foodConsumptionPerPerson).toBe(0.7);
      expect(config.buildingWoodCost).toBe(12);
    });
  });

  describe('設定検証の実用性テスト', () => {
    it('実際のゲームプレイで問題となる設定を検出する', () => {
      // 極端に高い食料消費（ゲームバランスを破綻させる）
      const gameBreakingConfig = {
        ...DEFAULT_SUPPLY_DEMAND_CONFIG,
        foodConsumptionPerPerson: 5.0,  // 非常に高い消費
        populationGrowthRate: 0.001,    // 非常に低い成長率
        buildingWoodCost: 100,          // 非常に高いコスト
      };
      
      const result = configManager.validateConfig(gameBreakingConfig);
      
      // 範囲外の値があるためエラーが発生するはず
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('バランスの取れた設定は警告なしで通る', () => {
      const balancedConfig = {
        ...DEFAULT_SUPPLY_DEMAND_CONFIG,
        foodConsumptionPerPerson: 0.6,
        populationGrowthRate: 0.025,
        buildingWoodCost: 12,
        buildingOreCost: 6,
        surplusThreshold: 1.4,
        shortageThreshold: 0.7,
        criticalThreshold: 0.25
      };
      
      const result = configManager.validateConfig(balancedConfig);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeLessThanOrEqual(1); // 軽微な警告は許容
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量の設定検証が高速に実行される', () => {
      const startTime = performance.now();
      
      // 100回の設定検証を実行
      for (let i = 0; i < 100; i++) {
        const randomConfig = {
          ...DEFAULT_SUPPLY_DEMAND_CONFIG,
          foodConsumptionPerPerson: Math.random() * 2,
          populationGrowthRate: Math.random() * 0.1,
          buildingWoodCost: Math.floor(Math.random() * 100) + 1
        };
        
        configManager.validateConfig(randomConfig);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 100回の検証が100ms以内に完了することを期待
      expect(duration).toBeLessThan(100);
    });
  });
});