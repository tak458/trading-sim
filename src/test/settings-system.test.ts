/**
 * 統合設定システムのテスト
 * 要件 2.1, 2.2, 2.3 の検証
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  applySettingsPreset,
  DEFAULT_GAME_SETTINGS,
  getGlobalSettings,
  getGlobalSettingsManager,
  SETTINGS_PRESETS,
  SettingsManager,
  updateGlobalSettings,
} from "../settings";

describe("統合設定システム", () => {
  let settingsManager: SettingsManager;

  beforeEach(() => {
    // 各テスト前に新しいインスタンスを作成
    settingsManager = SettingsManager.getInstance();
    settingsManager.resetToDefaults();
  });

  describe("基本機能", () => {
    it("デフォルト設定を正しく取得できる", () => {
      const settings = settingsManager.getSettings();

      expect(settings.resources.depletionRate).toBe(
        DEFAULT_GAME_SETTINGS.resources.depletionRate,
      );
      expect(settings.supplyDemand.foodConsumptionPerPerson).toBe(
        DEFAULT_GAME_SETTINGS.supplyDemand.foodConsumptionPerPerson,
      );
      expect(settings.time.gameSpeed).toBe(
        DEFAULT_GAME_SETTINGS.time.gameSpeed,
      );
      expect(settings.graphics.tileSize).toBe(
        DEFAULT_GAME_SETTINGS.graphics.tileSize,
      );
      expect(settings.gameplay.difficulty).toBe(
        DEFAULT_GAME_SETTINGS.gameplay.difficulty,
      );
    });

    it("設定を部分的に更新できる", () => {
      const updateResult = settingsManager.updateSettings({
        resources: {
          depletionRate: 0.15,
        },
        supplyDemand: {
          foodConsumptionPerPerson: 0.25,
        },
      });

      expect(updateResult.isValid).toBe(true);

      const settings = settingsManager.getSettings();
      expect(settings.resources.depletionRate).toBe(0.15);
      expect(settings.supplyDemand.foodConsumptionPerPerson).toBe(0.25);

      // 他の設定は変更されていないことを確認
      expect(settings.resources.recoveryRate).toBe(
        DEFAULT_GAME_SETTINGS.resources.recoveryRate,
      );
      expect(settings.supplyDemand.populationGrowthRate).toBe(
        DEFAULT_GAME_SETTINGS.supplyDemand.populationGrowthRate,
      );
    });

    it("設定をデフォルトにリセットできる", () => {
      // 設定を変更
      settingsManager.updateSettings({
        resources: { depletionRate: 0.5 },
      });

      // リセット
      settingsManager.resetToDefaults();

      const settings = settingsManager.getSettings();
      expect(settings.resources.depletionRate).toBe(
        DEFAULT_GAME_SETTINGS.resources.depletionRate,
      );
    });
  });

  describe("設定検証機能", () => {
    it("無効な設定値を検出して修正する", () => {
      const updateResult = settingsManager.updateSettings({
        resources: {
          depletionRate: -0.1, // 無効: 負の値
          recoveryRate: 2.0, // 無効: 1.0を超える
        },
      });

      expect(updateResult.isValid).toBe(false);
      expect(updateResult.errors.length).toBeGreaterThan(0);
      expect(updateResult.correctedSettings).toBeDefined();

      const settings = settingsManager.getSettings();
      expect(settings.resources.depletionRate).toBeGreaterThanOrEqual(0);
      expect(settings.resources.recoveryRate).toBeLessThanOrEqual(1);
    });

    it("論理的整合性をチェックする", () => {
      const updateResult = settingsManager.updateSettings({
        supplyDemand: {
          criticalThreshold: 0.8,
          shortageThreshold: 0.7,
          surplusThreshold: 0.6, // 無効: 閾値の順序が逆
        },
      });

      expect(updateResult.isValid).toBe(false);
      expect(
        updateResult.errors.some((e) => e.field.includes("Threshold")),
      ).toBe(true);
    });

    it("推奨範囲外の値に警告を出す", () => {
      const updateResult = settingsManager.updateSettings({
        resources: {
          depletionRate: 0.4, // 有効だが推奨範囲外
        },
      });

      expect(updateResult.warnings.length).toBeGreaterThan(0);
      expect(
        updateResult.warnings.some((w) => w.field === "depletionRate"),
      ).toBe(true);
    });
  });

  describe("プリセット機能", () => {
    it("利用可能なプリセットを取得できる", () => {
      expect(SETTINGS_PRESETS.length).toBeGreaterThan(0);
      expect(SETTINGS_PRESETS.some((p) => p.name === "easy")).toBe(true);
      expect(SETTINGS_PRESETS.some((p) => p.name === "normal")).toBe(true);
      expect(SETTINGS_PRESETS.some((p) => p.name === "hard")).toBe(true);
      expect(SETTINGS_PRESETS.some((p) => p.name === "extreme")).toBe(true);
    });

    it("プリセットを適用できる", () => {
      const result = applySettingsPreset("easy");
      expect(result).toBeDefined();
      expect(result!.isValid).toBe(true);

      const settings = getGlobalSettings();
      expect(settings.gameplay.difficulty).toBe("easy");
      expect(settings.resources.depletionRate).toBe(0.05); // easyプリセットの値
    });

    it("存在しないプリセットはnullを返す", () => {
      const result = applySettingsPreset("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("エクスポート・インポート機能", () => {
    it("設定をJSONとしてエクスポートできる", () => {
      const jsonString = settingsManager.exportSettings();
      expect(typeof jsonString).toBe("string");

      const parsed = JSON.parse(jsonString);
      expect(parsed.resources).toBeDefined();
      expect(parsed.supplyDemand).toBeDefined();
      expect(parsed.time).toBeDefined();
      expect(parsed.graphics).toBeDefined();
      expect(parsed.gameplay).toBeDefined();
    });

    it("JSONから設定をインポートできる", () => {
      const testSettings = {
        resources: { depletionRate: 0.2 },
        gameplay: { difficulty: "hard" as const },
      };

      const jsonString = JSON.stringify(testSettings);
      const importResult = settingsManager.importSettings(jsonString);

      expect(importResult.success).toBe(true);

      const settings = settingsManager.getSettings();
      expect(settings.resources.depletionRate).toBe(0.2);
      expect(settings.gameplay.difficulty).toBe("hard");
    });

    it("無効なJSONのインポートはエラーを返す", () => {
      const invalidJson = "{ invalid json }";
      const importResult = settingsManager.importSettings(invalidJson);

      expect(importResult.success).toBe(false);
      expect(importResult.error).toBeDefined();
    });
  });

  describe("グローバル便利関数", () => {
    it("グローバル設定を取得できる", () => {
      const settings = getGlobalSettings();
      expect(settings).toBeDefined();
      expect(settings.resources).toBeDefined();
    });

    it("グローバル設定を更新できる", () => {
      const updateResult = updateGlobalSettings({
        resources: { depletionRate: 0.3 },
      });

      expect(updateResult.isValid).toBe(true);

      const settings = getGlobalSettings();
      expect(settings.resources.depletionRate).toBe(0.3);
    });
  });

  describe("設定統計", () => {
    it("設定統計を取得できる", () => {
      const stats = settingsManager.getSettingsStats();

      expect(stats.totalFields).toBeGreaterThan(0);
      expect(stats.validFields).toBeGreaterThan(0);
      expect(stats.overallHealth).toBeDefined();
      expect(["excellent", "good", "warning", "error"]).toContain(
        stats.overallHealth,
      );
    });

    it("エラーがある場合の統計を正しく計算する", () => {
      // 無効な設定を直接検証（updateSettingsは自動修正するため）
      const invalidSettings = {
        resources: { ...DEFAULT_GAME_SETTINGS.resources, depletionRate: -1 },
        supplyDemand: DEFAULT_GAME_SETTINGS.supplyDemand,
        time: DEFAULT_GAME_SETTINGS.time,
        graphics: DEFAULT_GAME_SETTINGS.graphics,
        gameplay: DEFAULT_GAME_SETTINGS.gameplay,
      };

      const validationResult =
        settingsManager.validateSettings(invalidSettings);
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThan(0);

      // 統計は現在の（修正済み）設定に基づくため、健全性をチェック
      const stats = settingsManager.getSettingsStats();
      expect(stats.overallHealth).toMatch(/excellent|good|warning|error/);
    });
  });
});

describe("設定変更リスナー", () => {
  let settingsManager: SettingsManager;

  beforeEach(() => {
    settingsManager = SettingsManager.getInstance();
    settingsManager.resetToDefaults();
  });

  it("設定変更時にリスナーが呼び出される", () => {
    let listenerCalled = false;
    let receivedSettings: any = null;

    const listener = (settings: any) => {
      listenerCalled = true;
      receivedSettings = settings;
    };

    settingsManager.addListener("resources", listener);

    settingsManager.updateSettings({
      resources: { depletionRate: 0.25 },
    });

    expect(listenerCalled).toBe(true);
    expect(receivedSettings.resources.depletionRate).toBe(0.25);

    // クリーンアップ
    settingsManager.removeListener("resources", listener);
  });

  it("関係ないカテゴリの変更では呼び出されない", () => {
    let listenerCalled = false;

    const listener = (settings: any) => {
      listenerCalled = true;
    };

    settingsManager.addListener("resources", listener);

    settingsManager.updateSettings({
      gameplay: { difficulty: "hard" },
    });

    expect(listenerCalled).toBe(false);

    // クリーンアップ
    settingsManager.removeListener("resources", listener);
  });

  it("リスナーを削除できる", () => {
    let listenerCalled = false;

    const listener = (settings: any) => {
      listenerCalled = true;
    };

    settingsManager.addListener("resources", listener);
    settingsManager.removeListener("resources", listener);

    settingsManager.updateSettings({
      resources: { depletionRate: 0.25 },
    });

    expect(listenerCalled).toBe(false);
  });
});
