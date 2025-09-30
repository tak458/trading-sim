/**
 * FinalIntegrationSystem - 全システムの統合テストと最終調整
 * 全要件の統合と最適化を行う
 */

import { Village } from '../world/village';
import { Tile } from '../world/map';
import { Road } from '../world/trade';
import { VillageEconomyManager } from './village-economy-manager';
import type { GameTime } from '../shared-types';
import { PopulationManager } from '../population/population-manager';
import { BuildingManager } from '../population/building-manager';
import { SupplyDemandBalancer } from '../economy/supply-demand-balancer';
import { VillageStatusUI } from '../../graphics/ui/village-status-ui';
import { PerformanceOptimizer, PerformanceMetrics, OptimizationConfig } from './performance-optimizer';
import { EconomyErrorHandler } from '../economy/economy-error-handler';
import { SupplyDemandConfig, DEFAULT_SUPPLY_DEMAND_CONFIG } from '../../settings';

/**
 * システム統合状態
 */
export interface SystemIntegrationStatus {
  isInitialized: boolean;
  economySystemStatus: 'active' | 'error' | 'disabled';
  populationSystemStatus: 'active' | 'error' | 'disabled';
  buildingSystemStatus: 'active' | 'error' | 'disabled';
  uiSystemStatus: 'active' | 'error' | 'disabled';
  performanceOptimizerStatus: 'active' | 'error' | 'disabled';
  lastIntegrationCheck: number;
  errorCount: number;
  warningCount: number;
}

/**
 * 統合テスト結果
 */
export interface IntegrationTestResult {
  testName: string;
  passed: boolean;
  message: string;
  executionTime: number;
  details?: any;
}

/**
 * システム健全性チェック結果
 */
export interface SystemHealthCheck {
  overallHealth: 'healthy' | 'warning' | 'critical';
  villageDataIntegrity: boolean;
  economyDataConsistency: boolean;
  performanceWithinLimits: boolean;
  memoryUsageAcceptable: boolean;
  errorRateAcceptable: boolean;
  recommendations: string[];
}

/**
 * 最終統合システム
 */
export class FinalIntegrationSystem {
  // システムコンポーネント
  private economyManager: VillageEconomyManager;
  private populationManager: PopulationManager;
  private buildingManager: BuildingManager;
  private supplyDemandBalancer: SupplyDemandBalancer;
  private performanceOptimizer: PerformanceOptimizer;
  private errorHandler: EconomyErrorHandler;

  // 統合状態
  private integrationStatus: SystemIntegrationStatus;
  private testResults: IntegrationTestResult[] = [];
  private healthCheckHistory: SystemHealthCheck[] = [];

  // 設定
  // private config: SupplyDemandConfig; // Unused
  // private optimizationConfig: OptimizationConfig; // Unused

  // 統計情報
  private totalVillagesProcessed: number = 0;
  private totalErrorsHandled: number = 0;
  private systemStartTime: number = 0;

  constructor(
    config: SupplyDemandConfig = DEFAULT_SUPPLY_DEMAND_CONFIG,
    optimizationConfig?: OptimizationConfig
  ) {
    // this.config = config; // Unused variable
    this.systemStartTime = Date.now();

    // システムコンポーネントを初期化
    this.errorHandler = new EconomyErrorHandler(config);
    this.economyManager = new VillageEconomyManager(config);
    this.populationManager = new PopulationManager(config);
    this.buildingManager = new BuildingManager(config);
    this.supplyDemandBalancer = new SupplyDemandBalancer(config);
    this.performanceOptimizer = new PerformanceOptimizer(
      optimizationConfig,
      this.economyManager,
      this.populationManager,
      this.buildingManager,
      this.supplyDemandBalancer
    );

    // 統合状態を初期化
    this.integrationStatus = {
      isInitialized: false,
      economySystemStatus: 'disabled',
      populationSystemStatus: 'disabled',
      buildingSystemStatus: 'disabled',
      uiSystemStatus: 'disabled',
      performanceOptimizerStatus: 'disabled',
      lastIntegrationCheck: 0,
      errorCount: 0,
      warningCount: 0
    };
  }

