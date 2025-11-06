// src/game-systems/economy/resource-manager.ts

import { 
  getGlobalSettingsManager, 
  type ResourceConfig,
  type SettingsValidationResult 
} from "../../settings";
import type { Tile } from "../world/map";

export interface ResourceVisualState {
  opacity: number; // 0.3-1.0, 資源量に基づく透明度
  tint: number; // 色調整（枯渇時は赤みがかる）
  isDepleted: boolean; // 完全枯渇フラグ
  recoveryProgress: number; // 0-1, 回復進行度
}

export class ResourceManager {
  private settingsManager = getGlobalSettingsManager();
  private currentTick: number = 0;

  constructor() {
    // 設定は統合設定システムから取得
  }

  /**
   * 現在の資源設定を取得
   */
  private getConfig(): ResourceConfig {
    return this.settingsManager.getSettings().resources;
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
    resourceType: keyof Tile["resources"],
    requestedAmount: number,
  ): number {
    const config = this.getConfig();
    
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
      tile.depletionState[resourceType] =
        tile.resources[resourceType] / maxAmount;
    } else {
      tile.depletionState[resourceType] = 0;
    }

    // 最後の採取時間を更新
    tile.lastHarvestTime = this.currentTick;

    // 完全に枯渇した場合、回復タイマーを設定
    if (tile.resources[resourceType] === 0) {
      tile.recoveryTimer[resourceType] =
        this.currentTick + config.recoveryDelay;
    }

    return harvestableAmount;
  }

  /**
   * タイルの資源回復を処理
   * @param tile 回復対象のタイル
   */
  updateRecovery(tile: Tile): void {
    const config = this.getConfig();
    const resourceTypes: (keyof Tile["resources"])[] = ["food", "wood", "ore"];

    resourceTypes.forEach((resourceType) => {
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
      if (
        currentAmount === 0 &&
        this.currentTick < tile.recoveryTimer[resourceType]
      ) {
        return;
      }

      // 回復閾値をチェック
      if (
        depletionState > config.minRecoveryThreshold &&
        currentAmount > 0
      ) {
        // 閾値を超えている場合は通常回復
      } else if (currentAmount === 0) {
        // 完全枯渇からの回復
      } else {
        // 閾値以下での回復
      }

      // タイルタイプに基づく回復率の調整
      const typeMultiplier =
        config.typeMultipliers[tile.type]?.[resourceType] || 1;
      const effectiveRecoveryRate = config.recoveryRate * typeMultiplier;

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
    resourceType: keyof Tile["resources"],
    newAmount: number,
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
    const config = this.getConfig();
    
    // 全資源の平均消耗状態を計算
    const depletionStates = [
      tile.depletionState.food,
      tile.depletionState.wood,
      tile.depletionState.ore,
    ];

    // 最大資源量がある資源のみを考慮
    const validStates = depletionStates.filter((_, index) => {
      const resourceTypes: (keyof Tile["resources"])[] = [
        "food",
        "wood",
        "ore",
      ];
      return tile.maxResources[resourceTypes[index]] > 0;
    });

    if (validStates.length === 0) {
      return {
        opacity: 1.0,
        tint: 0xffffff,
        isDepleted: false,
        recoveryProgress: 0,
      };
    }

    const averageDepletion =
      validStates.reduce((sum, state) => sum + state, 0) / validStates.length;

    // 透明度を計算（0.3-1.0の範囲）
    const opacity = 0.3 + averageDepletion * 0.7;

    // 色調を計算（枯渇時は赤みがかる）
    let tint = 0xffffff; // 白（通常）
    if (averageDepletion < 0.3) {
      // 枯渇気味の場合、赤みを加える
      const redIntensity = Math.floor((1 - averageDepletion / 0.3) * 100);
      tint =
        (0xff << 16) | ((0xff - redIntensity) << 8) | (0xff - redIntensity);
    }

    // 完全枯渇フラグ（有効な資源がすべて0の場合）
    const isDepleted =
      validStates.length > 0 && validStates.every((state) => state === 0);

    // 回復進行度を計算
    let recoveryProgress = 0;
    if (isDepleted) {
      // 枯渇している場合、回復タイマーに基づいて進行度を計算
      const resourceTypes: (keyof Tile["resources"])[] = [
        "food",
        "wood",
        "ore",
      ];
      const activeTimers = resourceTypes
        .filter(
          (type) => tile.maxResources[type] > 0 && tile.resources[type] === 0,
        )
        .map((type) => tile.recoveryTimer[type]);

      if (activeTimers.length > 0) {
        const minTimer = Math.min(...activeTimers);
        const timeSinceDepletion =
          this.currentTick - (minTimer - config.recoveryDelay);
        recoveryProgress = Math.max(
          0,
          Math.min(1, timeSinceDepletion / config.recoveryDelay),
        );
      }
    } else {
      recoveryProgress = averageDepletion;
    }

    return {
      opacity,
      tint,
      isDepleted,
      recoveryProgress,
    };
  }

  /**
   * 設定を更新（統合設定システム経由）
   */
  updateConfig(newConfig: Partial<ResourceConfig>): SettingsValidationResult {
    return this.settingsManager.updateSettings({
      resources: newConfig
    });
  }

  /**
   * プリセット設定を適用（統合設定システム経由）
   */
  applyPreset(presetName: string): boolean {
    const presets = this.settingsManager.getSettings();
    // プリセットは統合設定システムで管理されているため、
    // applySettingsPreset関数を使用することを推奨
    return false; // この機能は統合設定システムに移行
  }

  /**
   * 現在の設定を検証
   */
  validateCurrentConfig(): SettingsValidationResult {
    return this.settingsManager.validateSettings(this.settingsManager.getSettings());
  }
}
