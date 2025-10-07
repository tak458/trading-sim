/**
 * VillageEconomyManager - 村の経済状況を管理するクラス
 * 要件 1.1, 5.1, 5.2, 6.1, 6.2 に対応
 */

import {
  DEFAULT_SUPPLY_DEMAND_CONFIG,
  type SupplyDemandConfig,
} from "../../settings";
import { EconomyErrorHandler } from "../economy/economy-error-handler";
import {
  type Consumption,
  type Production,
  type SupplyDemandLevel,
  type SupplyDemandStatus,
  VillageEconomy,
} from "../economy/village-economy";
import type { GameTime, ResourceInfo } from "../shared-types";
import type { Tile } from "../world/map";
import type { Village } from "../world/village";

/**
 * 村の経済システムを管理するクラス
 * 要件 1.1: 村ごとに生産・消費・ストック管理機能を提供
 */
export class VillageEconomyManager {
  private config: SupplyDemandConfig;
  private errorHandler: EconomyErrorHandler;

  constructor(config: SupplyDemandConfig = DEFAULT_SUPPLY_DEMAND_CONFIG) {
    this.config = config;
    this.errorHandler = new EconomyErrorHandler(config);
  }

  /**
   * 村の経済状況を更新
   * 要件 1.4: 村の状態が変化する時にシステムは生産・消費・ストック情報を更新する
   * @param village 更新対象の村
   * @param gameTime ゲーム時間情報
   * @param map マップ情報（生産能力計算に使用）
   */
  updateVillageEconomy(
    village: Village,
    gameTime: GameTime,
    map: Tile[][],
  ): void {
    const villageId = `${village.x},${village.y}`;

    try {
      // データ整合性チェックと自動修正
      const validationResult =
        this.errorHandler.validateVillageEconomy(village);
      if (!validationResult.isValid) {
        this.errorHandler.correctInvalidValues(village);
      }

      // 利用可能な資源情報を取得
      const availableResources = this.errorHandler.safeCalculation(
        () => this.getAvailableResources(village, map),
        { food: 0, wood: 0, ore: 0 },
        "getAvailableResources",
        villageId,
      );

      // 生産能力を計算
      village.economy.production = this.errorHandler.safeCalculation(
        () => this.calculateProduction(village, availableResources),
        { food: 0, wood: 0, ore: 0 },
        "calculateProduction",
        villageId,
      );

      // 消費量を計算
      village.economy.consumption = this.errorHandler.safeCalculation(
        () => this.calculateConsumption(village),
        { food: 0, wood: 0, ore: 0 },
        "calculateConsumption",
        villageId,
      );

      // ストック情報を更新（既存のstorageと同期）
      this.updateStock(village);

      // 需給バランスを評価
      village.economy.supplyDemandStatus = this.errorHandler.safeCalculation(
        () => this.evaluateSupplyDemand(village),
        { food: "balanced", wood: "balanced", ore: "balanced" },
        "evaluateSupplyDemand",
        villageId,
      );

      // 最終更新時間を記録
      village.lastUpdateTime = gameTime.currentTime;

      // 更新後の最終検証
      this.errorHandler.correctInvalidValues(village);
    } catch (error) {
      console.error(
        `村 (${village.x}, ${village.y}) の経済更新でエラー:`,
        error,
      );
      // エラー時はエラーハンドラーを使用してリセット
      this.errorHandler.resetVillageEconomyToDefaults(village);
    }
  }

