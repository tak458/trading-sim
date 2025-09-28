/**
 * PopulationManager - 人口管理システム
 * 要件 2.1, 2.2, 2.3, 2.4, 2.5 に対応
 */

import { Village } from './village';
import { SupplyDemandConfig, DEFAULT_SUPPLY_DEMAND_CONFIG } from './village-economy';
import { EconomyErrorHandler } from './economy-error-handler';

/**
 * ゲーム時間を表すインターフェース
 */
export interface GameTime {
  currentTime: number;
  deltaTime: number;
}

/**
 * 人口管理を行うクラス
 * 食料消費による人口変化を処理
 */
export class PopulationManager {
  private config: SupplyDemandConfig;
  private errorHandler: EconomyErrorHandler;

  constructor(config: SupplyDemandConfig = DEFAULT_SUPPLY_DEMAND_CONFIG) {
    this.config = config;
    this.errorHandler = new EconomyErrorHandler(config);
  }

  /**
   * 食料消費による人口変化を処理
   * 要件 2.1: 時間が経過する時にシステムは村の人口に比例して食料を消費する
   * 要件 2.3: 村の食料が不足している時にシステムは人口増加を停止する
   * 要件 2.4: 村の食料が完全に枯渇する時にシステムは人口を減少させる
   * 要件 2.5: 食料状況が改善される時にシステムは人口増加を再開する
   * @param village 対象の村
   * @param gameTime ゲーム時間情報
   */
  updatePopulation(village: Village, gameTime: GameTime): void {
    const villageId = `${village.x},${village.y}`;
    
    try {
      // データ整合性チェック
      this.errorHandler.correctInvalidValues(village);
      
      // 食料消費量を計算
      const foodConsumption = this.errorHandler.safeCalculation(
        () => this.calculateFoodConsumption(village.population),
        0,
        'calculateFoodConsumption',
        villageId
      );
      
      // 実際に食料を消費
      const actualConsumption = this.errorHandler.safeCalculation(
        () => Math.min(foodConsumption * gameTime.deltaTime, village.storage.food),
        0,
        'actualConsumption calculation',
        villageId
      );
      
      village.storage.food = Math.max(0, village.storage.food - actualConsumption);
      
      // 経済ストックと同期
      if (village.economy && village.economy.stock) {
        village.economy.stock.food = village.storage.food;
      }
      
      // 人口変化の判定と処理
      const shouldDecrease = this.errorHandler.safeCalculation(
        () => this.shouldPopulationDecrease(village),
        false,
        'shouldPopulationDecrease',
        villageId
      );
      
      const canGrow = this.errorHandler.safeCalculation(
        () => this.canPopulationGrow(village),
        false,
        'canPopulationGrow',
        villageId
      );
      
      if (shouldDecrease) {
        // 食料枯渇時の人口減少
        this.decreasePopulation(village, gameTime);
      } else if (canGrow) {
        // 食料が十分な場合の人口増加
        this.increasePopulation(village, gameTime);
      }
      
      // 人口履歴を更新（最新10件まで保持）
      if (!village.populationHistory) {
        village.populationHistory = [];
      }
      village.populationHistory.push(village.population);
      while (village.populationHistory.length > 10) {
        village.populationHistory.shift();
      }
      
      // 最終的なデータ整合性チェック
      this.errorHandler.correctInvalidValues(village);
      
    } catch (error) {
      console.error(`村 (${village.x}, ${village.y}) の人口更新でエラー:`, error);
      // エラー時はエラーハンドラーでリセット
      this.errorHandler.resetVillageEconomyToDefaults(village);
    }
  }

  /**
   * 人口1人当たりの食料消費量を計算
   * 要件 2.1: 時間が経過する時にシステムは村の人口に比例して食料を消費する
   * 要件 2.2: 村の人口が増加する時にシステムは食料消費量を増加させる
   * @param population 現在の人口
   * @returns 食料消費量（時間単位あたり）
   */
  calculateFoodConsumption(population: number): number {
    const safePopulation = Math.max(0, population || 0);
    
    if (safePopulation <= 0) {
      return 0;
    }
    
    // 基本消費量：人口 × 1人当たり消費量
    const baseConsumption = this.errorHandler.safeCalculation(
      () => safePopulation * this.config.foodConsumptionPerPerson,
      0,
      'base food consumption calculation'
    );
    
    // 人口規模による効率性（大きな村ほど若干効率的）
    const efficiencyFactor = this.errorHandler.safeCalculation(
      () => Math.max(0.8, 1.0 - (safePopulation - 10) * 0.002),
      1.0,
      'efficiency factor calculation'
    );
    
    return this.errorHandler.safeCalculation(
      () => Math.max(0, baseConsumption * efficiencyFactor),
      0,
      'final food consumption calculation'
    );
  }

