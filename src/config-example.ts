// src/config-example.ts
// Example usage of the resource configuration system

import { ResourceManager, RESOURCE_CONFIG_PRESETS, getPresetConfig } from './resource-manager';
import { 
  formatConfigValue, 
  getDifficultyLevel, 
  getConfigRecommendations,
  exportConfig,
  importConfig 
} from './resource-config-ui';

/**
 * Example: Creating a ResourceManager with different configurations
 */
export function configurationExamples() {
  console.log('=== Resource Configuration System Examples ===\n');

  // Example 1: Default configuration
  console.log('1. Default Configuration:');
  const defaultManager = new ResourceManager();
  console.log('Difficulty Level:', getDifficultyLevel(defaultManager.getConfig()));
  console.log('Depletion Rate:', formatConfigValue('depletionRate', defaultManager.getConfig().depletionRate));
  console.log('Recovery Rate:', formatConfigValue('recoveryRate', defaultManager.getConfig().recoveryRate));
  console.log();

  // Example 2: Easy preset
  console.log('2. Easy Preset Configuration:');
  const easyManager = new ResourceManager();
  easyManager.applyPreset('easy');
  console.log('Difficulty Level:', getDifficultyLevel(easyManager.getConfig()));
  console.log('Depletion Rate:', formatConfigValue('depletionRate', easyManager.getConfig().depletionRate));
  console.log('Recovery Rate:', formatConfigValue('recoveryRate', easyManager.getConfig().recoveryRate));
  console.log();

  // Example 3: Custom configuration with validation
  console.log('3. Custom Configuration with Validation:');
  const customManager = new ResourceManager();
  const updateResult = customManager.updateConfig({
    depletionRate: 0.25,
    recoveryRate: 0.01,
    recoveryDelay: 900
  });
  
  console.log('Configuration Valid:', updateResult.isValid);
  if (updateResult.warnings.length > 0) {
    console.log('Warnings:', updateResult.warnings);
  }
  console.log('Difficulty Level:', getDifficultyLevel(customManager.getConfig()));
  console.log();

  // Example 4: Invalid configuration handling
  console.log('4. Invalid Configuration Handling:');
  const invalidManager = new ResourceManager();
  const invalidResult = invalidManager.updateConfig({
    depletionRate: -0.1, // Invalid: negative
    recoveryRate: 2.0    // Invalid: > 1.0
  });
  
  console.log('Configuration Valid:', invalidResult.isValid);
  console.log('Errors:', invalidResult.errors);
  console.log('Final Depletion Rate:', formatConfigValue('depletionRate', invalidManager.getConfig().depletionRate));
  console.log();

  // Example 5: Configuration recommendations
  console.log('5. Configuration Recommendations:');
  const imbalancedManager = new ResourceManager();
  imbalancedManager.updateConfig({
    depletionRate: 0.4,
    recoveryRate: 0.001
  });
  
  const recommendations = getConfigRecommendations(imbalancedManager.getConfig());
  console.log('Recommendations:');
  recommendations.forEach(rec => console.log('- ' + rec));
  console.log();

  // Example 6: Export/Import configuration
  console.log('6. Export/Import Configuration:');
  const exportManager = new ResourceManager();
  exportManager.applyPreset('hard');
  
  const exported = exportConfig(exportManager.getConfig());
  console.log('Exported config length:', exported.length, 'characters');
  
  const imported = importConfig(exported);
  console.log('Import successful:', imported.success);
  if (imported.success && imported.config) {
    const importedManager = new ResourceManager(imported.config);
    console.log('Imported difficulty level:', getDifficultyLevel(importedManager.getConfig()));
  }
  console.log();

  // Example 7: Available presets
  console.log('7. Available Presets:');
  const presetManager = new ResourceManager();
  const presets = presetManager.getAvailablePresets();
  presets.forEach(preset => {
    console.log(`- ${preset.name}: ${preset.description}`);
  });
  console.log();

  console.log('=== End of Examples ===');
}

/**
 * Example: Game balance testing with different configurations
 */
export function balanceTestingExample() {
  console.log('=== Balance Testing Example ===\n');

  const presets = ['easy', 'normal', 'hard', 'extreme'];
  
  presets.forEach(presetName => {
    const config = getPresetConfig(presetName);
    if (!config) return;

    console.log(`${presetName.toUpperCase()} Preset:`);
    console.log(`  Depletion: ${formatConfigValue('depletionRate', config.depletionRate)}`);
    console.log(`  Recovery: ${formatConfigValue('recoveryRate', config.recoveryRate)}`);
    console.log(`  Delay: ${formatConfigValue('recoveryDelay', config.recoveryDelay)}`);
    
    // Calculate theoretical time to full depletion and recovery
    const depletionTime = Math.ceil(1 / config.depletionRate);
    const recoveryTime = Math.ceil(1 / config.recoveryRate);
    
    console.log(`  Theoretical full depletion: ${depletionTime} harvests`);
    console.log(`  Theoretical full recovery: ${recoveryTime} frames`);
    console.log(`  Recovery delay: ${config.recoveryDelay} frames`);
    
    const recommendations = getConfigRecommendations(config);
    if (recommendations.length > 0) {
      console.log('  Recommendations:');
      recommendations.forEach(rec => console.log(`    - ${rec}`));
    }
    console.log();
  });

  console.log('=== End of Balance Testing ===');
}

/**
 * Example: Time system configuration
 */
export function timeSystemExample() {
  console.log('=== Time System Configuration Example ===\n');

  // Example 1: Fast-paced game
  console.log('1. Fast-paced Configuration:');
  const fastConfig = {
    gameSpeed: 2.0, // 2倍速
    ticksPerSecond: 2, // 2秒に1回更新
    resourceUpdateInterval: 1, // 毎ティック資源更新
    villageUpdateInterval: 1, // 毎ティック村更新
    tradeInterval: 2 // 2ティックごとに交易（4秒間隔）
  };
  console.log('Game Speed:', fastConfig.gameSpeed + 'x');
  console.log('Resource Update Frequency:', fastConfig.ticksPerSecond / fastConfig.resourceUpdateInterval, 'times/sec');
  console.log('Village Update Frequency:', fastConfig.ticksPerSecond / fastConfig.villageUpdateInterval, 'times/sec');
  console.log();

  // Example 2: Slow strategic game
  console.log('2. Strategic Configuration:');
  const strategicConfig = {
    gameSpeed: 0.5, // 半分の速度
    ticksPerSecond: 1, // 1秒に1回更新
    resourceUpdateInterval: 2, // 2ティックごとに資源更新（2秒間隔）
    villageUpdateInterval: 3, // 3ティックごとに村更新（3秒間隔）
    tradeInterval: 5 // 5ティックごとに交易（5秒間隔）
  };
  console.log('Game Speed:', strategicConfig.gameSpeed + 'x');
  console.log('Resource Update Frequency:', strategicConfig.ticksPerSecond / strategicConfig.resourceUpdateInterval, 'times/sec');
  console.log('Village Update Frequency:', strategicConfig.ticksPerSecond / strategicConfig.villageUpdateInterval, 'times/sec');
  console.log();

  console.log('=== End of Time System Example ===');
}

// Uncomment to run examples:
// configurationExamples();
// balanceTestingExample();
// timeSystemExample();