  /**
   * 生産能力を計算
   * 要件 5.1: 村が資源タイルにアクセスする時にシステムは村の生産能力を計算する
   * 要件 5.2: 村の周辺環境が変化する時にシステムは生産能力を再計算する
   * @param village 対象の村
   * @param availableResources 利用可能な資源情報
   * @returns 生産能力
   */
  calculateProduction(
    village: Village,
    availableResources: ResourceInfo,
  ): Production {
    // 安全な値の取得
    const radius = Math.max(1, village.collectionRadius || 1);
    const population = Math.max(0, village.population || 0);
    const buildingCount = Math.max(0, village.economy?.buildings?.count || 0);

    const baseProductionRate = 1.0; // 基本生産率

    // 人口による生産効率ボーナス（人口が多いほど効率的）
    const populationBonus = this.errorHandler.safeCalculation(
      () => Math.min(2.0, 1.0 + (population - 10) * 0.02),
      1.0,
      "populationBonus calculation",
    );

    // 建物による生産効率ボーナス
    const buildingBonus = this.errorHandler.safeCalculation(
      () => Math.min(1.5, 1.0 + buildingCount * 0.1),
      1.0,
      "buildingBonus calculation",
    );

    // 収集範囲による生産量調整
    const radiusMultiplier = this.errorHandler.safeCalculation(
      () => radius * radius,
      1,
      "radiusMultiplier calculation",
    );

    const totalMultiplier = this.errorHandler.safeCalculation(
      () =>
        baseProductionRate * populationBonus * buildingBonus * radiusMultiplier,
      1.0,
      "totalMultiplier calculation",
    );

    // 安全な資源値の取得
    const safeFood = Math.max(0, availableResources.food || 0);
    const safeWood = Math.max(0, availableResources.wood || 0);
    const safeOre = Math.max(0, availableResources.ore || 0);

    return {
      food: this.errorHandler.safeCalculation(
        () => Math.max(0, safeFood * totalMultiplier * 0.1),
        0,
        "food production calculation",
      ),
      wood: this.errorHandler.safeCalculation(
        () => Math.max(0, safeWood * totalMultiplier * 0.08),
        0,
        "wood production calculation",
      ),
      ore: this.errorHandler.safeCalculation(
        () => Math.max(0, safeOre * totalMultiplier * 0.05),
        0,
        "ore production calculation",
      ),
    };
  }

  /**
   * 消費量を計算
   * 要件 2.1: 時間が経過する時にシステムは村の人口に比例して食料を消費する
   * 要件 3.1: 村が建物を建設する時にシステムは木材と鉱石を消費する
   * @param village 対象の村
   * @returns 消費量
   */
  calculateConsumption(village: Village): Consumption {
    // 安全な値の取得
    const population = Math.max(0, village.population || 0);
    const constructionQueue = Math.max(
      0,
      village.economy?.buildings?.constructionQueue || 0,
    );

    // 食料消費：人口に比例
    const foodConsumption = this.errorHandler.safeCalculation(
      () => population * this.config.foodConsumptionPerPerson,
      0,
      "food consumption calculation",
    );

    // 建物建設による木材・鉱石消費
    const woodConsumption = this.errorHandler.safeCalculation(
      () => constructionQueue * this.config.buildingWoodCost,
      0,
      "wood consumption calculation",
    );

    const oreConsumption = this.errorHandler.safeCalculation(
      () => constructionQueue * this.config.buildingOreCost,
      0,
      "ore consumption calculation",
    );

    return {
      food: Math.max(0, foodConsumption),
      wood: Math.max(0, woodConsumption),
      ore: Math.max(0, oreConsumption),
    };
  }

  /**
   * 需給バランスを評価
   * 要件 6.1: システムが村の状態を評価する時に各村の資源余剰・不足状況を判定する
   * 要件 6.2: 村に資源余剰がある時にシステムは余剰資源を他村への供給候補として識別する
   * @param village 対象の村
   * @returns 需給バランス状況
   */
  evaluateSupplyDemand(village: Village): SupplyDemandStatus {
    const production = village.economy.production;
    const consumption = village.economy.consumption;
    const stock = village.economy.stock;

    return {
      food: this.evaluateResourceBalance(
        production.food,
        consumption.food,
        stock.food,
      ),
      wood: this.evaluateResourceBalance(
        production.wood,
        consumption.wood,
        stock.wood,
      ),
      ore: this.evaluateResourceBalance(
        production.ore,
        consumption.ore,
        stock.ore,
      ),
    };
  }

  /**
   * 資源不足の村を特定
   * 要件 6.3: 村で資源不足が発生している時にシステムは近隣村からの供給可能性を評価する
   * @param villages 全ての村のリスト
   * @returns 資源不足の村のリスト
   */
  getResourceShortageVillages(villages: Village[]): Village[] {
    return villages.filter((village) => {
      const status = village.economy.supplyDemandStatus;
      return (
        status.food === "shortage" ||
        status.food === "critical" ||
        status.wood === "shortage" ||
        status.wood === "critical" ||
        status.ore === "shortage" ||
        status.ore === "critical"
      );
    });
  }

