/**
 * PerformanceOptimizer - パフォーマンス最適化システム
 * 大量の村での処理性能を最適化し、UI更新頻度の調整とバッチ処理を実装
 */

import type { SupplyDemandBalancer } from "../economy/supply-demand-balancer";
import type { BuildingManager } from "../population/building-manager";
import type { PopulationManager } from "../population/population-manager";
import type { GameTime } from "../shared-types";
import type { Tile } from "../world/map";
import type { Village } from "../world/village";
import type { VillageEconomyManager } from "./village-economy-manager";

/**
 * パフォーマンス統計情報
 */
export interface PerformanceMetrics {
  frameTime: number;
  updateTime: number;
  villageUpdateTime: number;
  uiUpdateTime: number;
  memoryUsage: number;
  villageCount: number;
  averageFPS: number;
  batchProcessingEfficiency: number;
}

/**
 * 最適化設定
 */
export interface OptimizationConfig {
  // バッチ処理設定
  maxVillagesPerBatch: number;
  batchProcessingInterval: number; // ミリ秒

  // UI更新設定
  uiUpdateInterval: number; // ミリ秒
  villageTextUpdateInterval: number; // ミリ秒
  statusUIUpdateInterval: number; // ミリ秒

  // メモリ最適化設定
  maxHistoryLength: number;
  memoryCleanupInterval: number; // ミリ秒

  // パフォーマンス閾値
  targetFPS: number;
  maxUpdateTime: number; // ミリ秒

  // 動的最適化設定
  enableDynamicOptimization: boolean;
  performanceMonitoringInterval: number; // ミリ秒
}

/**
 * デフォルト最適化設定
 */
export const DEFAULT_OPTIMIZATION_CONFIG: OptimizationConfig = {
  maxVillagesPerBatch: 10,
  batchProcessingInterval: 100,
  uiUpdateInterval: 500,
  villageTextUpdateInterval: 1000,
  statusUIUpdateInterval: 2000,
  maxHistoryLength: 50,
  memoryCleanupInterval: 30000,
  targetFPS: 60,
  maxUpdateTime: 16.67, // 60FPS target
  enableDynamicOptimization: true,
  performanceMonitoringInterval: 5000,
};

/**
 * バッチ処理キュー項目
 */
interface BatchQueueItem {
  village: Village;
  priority: number;
  lastProcessed: number;
}

/**
 * パフォーマンス最適化システム
 */
export class PerformanceOptimizer {
  private config: OptimizationConfig;
  private metrics: PerformanceMetrics;

  // システムマネージャー
  private economyManager: VillageEconomyManager;
  private populationManager: PopulationManager;
  private buildingManager: BuildingManager;
  private supplyDemandBalancer: SupplyDemandBalancer;

  // バッチ処理
  private batchQueue: BatchQueueItem[] = [];
  private currentBatchIndex: number = 0;
  private lastBatchProcessTime: number = 0;

  // UI更新制御
  private lastUIUpdateTime: number = 0;
  private lastVillageTextUpdateTime: number = 0;
  private lastStatusUIUpdateTime: number = 0;

  // メモリ管理
  private lastMemoryCleanupTime: number = 0;
  private performanceHistory: PerformanceMetrics[] = [];

  // 動的最適化
  private lastPerformanceCheckTime: number = 0;
  private adaptiveConfig: OptimizationConfig;

  // フレーム時間測定
  private frameTimeHistory: number[] = [];
  private updateTimeHistory: number[] = [];

  constructor(
    config: OptimizationConfig = DEFAULT_OPTIMIZATION_CONFIG,
    economyManager: VillageEconomyManager,
    populationManager: PopulationManager,
    buildingManager: BuildingManager,
    supplyDemandBalancer: SupplyDemandBalancer,
  ) {
    this.config = { ...config };
    this.adaptiveConfig = { ...config };
    this.economyManager = economyManager;
    this.populationManager = populationManager;
    this.buildingManager = buildingManager;
    this.supplyDemandBalancer = supplyDemandBalancer;

    this.metrics = {
      frameTime: 0,
      updateTime: 0,
      villageUpdateTime: 0,
      uiUpdateTime: 0,
      memoryUsage: 0,
      villageCount: 0,
      averageFPS: 60,
      batchProcessingEfficiency: 1.0,
    };
  }

