/**
 * BuildingManager - 建物管理システム
 * 要件 3.1, 3.2, 3.3, 3.4 に対応
 */

import { Village } from '../world/village';
import { SupplyDemandConfig, DEFAULT_SUPPLY_DEMAND_CONFIG } from '../../settings';
import { EconomyErrorHandler } from '../economy/economy-error-handler';

import type { GameTime } from '../shared-types';

/**
 * 建物建設コストを表すインターフェース
 */
export interface BuildingCost {
  wood: number;
  ore: number;
}

/**
 * 建物管理を行うクラス
 * 人口に基づく建物建設と資源消費を処理
 */
export class BuildingManager {
  private config: SupplyDemandConfig;
  private errorHandler: EconomyErrorHandler;

  constructor(config: SupplyDemandConfig = DEFAULT_SUPPLY_DEMAND_CONFIG) {
    this.config = config;
    this.errorHandler = new EconomyErrorHandler(config);
  }

  /**
   * 人口に基づく建物建設を処理
   * 要件 3.1: 村が建物を建設する時にシステムは木材と鉱石を消費する
   * 要件 3.2: 村の人口が増加する時にシステムは人口に比例して建物数を増加させる
   * 要件 3.4: 建設資源が不足する時にシステムは村の建物増加を停止する
   * @param village 対象の村
   * @param gameTime ゲーム時間情報
   */
  updateBuildings(village: Village, gameTime: GameTime): void {
    const villageId = `${village.x},${village.y}`;
    
    try {
      // データ整合性チェック
      this.errorHandler.correctInvalidValues(village);
      
      // 建設キューの処理（時間経過による建設完了）を先に実行
      this.processConstructionQueue(village, gameTime);
      
      // 目標建物数を計算
      const targetCount = this.errorHandler.safeCalculation(
        () => this.calculateTargetBuildingCount(village.population),
        0,
        'calculateTargetBuildingCount',
        villageId
      );
      
      if (village.economy && village.economy.buildings) {
        village.economy.buildings.targetCount = targetCount;
        
        // 現在の建物数（建設中含む）が目標に達していない場合、建設を試行
        const totalBuildings = this.errorHandler.safeCalculation(
          () => village.economy.buildings.count + village.economy.buildings.constructionQueue,
          0,
          'totalBuildings calculation',
          villageId
        );
        
        const buildingsNeeded = Math.max(0, targetCount - totalBuildings);
        
        if (buildingsNeeded > 0) {
          // 建設可能な建物数を計算（資源制限を考慮）
          const maxBuildable = this.errorHandler.safeCalculation(
            () => this.calculateMaxBuildableBuildings(village),
            0,
            'calculateMaxBuildableBuildings',
            villageId
          );
          
          const actualBuildCount = Math.min(buildingsNeeded, maxBuildable);
          
          const canBuild = this.errorHandler.safeCalculation(
            () => this.canBuildBuilding(village),
            false,
            'canBuildBuilding',
            villageId
          );
          
          if (actualBuildCount > 0 && canBuild) {
            this.constructBuildings(village, actualBuildCount, gameTime);
          }
        }
      }
      
      // 最終的なデータ整合性チェック
      this.errorHandler.correctInvalidValues(village);
      
    } catch (error) {
      console.error(`村 (${village.x}, ${village.y}) の建物更新でエラー:`, error);
      // エラー時はエラーハンドラーでリセット
      this.errorHandler.resetVillageEconomyToDefaults(village);
    }
  }

  /**
   * 人口に比例した目標建物数を計算
   * 要件 3.2: 村の人口が増加する時にシステムは人口に比例して建物数を増加させる
   * @param population 現在の人口
   * @returns 目標建物数
   */
  calculateTargetBuildingCount(population: number): number {
    const safePopulation = Math.max(0, population || 0);
    
    if (safePopulation <= 0) {
      return 0;
    }
    
    // 基本計算：人口 × 建物比率
    const baseCount = this.errorHandler.safeCalculation(
      () => Math.floor(safePopulation * this.config.buildingsPerPopulation),
      0,
      'base building count calculation'
    );
    
    // 最低1つの建物は必要（人口が1以上の場合）
    const minimumBuildings = safePopulation >= 1 ? 1 : 0;
    
    // 最大建物数の制限（人口の半分まで）
    const maximumBuildings = this.errorHandler.safeCalculation(
      () => Math.floor(safePopulation / 2),
      1,
      'maximum buildings calculation'
    );
    
    return Math.max(minimumBuildings, Math.min(baseCount, maximumBuildings));
  }

  /**
   * 建物1つあたりの木材・鉱石コストを計算
   * 要件 3.1: 村が建物を建設する時にシステムは木材と鉱石を消費する
   * @returns 建物建設コスト
   */
  calculateBuildingCost(): BuildingCost {
    return {
      wood: this.config.buildingWoodCost,
      ore: this.config.buildingOreCost
    };
  }

