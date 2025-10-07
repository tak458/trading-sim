// src/config-example.ts
// Example usage of the resource configuration system
// This file contains example configurations and usage patterns

import { ResourceManager } from "./game-systems/economy/resource-manager";

/**
 * Helper function to format configuration values for display
 */
export function formatConfigValue(key: string, value: number): string {
  switch (key) {
    case "depletionRate":
    case "recoveryRate":
    case "minRecoveryThreshold":
      return `${(value * 100).toFixed(1)}%`;
    case "recoveryDelay":
      return `${(value / 60).toFixed(1)}秒 (${value}フレーム)`;
    default:
      return value.toString();
  }
}

/**
 * Helper function to determine difficulty level based on configuration
 */
export function getDifficultyLevel(config: any): string {
  const depletionRate = config.depletionRate;
  const recoveryRate = config.recoveryRate;

  if (depletionRate <= 0.1 && recoveryRate >= 0.02) return "Easy";
  if (depletionRate <= 0.2 && recoveryRate >= 0.01) return "Normal";
  if (depletionRate <= 0.3 && recoveryRate >= 0.005) return "Hard";
  return "Extreme";
}

/**
 * Example: Creating a ResourceManager with different configurations
 */
export function configurationExamples() {
  console.log("=== Resource Configuration System Examples ===\n");

  // Example 1: Default configuration
  console.log("1. Default Configuration:");
  const defaultManager = new ResourceManager();
  console.log(
    "Difficulty Level:",
    getDifficultyLevel(defaultManager.getConfig()),
  );
  console.log(
    "Depletion Rate:",
    formatConfigValue(
      "depletionRate",
      defaultManager.getConfig().depletionRate,
    ),
  );
  console.log(
    "Recovery Rate:",
    formatConfigValue("recoveryRate", defaultManager.getConfig().recoveryRate),
  );
  console.log();

  // Example 2: Easy preset
  console.log("2. Easy Preset Configuration:");
  const easyManager = new ResourceManager();
  easyManager.applyPreset("easy");
  console.log("Difficulty Level:", getDifficultyLevel(easyManager.getConfig()));
  console.log(
    "Depletion Rate:",
    formatConfigValue("depletionRate", easyManager.getConfig().depletionRate),
  );
  console.log(
    "Recovery Rate:",
    formatConfigValue("recoveryRate", easyManager.getConfig().recoveryRate),
  );
  console.log();

  // Example 3: Custom configuration with validation
  console.log("3. Custom Configuration with Validation:");
  const customManager = new ResourceManager();
  const updateResult = customManager.updateConfig({
    depletionRate: 0.25,
    recoveryRate: 0.01,
    recoveryDelay: 900,
  });

  console.log("Configuration Valid:", updateResult.isValid);
  if (updateResult.warnings.length > 0) {
    console.log("Warnings:", updateResult.warnings);
  }
  console.log(
    "Difficulty Level:",
    getDifficultyLevel(customManager.getConfig()),
  );
  console.log();

  console.log("=== End of Examples ===");
}

/**
 * Example: Time system configuration
 */
export function timeSystemExample() {
  console.log("=== Time System Configuration Example ===\n");

  // Example 1: Fast-paced game
  console.log("1. Fast-paced Configuration:");
  const fastConfig = {
    gameSpeed: 2.0, // 2倍速
    ticksPerSecond: 2, // 2秒に1回更新
    resourceUpdateInterval: 1, // 毎ティック資源更新
    villageUpdateInterval: 1, // 毎ティック村更新
    tradeInterval: 2, // 2ティックごとに交易（4秒間隔）
  };
  console.log("Game Speed:", fastConfig.gameSpeed + "x");
  console.log(
    "Resource Update Frequency:",
    fastConfig.ticksPerSecond / fastConfig.resourceUpdateInterval,
    "times/sec",
  );
  console.log(
    "Village Update Frequency:",
    fastConfig.ticksPerSecond / fastConfig.villageUpdateInterval,
    "times/sec",
  );
  console.log();

  // Example 2: Slow strategic game
  console.log("2. Strategic Configuration:");
  const strategicConfig = {
    gameSpeed: 0.5, // 半分の速度
    ticksPerSecond: 1, // 1秒に1回更新
    resourceUpdateInterval: 2, // 2ティックごとに資源更新（2秒間隔）
    villageUpdateInterval: 3, // 3ティックごとに村更新（3秒間隔）
    tradeInterval: 5, // 5ティックごとに交易（5秒間隔）
  };
  console.log("Game Speed:", strategicConfig.gameSpeed + "x");
  console.log(
    "Resource Update Frequency:",
    strategicConfig.ticksPerSecond / strategicConfig.resourceUpdateInterval,
    "times/sec",
  );
  console.log(
    "Village Update Frequency:",
    strategicConfig.ticksPerSecond / strategicConfig.villageUpdateInterval,
    "times/sec",
  );
  console.log();

  console.log("=== End of Time System Example ===");
}
