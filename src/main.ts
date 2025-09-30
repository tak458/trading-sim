import Phaser from "phaser";
import { UIScene } from "./graphics/scenes/ui-scene";
import { MapScene } from "./graphics/scenes/map-scene";
import { getGlobalSettingsManager, GameSettings } from "./settings";
import { FinalIntegrationSystem } from "./game-systems/integration/final-integration-system";

/**
 * メインエントリーポイント
 * 要件 1.3, 4.2, 5.2: 新しいフォルダ構造と設定システムに対応
 */

// グローバル設定マネージャーを初期化
const settingsManager = getGlobalSettingsManager();
const gameSettings: GameSettings = settingsManager.getSettings();

// ゲームシステムの統合管理を初期化
const integrationSystem = new FinalIntegrationSystem(
  gameSettings.supplyDemand,
  {
    maxVillagesPerBatch: 10,
    batchProcessingInterval: 100,
    uiUpdateInterval: 250,
    villageTextUpdateInterval: 1000,
    statusUIUpdateInterval: 500,
    maxHistoryLength: 100,
    memoryCleanupInterval: 30000,
    targetFPS: 60,
    maxUpdateTime: 50,
    enableDynamicOptimization: true,
    performanceMonitoringInterval: 1000
  }
);

// Phaser3ゲームインスタンスを作成
const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  scene: [MapScene, UIScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  backgroundColor: gameSettings.graphics.uiSettings.showDebugInfo ? '#1a1a1a' : '#2c3e50',
  fps: {
    target: 60,
    forceSetTimeOut: true
  }
});

// ゲームシステムの初期化
integrationSystem.initialize().then(success => {
  if (success) {
    console.log('Game systems initialized successfully');
  } else {
    console.error('Failed to initialize game systems');
  }
});

// グローバルアクセス用（デバッグ目的）
if (gameSettings.graphics.uiSettings.showDebugInfo) {
  (window as any).gameDebug = {
    settings: settingsManager,
    integrationSystem,
    phaserGame: game
  };
}