  /**
   * 資源不足時の建物建設制限ロジック
   * 要件 3.3: 村に十分な木材または鉱石がない時にシステムは建物建設を制限する
   * 要件 3.4: 建設資源が不足する時にシステムは村の建物増加を停止する
   * @param village 対象の村
   * @returns 建設可能かどうか
   */
  canBuildBuilding(village: Village): boolean {
    const cost = this.calculateBuildingCost();
    
    // 基本的な資源チェック
    const hasEnoughWood = village.storage.wood >= cost.wood;
    const hasEnoughOre = village.storage.ore >= cost.ore;
    
    if (!hasEnoughWood || !hasEnoughOre) {
      return false;
    }
    
    // 建設後も最低限の資源を維持できるかチェック
    const woodAfterConstruction = village.storage.wood - cost.wood;
    const oreAfterConstruction = village.storage.ore - cost.ore;
    
    // 最低限の資源バッファを維持（建設コストの2倍分）
    const minimumWoodBuffer = cost.wood * 2;
    const minimumOreBuffer = cost.ore * 2;
    
    const maintainsWoodBuffer = woodAfterConstruction >= minimumWoodBuffer;
    const maintainsOreBuffer = oreAfterConstruction >= minimumOreBuffer;
    
    // 需給状況が危機的でないかチェック
    const woodStatus = village.economy.supplyDemandStatus.wood;
    const oreStatus = village.economy.supplyDemandStatus.ore;
    
    const woodNotCritical = woodStatus !== 'critical';
    const oreNotCritical = oreStatus !== 'critical';
    
    // 建設キューが満杯でないかチェック（最大3つまで同時建設）
    const queueNotFull = village.economy.buildings.constructionQueue < 3;
    
    return maintainsWoodBuffer && maintainsOreBuffer && 
           woodNotCritical && oreNotCritical && queueNotFull;
  }

  /**
   * 建設可能な最大建物数を計算
   * @param village 対象の村
   * @returns 建設可能な建物数
   */
  private calculateMaxBuildableBuildings(village: Village): number {
    const cost = this.calculateBuildingCost();
    
    // 利用可能な資源から建設可能数を計算
    const maxByWood = Math.floor(village.storage.wood / cost.wood);
    const maxByOre = Math.floor(village.storage.ore / cost.ore);
    
    // 制限要因となる資源で決定
    const maxByResources = Math.min(maxByWood, maxByOre);
    
    // 建設キューの空き容量も考慮
    const queueCapacity = Math.max(0, 3 - village.economy.buildings.constructionQueue);
    
    return Math.min(maxByResources, queueCapacity);
  }

  /**
   * 建物を建設する（資源を消費し建設キューに追加）
   * @param village 対象の村
   * @param buildCount 建設する建物数
   * @param gameTime ゲーム時間情報
   */
  private constructBuildings(village: Village, buildCount: number, gameTime: GameTime): void {
    const cost = this.calculateBuildingCost();
    const totalWoodCost = cost.wood * buildCount;
    const totalOreCost = cost.ore * buildCount;
    
    // 資源を消費
    village.storage.wood -= totalWoodCost;
    village.storage.ore -= totalOreCost;
    
    // ストック情報を同期
    village.economy.stock.wood = village.storage.wood;
    village.economy.stock.ore = village.storage.ore;
    
    // 建設キューに追加
    village.economy.buildings.constructionQueue += buildCount;
    
    console.log(`村 (${village.x}, ${village.y}): ${buildCount}棟の建物建設を開始 (木材: ${totalWoodCost}, 鉱石: ${totalOreCost})`);
  }

  /**
   * 建設キューを処理（時間経過による建設完了）
   * @param village 対象の村
   * @param gameTime ゲーム時間情報
   */
  private processConstructionQueue(village: Village, gameTime: GameTime): void {
    if (village.economy.buildings.constructionQueue <= 0) {
      return;
    }
    
    // 建設時間（1建物あたり5時間）
    const constructionTimePerBuilding = 5.0;
    const completionRate = gameTime.deltaTime / constructionTimePerBuilding;
    
    // 完成した建物数を計算（建設キューの数を超えないように制限）
    const maxCompletable = village.economy.buildings.constructionQueue;
    const completedBuildings = Math.min(maxCompletable, Math.floor(maxCompletable * completionRate));
    
    if (completedBuildings > 0) {
      // 建物数を増加
      village.economy.buildings.count += completedBuildings;
      
      // 建設キューから削除
      village.economy.buildings.constructionQueue -= completedBuildings;
      
      // ストック容量を更新
      village.economy.stock.capacity = this.config.baseStorageCapacity + 
        (village.economy.buildings.count * this.config.storageCapacityPerBuilding);
      
      console.log(`村 (${village.x}, ${village.y}): ${completedBuildings}棟の建物が完成 (総建物数: ${village.economy.buildings.count})`);
    }
  }

  /**
   * 村の建物統計情報を取得
   * @param village 対象の村
   * @returns 建物統計情報
   */
  getBuildingStats(village: Village): {
    currentCount: number;
    targetCount: number;
    constructionQueue: number;
    canBuild: boolean;
    buildingCost: BuildingCost;
    maxBuildable: number;
  } {
    return {
      currentCount: village.economy.buildings.count,
      targetCount: village.economy.buildings.targetCount,
      constructionQueue: village.economy.buildings.constructionQueue,
      canBuild: this.canBuildBuilding(village),
      buildingCost: this.calculateBuildingCost(),
      maxBuildable: this.calculateMaxBuildableBuildings(village)
    };
  }
}