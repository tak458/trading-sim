// src/resource-config-ui.ts
import { ResourceConfig, ResourceConfigPreset, RESOURCE_CONFIG_PRESETS, validateResourceConfig, sanitizeResourceConfig, getPresetConfig } from "./resource-manager";

/**
 * 設定UI用の定数とヘルパー関数
 */

export interface ConfigUISlider {
  key: keyof ResourceConfig;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string;
}

export interface ConfigUIMultiplierSlider {
  tileType: 'land' | 'forest' | 'mountain';
  resourceType: 'food' | 'wood' | 'ore';
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

/**
 * メイン設定項目のUI定義
 */
export const CONFIG_UI_SLIDERS: ConfigUISlider[] = [
  {
    key: 'depletionRate',
    label: '消耗率',
    description: '村が資源を採取する際の消耗率（高いほど早く枯渇）',
    min: 0.01,
    max: 0.5,
    step: 0.01,
    defaultValue: 0.1,
    unit: '%'
  },
  {
    key: 'recoveryRate',
    label: '回復率',
    description: '資源の回復速度（高いほど早く回復）',
    min: 0.001,
    max: 0.1,
    step: 0.001,
    defaultValue: 0.02,
    unit: '%/フレーム'
  },
  {
    key: 'recoveryDelay',
    label: '回復遅延',
    description: '完全枯渇後の回復開始までの遅延時間',
    min: 60,
    max: 1800,
    step: 60,
    defaultValue: 300,
    unit: 'フレーム'
  },
  {
    key: 'minRecoveryThreshold',
    label: '回復開始閾値',
    description: '回復が開始される資源量の閾値',
    min: 0.01,
    max: 0.5,
    step: 0.01,
    defaultValue: 0.1,
    unit: '%'
  }
];

/**
 * タイプ別乗数のUI定義
 */
export const MULTIPLIER_UI_SLIDERS: ConfigUIMultiplierSlider[] = [
  // Land multipliers
  { tileType: 'land', resourceType: 'food', label: '土地 - 食料回復', min: 0.1, max: 5.0, step: 0.1, defaultValue: 1.5 },
  { tileType: 'land', resourceType: 'wood', label: '土地 - 木材回復', min: 0.1, max: 5.0, step: 0.1, defaultValue: 0.5 },
  { tileType: 'land', resourceType: 'ore', label: '土地 - 鉱石回復', min: 0.1, max: 5.0, step: 0.1, defaultValue: 0.3 },
  
  // Forest multipliers
  { tileType: 'forest', resourceType: 'food', label: '森林 - 食料回復', min: 0.1, max: 5.0, step: 0.1, defaultValue: 0.8 },
  { tileType: 'forest', resourceType: 'wood', label: '森林 - 木材回復', min: 0.1, max: 5.0, step: 0.1, defaultValue: 2.0 },
  { tileType: 'forest', resourceType: 'ore', label: '森林 - 鉱石回復', min: 0.1, max: 5.0, step: 0.1, defaultValue: 0.2 },
  
  // Mountain multipliers
  { tileType: 'mountain', resourceType: 'food', label: '山 - 食料回復', min: 0.1, max: 5.0, step: 0.1, defaultValue: 0.3 },
  { tileType: 'mountain', resourceType: 'wood', label: '山 - 木材回復', min: 0.1, max: 5.0, step: 0.1, defaultValue: 0.5 },
  { tileType: 'mountain', resourceType: 'ore', label: '山 - 鉱石回復', min: 0.1, max: 5.0, step: 0.1, defaultValue: 2.5 }
];

/**
 * 設定値を表示用の値に変換
 */
export function formatConfigValue(key: keyof ResourceConfig, value: number): string {
  switch (key) {
    case 'depletionRate':
    case 'recoveryRate':
    case 'minRecoveryThreshold':
      return `${(value * 100).toFixed(1)}%`;
    case 'recoveryDelay':
      const seconds = (value / 60).toFixed(1);
      return `${seconds}秒 (${value}フレーム)`;
    default:
      return value.toString();
  }
}

/**
 * 表示用の値を設定値に変換
 */
export function parseConfigValue(key: keyof ResourceConfig, displayValue: string): number {
  const numericValue = parseFloat(displayValue.replace(/[^\d.-]/g, ''));
  
  switch (key) {
    case 'depletionRate':
    case 'recoveryRate':
    case 'minRecoveryThreshold':
      return numericValue / 100; // パーセンテージから小数に変換
    case 'recoveryDelay':
      return numericValue * 60; // 秒からフレームに変換
    default:
      return numericValue;
  }
}

/**
 * 設定の難易度レベルを判定
 */
export function getDifficultyLevel(config: ResourceConfig): string {
  // 各プリセットとの類似度を計算
  let bestMatch = 'custom';
  let bestScore = Infinity;
  
  for (const preset of RESOURCE_CONFIG_PRESETS) {
    const score = calculateConfigDifference(config, preset.config);
    if (score < bestScore) {
      bestScore = score;
      bestMatch = preset.name;
    }
  }
  
  // 閾値以下なら一致とみなす
  return bestScore < 0.001 ? bestMatch : 'custom';
}

/**
 * 2つの設定間の差異を計算
 */
function calculateConfigDifference(config1: ResourceConfig, config2: ResourceConfig): number {
  let totalDiff = 0;
  let count = 0;
  
  // 基本パラメータの差異
  const basicParams: (keyof ResourceConfig)[] = ['depletionRate', 'recoveryRate', 'recoveryDelay', 'minRecoveryThreshold'];
  for (const param of basicParams) {
    if (typeof config1[param] === 'number' && typeof config2[param] === 'number') {
      totalDiff += Math.abs((config1[param] as number) - (config2[param] as number));
      count++;
    }
  }
  
  // タイプ乗数の差異
  const tileTypes = ['land', 'forest', 'mountain'] as const;
  const resourceTypes = ['food', 'wood', 'ore'] as const;
  
  for (const tileType of tileTypes) {
    for (const resourceType of resourceTypes) {
      const val1 = config1.typeMultipliers[tileType][resourceType];
      const val2 = config2.typeMultipliers[tileType][resourceType];
      totalDiff += Math.abs(val1 - val2);
      count++;
    }
  }
  
  return count > 0 ? totalDiff / count : 0;
}

/**
 * 設定の推奨値チェック
 */
export function getConfigRecommendations(config: ResourceConfig): string[] {
  const recommendations: string[] = [];
  
  // バランスチェック
  if (config.depletionRate > config.recoveryRate * 20) {
    recommendations.push("消耗率が回復率に比べて高すぎます。資源が枯渇しやすくなります。");
  }
  
  if (config.recoveryDelay > 900) { // 15秒
    recommendations.push("回復遅延が長すぎます。プレイヤーが待機時間を退屈に感じる可能性があります。");
  }
  
  if (config.minRecoveryThreshold > 0.3) {
    recommendations.push("回復開始閾値が高すぎます。資源の回復が遅れる可能性があります。");
  }
  
  // タイプ乗数のバランスチェック
  const multipliers = config.typeMultipliers;
  
  // 各タイルタイプで最も高い乗数をチェック
  const landMax = Math.max(multipliers.land.food, multipliers.land.wood, multipliers.land.ore);
  const forestMax = Math.max(multipliers.forest.food, multipliers.forest.wood, multipliers.forest.ore);
  const mountainMax = Math.max(multipliers.mountain.food, multipliers.mountain.wood, multipliers.mountain.ore);
  
  if (landMax < 1.0 && forestMax < 1.0 && mountainMax < 1.0) {
    recommendations.push("すべてのタイプ乗数が1.0未満です。資源回復が非常に遅くなります。");
  }
  
  if (Math.max(landMax, forestMax, mountainMax) > 5.0) {
    recommendations.push("一部のタイプ乗数が5.0を超えています。資源回復が早すぎる可能性があります。");
  }
  
  return recommendations;
}

/**
 * 設定のエクスポート/インポート用のJSON文字列化
 */
export function exportConfig(config: ResourceConfig): string {
  return JSON.stringify(config, null, 2);
}

/**
 * JSON文字列から設定をインポート
 */
export function importConfig(jsonString: string): { success: boolean; config?: ResourceConfig; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    const validation = validateResourceConfig(parsed);
    
    if (!validation.isValid) {
      return {
        success: false,
        error: `設定が無効です: ${validation.errors.join(', ')}`
      };
    }
    
    const sanitized = sanitizeResourceConfig(parsed);
    return {
      success: true,
      config: sanitized
    };
  } catch (error) {
    return {
      success: false,
      error: `JSON解析エラー: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}