// src/game-systems/economy/resource-manager.ts
import { Tile } from "../world/map";
import { ResourceConfig, DEFAULT_RESOURCE_CONFIG } from '../../settings';

export interface ResourceConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ResourceConfigPreset {
  name: string;
  description: string;
  config: ResourceConfig;
}

export interface ResourceVisualState {
  opacity: number; // 0.3-1.0, 資源量に基づく透明度
  tint: number; // 色調整（枯渇時は赤みがかる）
  isDepleted: boolean; // 完全枯渇フラグ
  recoveryProgress: number; // 0-1, 回復進行度
}

/**
 * 設定プリセット - 異なる難易度レベル
 */
export const RESOURCE_CONFIG_PRESETS: ResourceConfigPreset[] = [
  {
    name: "easy",
    description: "初心者向け - 資源が豊富で回復が早い",
    config: {
      depletionRate: 0.05, // 5%消耗 - 緩やか
      recoveryRate: 0.04, // 4%回復 - 早い
      recoveryDelay: 3, // 3ティック（3秒）遅延 - 短い
      minRecoveryThreshold: 0.2, // 20%で回復開始 - 早め
      typeMultipliers: {
        water: { food: 0.0, wood: 0.0, ore: 0.0 },
        land: { food: 2.0, wood: 0.8, ore: 0.5 },
        forest: { food: 1.2, wood: 2.5, ore: 0.3 },
        mountain: { food: 0.5, wood: 0.8, ore: 3.0 },
        road: { food: 0.1, wood: 0.1, ore: 0.1 }
      }
    }
  },
  {
    name: "normal",
    description: "標準的なバランス",
    config: DEFAULT_RESOURCE_CONFIG
  },
  {
    name: "hard",
    description: "上級者向け - 資源管理が重要",
    config: {
      depletionRate: 0.15, // 15%消耗 - 厳しい
      recoveryRate: 0.01, // 1%回復 - 遅い
      recoveryDelay: 10, // 10ティック（10秒）遅延 - 長い
      minRecoveryThreshold: 0.05, // 5%で回復開始 - 遅め
      typeMultipliers: {
        water: { food: 0.0, wood: 0.0, ore: 0.0 },
        land: { food: 1.2, wood: 0.3, ore: 0.2 },
        forest: { food: 0.5, wood: 1.5, ore: 0.1 },
        mountain: { food: 0.2, wood: 0.3, ore: 2.0 },
        road: { food: 0.05, wood: 0.05, ore: 0.05 }
      }
    }
  },
  {
    name: "extreme",
    description: "エキスパート向け - 極限の資源管理",
    config: {
      depletionRate: 0.25, // 25%消耗 - 非常に厳しい
      recoveryRate: 0.005, // 0.5%回復 - 非常に遅い
      recoveryDelay: 15, // 15ティック（15秒）遅延 - 非常に長い
      minRecoveryThreshold: 0.02, // 2%で回復開始 - 非常に遅め
      typeMultipliers: {
        water: { food: 0.0, wood: 0.0, ore: 0.0 },
        land: { food: 1.0, wood: 0.2, ore: 0.1 },
        forest: { food: 0.3, wood: 1.2, ore: 0.05 },
        mountain: { food: 0.1, wood: 0.2, ore: 1.5 },
        road: { food: 0.02, wood: 0.02, ore: 0.02 }
      }
    }
  }
];

/**
 * 設定値の妥当性を検証
 */
