/**
 * SupplyDemand設定のテスト
 * 要件 2.1, 3.1, 6.1 の設定値妥当性検証機能をテスト
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_SUPPLY_DEMAND_CONFIG,
  getGlobalSettings,
  getGlobalSettingsManager,
  SettingsManager,
  type SupplyDemandConfig,
  updateGlobalSettings,
} from "../settings";

describe("SupplyDemand設定システム", () => {
  let settingsManager: SettingsManager;

  beforeEach(() => {
    settingsManager = SettingsManager.getInstance();
    settingsManager.resetToDefaults();
  });

  describe("設定値の妥当性検証", () => {
    it("デフォルト設定は有効である", () => {
      const result = settingsManager.validateSettings({
        supplyDemand: DEFAULT_SUPPLY_DEMAND_CONFIG,
        resources: settingsManager.getSettings().resources,
        time: settingsManager.getSettings().time,
        graphics: settingsManager.getSettings().graphics,
        gameplay: settingsManager.getSettings().gameplay,
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("範囲外の値を検出してエラーを返す", () => {
      const invalidConfig: SupplyDemandConfig = {
        ...DEFAULT_SUPPLY_DEMAND_CONFIG,
        foodConsumptionPerPerson: -1, // 最小値0.1未満
        populationGrowthRate: 0.2, // 最大値0.1超過
      };

      const result = settingsManager.validateSettings({
        supplyDemand: invalidConfig,
        resources: settingsManager.getSettings().resources,
        time: settingsManager.getSettings().time,
        graphics: settingsManager.getSettings().graphics,
        gameplay: settingsManager.getSettings().gameplay,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
    });

    it("設定を更新できる", () => {
      const result = settingsManager.updateSettings({
        supplyDemand: { foodConsumptionPerPerson: 0.8 },
      });

      expect(result.isValid).toBe(true);
      expect(
        settingsManager.getSettings().supplyDemand.foodConsumptionPerPerson,
      ).toBe(0.8);
    });

    it("デフォルト値にリセットできる", () => {
      settingsManager.updateSettings({
        supplyDemand: { foodConsumptionPerPerson: 0.8 },
      });
      settingsManager.resetToDefaults();

      expect(settingsManager.getSettings().supplyDemand).toEqual(
        DEFAULT_SUPPLY_DEMAND_CONFIG,
      );
    });

    it("無効な設定値は自動修正される", () => {
      const result = settingsManager.updateSettings({
        supplyDemand: {
          ...DEFAULT_SUPPLY_DEMAND_CONFIG,
          foodConsumptionPerPerson: -1, // 無効値
        },
      });

      expect(result.isValid).toBe(false);
      expect(result.correctedSettings).toBeDefined();
    });
  });
});

describe("グローバル設定管理", () => {
  it("グローバル設定マネージャーを取得できる", () => {
    const manager1 = getGlobalSettingsManager();
    const manager2 = getGlobalSettingsManager();
    expect(manager1).toBe(manager2); // シングルトン
  });

  it("グローバル設定を取得できる", () => {
    // 設定をリセットしてからテスト
    getGlobalSettingsManager().resetToDefaults();
    const settings = getGlobalSettings();
    expect(settings.supplyDemand).toEqual(DEFAULT_SUPPLY_DEMAND_CONFIG);
  });

  it("グローバル設定を更新できる", () => {
    const result = updateGlobalSettings({
      supplyDemand: { foodConsumptionPerPerson: 0.6 },
    });
    expect(result.isValid).toBe(true);
    expect(getGlobalSettings().supplyDemand.foodConsumptionPerPerson).toBe(0.6);
  });
});