  /**
   * 最適化されたシステム更新
   * @param villages 村のリスト
   * @param gameTime ゲーム時間
   * @param map マップデータ
   * @returns 更新されたかどうか
   */
  optimizedUpdate(
    villages: Village[],
    gameTime: GameTime,
    map: Tile[][],
  ): boolean {
    const updateStartTime = performance.now();
    let wasUpdated = false;

    try {
      // パフォーマンス測定開始
      this.startPerformanceMeasurement();

      // 村数を記録
      this.metrics.villageCount = villages.length;

      // バッチ処理による村の更新
      if (this.shouldProcessBatch()) {
        const batchUpdateTime = performance.now();
        this.processBatchUpdate(villages, gameTime, map);
        this.metrics.villageUpdateTime = performance.now() - batchUpdateTime;
        wasUpdated = true;
      }

      // メモリクリーンアップ
      if (this.shouldCleanupMemory()) {
        this.performMemoryCleanup(villages);
      }

      // 動的最適化
      if (this.shouldPerformDynamicOptimization()) {
        this.performDynamicOptimization();
      }

      // パフォーマンス測定終了
      this.metrics.updateTime = performance.now() - updateStartTime;
      this.endPerformanceMeasurement();

      return wasUpdated;
    } catch (error) {
      console.error("Optimized update error:", error);
      // エラー時はフォールバック処理
      this.performFallbackUpdate(villages, gameTime, map);
      return true;
    }
  }

  /**
   * バッチ処理による村の更新
   * @param villages 村のリスト
   * @param gameTime ゲーム時間
   * @param map マップデータ
   */
  private processBatchUpdate(
    villages: Village[],
    gameTime: GameTime,
    map: Tile[][],
  ): void {
    // バッチキューの更新
    this.updateBatchQueue(villages);

    // 現在のバッチサイズを決定（動的調整）
    const batchSize = this.calculateOptimalBatchSize();

    // バッチ処理実行
    const startIndex = this.currentBatchIndex;
    const endIndex = Math.min(startIndex + batchSize, this.batchQueue.length);

    for (let i = startIndex; i < endIndex; i++) {
      const item = this.batchQueue[i];
      try {
        this.updateSingleVillage(item.village, gameTime, map);
        item.lastProcessed = Date.now();
      } catch (error) {
        console.warn(
          `Village update error for village at (${item.village.x}, ${item.village.y}):`,
          error,
        );
      }
    }

    // 次のバッチインデックスを更新
    this.currentBatchIndex = endIndex >= this.batchQueue.length ? 0 : endIndex;
    this.lastBatchProcessTime = Date.now();

    // バッチ処理効率を計算
    this.calculateBatchEfficiency(batchSize, endIndex - startIndex);
  }

  /**
   * 単一村の更新処理
   * @param village 村
   * @param gameTime ゲーム時間
   * @param map マップデータ
   */
  private updateSingleVillage(
    village: Village,
    gameTime: GameTime,
    map: Tile[][],
  ): void {
    // 経済システム更新
    this.economyManager.updateVillageEconomy(village, gameTime, map);

    // 人口管理更新
    this.populationManager.updatePopulation(village, gameTime);

    // 建物管理更新
    this.buildingManager.updateBuildings(village, gameTime);
  }

