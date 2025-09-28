/**
 * SupplyDemandConfigManager のテスト
 * 要件 2.1, 3.1, 6.1 の設定値妥当性検証機能をテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  SupplyDemandConfigManager, 
  getGlobalConfigManager, 
  getGlobalConfig, 
  updateGlobalConfig 
} from '../supply-demand-config';
import { SupplyDemandConfig, DEFAULT_SUPPLY_DEMAND_CONFIG } from '../village-economy';

describe('SupplyDemandConfigManager', () => {
  let configManager: SupplyDemandConfigManager;

  beforeEach(() => {
    configManager = new SupplyDemandConfigManager();
  });

  describe('設定値の妥当性検証', () => {
    it('デフォルト設定は有効である', () => {
      const result = configManager.validateConfig(DEFAULT_SUPPLY_DEMAND_CONFIG);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('範囲外の値を検出してエラーを返す', () => {
      const invalidConfig: SupplyDemandConfig = {
        ...DEFAULT_SUPPLY_DEMAND_CONFIG,
        foodConsumptionPerPerson: -1, // 最小値0.1未満
        populationGrowthRate: 0.2,    // 最大値0.1超過
      };

      const result = configManager.validateConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].field).toBe('foodConsumptionPerPerson');
      expect(result.errors[1].field).toBe('populationGrowthRate');
    });

    it('推奨範囲外の値で警告を返す', () => {
      const warningConfig: SupplyDemandConfig = {
        ...DEFAULT_SUPPLY_DEMAND_CONFIG,
        foodConsumptionPerPerson: 0.15, // 推奨範囲0.3-1.0外だが有効範囲0.1-2.0内
        buildingsPerPopulation: 0.06,   // 推奨範囲0.08-0.2外だが有効範囲0.05-1.0内
      };

      const result = configManager.validateConfig(warningConfig);
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('論理的整合性エラーを検出する', () => {
      const inconsistentConfig: SupplyDemandConfig = {
        ...DEFAULT_SUPPLY_DEMAND_CONFIG,
        criticalThreshold: 0.9,  // shortageThreshold(0.8)より大きい
        shortageThreshold: 1.6,  // surplusThreshold(1.5)より大きい
      };

      const result = configManager.validateConfig(inconsistentConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('範囲外の値を自動修正する', () => {
      const invalidConfig: SupplyDemandConfig = {
        ...DEFAULT_SUPPLY_DEMAND_CONFIG,
        foodConsumptionPerPerson: 5.0, // 最大値2.0を超過
        buildingWoodCost: -10,         // 最小値1未満
      };

      const result = configManager.validateConfig(invalidConfig);
      expect(result.correctedConfig).toBeDefined();
      expect(result.correctedConfig!.foodConsumptionPerPerson).toBe(2.0);
      expect(result.correctedConfig!.buildingWoodCost).toBe(1);
    });
  });

  describe('設定管理機能', () => {
    it('現在の設定を取得できる', () => {
      const config = configManager.getConfig();
      expect(config).toEqual(DEFAULT_SUPPLY_DEMAND_CONFIG);
    });

    it('設定を更新できる', () => {
      const newConfig = { foodConsumptionPerPerson: 0.8 };
      const result = configManager.updateConfig(newConfig);
      
      expect(result.isValid).toBe(true);
      expect(configManager.getConfig().foodConsumptionPerPerson).toBe(0.8);
    });

    it('無効な設定更新は修正される', () => {
      const invalidUpdate = { foodConsumptionPerPerson: -1 };
      const result = configManager.updateConfig(invalidUpdate);
      
      expect(result.isValid).toBe(false);
      expect(result.correctedConfig).toBeDefined();
      expect(configManager.getConfig().foodConsumptionPerPerson).toBe(0.1); // 最小値に修正
    });

    it('デフォルト値にリセットできる', () => {
      configManager.updateConfig({ foodConsumptionPerPerson: 0.8 });
      configManager.resetToDefaults();
      
      expect(configManager.getConfig()).toEqual(DEFAULT_SUPPLY_DEMAND_CONFIG);
    });
  });

  describe('設定情報取得機能', () => {
    it('設定項目の説明を取得できる', () => {
      const description = configManager.getConfigDescription('foodConsumptionPerPerson');
      expect(description).toContain('食料消費量');
      expect(description.length).toBeGreaterThan(10);
    });

    it('推奨範囲情報を取得できる', () => {
      const range = configManager.getRecommendedRange('foodConsumptionPerPerson');
      expect(range.min).toBe(0.1);
      expect(range.max).toBe(2.0);
      expect(range.recommended).toBeDefined();
      expect(range.current).toBe(DEFAULT_SUPPLY_DEMAND_CONFIG.foodConsumptionPerPerson);
    });

    it('設定統計情報を取得できる', () => {
      const stats = configManager.getConfigStats();
      expect(stats.totalFields).toBeGreaterThan(0);
      expect(stats.validFields).toBeGreaterThan(0);
      expect(stats.overallHealth).toBe('excellent'); // デフォルト設定は優秀
    });
  });

  describe('エラーケース処理', () => {
    it('NaN値を適切に処理する', () => {
      const nanConfig: SupplyDemandConfig = {
        ...DEFAULT_SUPPLY_DEMAND_CONFIG,
        foodConsumptionPerPerson: NaN,
      };

      const result = configManager.validateConfig(nanConfig);
      expect(result.isValid).toBe(false);
      expect(result.correctedConfig).toBeDefined();
    });

    it('Infinity値を適切に処理する', () => {
      const infinityConfig: SupplyDemandConfig = {
        ...DEFAULT_SUPPLY_DEMAND_CONFIG,
        populationGrowthRate: Infinity,
      };

      const result = configManager.validateConfig(infinityConfig);
      expect(result.isValid).toBe(false);
      expect(result.correctedConfig).toBeDefined();
    });

    it('存在しない設定項目の説明要求を処理する', () => {
      const description = configManager.getConfigDescription('nonExistentField' as any);
      expect(description).toContain('設定項目の説明がありません');
    });
  });

  describe('複雑な検証シナリオ', () => {
    it('建物コスト比率の警告を適切に検出する', () => {
      const unbalancedConfig: SupplyDemandConfig = {
        ...DEFAULT_SUPPLY_DEMAND_CONFIG,
        buildingWoodCost: 100,  // 鉱石コスト5に対して20倍（推奨1.5-4倍を超過）
        buildingOreCost: 5,
      };

      const result = configManager.validateConfig(unbalancedConfig);
      expect(result.isValid).toBe(true); // エラーではないが警告あり
      expect(result.warnings.some(w => w.field === 'buildingWoodCost')).toBe(true);
    });

    it('人口変化率の論理チェックを実行する', () => {
      const illogicalConfig: SupplyDemandConfig = {
        ...DEFAULT_SUPPLY_DEMAND_CONFIG,
        populationGrowthRate: 0.08,  // 8%増加率
        populationDeclineRate: 0.05, // 5%減少率（増加率より小さい）
      };

      const result = configManager.validateConfig(illogicalConfig);
      expect(result.warnings.some(w => w.field === 'populationDeclineRate')).toBe(true);
    });

    it('複数の設定項目を同時に更新できる', () => {
      const multiUpdate = {
        foodConsumptionPerPerson: 0.7,
        buildingWoodCost: 15,
        surplusThreshold: 1.8
      };

      const result = configManager.updateConfig(multiUpdate);
      expect(result.isValid).toBe(true);
      
      const config = configManager.getConfig();
      expect(config.foodConsumptionPerPerson).toBe(0.7);
      expect(config.buildingWoodCost).toBe(15);
      expect(config.surplusThreshold).toBe(1.8);
    });
  });
});

describe('グローバル設定管理', () => {
  it('グローバル設定マネージャーを取得できる', () => {
    const manager1 = getGlobalConfigManager();
    const manager2 = getGlobalConfigManager();
    expect(manager1).toBe(manager2); // シングルトン
  });

  it('グローバル設定を取得できる', () => {
    const config = getGlobalConfig();
    expect(config).toEqual(DEFAULT_SUPPLY_DEMAND_CONFIG);
  });

  it('グローバル設定を更新できる', () => {
    const result = updateGlobalConfig({ foodConsumptionPerPerson: 0.6 });
    expect(result.isValid).toBe(true);
    expect(getGlobalConfig().foodConsumptionPerPerson).toBe(0.6);
  });
});

describe('設定値の境界値テスト', () => {
  let configManager: SupplyDemandConfigManager;

  beforeEach(() => {
    configManager = new SupplyDemandConfigManager();
  });

  const boundaryTests = [
    { field: 'foodConsumptionPerPerson', min: 0.1, max: 2.0 },
    { field: 'populationGrowthRate', min: 0.001, max: 0.1 },
    { field: 'populationDeclineRate', min: 0.001, max: 0.2 },
    { field: 'buildingsPerPopulation', min: 0.05, max: 1.0 },
    { field: 'buildingWoodCost', min: 1, max: 100 },
    { field: 'buildingOreCost', min: 1, max: 50 },
    { field: 'surplusThreshold', min: 1.1, max: 3.0 },
    { field: 'shortageThreshold', min: 0.3, max: 0.95 },
    { field: 'criticalThreshold', min: 0.1, max: 0.6 },
    { field: 'baseStorageCapacity', min: 50, max: 500 },
    { field: 'storageCapacityPerBuilding', min: 5, max: 100 }
  ];

  boundaryTests.forEach(({ field, min, max }) => {
    it(`${field}の境界値テスト`, () => {
      // 最小値テスト
      const minConfig = { ...DEFAULT_SUPPLY_DEMAND_CONFIG, [field]: min };
      const minResult = configManager.validateConfig(minConfig);
      expect(minResult.isValid).toBe(true);

      // 最大値テスト
      const maxConfig = { ...DEFAULT_SUPPLY_DEMAND_CONFIG, [field]: max };
      const maxResult = configManager.validateConfig(maxConfig);
      expect(maxResult.isValid).toBe(true);

      // 最小値未満テスト
      const belowMinConfig = { ...DEFAULT_SUPPLY_DEMAND_CONFIG, [field]: min - 0.001 };
      const belowMinResult = configManager.validateConfig(belowMinConfig);
      expect(belowMinResult.isValid).toBe(false);

      // 最大値超過テスト
      const aboveMaxConfig = { ...DEFAULT_SUPPLY_DEMAND_CONFIG, [field]: max + 0.001 };
      const aboveMaxResult = configManager.validateConfig(aboveMaxConfig);
      expect(aboveMaxResult.isValid).toBe(false);
    });
  });
});