export function validateResourceConfig(config: Partial<ResourceConfig>): ResourceConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // depletionRate の検証
  if (config.depletionRate !== undefined) {
    if (config.depletionRate < 0) {
      errors.push("depletionRate must be non-negative");
    } else if (config.depletionRate > 1) {
      errors.push("depletionRate must not exceed 1.0 (100%)");
    } else if (config.depletionRate > 0.5) {
      warnings.push("depletionRate above 0.5 may cause very rapid resource depletion");
    }
  }

  // recoveryRate の検証
  if (config.recoveryRate !== undefined) {
    if (config.recoveryRate < 0) {
      errors.push("recoveryRate must be non-negative");
    } else if (config.recoveryRate > 1) {
      errors.push("recoveryRate must not exceed 1.0 (100% per frame)");
    } else if (config.recoveryRate > 0.1) {
      warnings.push("recoveryRate above 0.1 may cause very rapid recovery");
    }
  }

  // recoveryDelay の検証
  if (config.recoveryDelay !== undefined) {
    if (config.recoveryDelay < 0) {
      errors.push("recoveryDelay must be non-negative");
    } else if (config.recoveryDelay > 60) { // 60ティック（60秒）
      warnings.push("recoveryDelay above 60 ticks (60 seconds) may be too long");
    }
  }

  // minRecoveryThreshold の検証
  if (config.minRecoveryThreshold !== undefined) {
    if (config.minRecoveryThreshold < 0) {
      errors.push("minRecoveryThreshold must be non-negative");
    } else if (config.minRecoveryThreshold > 1) {
      errors.push("minRecoveryThreshold must not exceed 1.0 (100%)");
    }
  }

  // typeMultipliers の検証
  if (config.typeMultipliers) {
    const tileTypes = ['water', 'land', 'forest', 'mountain', 'road'] as const;
    const resourceTypes = ['food', 'wood', 'ore'] as const;

    for (const tileType of tileTypes) {
      if (config.typeMultipliers[tileType]) {
        for (const resourceType of resourceTypes) {
          const multiplier = config.typeMultipliers[tileType][resourceType];
          if (multiplier !== undefined) {
            if (multiplier < 0) {
              errors.push(`typeMultipliers.${tileType}.${resourceType} must be non-negative`);
            } else if (multiplier > 10) {
              warnings.push(`typeMultipliers.${tileType}.${resourceType} above 10 may cause very rapid recovery`);
            }
          }
        }
      }
    }
  }

  // バランスチェック
  if (config.depletionRate !== undefined && config.recoveryRate !== undefined) {
    if (config.depletionRate > config.recoveryRate * 10) {
      warnings.push("depletionRate is much higher than recoveryRate, resources may become permanently depleted");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 安全な設定値を適用（無効な値はデフォルト値で置換）
 */
export function sanitizeResourceConfig(config: Partial<ResourceConfig>): ResourceConfig {
  const validation = validateResourceConfig(config);
  
  if (validation.isValid) {
    return { ...DEFAULT_RESOURCE_CONFIG, ...config };
  }

  // エラーがある場合はデフォルト値を使用
  const sanitized = { ...DEFAULT_RESOURCE_CONFIG };
  
  // 有効な値のみを適用
  if (config.depletionRate !== undefined && config.depletionRate >= 0 && config.depletionRate <= 1) {
    sanitized.depletionRate = config.depletionRate;
  }
  
  if (config.recoveryRate !== undefined && config.recoveryRate >= 0 && config.recoveryRate <= 1) {
    sanitized.recoveryRate = config.recoveryRate;
  }
  
  if (config.recoveryDelay !== undefined && config.recoveryDelay >= 0) {
    sanitized.recoveryDelay = config.recoveryDelay;
  }
  
  if (config.minRecoveryThreshold !== undefined && config.minRecoveryThreshold >= 0 && config.minRecoveryThreshold <= 1) {
    sanitized.minRecoveryThreshold = config.minRecoveryThreshold;
  }
  
  // typeMultipliers の安全な適用
  if (config.typeMultipliers) {
    const tileTypes = ['water', 'land', 'forest', 'mountain', 'road'] as const;
    const resourceTypes = ['food', 'wood', 'ore'] as const;
    
    for (const tileType of tileTypes) {
      if (config.typeMultipliers[tileType]) {
        for (const resourceType of resourceTypes) {
          const multiplier = config.typeMultipliers[tileType][resourceType];
          if (multiplier !== undefined && multiplier >= 0) {
            sanitized.typeMultipliers[tileType][resourceType] = multiplier;
          }
        }
      }
    }
  }
  
  return sanitized;
}

/**
 * プリセットから設定を取得
 */
export function getPresetConfig(presetName: string): ResourceConfig | null {
  const preset = RESOURCE_CONFIG_PRESETS.find(p => p.name === presetName);
  return preset ? { ...preset.config } : null;
}

export class ResourceManager {
  private config: ResourceConfig;
  private currentTick: number = 0;
  private lastUpdateTick: number = 0;

  constructor(config?: Partial<ResourceConfig>) {
    // 設定を検証・サニタイズして適用
    this.config = sanitizeResourceConfig(config || {});
  }

  /**
   * 時間ティックを更新（TimeManagerから呼び出される）
   */
  updateTick(currentTick: number): void {
    this.currentTick = currentTick;
  }

  /**
   * フレーム数を更新（後方互換性のため残す）
   * @deprecated TimeManagerのupdateTickを使用してください
   */
  updateFrame(): void {
    this.currentTick++;
  }

  /**
   * タイルから資源を採取し、消耗状態を更新
   * @param tile 採取対象のタイル
   * @param resourceType 採取する資源タイプ
   * @param requestedAmount 要求採取量
   * @returns 実際に採取できた量
   */
  harvestResource(
    tile: Tile, 
    resourceType: keyof Tile['resources'], 
    requestedAmount: number
  ): number {
    // 現在の資源量を確認
    const currentAmount = tile.resources[resourceType];
    
    // 採取可能量を計算（要求量と現在量の小さい方）
    const harvestableAmount = Math.min(requestedAmount, currentAmount);
    
    if (harvestableAmount <= 0) {
      return 0;
    }

    // 資源量を減少
    tile.resources[resourceType] -= harvestableAmount;
    
    // 消耗状態を更新
    const maxAmount = tile.maxResources[resourceType];
    if (maxAmount > 0) {
      tile.depletionState[resourceType] = tile.resources[resourceType] / maxAmount;
    } else {
      tile.depletionState[resourceType] = 0;
    }
    
    // 最後の採取時間を更新
    tile.lastHarvestTime = this.currentTick;
    
    // 完全に枯渇した場合、回復タイマーを設定
    if (tile.resources[resourceType] === 0) {
      tile.recoveryTimer[resourceType] = this.currentTick + this.config.recoveryDelay;
    }

    return harvestableAmount;
  }

  /**
   * タイルの資源回復を処理
   * @param tile 回復対象のタイル
   */
  updateRecovery(tile: Tile): void {
    const resourceTypes: (keyof Tile['resources'])[] = ['food', 'wood', 'ore'];
    
    resourceTypes.forEach(resourceType => {
      const currentAmount = tile.resources[resourceType];
      const maxAmount = tile.maxResources[resourceType];
      const depletionState = tile.depletionState[resourceType];
      
      // 最大量が0の場合は回復しない
      if (maxAmount === 0) {
        return;
      }
      
      // 既に満タンの場合は回復しない
      if (currentAmount >= maxAmount) {
        tile.resources[resourceType] = maxAmount; // 念のため上限を設定
        tile.depletionState[resourceType] = 1;
        return;
      }
      
      // 完全に枯渇している場合、回復遅延をチェック
      if (currentAmount === 0 && this.currentTick < tile.recoveryTimer[resourceType]) {
        return;
      }
      
      // 回復閾値をチェック
      if (depletionState > this.config.minRecoveryThreshold && currentAmount > 0) {
        // 閾値を超えている場合は通常回復
      } else if (currentAmount === 0) {
        // 完全枯渇からの回復
      } else {
        // 閾値以下での回復
      }
      
      // タイルタイプに基づく回復率の調整
      const typeMultiplier = this.config.typeMultipliers[tile.type]?.[resourceType] || 1;
      const effectiveRecoveryRate = this.config.recoveryRate * typeMultiplier;
      
      // 回復量を計算
      const recoveryAmount = maxAmount * effectiveRecoveryRate;
      const newAmount = Math.min(maxAmount, currentAmount + recoveryAmount);
      
      // 資源量と消耗状態を更新
      tile.resources[resourceType] = newAmount;
      tile.depletionState[resourceType] = newAmount / maxAmount;
      
      // 完全回復した場合、回復タイマーをリセット
      if (newAmount >= maxAmount) {
        tile.recoveryTimer[resourceType] = 0;
      }
    });
  }

  /**
   * 神の介入による直接的な資源調整
   * @param tile 調整対象のタイル
   * @param resourceType 調整する資源タイプ
   * @param newAmount 新しい資源量
   */
  divineIntervention(
    tile: Tile, 
    resourceType: keyof Tile['resources'], 
    newAmount: number
  ): void {
    const maxAmount = tile.maxResources[resourceType];
    
    // 値を0から最大値の範囲に制限
    const clampedAmount = Math.max(0, Math.min(maxAmount, newAmount));
    
    // 資源量を設定
    tile.resources[resourceType] = clampedAmount;
    
    // 消耗状態を更新
    if (maxAmount > 0) {
      tile.depletionState[resourceType] = clampedAmount / maxAmount;
    } else {
      tile.depletionState[resourceType] = 0;
    }
    
    // 枯渇状態から回復した場合、回復タイマーをリセット
    if (clampedAmount > 0) {
      tile.recoveryTimer[resourceType] = 0;
    }
    
    // 最後の採取時間を更新（神の介入も一種の変更として記録）
    tile.lastHarvestTime = this.currentTick;
  }

  /**
   * タイルの視覚状態を計算
   * @param tile 対象のタイル
   * @returns 視覚状態情報
   */
  getVisualState(tile: Tile): ResourceVisualState {
    // 全資源の平均消耗状態を計算
    const depletionStates = [
      tile.depletionState.food,
      tile.depletionState.wood,
      tile.depletionState.ore
    ];
    
    // 最大資源量がある資源のみを考慮
    const validStates = depletionStates.filter((_, index) => {
      const resourceTypes: (keyof Tile['resources'])[] = ['food', 'wood', 'ore'];
      return tile.maxResources[resourceTypes[index]] > 0;
    });
    
    if (validStates.length === 0) {
      return {
        opacity: 1.0,
        tint: 0xffffff,
        isDepleted: false,
        recoveryProgress: 0
      };
    }
    
    const averageDepletion = validStates.reduce((sum, state) => sum + state, 0) / validStates.length;
    
    // 透明度を計算（0.3-1.0の範囲）
    const opacity = 0.3 + (averageDepletion * 0.7);
    
    // 色調を計算（枯渇時は赤みがかる）
    let tint = 0xffffff; // 白（通常）
    if (averageDepletion < 0.3) {
      // 枯渇気味の場合、赤みを加える
      const redIntensity = Math.floor((1 - averageDepletion / 0.3) * 100);
      tint = (0xff << 16) | ((0xff - redIntensity) << 8) | (0xff - redIntensity);
    }
    
    // 完全枯渇フラグ（有効な資源がすべて0の場合）
    const isDepleted = validStates.length > 0 && validStates.every(state => state === 0);
    
    // 回復進行度を計算
    let recoveryProgress = 0;
    if (isDepleted) {
      // 枯渇している場合、回復タイマーに基づいて進行度を計算
      const resourceTypes: (keyof Tile['resources'])[] = ['food', 'wood', 'ore'];
      const activeTimers = resourceTypes
        .filter(type => tile.maxResources[type] > 0 && tile.resources[type] === 0)
        .map(type => tile.recoveryTimer[type]);
      
      if (activeTimers.length > 0) {
        const minTimer = Math.min(...activeTimers);
        const timeSinceDepletion = this.currentTick - (minTimer - this.config.recoveryDelay);
        recoveryProgress = Math.max(0, Math.min(1, timeSinceDepletion / this.config.recoveryDelay));
      }
    } else {
      recoveryProgress = averageDepletion;
    }
    
    return {
      opacity,
      tint,
      isDepleted,
      recoveryProgress
    };
  }

  /**
   * 設定を取得
   */
  getConfig(): ResourceConfig {
    return { ...this.config };
  }

  /**
   * 設定を更新（検証付き）
   */
  updateConfig(newConfig: Partial<ResourceConfig>): ResourceConfigValidationResult {
    const validation = validateResourceConfig(newConfig);
    
    if (validation.isValid) {
      this.config = { ...this.config, ...newConfig };
    } else {
      // エラーがある場合はサニタイズした設定を適用
      this.config = sanitizeResourceConfig({ ...this.config, ...newConfig });
    }
    
    return validation;
  }

  /**
   * プリセット設定を適用
   */
  applyPreset(presetName: string): boolean {
    const presetConfig = getPresetConfig(presetName);
    if (presetConfig) {
      this.config = presetConfig;
      return true;
    }
    return false;
  }

  /**
   * 利用可能なプリセット一覧を取得
   */
  getAvailablePresets(): ResourceConfigPreset[] {
    return [...RESOURCE_CONFIG_PRESETS];
  }

  /**
   * 現在の設定を検証
   */
  validateCurrentConfig(): ResourceConfigValidationResult {
    return validateResourceConfig(this.config);
  }
}