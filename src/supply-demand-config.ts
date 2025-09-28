/**
 * SupplyDemandConfig - 設定システムとデフォルト値管理
 * 要件 2.1, 3.1, 6.1 に対応
 * 
 * このファイルは設定値の妥当性検証機能と設定管理機能を提供します。
 */

import { SupplyDemandConfig, DEFAULT_SUPPLY_DEMAND_CONFIG } from './village-economy';

/**
 * 設定値の検証エラーを表すインターフェース
 */
export interface ConfigValidationError {
  field: keyof SupplyDemandConfig;
  value: number;
  message: string;
  suggestedValue?: number;
}

/**
 * 設定値の検証結果を表すインターフェース
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: ConfigValidationError[];
  warnings: ConfigValidationError[];
  correctedConfig?: SupplyDemandConfig;
}

/**
 * 設定値の範囲制限を定義するインターフェース
 */
interface ConfigConstraints {
  min: number;
  max: number;
  recommended?: {
    min: number;
    max: number;
  };
}

/**
 * 各設定項目の制約条件
 */
const CONFIG_CONSTRAINTS: Record<keyof SupplyDemandConfig, ConfigConstraints> = {
  // 人口関連制約
  foodConsumptionPerPerson: {
    min: 0.1,
    max: 2.0,
    recommended: { min: 0.3, max: 1.0 }
  },
  populationGrowthRate: {
    min: 0.001,
    max: 0.1,
    recommended: { min: 0.01, max: 0.05 }
  },
  populationDeclineRate: {
    min: 0.001,
    max: 0.2,
    recommended: { min: 0.02, max: 0.1 }
  },
  
  // 建物関連制約
  buildingsPerPopulation: {
    min: 0.05,
    max: 1.0,
    recommended: { min: 0.08, max: 0.2 }
  },
  buildingWoodCost: {
    min: 1,
    max: 100,
    recommended: { min: 5, max: 20 }
  },
  buildingOreCost: {
    min: 1,
    max: 50,
    recommended: { min: 2, max: 15 }
  },
  
  // 需給バランス閾値制約
  surplusThreshold: {
    min: 1.1,
    max: 3.0,
    recommended: { min: 1.2, max: 2.0 }
  },
  shortageThreshold: {
    min: 0.3,
    max: 0.95,
    recommended: { min: 0.6, max: 0.9 }
  },
  criticalThreshold: {
    min: 0.1,
    max: 0.6,
    recommended: { min: 0.2, max: 0.5 }
  },
  
  // ストック関連制約
  baseStorageCapacity: {
    min: 50,
    max: 500,
    recommended: { min: 80, max: 200 }
  },
  storageCapacityPerBuilding: {
    min: 5,
    max: 100,
    recommended: { min: 10, max: 50 }
  }
};

/**
 * 設定システム管理クラス
 * 設定値の妥当性検証、修正、管理機能を提供
 */
export class SupplyDemandConfigManager {
  private currentConfig: SupplyDemandConfig;

  constructor(config: SupplyDemandConfig = DEFAULT_SUPPLY_DEMAND_CONFIG) {
    // 初期設定を検証して修正
    const validationResult = this.validateConfig(config);
    this.currentConfig = validationResult.correctedConfig || config;
    
    if (!validationResult.isValid) {
      console.warn('設定値に問題があったため修正しました:', validationResult.errors);
    }
  }