  /**
   * システム初期化
   * @returns 初期化成功かどうか
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('Final Integration System: Starting initialization...');

      // 各システムの初期化テスト
      const initTests = await this.runInitializationTests();

      // 初期化結果の評価
      const allTestsPassed = initTests.every(test => test.passed);

      if (allTestsPassed) {
        this.integrationStatus.isInitialized = true;
        this.integrationStatus.economySystemStatus = 'active';
        this.integrationStatus.populationSystemStatus = 'active';
        this.integrationStatus.buildingSystemStatus = 'active';
        this.integrationStatus.uiSystemStatus = 'active';
        this.integrationStatus.performanceOptimizerStatus = 'active';

        console.log('Final Integration System: Initialization completed successfully');
        return true;
      } else {
        console.error('Final Integration System: Initialization failed');
        this.logFailedTests(initTests);
        return false;
      }

    } catch (error) {
      console.error('Final Integration System: Initialization error:', error);
      return false;
    }
  }

  /**
   * 統合システム更新（メインループ）
   * @param villages 村のリスト
   * @param gameTime ゲーム時間
   * @param map マップデータ
   * @param roads 道のリスト
   * @returns 更新成功かどうか
   */
  update(villages: Village[], gameTime: GameTime, map: Tile[][], roads: Road[]): boolean {
    if (!this.integrationStatus.isInitialized) {
      console.warn('Final Integration System: System not initialized');
      return false;
    }

    try {
      const updateStartTime = performance.now();

      // パフォーマンス最適化された更新
      const wasUpdated = this.performanceOptimizer.optimizedUpdate(villages, gameTime, map);

      // 定期的なシステム健全性チェック
      if (this.shouldPerformHealthCheck()) {
        this.performSystemHealthCheck(villages, roads);
      }

      // 統計情報更新
      this.totalVillagesProcessed += villages.length;
      this.integrationStatus.lastIntegrationCheck = Date.now();

      const updateTime = performance.now() - updateStartTime;

      // パフォーマンス監視
      if (updateTime > 50) { // 50ms以上かかった場合は警告
        console.warn(`Final Integration System: Slow update detected (${updateTime.toFixed(2)}ms)`);
        this.integrationStatus.warningCount++;
      }

      // 常にtrueを返す（更新が実行されたことを示す）
      return true;

    } catch (error) {
      console.error('Final Integration System: Update error:', error);
      this.integrationStatus.errorCount++;
      this.totalErrorsHandled++;

      // エラー時のフォールバック処理
      return this.performFallbackUpdate(villages, gameTime, map);
    }
  }

  /**
   * UI更新の最適化制御
   * @param villageStatusUI 村状態UI
   * @param villages 村のリスト
   * @param forceUpdate 強制更新フラグ
   */
  updateUI(villageStatusUI: VillageStatusUI, villages: Village[], forceUpdate: boolean = false): void {
    try {
      // UI更新頻度の最適化
      if (forceUpdate || this.performanceOptimizer.shouldUpdateUI('status')) {
        const uiUpdateStartTime = performance.now();

        villageStatusUI.updateVillageStatus(villages, forceUpdate);

        const uiUpdateTime = performance.now() - uiUpdateStartTime;
        this.performanceOptimizer.markUIUpdated('status');

        // UI更新時間の監視
        if (uiUpdateTime > 20) { // 20ms以上かかった場合は警告
          console.warn(`Final Integration System: Slow UI update detected (${uiUpdateTime.toFixed(2)}ms)`);
        }
      }

    } catch (error) {
      console.error('Final Integration System: UI update error:', error);
      this.integrationStatus.errorCount++;
    }
  }

  /**
   * 村テキスト更新の最適化制御
   * @param updateCallback 更新コールバック関数
   */
  updateVillageTexts(updateCallback: () => void): void {
    try {
      if (this.performanceOptimizer.shouldUpdateUI('villageText')) {
        updateCallback();
        this.performanceOptimizer.markUIUpdated('villageText');
      }
    } catch (error) {
      console.error('Final Integration System: Village text update error:', error);
      this.integrationStatus.errorCount++;
    }
  }