  /**
   * バッチキューの更新
   * @param villages 村のリスト
   */
  private updateBatchQueue(villages: Village[]): void {
    // 新しい村を追加
    const existingVillageIds = new Set(
      this.batchQueue.map((item) => `${item.village.x},${item.village.y}`),
    );

    for (const village of villages) {
      const villageId = `${village.x},${village.y}`;
      if (!existingVillageIds.has(villageId)) {
        this.batchQueue.push({
          village,
          priority: this.calculateVillagePriority(village),
          lastProcessed: 0,
        });
      }
    }

    // 削除された村を除去
    this.batchQueue = this.batchQueue.filter((item) =>
      villages.some((v) => v.x === item.village.x && v.y === item.village.y),
    );

    // 優先度でソート
    this.batchQueue.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 村の優先度を計算
   * @param village 村
   * @returns 優先度（高いほど優先）
   */
  private calculateVillagePriority(village: Village): number {
    let priority = 0;

    // 人口による優先度
    priority += village.population * 0.1;

    // 資源不足による優先度
    const status = village.economy.supplyDemandStatus;
    if (status.food === "critical") priority += 100;
    else if (status.food === "shortage") priority += 50;

    if (status.wood === "critical") priority += 80;
    else if (status.wood === "shortage") priority += 40;

    if (status.ore === "critical") priority += 80;
    else if (status.ore === "shortage") priority += 40;

    // 建設キューによる優先度
    priority += village.economy.buildings.constructionQueue * 10;

    return priority;
  }

  /**
   * 最適なバッチサイズを計算
   * @returns バッチサイズ
   */
  private calculateOptimalBatchSize(): number {
    const baseSize = this.adaptiveConfig.maxVillagesPerBatch;

    // パフォーマンスに基づく動的調整
    if (this.metrics.averageFPS < this.config.targetFPS * 0.8) {
      // FPSが低い場合はバッチサイズを減らす
      return Math.max(1, Math.floor(baseSize * 0.7));
    } else if (this.metrics.averageFPS > this.config.targetFPS * 1.1) {
      // FPSが高い場合はバッチサイズを増やす
      return Math.min(this.batchQueue.length, Math.floor(baseSize * 1.3));
    }

    return baseSize;
  }

  /**
   * UI更新が必要かチェック
   * @param updateType 更新タイプ
   * @returns 更新が必要かどうか
   */
  shouldUpdateUI(updateType: "general" | "villageText" | "status"): boolean {
    const now = Date.now();

    switch (updateType) {
      case "general":
        return (
          now - this.lastUIUpdateTime >= this.adaptiveConfig.uiUpdateInterval
        );
      case "villageText":
        return (
          now - this.lastVillageTextUpdateTime >=
          this.adaptiveConfig.villageTextUpdateInterval
        );
      case "status":
        return (
          now - this.lastStatusUIUpdateTime >=
          this.adaptiveConfig.statusUIUpdateInterval
        );
      default:
        return false;
    }
  }

  /**
   * UI更新時間を記録
   * @param updateType 更新タイプ
   */
  markUIUpdated(updateType: "general" | "villageText" | "status"): void {
    const now = Date.now();

    switch (updateType) {
      case "general":
        this.lastUIUpdateTime = now;
        break;
      case "villageText":
        this.lastVillageTextUpdateTime = now;
        break;
      case "status":
        this.lastStatusUIUpdateTime = now;
        break;
    }
  }

  /**
   * バッチ処理が必要かチェック
   * @returns バッチ処理が必要かどうか
   */
  private shouldProcessBatch(): boolean {
    return (
      Date.now() - this.lastBatchProcessTime >=
      this.adaptiveConfig.batchProcessingInterval
    );
  }

  /**
   * メモリクリーンアップが必要かチェック
   * @returns クリーンアップが必要かどうか
   */
  private shouldCleanupMemory(): boolean {
    return (
      Date.now() - this.lastMemoryCleanupTime >=
      this.config.memoryCleanupInterval
    );
  }

  /**
   * 動的最適化が必要かチェック
   * @returns 最適化が必要かどうか
   */
  private shouldPerformDynamicOptimization(): boolean {
    return (
      this.config.enableDynamicOptimization &&
      Date.now() - this.lastPerformanceCheckTime >=
        this.config.performanceMonitoringInterval
    );
  }

  /**
   * メモリクリーンアップを実行
   * @param villages 村のリスト
   */
  private performMemoryCleanup(villages: Village[]): void {
    try {
      // 村の履歴データをクリーンアップ
      villages.forEach((village) => {
        if (
          village.populationHistory &&
          village.populationHistory.length > this.config.maxHistoryLength
        ) {
          village.populationHistory = village.populationHistory.slice(
            -this.config.maxHistoryLength,
          );
        }
      });

      // パフォーマンス履歴をクリーンアップ
      if (this.performanceHistory.length > this.config.maxHistoryLength) {
        this.performanceHistory = this.performanceHistory.slice(
          -this.config.maxHistoryLength,
        );
      }

      // フレーム時間履歴をクリーンアップ
      if (this.frameTimeHistory.length > 60) {
        this.frameTimeHistory = this.frameTimeHistory.slice(-60);
      }

      if (this.updateTimeHistory.length > 60) {
        this.updateTimeHistory = this.updateTimeHistory.slice(-60);
      }

      this.lastMemoryCleanupTime = Date.now();
    } catch (error) {
      console.warn("Memory cleanup error:", error);
    }
  }

  /**
   * 動的最適化を実行
   */
  private performDynamicOptimization(): void {
    try {
      // パフォーマンス分析
      const avgFPS = this.calculateAverageFPS();
      const avgUpdateTime = this.calculateAverageUpdateTime();

      // 設定変更フラグ
      let configChanged = false;

      // 設定の動的調整
      if (avgFPS < this.config.targetFPS * 0.8) {
        // パフォーマンスが悪い場合
        const newBatchSize = Math.max(
          1,
          this.adaptiveConfig.maxVillagesPerBatch - 1,
        );
        const newUIInterval = Math.min(
          2000,
          this.adaptiveConfig.uiUpdateInterval + 100,
        );
        const newBatchInterval = Math.min(
          500,
          this.adaptiveConfig.batchProcessingInterval + 50,
        );

        if (newBatchSize !== this.adaptiveConfig.maxVillagesPerBatch) {
          this.adaptiveConfig.maxVillagesPerBatch = newBatchSize;
          configChanged = true;
        }
        if (newUIInterval !== this.adaptiveConfig.uiUpdateInterval) {
          this.adaptiveConfig.uiUpdateInterval = newUIInterval;
          configChanged = true;
        }
        if (newBatchInterval !== this.adaptiveConfig.batchProcessingInterval) {
          this.adaptiveConfig.batchProcessingInterval = newBatchInterval;
          configChanged = true;
        }
      } else if (
        avgFPS > this.config.targetFPS * 1.1 &&
        avgUpdateTime < this.config.maxUpdateTime * 0.5
      ) {
        // パフォーマンスが良い場合
        const newBatchSize = Math.min(
          20,
          this.adaptiveConfig.maxVillagesPerBatch + 1,
        );
        const newUIInterval = Math.max(
          200,
          this.adaptiveConfig.uiUpdateInterval - 50,
        );
        const newBatchInterval = Math.max(
          50,
          this.adaptiveConfig.batchProcessingInterval - 25,
        );

        if (newBatchSize !== this.adaptiveConfig.maxVillagesPerBatch) {
          this.adaptiveConfig.maxVillagesPerBatch = newBatchSize;
          configChanged = true;
        }
        if (newUIInterval !== this.adaptiveConfig.uiUpdateInterval) {
          this.adaptiveConfig.uiUpdateInterval = newUIInterval;
          configChanged = true;
        }
        if (newBatchInterval !== this.adaptiveConfig.batchProcessingInterval) {
          this.adaptiveConfig.batchProcessingInterval = newBatchInterval;
          configChanged = true;
        }
      }

      this.lastPerformanceCheckTime = Date.now();

      if (configChanged) {
        console.log(
          "Performance optimization: Configuration adjusted based on performance metrics",
        );
      }
    } catch (error) {
      console.warn("Dynamic optimization error:", error);
    }
  }

  /**
   * フォールバック更新処理
   * @param villages 村のリスト
   * @param gameTime ゲーム時間
   * @param map マップデータ
   */
  private performFallbackUpdate(
    villages: Village[],
    gameTime: GameTime,
    map: Tile[][],
  ): void {
    // 最小限の更新処理
    const maxVillages = Math.min(5, villages.length);
    for (let i = 0; i < maxVillages; i++) {
      try {
        this.updateSingleVillage(villages[i], gameTime, map);
      } catch (error) {
        console.warn(`Fallback update error for village ${i}:`, error);
      }
    }
  }

  /**
   * パフォーマンス測定開始
   */
  private startPerformanceMeasurement(): void {
    this.metrics.frameTime = performance.now();
  }

  /**
   * パフォーマンス測定終了
   */
  private endPerformanceMeasurement(): void {
    const now = performance.now();
    const frameTime = now - this.metrics.frameTime;

    this.frameTimeHistory.push(frameTime);
    this.updateTimeHistory.push(this.metrics.updateTime);

    // 履歴を制限
    if (this.frameTimeHistory.length > 60) {
      this.frameTimeHistory.shift();
    }
    if (this.updateTimeHistory.length > 60) {
      this.updateTimeHistory.shift();
    }

    // 平均FPSを計算
    this.metrics.averageFPS = this.calculateAverageFPS();

    // パフォーマンス履歴に追加
    this.performanceHistory.push({ ...this.metrics });
  }

  /**
   * 平均FPSを計算
   * @returns 平均FPS
   */
  private calculateAverageFPS(): number {
    if (this.frameTimeHistory.length === 0) return 60;

    const avgFrameTime =
      this.frameTimeHistory.reduce((sum, time) => sum + time, 0) /
      this.frameTimeHistory.length;
    return Math.min(60, 1000 / avgFrameTime);
  }

  /**
   * 平均更新時間を計算
   * @returns 平均更新時間（ミリ秒）
   */
  private calculateAverageUpdateTime(): number {
    if (this.updateTimeHistory.length === 0) return 0;

    return (
      this.updateTimeHistory.reduce((sum, time) => sum + time, 0) /
      this.updateTimeHistory.length
    );
  }

  /**
   * バッチ処理効率を計算
   * @param targetBatchSize 目標バッチサイズ
   * @param actualBatchSize 実際のバッチサイズ
   */
  private calculateBatchEfficiency(
    targetBatchSize: number,
    actualBatchSize: number,
  ): void {
    if (targetBatchSize === 0) {
      this.metrics.batchProcessingEfficiency = 1.0;
      return;
    }

    this.metrics.batchProcessingEfficiency = actualBatchSize / targetBatchSize;
  }

  /**
   * 現在のパフォーマンス統計を取得
   * @returns パフォーマンス統計
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * 最適化設定を取得
   * @returns 最適化設定
   */
  getOptimizationConfig(): OptimizationConfig {
    return { ...this.adaptiveConfig };
  }

  /**
   * 最適化設定を更新
   * @param newConfig 新しい設定
   */
  updateOptimizationConfig(newConfig: Partial<OptimizationConfig>): void {
    Object.assign(this.adaptiveConfig, newConfig);
  }

  /**
   * パフォーマンス履歴を取得
   * @returns パフォーマンス履歴
   */
  getPerformanceHistory(): PerformanceMetrics[] {
    return [...this.performanceHistory];
  }

  /**
   * システムリセット
   */
  reset(): void {
    this.batchQueue = [];
    this.currentBatchIndex = 0;
    this.performanceHistory = [];
    this.frameTimeHistory = [];
    this.updateTimeHistory = [];
    this.lastBatchProcessTime = 0;
    this.lastUIUpdateTime = 0;
    this.lastVillageTextUpdateTime = 0;
    this.lastStatusUIUpdateTime = 0;
    this.lastMemoryCleanupTime = 0;
    this.lastPerformanceCheckTime = 0;
    this.adaptiveConfig = { ...this.config };
  }
}