  /**
   * 設定値の妥当性を検証
   * 要件 2.1, 3.1, 6.1: 設定値の妥当性検証機能を実装
   * @param config 検証する設定
   * @returns 検証結果
   */
  validateConfig(config: SupplyDemandConfig): ConfigValidationResult {
    const errors: ConfigValidationError[] = [];
    const warnings: ConfigValidationError[] = [];
    const correctedConfig: SupplyDemandConfig = { ...config };

    // 各設定項目を検証
    for (const [field, constraints] of Object.entries(CONFIG_CONSTRAINTS)) {
      const key = field as keyof SupplyDemandConfig;
      const value = config[key];
      
      // NaN や Infinity の検出
      if (!isFinite(value) || isNaN(value)) {
        const suggestedValue = (constraints.recommended?.min || constraints.min);
        errors.push({
          field: key,
          value,
          message: `${key}は有効な数値である必要があります`,
          suggestedValue
        });
        correctedConfig[key] = suggestedValue;
        continue;
      }
      
      // 基本範囲チェック
      if (value < constraints.min || value > constraints.max) {
        const suggestedValue = Math.max(constraints.min, Math.min(constraints.max, value));
        errors.push({
          field: key,
          value,
          message: `${key}は${constraints.min}から${constraints.max}の範囲内である必要があります`,
          suggestedValue
        });
        correctedConfig[key] = suggestedValue;
      }
      
      // 推奨範囲チェック
      else if (constraints.recommended) {
        const { min: recMin, max: recMax } = constraints.recommended;
        if (value < recMin || value > recMax) {
          warnings.push({
            field: key,
            value,
            message: `${key}の推奨範囲は${recMin}から${recMax}です`,
            suggestedValue: Math.max(recMin, Math.min(recMax, value))
          });
        }
      }
    }

    // 論理的整合性チェック
    this.validateLogicalConsistency(correctedConfig, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      correctedConfig: errors.length > 0 ? correctedConfig : undefined
    };
  }

  /**
   * 設定値の論理的整合性を検証
   * @param config 検証する設定
   * @param errors エラーリスト
   * @param warnings 警告リスト
   */
  private validateLogicalConsistency(
    config: SupplyDemandConfig, 
    errors: ConfigValidationError[], 
    warnings: ConfigValidationError[]
  ): void {
    // 需給バランス閾値の論理的順序チェック（厳密な不等号を使用）
    if (config.criticalThreshold > config.shortageThreshold) {
      errors.push({
        field: 'criticalThreshold',
        value: config.criticalThreshold,
        message: 'criticalThresholdはshortageThreshold以下である必要があります',
        suggestedValue: config.shortageThreshold * 0.9
      });
    }

    if (config.shortageThreshold > config.surplusThreshold) {
      errors.push({
        field: 'shortageThreshold',
        value: config.shortageThreshold,
        message: 'shortageThresholdはsurplusThreshold以下である必要があります',
        suggestedValue: config.surplusThreshold * 0.9
      });
    }

    // 人口変化率の論理チェック
    if (config.populationDeclineRate <= config.populationGrowthRate) {
      warnings.push({
        field: 'populationDeclineRate',
        value: config.populationDeclineRate,
        message: '人口減少率は通常、増加率より大きく設定することを推奨します',
        suggestedValue: config.populationGrowthRate * 2
      });
    }

    // 建物コストの比率チェック
    const woodOreRatio = config.buildingWoodCost / config.buildingOreCost;
    if (woodOreRatio < 1.5 || woodOreRatio > 4.0) {
      warnings.push({
        field: 'buildingWoodCost',
        value: config.buildingWoodCost,
        message: '木材コストは鉱石コストの1.5〜4倍程度に設定することを推奨します',
        suggestedValue: config.buildingOreCost * 2.5
      });
    }
  }

  /**
   * 現在の設定を取得
   * @returns 現在の設定
   */
  getConfig(): SupplyDemandConfig {
    return { ...this.currentConfig };
  }

  /**
   * 設定を更新
   * @param newConfig 新しい設定
   * @returns 更新結果
   */
  updateConfig(newConfig: Partial<SupplyDemandConfig>): ConfigValidationResult {
    const mergedConfig: SupplyDemandConfig = {
      ...this.currentConfig,
      ...newConfig
    };

    const validationResult = this.validateConfig(mergedConfig);
    
    if (validationResult.isValid || validationResult.correctedConfig) {
      this.currentConfig = validationResult.correctedConfig || mergedConfig;
    }

    return validationResult;
  }

  /**
   * 設定をデフォルト値にリセット
   */
  resetToDefaults(): void {
    this.currentConfig = { ...DEFAULT_SUPPLY_DEMAND_CONFIG };
  }

