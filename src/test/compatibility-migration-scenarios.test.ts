/**
 * 設定システム移行シナリオテスト
 * 要件 4.1, 4.2, 5.1 に対応
 * 
 * このテストファイルは設定システムの移行シナリオをテストします:
 * - 新しい設定システムの動作確認
 * - 設定の移行と検証
 * - エラー回復とフォールバック
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getGlobalSettings,
  getGlobalSettingsManager,
  updateGlobalSettings,
  SettingsManager,
  DEFAULT_GAME_SETTINGS,
  applySettingsPreset,
  PartialGameSettings
} from '../settings';

describe('設定システム移行シナリオテスト', () => {
  let settingsManager: SettingsManager;

  beforeEach(() => {
    settingsManager = SettingsManager.getInstance();
    settingsManager.resetToDefaults();
  });

  describe('基本移行シナリオ', () => {
    it('デフォルト設定から新しい設定システムに移行できる', () => {
      // 初期状態の確認
      const initialSettings = settingsManager.getSettings();
      expect(initialSettings).toEqual(DEFAULT_GAME_SETTINGS);

      // 設定を更新
      const result = settingsManager.updateSettings({
        resources: { depletionRate: 0.15 },
        supplyDemand: { foodConsumptionPerPerson: 0.6 }
      });

      expect(result.isValid).toBe(true);

      const updatedSettings = settingsManager.getSettings();
      expect(updatedSettings.resources.depletionRate).toBe(0.15);
      expect(updatedSettings.supplyDemand.foodConsumptionPerPerson).toBe(0.6);
    });

    it('プリセット適用による移行シナリオ', () => {
      // easyプリセットを適用
      const result = applySettingsPreset('easy');
      expect(result).toBeDefined();
      expect(result!.isValid).toBe(true);

      const settings = getGlobalSettings();
      expect(settings.gameplay.difficulty).toBe('easy');

      // hardプリセットに変更
      const hardResult = applySettingsPreset('hard');
      expect(hardResult).toBeDefined();
      expect(hardResult!.isValid).toBe(true);

      const hardSettings = getGlobalSettings();
      expect(hardSettings.gameplay.difficulty).toBe('hard');
    });
  });

  describe('エラー回復シナリオ', () => {
    it('無効な設定値からの自動回復', () => {
      // 無効な設定を適用
      const result = settingsManager.updateSettings({
        resources: {
          depletionRate: -1,    // 無効値
          recoveryRate: 2.0     // 無効値
        }
      });

      expect(result.isValid).toBe(false);
      expect(result.correctedSettings).toBeDefined();

      // 設定が自動修正されていることを確認
      const settings = settingsManager.getSettings();
      expect(settings.resources.depletionRate).toBeGreaterThanOrEqual(0);
      expect(settings.resources.recoveryRate).toBeLessThanOrEqual(1);
    });

    it('部分的な設定エラーからの回復', () => {
      // 一部有効、一部無効な設定
      const result = settingsManager.updateSettings({
        resources: {
          depletionRate: 0.1,   // 有効
          recoveryRate: -1      // 無効
        },
        supplyDemand: {
          foodConsumptionPerPerson: 0.5 // 有効
        }
      });

      expect(result.isValid).toBe(false);

      const settings = settingsManager.getSettings();
      expect(settings.resources.depletionRate).toBe(0.1); // 有効な値は適用される
      expect(settings.supplyDemand.foodConsumptionPerPerson).toBe(0.5); // 有効な値は適用される
      expect(settings.resources.recoveryRate).toBeGreaterThanOrEqual(0); // 無効な値は修正される
    });
  });

  describe('グローバル設定移行シナリオ', () => {
    it('グローバル設定の一括更新', () => {
      const result = updateGlobalSettings({
        resources: { depletionRate: 0.2 },
        supplyDemand: { foodConsumptionPerPerson: 0.7 },
        gameplay: { difficulty: 'hard' }
      });

      expect(result.isValid).toBe(true);

      const settings = getGlobalSettings();
      expect(settings.resources.depletionRate).toBe(0.2);
      expect(settings.supplyDemand.foodConsumptionPerPerson).toBe(0.7);
      expect(settings.gameplay.difficulty).toBe('hard');
    });

    it('グローバル設定マネージャーの一貫性', () => {
      const manager1 = getGlobalSettingsManager();
      const manager2 = getGlobalSettingsManager();

      expect(manager1).toBe(manager2);

      // 一方で設定を変更
      manager1.updateSettings({ resources: { depletionRate: 0.3 } });

      // 他方でも同じ設定が反映されることを確認
      const settings = manager2.getSettings();
      expect(settings.resources.depletionRate).toBe(0.3);
    });
  });

  describe('設定検証移行シナリオ', () => {
    it('複雑な設定検証シナリオ', () => {
      const complexSettings: PartialGameSettings = {
        resources: {
          depletionRate: 0.1,
          recoveryRate: 0.05,
          typeMultipliers: {
            forest: { wood: 2.0, food: 1.2, ore: 0.5 },
            mountain: { ore: 2.5, wood: 0.3, food: 0.2 },
            water: {
              food: 0,
              wood: 0,
              ore: 0
            },
            land: {
              food: 0,
              wood: 0,
              ore: 0
            },
            road: {
              food: 0,
              wood: 0,
              ore: 0
            }
          }
        },
        supplyDemand: {
          foodConsumptionPerPerson: 0.5,
          populationGrowthRate: 0.02,
          buildingWoodCost: 10,
          buildingOreCost: 5
        },
        time: {
          gameSpeed: 1.0,
          ticksPerSecond: 2.0  // 制約内の値に修正（0.1-10の範囲）
        }
      };

      const result = settingsManager.updateSettings(complexSettings);
      expect(result.isValid).toBe(true);

      const settings = settingsManager.getSettings();
      expect(settings.resources.typeMultipliers.forest.wood).toBe(2.0);
      expect(settings.supplyDemand.buildingWoodCost).toBe(10);
      expect(settings.time.gameSpeed).toBe(1.0);
    });

    it('設定統計による健全性チェック', () => {
      // 様々な設定を適用
      settingsManager.updateSettings({
        resources: { depletionRate: 0.05 }, // 低い値
        supplyDemand: { foodConsumptionPerPerson: 1.5 }, // 高い値
        gameplay: { difficulty: 'extreme' }
      });

      const stats = settingsManager.getSettingsStats();
      expect(stats.totalFields).toBeGreaterThan(0);
      expect(stats.validFields).toBeGreaterThan(0);
      expect(['excellent', 'good', 'warning', 'error']).toContain(stats.overallHealth);
    });
  });

  describe('設定エクスポート・インポート移行', () => {
    it('設定のエクスポートとインポート', () => {
      // カスタム設定を適用
      settingsManager.updateSettings({
        resources: { depletionRate: 0.12 },
        supplyDemand: { foodConsumptionPerPerson: 0.8 },
        gameplay: { difficulty: 'hard' }
      });

      // エクスポート
      const exportedJson = settingsManager.exportSettings();
      expect(typeof exportedJson).toBe('string');

      // 設定をリセット
      settingsManager.resetToDefaults();
      expect(settingsManager.getSettings().resources.depletionRate).toBe(DEFAULT_GAME_SETTINGS.resources.depletionRate);

      // インポート
      const importResult = settingsManager.importSettings(exportedJson);
      expect(importResult.success).toBe(true);

      // 設定が復元されていることを確認
      const restoredSettings = settingsManager.getSettings();
      expect(restoredSettings.resources.depletionRate).toBe(0.12);
      expect(restoredSettings.supplyDemand.foodConsumptionPerPerson).toBe(0.8);
      expect(restoredSettings.gameplay.difficulty).toBe('hard');
    });

    it('破損した設定ファイルからの回復', () => {
      // 完全に無効なJSONを使用
      const corruptedJson = '{ invalid json syntax';

      const importResult = settingsManager.importSettings(corruptedJson);
      expect(importResult.success).toBe(false);
      expect(importResult.error).toBeDefined();

      // 設定は変更されていないことを確認
      const settings = settingsManager.getSettings();
      expect(settings).toEqual(DEFAULT_GAME_SETTINGS);
    });
  });
});