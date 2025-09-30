/**
 * 設定システムの互換性テスト
 * 要件 4.1, 4.2, 5.1 に対応
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  getGlobalSettings, 
  getGlobalSettingsManager,
  updateGlobalSettings,
  SettingsManager,
  DEFAULT_GAME_SETTINGS,
  applySettingsPreset
} from '../settings';

describe('設定システム互換性テスト', () => {
  let settingsManager: SettingsManager;

  beforeEach(() => {
    settingsManager = SettingsManager.getInstance();
    settingsManager.resetToDefaults();
  });

  describe('基本的な互換性', () => {
    it('グローバル設定の取得が正しく動作する', () => {
      const settings = getGlobalSettings();
      expect(settings).toBeDefined();
      expect(settings.resources).toBeDefined();
      expect(settings.supplyDemand).toBeDefined();
      expect(settings.time).toBeDefined();
      expect(settings.graphics).toBeDefined();
      expect(settings.gameplay).toBeDefined();
    });

    it('グローバル設定の更新が正しく動作する', () => {
      const result = updateGlobalSettings({
        resources: { depletionRate: 0.15 },
        supplyDemand: { foodConsumptionPerPerson: 0.6 }
      });

      expect(result.isValid).toBe(true);
      
      const settings = getGlobalSettings();
      expect(settings.resources.depletionRate).toBe(0.15);
      expect(settings.supplyDemand.foodConsumptionPerPerson).toBe(0.6);
    });

    it('グローバル設定マネージャーのシングルトン性', () => {
      const manager1 = getGlobalSettingsManager();
      const manager2 = getGlobalSettingsManager();
      
      expect(manager1).toBe(manager2);
      expect(manager1).toBe(settingsManager);
    });
  });

  describe('設定値の互換性', () => {
    it('資源設定の互換性', () => {
      const resourceUpdate = {
        resources: {
          depletionRate: 0.1,
          recoveryRate: 0.02,
          recoveryDelay: 10, // 制約内の値に修正（0-60の範囲）
          minRecoveryThreshold: 0.1
        }
      };

      const result = updateGlobalSettings(resourceUpdate);
      expect(result.isValid).toBe(true);

      const settings = getGlobalSettings();
      expect(settings.resources.depletionRate).toBe(0.1);
      expect(settings.resources.recoveryRate).toBe(0.02);
      expect(settings.resources.recoveryDelay).toBe(10);
      expect(settings.resources.minRecoveryThreshold).toBe(0.1);
    });

    it('需給設定の互換性', () => {
      const supplyDemandUpdate = {
        supplyDemand: {
          foodConsumptionPerPerson: 0.5,
          populationGrowthRate: 0.02,
          populationDeclineRate: 0.05,
          buildingWoodCost: 10,
          buildingOreCost: 5
        }
      };

      const result = updateGlobalSettings(supplyDemandUpdate);
      expect(result.isValid).toBe(true);

      const settings = getGlobalSettings();
      expect(settings.supplyDemand.foodConsumptionPerPerson).toBe(0.5);
      expect(settings.supplyDemand.populationGrowthRate).toBe(0.02);
      expect(settings.supplyDemand.buildingWoodCost).toBe(10);
    });

    it('時間設定の互換性', () => {
      const timeUpdate = {
        time: {
          gameSpeed: 1.5,
          ticksPerSecond: 2.0 // 制約内の値に修正（0.1-10の範囲）
        }
      };

      const result = updateGlobalSettings(timeUpdate);
      expect(result.isValid).toBe(true);

      const settings = getGlobalSettings();
      expect(settings.time.gameSpeed).toBe(1.5);
      expect(settings.time.ticksPerSecond).toBe(2.0);
    });
  });

  describe('プリセット互換性', () => {
    it('easyプリセットの適用', () => {
      const result = applySettingsPreset('easy');
      expect(result).toBeDefined();
      expect(result!.isValid).toBe(true);

      const settings = getGlobalSettings();
      expect(settings.gameplay.difficulty).toBe('easy');
    });

    it('hardプリセットの適用', () => {
      const result = applySettingsPreset('hard');
      expect(result).toBeDefined();
      expect(result!.isValid).toBe(true);

      const settings = getGlobalSettings();
      expect(settings.gameplay.difficulty).toBe('hard');
    });

    it('存在しないプリセットの処理', () => {
      const result = applySettingsPreset('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('エラーハンドリング互換性', () => {
    it('無効な設定値の処理', () => {
      const result = updateGlobalSettings({
        resources: {
          depletionRate: -1, // 無効値
          recoveryRate: 2.0  // 無効値
        }
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.correctedSettings).toBeDefined();
    });

    it('部分的な無効設定の処理', () => {
      const result = updateGlobalSettings({
        resources: {
          depletionRate: 0.1,  // 有効
          recoveryRate: -1     // 無効
        },
        supplyDemand: {
          foodConsumptionPerPerson: 0.5 // 有効
        }
      });

      expect(result.isValid).toBe(false);
      
      const settings = getGlobalSettings();
      expect(settings.resources.depletionRate).toBe(0.1); // 有効な値は適用
      expect(settings.supplyDemand.foodConsumptionPerPerson).toBe(0.5); // 有効な値は適用
    });
  });

  describe('設定リセット互換性', () => {
    it('設定リセット後のデフォルト値確認', () => {
      // 設定を変更
      updateGlobalSettings({
        resources: { depletionRate: 0.5 },
        gameplay: { difficulty: 'extreme' }
      });

      // リセット
      settingsManager.resetToDefaults();

      const settings = getGlobalSettings();
      expect(settings.resources.depletionRate).toBe(DEFAULT_GAME_SETTINGS.resources.depletionRate);
      expect(settings.gameplay.difficulty).toBe(DEFAULT_GAME_SETTINGS.gameplay.difficulty);
    });
  });
});