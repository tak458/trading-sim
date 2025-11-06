import { beforeEach, describe, expect, it } from "vitest";
import { ResourceManager } from "../game-systems/economy/resource-manager";
import type { Tile } from "../game-systems/world/map";
import { 
  getGlobalSettingsManager,
  SETTINGS_PRESETS,
  applySettingsPreset
} from "../settings";

describe("資源管理システム - 統合テスト", () => {
  let resourceManager: ResourceManager;
  let testTile: Tile;

  beforeEach(() => {
    resourceManager = new ResourceManager();
    testTile = {
      height: 0.5,
      type: "land",
      resources: { food: 10, wood: 5, ore: 3 },
      maxResources: { food: 10, wood: 5, ore: 3 },
      depletionState: { food: 1, wood: 1, ore: 1 },
      recoveryTimer: { food: 0, wood: 0, ore: 0 },
      lastHarvestTime: 0,
    };
  });

  describe("資源採取 - 単体テスト", () => {
    it("利用可能な時に要求された量を採取する", () => {
      const harvested = resourceManager.harvestResource(testTile, "food", 3);

      expect(harvested).toBe(3);
      expect(testTile.resources.food).toBe(7);
      expect(testTile.depletionState.food).toBe(0.7);
    });

    it("should harvest only available amount when requested exceeds current", () => {
      const harvested = resourceManager.harvestResource(testTile, "ore", 5);

      expect(harvested).toBe(3);
      expect(testTile.resources.ore).toBe(0);
      expect(testTile.depletionState.ore).toBe(0);
    });

    it("should return 0 when no resources available", () => {
      testTile.resources.food = 0;
      const harvested = resourceManager.harvestResource(testTile, "food", 5);

      expect(harvested).toBe(0);
      expect(testTile.resources.food).toBe(0);
    });

    it("should set recovery timer when resource is completely depleted", () => {
      resourceManager.harvestResource(testTile, "ore", 3);

      expect(testTile.recoveryTimer.ore).toBeGreaterThan(0);
    });

    it("should update lastHarvestTime when harvesting", () => {
      const initialTime = testTile.lastHarvestTime;
      resourceManager.updateFrame();
      resourceManager.harvestResource(testTile, "food", 1);

      expect(testTile.lastHarvestTime).toBeGreaterThan(initialTime);
    });

    it("should handle negative harvest amounts gracefully", () => {
      const initialFood = testTile.resources.food;
      const harvested = resourceManager.harvestResource(testTile, "food", -5);

      expect(harvested).toBe(0);
      expect(testTile.resources.food).toBe(initialFood);
    });

    it("should handle zero harvest amounts", () => {
      const initialFood = testTile.resources.food;
      const harvested = resourceManager.harvestResource(testTile, "food", 0);

      expect(harvested).toBe(0);
      expect(testTile.resources.food).toBe(initialFood);
    });

    it("should handle fractional harvest amounts", () => {
      const harvested = resourceManager.harvestResource(testTile, "food", 2.7);

      expect(harvested).toBe(2.7);
      expect(testTile.resources.food).toBe(7.3);
    });
  });

  describe("updateRecovery - Unit Tests", () => {
    it("should recover resources over time", () => {
      testTile.resources.food = 5;
      testTile.depletionState.food = 0.5;

      for (let i = 0; i < 10; i++) {
        resourceManager.updateFrame();
        resourceManager.updateRecovery(testTile);
      }

      expect(testTile.resources.food).toBeGreaterThan(5);
      expect(testTile.depletionState.food).toBeGreaterThan(0.5);
    });

    it("should not exceed maximum resource amount", () => {
      testTile.resources.food = 9;

      for (let i = 0; i < 100; i++) {
        resourceManager.updateFrame();
        resourceManager.updateRecovery(testTile);
      }

      expect(testTile.resources.food).toBe(10);
      expect(testTile.depletionState.food).toBe(1);
    });

    it("should respect recovery delay for depleted resources", () => {
      // 完全に枯渇させる
      resourceManager.harvestResource(testTile, "food", 10);
      expect(testTile.resources.food).toBe(0);

      // 回復遅延期間中は回復しない
      for (let i = 0; i < 100; i++) {
        resourceManager.updateRecovery(testTile);
      }

      // 遅延期間中は回復しないか、わずかな回復のみ
      expect(testTile.resources.food).toBeLessThan(5);
    });

    it("should apply different recovery rates based on tile type", () => {
      const forestTile: Tile = {
        height: 0.5,
        type: "forest",
        resources: { food: 5, wood: 2, ore: 1 },
        maxResources: { food: 10, wood: 10, ore: 5 },
        depletionState: { food: 0.5, wood: 0.2, ore: 0.2 },
        recoveryTimer: { food: 0, wood: 0, ore: 0 },
        lastHarvestTime: 0,
      };

      const mountainTile: Tile = {
        height: 0.8,
        type: "mountain",
        resources: { food: 1, wood: 1, ore: 2 },
        maxResources: { food: 5, wood: 5, ore: 10 },
        depletionState: { food: 0.2, wood: 0.2, ore: 0.2 },
        recoveryTimer: { food: 0, wood: 0, ore: 0 },
        lastHarvestTime: 0,
      };

      const initialForestWood = forestTile.resources.wood;
      const initialMountainOre = mountainTile.resources.ore;

      for (let i = 0; i < 10; i++) {
        resourceManager.updateFrame();
        resourceManager.updateRecovery(forestTile);
        resourceManager.updateRecovery(mountainTile);
      }

      const forestWoodGain = forestTile.resources.wood - initialForestWood;
      const mountainOreGain = mountainTile.resources.ore - initialMountainOre;

      expect(forestWoodGain).toBeGreaterThan(0);
      expect(mountainOreGain).toBeGreaterThan(0);
    });

    it("should start recovery after delay for completely depleted resources", () => {
      resourceManager.harvestResource(testTile, "food", 10);
      expect(testTile.resources.food).toBe(0);

      // Use settings manager to get config instead of private method
      const settingsManager = getGlobalSettingsManager();
      const config = settingsManager.getSettings().resources;
      for (let i = 0; i < config.recoveryDelay + 50; i++) {
        resourceManager.updateFrame();
        resourceManager.updateRecovery(testTile);
      }

      expect(testTile.resources.food).toBeGreaterThan(0);
    });

    it("should handle tiles with zero max resources", () => {
      const emptyTile: Tile = {
        height: 0.2,
        type: "water",
        resources: { food: 0, wood: 0, ore: 0 },
        maxResources: { food: 0, wood: 0, ore: 0 },
        depletionState: { food: 0, wood: 0, ore: 0 },
        recoveryTimer: { food: 0, wood: 0, ore: 0 },
        lastHarvestTime: 0,
      };

      expect(() => {
        for (let i = 0; i < 10; i++) {
          resourceManager.updateFrame();
          resourceManager.updateRecovery(emptyTile);
        }
      }).not.toThrow();

      expect(emptyTile.resources.food).toBe(0);
      expect(emptyTile.resources.wood).toBe(0);
      expect(emptyTile.resources.ore).toBe(0);
    });

    it("should handle recovery with minRecoveryThreshold", () => {
      // Set up tile with resources above threshold
      testTile.resources.food = 8; // 80% of max
      testTile.depletionState.food = 0.8;

      const initialFood = testTile.resources.food;

      // Should not recover much since above threshold
      for (let i = 0; i < 5; i++) {
        resourceManager.updateFrame();
        resourceManager.updateRecovery(testTile);
      }

      // Should recover but slowly since above threshold
      expect(testTile.resources.food).toBeGreaterThanOrEqual(initialFood);
    });
  });

  describe("divineIntervention - Unit Tests", () => {
    it("should set resource amount directly", () => {
      resourceManager.divineIntervention(testTile, "food", 8);

      expect(testTile.resources.food).toBe(8);
      expect(testTile.depletionState.food).toBe(0.8);
    });

    it("should clamp values to valid range", () => {
      resourceManager.divineIntervention(testTile, "food", 15);
      expect(testTile.resources.food).toBe(10);

      resourceManager.divineIntervention(testTile, "food", -5);
      expect(testTile.resources.food).toBe(0);
    });

    it("should reset recovery timer when setting positive amount", () => {
      testTile.recoveryTimer.food = 1000;
      resourceManager.divineIntervention(testTile, "food", 5);

      expect(testTile.recoveryTimer.food).toBe(0);
    });

    it("should update lastHarvestTime", () => {
      const initialTime = testTile.lastHarvestTime;
      resourceManager.updateFrame();
      resourceManager.divineIntervention(testTile, "food", 5);

      expect(testTile.lastHarvestTime).toBeGreaterThan(initialTime);
    });

    it("should handle zero max resources gracefully", () => {
      testTile.maxResources.food = 0;

      expect(() => {
        resourceManager.divineIntervention(testTile, "food", 5);
      }).not.toThrow();

      expect(testTile.resources.food).toBe(0);
      expect(testTile.depletionState.food).toBe(0);
    });

    it("should work with all resource types", () => {
      resourceManager.divineIntervention(testTile, "food", 8);
      resourceManager.divineIntervention(testTile, "wood", 3);
      resourceManager.divineIntervention(testTile, "ore", 2);

      expect(testTile.resources.food).toBe(8);
      expect(testTile.resources.wood).toBe(3);
      expect(testTile.resources.ore).toBe(2);
    });
  });

  describe("getVisualState - Unit Tests", () => {
    it("should return correct visual state for healthy tile", () => {
      const visualState = resourceManager.getVisualState(testTile);

      expect(visualState.opacity).toBe(1.0);
      expect(visualState.tint).toBe(0xffffff);
      expect(visualState.isDepleted).toBe(false);
    });

    it("should return correct visual state for depleted tile", () => {
      testTile.resources = { food: 0, wood: 0, ore: 0 };
      testTile.depletionState = { food: 0, wood: 0, ore: 0 };

      const visualState = resourceManager.getVisualState(testTile);

      expect(visualState.opacity).toBe(0.3);
      expect(visualState.isDepleted).toBe(true);
    });

    it("should calculate opacity based on depletion state", () => {
      testTile.resources = { food: 5, wood: 2, ore: 1 };
      testTile.depletionState = { food: 0.5, wood: 0.4, ore: 0.33 };

      const visualState = resourceManager.getVisualState(testTile);
      const expectedAverage = (0.5 + 0.4 + 0.33) / 3;
      const expectedOpacity = 0.3 + expectedAverage * 0.7;

      expect(visualState.opacity).toBeCloseTo(expectedOpacity, 2);
    });

    it("should handle tiles with mixed resource availability", () => {
      testTile.maxResources = { food: 10, wood: 0, ore: 5 };
      testTile.resources = { food: 5, wood: 0, ore: 2 };
      testTile.depletionState = { food: 0.5, wood: 0, ore: 0.4 };

      const visualState = resourceManager.getVisualState(testTile);

      // Should only consider resources with max > 0
      const expectedAverage = (0.5 + 0.4) / 2;
      const expectedOpacity = 0.3 + expectedAverage * 0.7;

      expect(visualState.opacity).toBeCloseTo(expectedOpacity, 2);
    });

    it("should calculate recovery progress for depleted tiles", () => {
      testTile.resources = { food: 0, wood: 0, ore: 0 };
      testTile.depletionState = { food: 0, wood: 0, ore: 0 };
      testTile.recoveryTimer = { food: 100, wood: 100, ore: 100 };

      // Advance time partially through recovery delay
      for (let i = 0; i < 150; i++) {
        resourceManager.updateFrame();
      }

      const visualState = resourceManager.getVisualState(testTile);

      expect(visualState.isDepleted).toBe(true);
      expect(visualState.recoveryProgress).toBeGreaterThan(0);
      expect(visualState.recoveryProgress).toBeLessThanOrEqual(1);
    });
  });

  describe("Configuration Management", () => {
    it("should use centralized settings system", () => {
      const settingsManager = getGlobalSettingsManager();
      const settings = settingsManager.getSettings();
      
      expect(settings.resources).toBeDefined();
      expect(settings.resources.depletionRate).toBeDefined();
      expect(settings.resources.recoveryRate).toBeDefined();
    });

    it("should validate configuration through settings system", () => {
      const manager = new ResourceManager();
      const result = manager.validateCurrentConfig();
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should update configuration through settings system", () => {
      const manager = new ResourceManager();
      const newConfig = { depletionRate: 0.15 };
      
      const result = manager.updateConfig(newConfig);
      
      expect(result.isValid).toBe(true);
      
      const settingsManager = getGlobalSettingsManager();
      const currentSettings = settingsManager.getSettings();
      expect(currentSettings.resources.depletionRate).toBe(0.15);
    });

    it("should have access to settings presets", () => {
      const presets = SETTINGS_PRESETS;
      
      expect(presets.length).toBe(1); // プロトタイプでは通常のみ
      expect(presets.some(p => p.name === "normal")).toBe(true);
    });

    it("should return false for preset application (moved to settings system)", () => {
      const manager = new ResourceManager();
      const success = manager.applyPreset("hard");

      expect(success).toBe(false); // Function moved to centralized system
    });

    it("should validate current config", () => {
      const manager = new ResourceManager();
      const validation = manager.validateCurrentConfig();

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle extremely small resource amounts", () => {
      testTile.resources = { food: 0.001, wood: 0.001, ore: 0.001 };
      testTile.maxResources = { food: 1, wood: 1, ore: 1 };

      const harvested = resourceManager.harvestResource(
        testTile,
        "food",
        0.0005,
      );
      expect(harvested).toBe(0.0005);
      expect(testTile.resources.food).toBeCloseTo(0.0005, 4);
    });

    it("should handle extremely large resource amounts", () => {
      testTile.resources = { food: 1000000, wood: 1000000, ore: 1000000 };
      testTile.maxResources = { food: 1000000, wood: 1000000, ore: 1000000 };

      const harvested = resourceManager.harvestResource(
        testTile,
        "food",
        500000,
      );
      expect(harvested).toBe(500000);
      expect(testTile.resources.food).toBe(500000);
    });

    it("should handle NaN and Infinity values gracefully", () => {
      expect(() => {
        resourceManager.harvestResource(testTile, "food", NaN);
      }).not.toThrow();

      expect(() => {
        resourceManager.harvestResource(testTile, "food", Infinity);
      }).not.toThrow();

      expect(() => {
        resourceManager.divineIntervention(testTile, "food", NaN);
      }).not.toThrow();
    });

    it("should handle concurrent harvesting from same tile", () => {
      const initialFood = testTile.resources.food;

      // Simulate concurrent harvesting
      const harvest1 = resourceManager.harvestResource(testTile, "food", 3);
      const harvest2 = resourceManager.harvestResource(testTile, "food", 3);
      const harvest3 = resourceManager.harvestResource(testTile, "food", 3);

      expect(harvest1 + harvest2 + harvest3).toBeLessThanOrEqual(initialFood);
      expect(testTile.resources.food).toBeGreaterThanOrEqual(0);
    });

    it("should maintain consistency during rapid state changes", () => {
      // Rapidly alternate between harvesting and divine intervention
      for (let i = 0; i < 100; i++) {
        resourceManager.harvestResource(testTile, "food", 1);
        resourceManager.divineIntervention(testTile, "food", 10);
        resourceManager.updateRecovery(testTile);
      }

      // Tile should remain in valid state
      expect(testTile.resources.food).toBeGreaterThanOrEqual(0);
      expect(testTile.resources.food).toBeLessThanOrEqual(
        testTile.maxResources.food,
      );
      expect(testTile.depletionState.food).toBeGreaterThanOrEqual(0);
      expect(testTile.depletionState.food).toBeLessThanOrEqual(1);
    });
  });

  describe("Settings System Integration", () => {
    it("should use centralized validation system", () => {
      const settingsManager = getGlobalSettingsManager();
      const currentSettings = settingsManager.getSettings();
      
      const validationResult = settingsManager.validateSettings(currentSettings);
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
    });

    it("should update settings through centralized system", () => {
      const settingsManager = getGlobalSettingsManager();
      const result = settingsManager.updateSettings({
        resources: { depletionRate: 0.12 }
      });

      expect(result.isValid).toBe(true);
      
      const updatedSettings = settingsManager.getSettings();
      expect(updatedSettings.resources.depletionRate).toBe(0.12);
    });

    it("should have access to preset configurations", () => {
      const presets = SETTINGS_PRESETS;
      const normalPreset = presets.find(p => p.name === "normal");

      expect(normalPreset).toBeDefined();
      expect(presets).toHaveLength(1); // プロトタイプでは通常のみ
      expect(normalPreset?.description).toContain("プロトタイプ用");
    });

    it("should sanitize invalid configurations through settings system", () => {
      const settingsManager = getGlobalSettingsManager();
      const invalidSettings = {
        resources: {
          depletionRate: -0.1, // Invalid: negative
          recoveryRate: 1.5, // Invalid: > 1
        }
      };

      const sanitized = settingsManager.sanitizeSettings(invalidSettings);

      expect(sanitized.resources.depletionRate).toBeGreaterThanOrEqual(0);
      expect(sanitized.resources.recoveryRate).toBeLessThanOrEqual(1);
    });
  });

  describe("デフォルト設定検証", () => {
    it("有効なデフォルト設定を持つ", () => {
      const settingsManager = getGlobalSettingsManager();
      const validation = settingsManager.validateSettings(settingsManager.getSettings());
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("バランスの取れたデフォルト値を持つ", () => {
      const settingsManager = getGlobalSettingsManager();
      const config = settingsManager.getSettings().resources;
      
      expect(config.depletionRate).toBeGreaterThan(0);
      expect(config.depletionRate).toBeLessThanOrEqual(1);
      expect(config.recoveryRate).toBeGreaterThan(0);
      expect(config.recoveryRate).toBeLessThanOrEqual(1);
      expect(config.recoveryDelay).toBeGreaterThanOrEqual(0);
      expect(config.minRecoveryThreshold).toBeGreaterThanOrEqual(0);
      expect(config.minRecoveryThreshold).toBeLessThanOrEqual(1);
    });
  });

  describe("統合設定システム詳細テスト", () => {
    it("設定の検証ができる", () => {
      const settingsManager = getGlobalSettingsManager();
      const validConfig = {
        resources: {
          depletionRate: 0.1,
          recoveryRate: 0.02,
          recoveryDelay: 5,
          minRecoveryThreshold: 0.1,
        }
      };

      const result = settingsManager.updateSettings(validConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("無効な設定を検出できる", () => {
      const settingsManager = getGlobalSettingsManager();
      const invalidConfig = {
        resources: {
          depletionRate: -0.1, // 無効: 負の値
        }
      };

      const result = settingsManager.updateSettings(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("設定をサニタイズできる", () => {
      const settingsManager = getGlobalSettingsManager();
      const invalidConfig = {
        resources: {
          depletionRate: -0.1,
          recoveryRate: 1.5,
        }
      };

      const sanitized = settingsManager.sanitizeSettings(invalidConfig);
      expect(sanitized.resources.depletionRate).toBeGreaterThanOrEqual(0);
      expect(sanitized.resources.recoveryRate).toBeLessThanOrEqual(1);
    });
  });

  describe("プリセット設定管理", () => {
    it("利用可能なプリセットを持つ", () => {
      const presets = SETTINGS_PRESETS;
      const presetNames = presets.map((p) => p.name);

      expect(presetNames).toContain("normal");
      expect(presets).toHaveLength(1); // プロトタイプでは通常のみ
    });

    it("すべてのプリセットが有効な設定を持つ", () => {
      const settingsManager = getGlobalSettingsManager();
      
      for (const preset of SETTINGS_PRESETS) {
        if (preset.settings.resources) {
          const testSettings = {
            resources: preset.settings.resources
          };
          const validation = settingsManager.updateSettings(testSettings);
          expect(validation.isValid).toBe(true);
        }
      }
    });

    it("通常難易度のプリセットが存在する", () => {
      const normalPreset = SETTINGS_PRESETS.find(p => p.name === "normal");

      expect(normalPreset).toBeDefined();
      expect(normalPreset?.description).toContain("プロトタイプ用");
    });

    it("プリセットを適用できる", () => {
      const result = applySettingsPreset("normal");
      expect(result).not.toBeNull();
      if (result) {
        expect(result.isValid).toBe(true);
      }
    });

    it("存在しないプリセット名でnullを返す", () => {
      const result = applySettingsPreset("non-existent");
      expect(result).toBeNull();
    });
  });
});