  /**
   * 設定値の説明を取得
   * @param field 設定項目
   * @returns 設定の説明
   */
  getConfigDescription(field: keyof SupplyDemandConfig): string {
    const descriptions: Record<keyof SupplyDemandConfig, string> = {
      foodConsumptionPerPerson: '1人当たりの時間あたり食料消費量。値が大きいほど食料不足が起きやすくなります。',
      populationGrowthRate: '人口増加の確率（時間あたり）。値が大きいほど人口が急速に増加します。',
      populationDeclineRate: '人口減少の確率（時間あたり）。値が大きいほど食料不足時の人口減少が急速になります。',
      buildingsPerPopulation: '人口1人あたりの目標建物数。値が大きいほど多くの建物が必要になります。',
      buildingWoodCost: '建物1つの建設に必要な木材量。値が大きいほど建設コストが高くなります。',
      buildingOreCost: '建物1つの建設に必要な鉱石量。値が大きいほど建設コストが高くなります。',
      surplusThreshold: '資源余剰判定の閾値（生産/消費比）。この値以上で余剰と判定されます。',
      shortageThreshold: '資源不足判定の閾値（生産/消費比）。この値以下で不足と判定されます。',
      criticalThreshold: '資源危機判定の閾値（生産/消費比）。この値以下で危機と判定されます。',
      baseStorageCapacity: '村の基本ストック容量。建物がない場合の最大保管量です。',
      storageCapacityPerBuilding: '建物1つあたりの追加ストック容量。建物数に比例して容量が増加します。'
    };

    return descriptions[field] || '設定項目の説明がありません。';
  }

  /**
   * 設定値の推奨範囲を取得
   * @param field 設定項目
   * @returns 推奨範囲情報
   */
  getRecommendedRange(field: keyof SupplyDemandConfig): {
    min: number;
    max: number;
    recommended?: { min: number; max: number };
    current: number;
  } {
    const constraints = CONFIG_CONSTRAINTS[field];
    return {
      min: constraints.min,
      max: constraints.max,
      recommended: constraints.recommended,
      current: this.currentConfig[field]
    };
  }

  /**
   * 設定の統計情報を取得
   * @returns 設定統計
   */
  getConfigStats(): {
    totalFields: number;
    validFields: number;
    warningFields: number;
    errorFields: number;
    overallHealth: 'excellent' | 'good' | 'warning' | 'error';
  } {
    const validationResult = this.validateConfig(this.currentConfig);
    const totalFields = Object.keys(CONFIG_CONSTRAINTS).length;
    const errorFields = validationResult.errors.length;
    const warningFields = validationResult.warnings.length;
    const validFields = totalFields - errorFields;

    let overallHealth: 'excellent' | 'good' | 'warning' | 'error';
    if (errorFields > 0) {
      overallHealth = 'error';
    } else if (warningFields > 3) {
      overallHealth = 'warning';
    } else if (warningFields > 0) {
      overallHealth = 'good';
    } else {
      overallHealth = 'excellent';
    }

    return {
      totalFields,
      validFields,
      warningFields,
      errorFields,
      overallHealth
    };
  }
}

/**
 * グローバル設定マネージャーインスタンス（シングルトン）
 */
let globalConfigManager: SupplyDemandConfigManager | null = null;

/**
 * グローバル設定マネージャーを取得
 * @returns 設定マネージャーインスタンス
 */
export function getGlobalConfigManager(): SupplyDemandConfigManager {
  if (!globalConfigManager) {
    globalConfigManager = new SupplyDemandConfigManager();
  }
  return globalConfigManager;
}

/**
 * グローバル設定を取得（便利関数）
 * @returns 現在のグローバル設定
 */
export function getGlobalConfig(): SupplyDemandConfig {
  return getGlobalConfigManager().getConfig();
}

/**
 * グローバル設定を更新（便利関数）
 * @param newConfig 新しい設定
 * @returns 更新結果
 */
export function updateGlobalConfig(newConfig: Partial<SupplyDemandConfig>): ConfigValidationResult {
  return getGlobalConfigManager().updateConfig(newConfig);
}