  /**
   * 初期化テストの実行
   * @returns テスト結果のリスト
   */
  private async runInitializationTests(): Promise<IntegrationTestResult[]> {
    const tests: IntegrationTestResult[] = [];

    // 経済システムテスト
    tests.push(await this.testEconomySystem());

    // 人口システムテスト
    tests.push(await this.testPopulationSystem());

    // 建物システムテスト
    tests.push(await this.testBuildingSystem());

    // 需給バランサーテスト
    tests.push(await this.testSupplyDemandBalancer());

    // パフォーマンス最適化システムテスト
    tests.push(await this.testPerformanceOptimizer());

    // エラーハンドラーテスト
    tests.push(await this.testErrorHandler());

    // システム統合テスト
    tests.push(await this.testSystemIntegration());

    this.testResults = tests;
    return tests;
  }

  /**
   * 経済システムテスト
   */
  private async testEconomySystem(): Promise<IntegrationTestResult> {
    const startTime = performance.now();

    try {
      // テスト用の村を作成
      const testVillage = this.createTestVillage();
      const testGameTime: GameTime = { 
        currentTime: 1000, 
        deltaTime: 1.0, 
        totalTicks: 0, 
        totalSeconds: 0, 
        totalMinutes: 0, 
        currentTick: 0 
      };
      const testMap = this.createTestMap();

      // 経済システムの更新をテスト
      this.economyManager.updateVillageEconomy(testVillage, testGameTime, testMap);

      // 結果の検証
      const hasValidProduction = testVillage.economy.production.food >= 0 &&
        testVillage.economy.production.wood >= 0 &&
        testVillage.economy.production.ore >= 0;

      const hasValidConsumption = testVillage.economy.consumption.food >= 0 &&
        testVillage.economy.consumption.wood >= 0 &&
        testVillage.economy.consumption.ore >= 0;

      const hasValidStatus = testVillage.economy.supplyDemandStatus.food !== undefined &&
        testVillage.economy.supplyDemandStatus.wood !== undefined &&
        testVillage.economy.supplyDemandStatus.ore !== undefined;

      const passed = hasValidProduction && hasValidConsumption && hasValidStatus;

      return {
        testName: 'Economy System Test',
        passed,
        message: passed ? 'Economy system functioning correctly' : 'Economy system validation failed',
        executionTime: performance.now() - startTime,
        details: {
          production: testVillage.economy.production,
          consumption: testVillage.economy.consumption,
          status: testVillage.economy.supplyDemandStatus
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        testName: 'Economy System Test',
        passed: false,
        message: `Economy system test failed: ${errorMessage}`,
        executionTime: performance.now() - startTime,
        details: { error: errorMessage }
      };
    }
  }

  /**
   * 人口システムテスト
   */
  private async testPopulationSystem(): Promise<IntegrationTestResult> {
    const startTime = performance.now();

    try {
      const testVillage = this.createTestVillage();
      const testGameTime: GameTime = { 
        currentTime: 1000, 
        deltaTime: 1.0, 
        totalTicks: 0, 
        totalSeconds: 0, 
        totalMinutes: 0, 
        currentTick: 0 
      };

      const initialPopulation = testVillage.population;

      // 人口システムの更新をテスト
      this.populationManager.updatePopulation(testVillage, testGameTime);

      // 結果の検証
      const populationValid = testVillage.population >= 0;
      const hasHistory = Array.isArray(testVillage.populationHistory);

      const passed = populationValid && hasHistory;

      return {
        testName: 'Population System Test',
        passed,
        message: passed ? 'Population system functioning correctly' : 'Population system validation failed',
        executionTime: performance.now() - startTime,
        details: {
          initialPopulation,
          finalPopulation: testVillage.population,
          hasHistory
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        testName: 'Population System Test',
        passed: false,
        message: `Population system test failed: ${errorMessage}`,
        executionTime: performance.now() - startTime,
        details: { error: errorMessage }
      };
    }
  }

  /**
   * 建物システムテスト
   */
  private async testBuildingSystem(): Promise<IntegrationTestResult> {
    const startTime = performance.now();

    try {
      const testVillage = this.createTestVillage();
      const testGameTime: GameTime = { 
        currentTime: 1000, 
        deltaTime: 1.0, 
        totalTicks: 0, 
        totalSeconds: 0, 
        totalMinutes: 0, 
        currentTick: 0 
      };

      // 建物システムの更新をテスト
      this.buildingManager.updateBuildings(testVillage, testGameTime);

      // 結果の検証
      const hasValidBuildingCount = testVillage.economy.buildings.count >= 0;
      const hasValidTargetCount = testVillage.economy.buildings.targetCount >= 0;
      const hasValidQueue = testVillage.economy.buildings.constructionQueue >= 0;

      const passed = hasValidBuildingCount && hasValidTargetCount && hasValidQueue;

      return {
        testName: 'Building System Test',
        passed,
        message: passed ? 'Building system functioning correctly' : 'Building system validation failed',
        executionTime: performance.now() - startTime,
        details: {
          buildings: testVillage.economy.buildings
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        testName: 'Building System Test',
        passed: false,
        message: `Building system test failed: ${errorMessage}`,
        executionTime: performance.now() - startTime,
        details: { error: errorMessage }
      };
    }
  }

  /**
   * 需給バランサーテスト
   */
  private async testSupplyDemandBalancer(): Promise<IntegrationTestResult> {
    const startTime = performance.now();

    try {
      const testVillages = [this.createTestVillage(), this.createTestVillage()];

      // 需給バランサーのテスト
      const balanceComparison = this.supplyDemandBalancer.compareVillageBalances(testVillages);
      const supplyDemandInfo = this.supplyDemandBalancer.identifySupplyDemandVillages(testVillages);

      // 結果の検証
      const hasValidComparison = balanceComparison.food !== undefined &&
        balanceComparison.wood !== undefined &&
        balanceComparison.ore !== undefined;

      const hasValidInfo = Array.isArray(supplyDemandInfo.shortageVillages) &&
        Array.isArray(supplyDemandInfo.surplusVillages);

      const passed = hasValidComparison && hasValidInfo;

      return {
        testName: 'Supply Demand Balancer Test',
        passed,
        message: passed ? 'Supply demand balancer functioning correctly' : 'Supply demand balancer validation failed',
        executionTime: performance.now() - startTime,
        details: {
          balanceComparison: Object.keys(balanceComparison),
          supplyDemandInfo: {
            shortageCount: supplyDemandInfo.shortageVillages.length,
            surplusCount: supplyDemandInfo.surplusVillages.length
          }
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        testName: 'Supply Demand Balancer Test',
        passed: false,
        message: `Supply demand balancer test failed: ${errorMessage}`,
        executionTime: performance.now() - startTime,
        details: { error: errorMessage }
      };
    }
  }

  /**
   * パフォーマンス最適化システムテスト
   */
  private async testPerformanceOptimizer(): Promise<IntegrationTestResult> {
    const startTime = performance.now();

    try {
      const testVillages = [this.createTestVillage()];
      const testGameTime: GameTime = { 
        currentTime: 1000, 
        deltaTime: 1.0, 
        totalTicks: 0, 
        totalSeconds: 0, 
        totalMinutes: 0, 
        currentTick: 0 
      };
      const testMap = this.createTestMap();

      // パフォーマンス最適化システムのテスト
      const wasUpdated = this.performanceOptimizer.optimizedUpdate(testVillages, testGameTime, testMap);
      const metrics = this.performanceOptimizer.getPerformanceMetrics();

      // 結果の検証
      const hasValidMetrics = typeof metrics.frameTime === 'number' &&
        typeof metrics.updateTime === 'number' &&
        typeof metrics.averageFPS === 'number';

      const passed = typeof wasUpdated === 'boolean' && hasValidMetrics;

      return {
        testName: 'Performance Optimizer Test',
        passed,
        message: passed ? 'Performance optimizer functioning correctly' : 'Performance optimizer validation failed',
        executionTime: performance.now() - startTime,
        details: {
          wasUpdated,
          metrics
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        testName: 'Performance Optimizer Test',
        passed: false,
        message: `Performance optimizer test failed: ${errorMessage}`,
        executionTime: performance.now() - startTime,
        details: { error: errorMessage }
      };
    }
  }

  /**
   * エラーハンドラーテスト
   */
  private async testErrorHandler(): Promise<IntegrationTestResult> {
    const startTime = performance.now();

    try {
      const testVillage = this.createTestVillage();

      // 意図的に無効な値を設定
      testVillage.population = -10;
      testVillage.storage.food = -5;

      // エラーハンドラーのテスト
      const validationResult = this.errorHandler.validateVillageEconomy(testVillage);
      this.errorHandler.correctInvalidValues(testVillage);

      // 結果の検証
      const detectedErrors = !validationResult.isValid;
      const correctedValues = testVillage.population >= 0 && testVillage.storage.food >= 0;

      const passed = detectedErrors && correctedValues;

      return {
        testName: 'Error Handler Test',
        passed,
        message: passed ? 'Error handler functioning correctly' : 'Error handler validation failed',
        executionTime: performance.now() - startTime,
        details: {
          detectedErrors,
          correctedValues,
          validationResult
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        testName: 'Error Handler Test',
        passed: false,
        message: `Error handler test failed: ${errorMessage}`,
        executionTime: performance.now() - startTime,
        details: { error: errorMessage }
      };
    }
  }

  /**
   * システム統合テスト
   */
  private async testSystemIntegration(): Promise<IntegrationTestResult> {
    const startTime = performance.now();

    try {
      const testVillages = [this.createTestVillage(), this.createTestVillage()];
      const testGameTime: GameTime = { 
        currentTime: 1000, 
        deltaTime: 1.0, 
        totalTicks: 0, 
        totalSeconds: 0, 
        totalMinutes: 0, 
        currentTick: 0 
      };
      const testMap = this.createTestMap();

      // 統合システムのテスト
      for (const village of testVillages) {
        this.economyManager.updateVillageEconomy(village, testGameTime, testMap);
        this.populationManager.updatePopulation(village, testGameTime);
        this.buildingManager.updateBuildings(village, testGameTime);
      }

      const balanceInfo = this.supplyDemandBalancer.identifySupplyDemandVillages(testVillages);

      // 結果の検証
      const allVillagesValid = testVillages.every(village =>
        village.economy &&
        village.economy.production &&
        village.economy.consumption &&
        village.economy.supplyDemandStatus
      );

      const balanceInfoValid = balanceInfo.shortageVillages !== undefined &&
        balanceInfo.surplusVillages !== undefined;

      const passed = allVillagesValid && balanceInfoValid;

      return {
        testName: 'System Integration Test',
        passed,
        message: passed ? 'System integration functioning correctly' : 'System integration validation failed',
        executionTime: performance.now() - startTime,
        details: {
          villageCount: testVillages.length,
          allVillagesValid,
          balanceInfoValid
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        testName: 'System Integration Test',
        passed: false,
        message: `System integration test failed: ${errorMessage}`,
        executionTime: performance.now() - startTime,
        details: { error: errorMessage }
      };
    }
  }

  /**
   * システム健全性チェックが必要かどうか
   */
  private shouldPerformHealthCheck(): boolean {
    const now = Date.now();
    const lastCheck = this.integrationStatus.lastIntegrationCheck;
    return now - lastCheck > 30000; // 30秒間隔
  }

  /**
   * システム健全性チェックを実行
   */
  private performSystemHealthCheck(villages: Village[], roads: Road[]): void {
    try {
      const healthCheck: SystemHealthCheck = {
        overallHealth: 'healthy',
        villageDataIntegrity: this.checkVillageDataIntegrity(villages),
        economyDataConsistency: this.checkEconomyDataConsistency(villages),
        performanceWithinLimits: this.checkPerformanceWithinLimits(),
        memoryUsageAcceptable: this.checkMemoryUsage(),
        errorRateAcceptable: this.checkErrorRate(),
        recommendations: []
      };

      // 総合健全性の判定
      const criticalIssues = [
        !healthCheck.villageDataIntegrity,
        !healthCheck.economyDataConsistency,
        !healthCheck.performanceWithinLimits
      ].filter(issue => issue).length;

      const warningIssues = [
        !healthCheck.memoryUsageAcceptable,
        !healthCheck.errorRateAcceptable
      ].filter(issue => issue).length;

      if (criticalIssues > 0) {
        healthCheck.overallHealth = 'critical';
      } else if (warningIssues > 0) {
        healthCheck.overallHealth = 'warning';
      }

      // 推奨事項の生成
      this.generateRecommendations(healthCheck);

      // 健全性チェック履歴に追加
      this.healthCheckHistory.push(healthCheck);
      if (this.healthCheckHistory.length > 10) {
        this.healthCheckHistory.shift();
      }

      // 警告またはエラーの場合はログ出力
      if (healthCheck.overallHealth !== 'healthy') {
        console.warn('Final Integration System: Health check warning/error detected', healthCheck);
      }

    } catch (error) {
      console.error('Final Integration System: Health check error:', error);
    }
  }

  /**
   * 村データの整合性チェック
   */
  private checkVillageDataIntegrity(villages: Village[]): boolean {
    return villages.every(village => {
      return village.population >= 0 &&
        village.storage.food >= 0 &&
        village.storage.wood >= 0 &&
        village.storage.ore >= 0 &&
        village.collectionRadius > 0 &&
        village.economy !== undefined;
    });
  }

  /**
   * 経済データの一貫性チェック
   */
  private checkEconomyDataConsistency(villages: Village[]): boolean {
    return villages.every(village => {
      const economy = village.economy;
      return economy.production !== undefined &&
        economy.consumption !== undefined &&
        economy.stock !== undefined &&
        economy.supplyDemandStatus !== undefined &&
        economy.buildings !== undefined;
    });
  }

  /**
   * パフォーマンス制限内チェック
   */
  private checkPerformanceWithinLimits(): boolean {
    const metrics = this.performanceOptimizer.getPerformanceMetrics();
    return metrics.averageFPS >= 30 && // 最低30FPS
      metrics.updateTime <= 50;    // 最大50ms
  }

  /**
   * メモリ使用量チェック
   */
  private checkMemoryUsage(): boolean {
    // 簡易的なメモリ使用量チェック
    const performanceInfo = (performance as any).memory;
    if (performanceInfo) {
      const usedMemoryMB = performanceInfo.usedJSHeapSize / (1024 * 1024);
      return usedMemoryMB < 500; // 500MB未満
    }
    return true; // メモリ情報が取得できない場合はOKとする
  }

  /**
   * エラー率チェック
   */
  private checkErrorRate(): boolean {
    const uptime = Date.now() - this.systemStartTime;
    const errorRate = this.totalErrorsHandled / (uptime / 1000); // エラー/秒
    return errorRate < 0.1; // 0.1エラー/秒未満
  }

  /**
   * 推奨事項の生成
   */
  private generateRecommendations(healthCheck: SystemHealthCheck): void {
    if (!healthCheck.villageDataIntegrity) {
      healthCheck.recommendations.push('村データの整合性に問題があります。データ修復を実行してください。');
    }

    if (!healthCheck.economyDataConsistency) {
      healthCheck.recommendations.push('経済データの一貫性に問題があります。システムリセットを検討してください。');
    }

    if (!healthCheck.performanceWithinLimits) {
      healthCheck.recommendations.push('パフォーマンスが制限を超えています。最適化設定を調整してください。');
    }

    if (!healthCheck.memoryUsageAcceptable) {
      healthCheck.recommendations.push('メモリ使用量が多すぎます。メモリクリーンアップを実行してください。');
    }

    if (!healthCheck.errorRateAcceptable) {
      healthCheck.recommendations.push('エラー率が高すぎます。システムの安定性を確認してください。');
    }
  }

  /**
   * フォールバック更新処理
   */
  private performFallbackUpdate(villages: Village[], gameTime: GameTime, map: Tile[][]): boolean {
    try {
      // 最小限の安全な更新処理
      const maxVillages = Math.min(3, villages.length);
      for (let i = 0; i < maxVillages; i++) {
        const village = villages[i];

        // 基本的なデータ修復
        this.errorHandler.correctInvalidValues(village);

        // 最小限の経済更新
        try {
          this.economyManager.updateVillageEconomy(village, gameTime, map);
        } catch (error) {
          console.warn(`Fallback economy update failed for village ${i}:`, error);
        }
      }

      return true;

    } catch (error) {
      console.error('Final Integration System: Fallback update failed:', error);
      return false;
    }
  }

  /**
   * テスト用の村を作成
   */
  private createTestVillage(): Village {
    return {
      x: 10,
      y: 10,
      population: 15,
      storage: { food: 50, wood: 30, ore: 20 },
      collectionRadius: 2,
      economy: {
        production: { food: 0, wood: 0, ore: 0 },
        consumption: { food: 0, wood: 0, ore: 0 },
        stock: { food: 50, wood: 30, ore: 20, capacity: 100 },
        buildings: { count: 3, targetCount: 5, constructionQueue: 0 },
        supplyDemandStatus: { food: 'balanced', wood: 'balanced', ore: 'balanced' }
      },
      lastUpdateTime: 0,
      populationHistory: [15]
    };
  }

  /**
   * テスト用のマップを作成
   */
  private createTestMap(): Tile[][] {
    const map: Tile[][] = [];
    for (let y = 0; y < 20; y++) {
      map[y] = [];
      for (let x = 0; x < 20; x++) {
        map[y][x] = {
          type: 'land',
          height: 0.5,
          resources: { food: 10, wood: 8, ore: 5 },
          maxResources: { food: 20, wood: 15, ore: 10 },
          depletionState: { food: 1, wood: 1, ore: 1 },
          recoveryTimer: { food: 0, wood: 0, ore: 0 },
          lastHarvestTime: 0
        };
      }
    }
    return map;
  }

  /**
   * 失敗したテストをログ出力
   */
  private logFailedTests(tests: IntegrationTestResult[]): void {
    const failedTests = tests.filter(test => !test.passed);
    console.error('Failed integration tests:');
    failedTests.forEach(test => {
      console.error(`- ${test.testName}: ${test.message}`);
      if (test.details) {
        console.error('  Details:', test.details);
      }
    });
  }

  // Getter methods
  getIntegrationStatus(): SystemIntegrationStatus {
    return { ...this.integrationStatus };
  }

  getTestResults(): IntegrationTestResult[] {
    return [...this.testResults];
  }

  getHealthCheckHistory(): SystemHealthCheck[] {
    return [...this.healthCheckHistory];
  }

  getPerformanceMetrics(): PerformanceMetrics {
    return this.performanceOptimizer.getPerformanceMetrics();
  }

  getSystemStatistics() {
    return {
      totalVillagesProcessed: this.totalVillagesProcessed,
      totalErrorsHandled: this.totalErrorsHandled,
      systemUptime: Date.now() - this.systemStartTime,
      integrationStatus: this.integrationStatus
    };
  }

  // System control methods
  resetSystem(): void {
    this.performanceOptimizer.reset();
    this.integrationStatus.errorCount = 0;
    this.integrationStatus.warningCount = 0;
    this.totalErrorsHandled = 0;
    this.testResults = [];
    this.healthCheckHistory = [];
  }

  updateOptimizationConfig(newConfig: Partial<OptimizationConfig>): void {
    this.performanceOptimizer.updateOptimizationConfig(newConfig);
  }
}