  /**
   * 資源余剰の村を特定
   * 要件 6.2: 村に資源余剰がある時にシステムは余剰資源を他村への供給候補として識別する
   * @param villages 全ての村のリスト
   * @returns 資源余剰の村のリスト
   */
  getResourceSurplusVillages(villages: Village[]): Village[] {
    return villages.filter((village) => {
      const status = village.economy.supplyDemandStatus;
      return (
        status.food === "surplus" ||
        status.wood === "surplus" ||
        status.ore === "surplus"
      );
    });
  }

  /**
   * 個別資源の需給バランスを評価
   * @param production 生産量
   * @param consumption 消費量
   * @param stock 現在のストック量
   * @returns 需給レベル
   */
  private evaluateResourceBalance(
    production: number,
    consumption: number,
    stock: number,
  ): SupplyDemandLevel {
    // 安全な値の確保
    const safeProduction = Math.max(0, production || 0);
    const safeConsumption = Math.max(0, consumption || 0);
    const safeStock = Math.max(0, stock || 0);

    // 消費量がゼロの場合は生産量とストックで判定
    if (safeConsumption <= 0) {
      if (safeStock > 50) return "surplus";
      if (safeStock > 20) return "balanced";
      if (safeStock > 5) return "shortage";
      return "critical";
    }

    // 生産量と消費量の比率で基本判定（ゼロ除算を防ぐ）
    const productionRatio = this.errorHandler.safeCalculation(
      () => safeProduction / safeConsumption,
      0,
      "production ratio calculation",
    );

    // ストック量も考慮した総合判定（ゼロ除算を防ぐ）
    const stockDays = this.errorHandler.safeCalculation(
      () => safeStock / safeConsumption,
      0,
      "stock days calculation",
    );

    // 危機的状況を最優先で判定（生産が大幅に不足し、ストックが危機的）
    if (productionRatio < this.config.criticalThreshold || stockDays < 1) {
      return "critical";
    }

    // 生産が消費を大幅に上回り、ストックも十分
    if (productionRatio >= this.config.surplusThreshold && stockDays > 10) {
      return "surplus";
    }

    // 生産が消費を下回り、ストックも少ない
    if (productionRatio < this.config.shortageThreshold && stockDays < 3) {
      return "shortage";
    }

    return "balanced";
  }

  /**
   * 村の周辺から利用可能な資源を取得
   * @param village 対象の村
   * @param map マップ情報
   * @returns 利用可能な資源情報
   */
  private getAvailableResources(village: Village, map: Tile[][]): ResourceInfo {
    const radius = village.collectionRadius;
    const availableResources: ResourceInfo = { food: 0, wood: 0, ore: 0 };

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const tx = village.x + dx;
        const ty = village.y + dy;

        if (map[ty] && map[ty][tx]) {
          const tile = map[ty][tx];
          availableResources.food += tile.resources.food;
          availableResources.wood += tile.resources.wood;
          availableResources.ore += tile.resources.ore;
        }
      }
    }

    return availableResources;
  }

  /**
   * ストック情報を更新（既存のstorageと同期）
   * 要件 1.2: 村が資源を収集する時にシステムは村のストックを更新する
   * 要件 1.3: 村に資源ストックがある時にシステムは各資源タイプの現在量を追跡する
   * @param village 対象の村
   */
  private updateStock(village: Village): void {
    // 既存のstorageと同期
    village.economy.stock.food = village.storage.food;
    village.economy.stock.wood = village.storage.wood;
    village.economy.stock.ore = village.storage.ore;

    // ストック容量を建物数に基づいて計算
    village.economy.stock.capacity =
      this.config.baseStorageCapacity +
      village.economy.buildings.count * this.config.storageCapacityPerBuilding;
  }

  /**
   * エラーハンドラーへのアクセスを提供
   * @returns エラーハンドラーインスタンス
   */
  getErrorHandler(): EconomyErrorHandler {
    return this.errorHandler;
  }
}