  /**
   * 人口増加条件をチェック
   * 要件 2.3: 村の食料が不足している時にシステムは人口増加を停止する
   * 要件 2.5: 食料状況が改善される時にシステムは人口増加を再開する
   * @param village 対象の村
   * @returns 人口増加可能かどうか
   */
  canPopulationGrow(village: Village): boolean {
    // 基本的な成長条件
    const hasGrowthPotential = village.population < 100; // 最大人口制限
    
    // 食料状況の確認
    const currentFoodConsumption = this.calculateFoodConsumption(village.population);
    const futurePopulation = village.population + 1;
    const futureFoodConsumption = this.calculateFoodConsumption(futurePopulation);
    
    // 現在の食料で将来の消費をまかなえるか（最低3時間分の余裕が必要）
    const requiredFoodBuffer = futureFoodConsumption * 3;
    const hasSufficientFood = village.storage.food >= requiredFoodBuffer;
    
    // 食料生産が消費を上回っているか
    const foodProduction = village.economy.production.food;
    const hasPositiveFoodBalance = foodProduction >= futureFoodConsumption;
    
    // 需給状況が危機的でないか
    const foodStatus = village.economy.supplyDemandStatus.food;
    const isNotCritical = foodStatus !== 'critical' && foodStatus !== 'shortage';
    
    return hasGrowthPotential && hasSufficientFood && hasPositiveFoodBalance && isNotCritical;
  }

  /**
   * 人口減少条件をチェック
   * 要件 2.4: 村の食料が完全に枯渇する時にシステムは人口を減少させる
   * @param village 対象の村
   * @returns 人口減少すべきかどうか
   */
  shouldPopulationDecrease(village: Village): boolean {
    // 食料が完全に枯渇している
    const isFoodDepleted = village.storage.food <= 0;
    
    // 食料生産が極めて低い（消費量の30%未満）
    const currentConsumption = this.calculateFoodConsumption(village.population);
    const isProductionInsufficient = village.economy.production.food < (currentConsumption * 0.3);
    
    // 需給状況が危機的
    const isCriticalStatus = village.economy.supplyDemandStatus.food === 'critical';
    
    // 人口が最低限を下回らないようにする（最低1人は維持）
    const isAboveMinimum = village.population > 1;
    
    return isAboveMinimum && (isFoodDepleted || (isProductionInsufficient && isCriticalStatus));
  }

  /**
   * 人口を増加させる
   * @param village 対象の村
   * @param gameTime ゲーム時間情報
   */
  private increasePopulation(village: Village, gameTime: GameTime): void {
    // 成長率に基づく確率的な人口増加
    const growthChance = this.config.populationGrowthRate * gameTime.deltaTime;
    
    // 食料の豊富さに基づく成長ボーナス
    const foodAbundance = Math.min(2.0, village.storage.food / (this.calculateFoodConsumption(village.population) * 10));
    const adjustedGrowthChance = growthChance * foodAbundance;
    
    if (Math.random() < adjustedGrowthChance) {
      village.population++;
      
      // 人口増加に伴う収集範囲の拡大（20人ごとに1拡大、最大4まで）
      const newRadius = Math.min(4, Math.floor(village.population / 20) + 1);
      village.collectionRadius = Math.max(village.collectionRadius, newRadius);
    }
  }

  /**
   * 人口を減少させる
   * @param village 対象の村
   * @param gameTime ゲーム時間情報
   */
  private decreasePopulation(village: Village, gameTime: GameTime): void {
    // 減少率に基づく確率的な人口減少
    const declineChance = this.config.populationDeclineRate * gameTime.deltaTime;
    
    // 食料不足の深刻さに基づく減少加速
    const foodShortage = Math.max(1.0, 2.0 - (village.storage.food / Math.max(0.1, this.calculateFoodConsumption(village.population))));
    const adjustedDeclineChance = declineChance * foodShortage;
    
    if (Math.random() < adjustedDeclineChance && village.population > 1) {
      village.population--;
      
      // 人口減少に伴う収集範囲の縮小（必要に応じて）
      const newRadius = Math.max(1, Math.floor(village.population / 20) + 1);
      village.collectionRadius = Math.min(village.collectionRadius, newRadius);
    }
  }

  /**
   * 村の人口統計情報を取得
   * @param village 対象の村
   * @returns 人口統計情報
   */
  getPopulationStats(village: Village): {
    currentPopulation: number;
    foodConsumption: number;
    canGrow: boolean;
    shouldDecline: boolean;
    populationTrend: 'growing' | 'stable' | 'declining';
  } {
    const currentConsumption = this.calculateFoodConsumption(village.population);
    const canGrow = this.canPopulationGrow(village);
    const shouldDecline = this.shouldPopulationDecrease(village);
    
    // 人口トレンドを履歴から判定
    let trend: 'growing' | 'stable' | 'declining' = 'stable';
    if (village.populationHistory.length >= 3) {
      const recent = village.populationHistory.slice(-3);
      const isGrowing = recent[2] > recent[0];
      const isDeclining = recent[2] < recent[0];
      
      if (isGrowing) trend = 'growing';
      else if (isDeclining) trend = 'declining';
    }
    
    return {
      currentPopulation: village.population,
      foodConsumption: currentConsumption,
      canGrow,
      shouldDecline,
      populationTrend: trend
    };
  }
}