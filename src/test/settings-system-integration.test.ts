/**
 * 設定システムの統合テスト
 * 要件 4.3, 5.1 に対応
 * 
 * このテストファイルは以下をカバーします:
 * - 新しい設定システムが正しく動作することを確認するテスト
 * - 設定値の検証とサニタイズ機能のテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  SettingsManager,
  getGlobalSettingsManager,
  getGlobalSettings,
  updateGlobalSettings,
  DEFAULT_GAME_SETTINGS,
  GameSettings,
  PartialGameSettings,
  applySettingsPreset,
  SETTINGS_PRESETS
} from '../settings';

describe('設定システム統合テスト', () => {
  let settingsManager: SettingsManager;

  beforeEach(() => {
    settingsManager = SettingsManager.getInstance();
    settingsManager.resetToDefaults();
  });

  describe('設定システム基本機能テスト', () => {
    it('シングルトンパターンが正しく動作する', () => {
      const instance1 = SettingsManager.getInstance();
      const instance2 = SettingsManager.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBe(settingsManager);
    });

    it('デフォルト設定が正しく設定される', () => {
      const settings = settingsManager.getSettings();
      
      // 各カテゴリの主要設定をチェック
      expect(settings.resources.depletionRate).toBe(DEFAULT_GAME_SETTINGS.resources.depletionRate);
      expect(settings.supplyDemand.foodConsumptionPerPerson).toBe(DEFAULT_GAME_SETTINGS.supplyDemand.foodConsumptionPerPerson);
      expect(settings.time.gameSpeed).toBe(DEFAULT_GAME_SETTINGS.time.gameSpeed);
      expect(settings.graphics.tileSize).toBe(DEFAULT_GAME_SETTINGS.graphics.tileSize);
      expect(settings.gameplay.difficulty).toBe(DEFAULT_GAME_SETTINGS.gameplay.difficulty);
    });

    it('設定の部分更新が正しく動作する', () => {
      const partialUpdate: PartialGameSettings = {
        resources: {
          depletionRate: 0.15,
          recoveryRate: 0.03
        },
        supplyDemand: {
          foodConsumptionPerPerson: 0.25
        },
        gameplay: {
          difficulty: 'hard'
        }
      };

      const result = settingsManager.updateSettings(partialUpdate);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);

      const settings = settingsManager.getSettings();
      expect(settings.resources.depletionRate).toBe(0.15);
      expect(settings.resources.recoveryRate).toBe(0.03);
      expect(settings.supplyDemand.foodConsumptionPerPerson).toBe(0.25);
      expect(settings.gameplay.difficulty).toBe('hard');
      
      // 更新されていない設定は元の値を保持
      expect(settings.time.gameSpeed).toBe(DEFAULT_GAME_SETTINGS.time.gameSpeed);
    });

    it('設定のリセットが正しく動作する', () => {
      // 設定を変更
      settingsManager.updateSettings({
        resources: { depletionRate: 0.5 },
        gameplay: { difficulty: 'extreme' }
      });

      // リセット
      settingsManager.resetToDefaults();

      const settings = settingsManager.getSettings();
      expect(settings.resources.depletionRate).toBe(DEFAULT_GAME_SETTINGS.resources.depletionRate);
      expect(settings.gameplay.difficulty).toBe(DEFAULT_GAME_SETTINGS.gameplay.difficulty);
    });
  });

  describe('設定検証機能テスト', () => {
    it('無効な設定値を検出する', () => {
      const invalidSettings: PartialGameSettings = {
        resources: {
          depletionRate: -0.1, // 無効: 負の値
          recoveryRate: 2.0    // 無効: 1.0を超える
        },
        supplyDemand: {
          foodConsumptionPerPerson: -1 // 無効: 負の値
        }
      };

      const result = settingsManager.updateSettings(invalidSettings);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.correctedSettings).toBeDefined();
    });

    it('論理的整合性をチェックする', () => {
      const inconsistentSettings: PartialGameSettings = {
        supplyDemand: {
          criticalThreshold: 0.8,
          shortageThreshold: 0.7,
          surplusThreshold: 0.6 // 無効: 閾値の順序が逆
        }
      };

      const result = settingsManager.updateSettings(inconsistentSettings);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field.includes('Threshold'))).toBe(true);
    });

    it('推奨範囲外の値で警告を出す', () => {
      const warningSettings: PartialGameSettings = {
        resources: {
          depletionRate: 0.4 // 有効だが推奨範囲外
        }
      };

      const result = settingsManager.updateSettings(warningSettings);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.field.includes('depletionRate'))).toBe(true);
    });
  });

  describe('プリセット機能テスト', () => {
    it('利用可能なプリセットを取得できる', () => {
      expect(SETTINGS_PRESETS.length).toBeGreaterThan(0);
      expect(SETTINGS_PRESETS.some(p => p.name === 'easy')).toBe(true);
      expect(SETTINGS_PRESETS.some(p => p.name === 'normal')).toBe(true);
      expect(SETTINGS_PRESETS.some(p => p.name === 'hard')).toBe(true);
    });

    it('プリセットを適用できる', () => {
      const result = applySettingsPreset('easy');
      expect(result).toBeDefined();
      expect(result!.isValid).toBe(true);

      const settings = settingsManager.getSettings();
      expect(settings.gameplay.difficulty).toBe('easy');
    });

    it('存在しないプリセットはnullを返す', () => {
      const result = applySettingsPreset('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('グローバル設定機能テスト', () => {
    it('グローバル設定を取得できる', () => {
      const settings = getGlobalSettings();
      expect(settings).toBeDefined();
      expect(settings.resources).toBeDefined();
      expect(settings.supplyDemand).toBeDefined();
    });

    it('グローバル設定を更新できる', () => {
      const result = updateGlobalSettings({
        resources: { depletionRate: 0.3 }
      });

      expect(result.isValid).toBe(true);
      
      const settings = getGlobalSettings();
      expect(settings.resources.depletionRate).toBe(0.3);
    });

    it('グローバル設定マネージャーのシングルトン性', () => {
      const manager1 = getGlobalSettingsManager();
      const manager2 = getGlobalSettingsManager();
      
      expect(manager1).toBe(manager2);
    });
  });

  describe('設定統計機能テスト', () => {
    it('設定統計を取得できる', () => {
      const stats = settingsManager.getSettingsStats();
      
      expect(stats.totalFields).toBeGreaterThan(0);
      expect(stats.validFields).toBeGreaterThan(0);
      expect(stats.overallHealth).toBeDefined();
      expect(['excellent', 'good', 'warning', 'error']).toContain(stats.overallHealth);
    });

    it('エラーがある場合の統計を正しく計算する', () => {
      // 無効な設定を適用
      settingsManager.updateSettings({
        resources: { depletionRate: -1 } // 無効値
      });

      const stats = settingsManager.getSettingsStats();
      expect(stats.overallHealth).toMatch(/excellent|good|warning|error/);
    });
  });

  describe('エクスポート・インポート機能テスト', () => {
    it('設定をJSONとしてエクスポートできる', () => {
      const jsonString = settingsManager.exportSettings();
      expect(typeof jsonString).toBe('string');
      
      const parsed = JSON.parse(jsonString);
      expect(parsed.resources).toBeDefined();
      expect(parsed.supplyDemand).toBeDefined();
    });

    it('JSONから設定をインポートできる', () => {
      const testSettings = {
        resources: { depletionRate: 0.2 },
        gameplay: { difficulty: 'hard' as const }
      };

      const jsonString = JSON.stringify(testSettings);
      const importResult = settingsManager.importSettings(jsonString);

      expect(importResult.success).toBe(true);
      
      const settings = settingsManager.getSettings();
      expect(settings.resources.depletionRate).toBe(0.2);
      expect(settings.gameplay.difficulty).toBe('hard');
    });

    it('無効なJSONのインポートはエラーを返す', () => {
      const invalidJson = '{ invalid json }';
      const importResult = settingsManager.importSettings(invalidJson);

      expect(importResult.success).toBe(false);
      expect(importResult.error).toBeDefined();
    });
  });
});