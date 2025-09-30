// src/test/resource-config.test.ts
import { describe, it, expect } from 'vitest';
import { getPresetConfig, RESOURCE_CONFIG_PRESETS, ResourceManager, sanitizeResourceConfig, validateResourceConfig } from '../game-systems/economy/resource-manager';
import { ResourceConfig, DEFAULT_RESOURCE_CONFIG } from '../settings';
import { formatConfigValue, getDifficultyLevel } from '@/config-example';

describe('資源設定システム', () => {
  describe('デフォルト設定', () => {
    it('有効なデフォルト設定を持つ', () => {
      const validation = validateResourceConfig(DEFAULT_RESOURCE_CONFIG);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('バランスの取れたデフォルト値を持つ', () => {
      expect(DEFAULT_RESOURCE_CONFIG.depletionRate).toBeGreaterThan(0);
      expect(DEFAULT_RESOURCE_CONFIG.depletionRate).toBeLessThanOrEqual(1);
      expect(DEFAULT_RESOURCE_CONFIG.recoveryRate).toBeGreaterThan(0);
      expect(DEFAULT_RESOURCE_CONFIG.recoveryRate).toBeLessThanOrEqual(1);
      expect(DEFAULT_RESOURCE_CONFIG.recoveryDelay).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_RESOURCE_CONFIG.minRecoveryThreshold).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_RESOURCE_CONFIG.minRecoveryThreshold).toBeLessThanOrEqual(1);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate correct configuration', () => {
      const validConfig: Partial<ResourceConfig> = {
        depletionRate: 0.1,
        recoveryRate: 0.02,
        recoveryDelay: 300,
        minRecoveryThreshold: 0.1
      };

      const result = validateResourceConfig(validConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject negative depletionRate', () => {
      const invalidConfig: Partial<ResourceConfig> = {
        depletionRate: -0.1
      };

      const result = validateResourceConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('depletionRate must be non-negative');
    });

    it('should reject depletionRate above 1.0', () => {
      const invalidConfig: Partial<ResourceConfig> = {
        depletionRate: 1.5
      };

      const result = validateResourceConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('depletionRate must not exceed 1.0 (100%)');
    });

    it('should warn about high depletionRate', () => {
      const warningConfig: Partial<ResourceConfig> = {
        depletionRate: 0.8
      };

      const result = validateResourceConfig(warningConfig);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('depletionRate above 0.5 may cause very rapid resource depletion');
    });

    it('should reject negative recoveryRate', () => {
      const invalidConfig: Partial<ResourceConfig> = {
        recoveryRate: -0.01
      };

      const result = validateResourceConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('recoveryRate must be non-negative');
    });

    it('should reject recoveryRate above 1.0', () => {
      const invalidConfig: Partial<ResourceConfig> = {
        recoveryRate: 1.5
      };

      const result = validateResourceConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('recoveryRate must not exceed 1.0 (100% per frame)');
    });

    it('should reject negative recoveryDelay', () => {
      const invalidConfig: Partial<ResourceConfig> = {
        recoveryDelay: -100
      };

      const result = validateResourceConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('recoveryDelay must be non-negative');
    });

    it('should reject invalid minRecoveryThreshold', () => {
      const invalidConfig: Partial<ResourceConfig> = {
        minRecoveryThreshold: -0.1
      };

      const result = validateResourceConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('minRecoveryThreshold must be non-negative');
    });

    it('should reject negative typeMultipliers', () => {
      const invalidConfig: Partial<ResourceConfig> = {
        typeMultipliers: {
          land: { food: -1, wood: 0.5, ore: 0.3 },
          forest: { food: 0.8, wood: 2.0, ore: 0.2 },
          mountain: { food: 0.3, wood: 0.5, ore: 2.5 },
          water: {
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
      };

      const result = validateResourceConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('typeMultipliers.land.food must be non-negative');
    });

    it('should warn about imbalanced depletion vs recovery', () => {
      const imbalancedConfig: Partial<ResourceConfig> = {
        depletionRate: 0.5,
        recoveryRate: 0.001
      };

      const result = validateResourceConfig(imbalancedConfig);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('depletionRate is much higher than recoveryRate, resources may become permanently depleted');
    });
  });

  describe('Configuration Sanitization', () => {
    it('should sanitize invalid values to defaults', () => {
      const invalidConfig: Partial<ResourceConfig> = {
        depletionRate: -0.1,
        recoveryRate: 2.0,
        recoveryDelay: -100,
        minRecoveryThreshold: 1.5
      };

      const sanitized = sanitizeResourceConfig(invalidConfig);
      expect(sanitized.depletionRate).toBe(DEFAULT_RESOURCE_CONFIG.depletionRate);
      expect(sanitized.recoveryRate).toBe(DEFAULT_RESOURCE_CONFIG.recoveryRate);
      expect(sanitized.recoveryDelay).toBe(DEFAULT_RESOURCE_CONFIG.recoveryDelay);
      expect(sanitized.minRecoveryThreshold).toBe(DEFAULT_RESOURCE_CONFIG.minRecoveryThreshold);
    });

    it('should keep valid values during sanitization', () => {
      const partiallyValidConfig: Partial<ResourceConfig> = {
        depletionRate: 0.15, // valid
        recoveryRate: 2.0,   // invalid
        recoveryDelay: 600   // valid
      };

      const sanitized = sanitizeResourceConfig(partiallyValidConfig);
      expect(sanitized.depletionRate).toBe(0.15);
      expect(sanitized.recoveryRate).toBe(DEFAULT_RESOURCE_CONFIG.recoveryRate);
      expect(sanitized.recoveryDelay).toBe(600);
    });

    it('should sanitize typeMultipliers', () => {
      const invalidConfig: Partial<ResourceConfig> = {
        typeMultipliers: {
          land: { food: -1, wood: 0.5, ore: 0.3 },
          forest: { food: 0.8, wood: 2.0, ore: 0.2 },
          mountain: { food: 0.3, wood: 0.5, ore: 2.5 },
          water: {
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
      };

      const sanitized = sanitizeResourceConfig(invalidConfig);
      expect(sanitized.typeMultipliers.land.food).toBe(DEFAULT_RESOURCE_CONFIG.typeMultipliers.land.food);
      expect(sanitized.typeMultipliers.land.wood).toBe(0.5);
      expect(sanitized.typeMultipliers.land.ore).toBe(0.3);
    });
  });

  describe('Configuration Presets', () => {
    it('should have all required presets', () => {
      const presetNames = RESOURCE_CONFIG_PRESETS.map(p => p.name);
      expect(presetNames).toContain('easy');
      expect(presetNames).toContain('normal');
      expect(presetNames).toContain('hard');
      expect(presetNames).toContain('extreme');
    });

    it('should have valid configurations for all presets', () => {
      for (const preset of RESOURCE_CONFIG_PRESETS) {
        const validation = validateResourceConfig(preset.config);
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      }
    });

    it('should get preset configuration by name', () => {
      const easyConfig = getPresetConfig('easy');
      expect(easyConfig).toBeDefined();
      expect(easyConfig?.depletionRate).toBeLessThan(DEFAULT_RESOURCE_CONFIG.depletionRate);
      expect(easyConfig?.recoveryRate).toBeGreaterThan(DEFAULT_RESOURCE_CONFIG.recoveryRate);
    });

    it('should return null for non-existent preset', () => {
      const config = getPresetConfig('non-existent');
      expect(config).toBeNull();
    });

    it('should have progressive difficulty levels', () => {
      const easy = getPresetConfig('easy')!;
      const normal = getPresetConfig('normal')!;
      const hard = getPresetConfig('hard')!;
      const extreme = getPresetConfig('extreme')!;

      // Easy should be more forgiving
      expect(easy.depletionRate).toBeLessThan(normal.depletionRate);
      expect(easy.recoveryRate).toBeGreaterThan(normal.recoveryRate);
      expect(easy.recoveryDelay).toBeLessThan(normal.recoveryDelay);

      // Hard should be more challenging
      expect(hard.depletionRate).toBeGreaterThan(normal.depletionRate);
      expect(hard.recoveryRate).toBeLessThan(normal.recoveryRate);
      expect(hard.recoveryDelay).toBeGreaterThan(normal.recoveryDelay);

      // Extreme should be the most challenging
      expect(extreme.depletionRate).toBeGreaterThan(hard.depletionRate);
      expect(extreme.recoveryRate).toBeLessThan(hard.recoveryRate);
      expect(extreme.recoveryDelay).toBeGreaterThan(hard.recoveryDelay);
    });
  });

  describe('ResourceManager Configuration Integration', () => {
    it('should create ResourceManager with default config', () => {
      const manager = new ResourceManager();
      const config = manager.getConfig();
      expect(config).toEqual(DEFAULT_RESOURCE_CONFIG);
    });

    it('should create ResourceManager with custom config', () => {
      const customConfig: Partial<ResourceConfig> = {
        depletionRate: 0.2,
        recoveryRate: 0.05
      };

      const manager = new ResourceManager(customConfig);
      const config = manager.getConfig();
      expect(config.depletionRate).toBe(0.2);
      expect(config.recoveryRate).toBe(0.05);
    });

    it('should sanitize invalid config during construction', () => {
      const invalidConfig: Partial<ResourceConfig> = {
        depletionRate: -0.1,
        recoveryRate: 0.05
      };

      const manager = new ResourceManager(invalidConfig);
      const config = manager.getConfig();
      expect(config.depletionRate).toBe(DEFAULT_RESOURCE_CONFIG.depletionRate);
      expect(config.recoveryRate).toBe(0.05);
    });

    it('should update config with validation', () => {
      const manager = new ResourceManager();

      const validUpdate: Partial<ResourceConfig> = {
        depletionRate: 0.15
      };

      const result = manager.updateConfig(validUpdate);
      expect(result.isValid).toBe(true);
      expect(manager.getConfig().depletionRate).toBe(0.15);
    });

    it('should sanitize invalid config during update', () => {
      const manager = new ResourceManager();

      const invalidUpdate: Partial<ResourceConfig> = {
        depletionRate: -0.1
      };

      const result = manager.updateConfig(invalidUpdate);
      expect(result.isValid).toBe(false);
      expect(manager.getConfig().depletionRate).toBe(DEFAULT_RESOURCE_CONFIG.depletionRate);
    });

    it('should apply preset configuration', () => {
      const manager = new ResourceManager();

      const success = manager.applyPreset('hard');
      expect(success).toBe(true);

      const hardConfig = getPresetConfig('hard')!;
      expect(manager.getConfig()).toEqual(hardConfig);
    });

    it('should fail to apply non-existent preset', () => {
      const manager = new ResourceManager();

      const success = manager.applyPreset('non-existent');
      expect(success).toBe(false);
    });

    it('should get available presets', () => {
      const manager = new ResourceManager();
      const presets = manager.getAvailablePresets();

      expect(presets).toHaveLength(RESOURCE_CONFIG_PRESETS.length);
      expect(presets.map(p => p.name)).toContain('easy');
      expect(presets.map(p => p.name)).toContain('normal');
      expect(presets.map(p => p.name)).toContain('hard');
      expect(presets.map(p => p.name)).toContain('extreme');
    });

    it('should validate current config', () => {
      const manager = new ResourceManager();
      const validation = manager.validateCurrentConfig();

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });
});
