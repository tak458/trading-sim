/**
 * EconomyErrorHandler - 村経済システムのエラーハンドリングとデータ整合性管理
 * 要件: 全要件の安定性確保
 */

import {
  DEFAULT_SUPPLY_DEMAND_CONFIG,
  type SupplyDemandConfig,
} from "../../settings";
import type { Village } from "../world/village";
import type { VillageEconomy } from "./village-economy";

/**
 * エラータイプの定義
 */
export type EconomyErrorType =
  | "calculation"
  | "data_integrity"
  | "state_inconsistency"
  | "validation";

/**
 * 経済システムエラー情報
 */
export interface EconomyError {
  villageId: string;
  errorType: EconomyErrorType;
  message: string;
  timestamp: number;
  recoveryAction: string;
  originalValue?: any;
  correctedValue?: any;
}

/**
 * データ検証結果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: EconomyError[];
  warnings: string[];
}

/**
 * 数値範囲の定義
 */
interface NumericRange {
  min: number;
  max: number;
  defaultValue: number;
}

/**
 * 経済システムのエラーハンドリングと整合性チェックを行うクラス
 */
export class EconomyErrorHandler {
  private config: SupplyDemandConfig;
  private errorLog: EconomyError[] = [];
  private maxLogSize: number = 1000;

  // 数値範囲の定義
  private readonly ranges = {
    population: { min: 0, max: 1000, defaultValue: 1 },
    resources: { min: 0, max: 100000, defaultValue: 0 },
    production: { min: 0, max: 10000, defaultValue: 0 },
    consumption: { min: 0, max: 10000, defaultValue: 0 },
    buildings: { min: 0, max: 500, defaultValue: 0 },
    collectionRadius: { min: 1, max: 10, defaultValue: 1 },
    capacity: { min: 0, max: 200000, defaultValue: 100 },
  };

  constructor(config: SupplyDemandConfig = DEFAULT_SUPPLY_DEMAND_CONFIG) {
    this.config = config;
  }

  /**
   * 村の経済データの包括的な整合性チェック
   * @param village 検証対象の村
   * @returns 検証結果
   */
  validateVillageEconomy(village: Village): ValidationResult {
    const errors: EconomyError[] = [];
    const warnings: string[] = [];
    const villageId = `${village.x},${village.y}`;

    try {
      // 基本データの検証
      this.validateBasicData(village, errors, warnings, villageId);

      // 経済データの検証
      this.validateEconomyData(village, errors, warnings, villageId);

      // 関係性の検証
      this.validateRelationships(village, errors, warnings, villageId);

      // 計算結果の検証
      this.validateCalculationResults(village, errors, warnings, villageId);
    } catch (error) {
      errors.push(
        this.createError(
          villageId,
          "validation",
          `検証プロセス中にエラーが発生: ${error}`,
          "validateVillageEconomy でのエラー処理",
        ),
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 負の値や範囲外の値を自動修正
   * @param village 修正対象の村
   * @returns 修正が行われたかどうか
   */
  correctInvalidValues(village: Village): boolean {
    let correctionsMade = false;
    const villageId = `${village.x},${village.y}`;

    try {
      // 基本データの修正
      correctionsMade =
        this.correctBasicData(village, villageId) || correctionsMade;

      // 経済データの修正
      correctionsMade =
        this.correctEconomyData(village, villageId) || correctionsMade;

      // ストレージデータの修正
      correctionsMade =
        this.correctStorageData(village, villageId) || correctionsMade;
    } catch (error) {
      this.logError(
        this.createError(
          villageId,
          "data_integrity",
          `データ修正中にエラーが発生: ${error}`,
          "correctInvalidValues でのエラー処理",
        ),
      );
    }

    return correctionsMade;
  }

  /**
   * 計算エラー（ゼロ除算、NaN等）の安全な処理
   * @param value 検証する値
   * @param fallbackValue フォールバック値
   * @param context エラーコンテキスト
   * @returns 安全な値
   */
  safeCalculation<T>(
    calculation: () => T,
    fallbackValue: T,
    context: string,
    villageId?: string,
  ): T {
    try {
      const result = calculation();

      // NaN、Infinity、undefined のチェック
      if (typeof result === "number") {
        if (!isFinite(result) || isNaN(result)) {
          this.logError(
            this.createError(
              villageId || "unknown",
              "calculation",
              `計算結果が無効な値: ${result} (コンテキスト: ${context})`,
              `フォールバック値 ${fallbackValue} を使用`,
            ),
          );
          return fallbackValue;
        }
      }

      // null チェック
      if (result === null || result === undefined) {
        this.logError(
          this.createError(
            villageId || "unknown",
            "calculation",
            `計算結果がnull/undefined (コンテキスト: ${context})`,
            `フォールバック値 ${fallbackValue} を使用`,
          ),
        );
        return fallbackValue;
      }

      return result;
    } catch (error) {
      this.logError(
        this.createError(
          villageId || "unknown",
          "calculation",
          `計算中にエラーが発生: ${error} (コンテキスト: ${context})`,
          `フォールバック値 ${fallbackValue} を使用`,
        ),
      );
      return fallbackValue;
    }
  }

  /**
   * 村の経済データをデフォルト値にリセット
   * @param village リセット対象の村
   */
  resetVillageEconomyToDefaults(village: Village): void {
    const villageId = `${village.x},${village.y}`;

    try {
      // 経済データが存在しない場合は初期化
      if (!village.economy) {
        village.economy = this.createDefaultEconomy();
        this.logError(
          this.createError(
            villageId,
            "state_inconsistency",
            "経済データが存在しないため初期化",
            "デフォルト経済データを作成",
          ),
        );
        return;
      }

      // 各セクションをデフォルト値にリセット
      village.economy.production = { food: 0, wood: 0, ore: 0 };
      village.economy.consumption = { food: 0, wood: 0, ore: 0 };
      village.economy.supplyDemandStatus = {
        food: "balanced",
        wood: "balanced",
        ore: "balanced",
      };

      // 建物データのリセット
      village.economy.buildings = {
        count: Math.max(0, village.economy.buildings?.count || 0),
        targetCount: 0,
        constructionQueue: 0,
      };

      // ストックデータの同期
      village.economy.stock = {
        food: Math.max(0, village.storage?.food || 0),
        wood: Math.max(0, village.storage?.wood || 0),
        ore: Math.max(0, village.storage?.ore || 0),
        capacity: this.config.baseStorageCapacity,
      };

      this.logError(
        this.createError(
          villageId,
          "state_inconsistency",
          "村の経済データをデフォルト値にリセット",
          "システムの安定性を確保",
        ),
      );
    } catch (error) {
      this.logError(
        this.createError(
          villageId,
          "state_inconsistency",
          `経済データリセット中にエラー: ${error}`,
          "最小限のデータ構造を作成",
        ),
      );

      // 最後の手段：最小限の構造を作成
      village.economy = this.createDefaultEconomy();
    }
  }

  /**
   * エラーログを取得
   * @param maxEntries 取得する最大エントリ数
   * @returns エラーログ
   */
  getErrorLog(maxEntries: number = 50): EconomyError[] {
    return this.errorLog.slice(-maxEntries);
  }

  /**
   * 特定の村のエラーログを取得
   * @param villageId 村ID
   * @param maxEntries 取得する最大エントリ数
   * @returns 村固有のエラーログ
   */
  getVillageErrorLog(
    villageId: string,
    maxEntries: number = 20,
  ): EconomyError[] {
    return this.errorLog
      .filter((error) => error.villageId === villageId)
      .slice(-maxEntries);
  }

  /**
   * エラーログをクリア
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * エラー統計を取得
   * @returns エラー統計情報
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsByType: Record<EconomyErrorType, number>;
    errorsByVillage: Record<string, number>;
    recentErrors: number; // 過去1時間のエラー数
  } {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    const errorsByType: Record<EconomyErrorType, number> = {
      calculation: 0,
      data_integrity: 0,
      state_inconsistency: 0,
      validation: 0,
    };

    const errorsByVillage: Record<string, number> = {};
    let recentErrors = 0;

    this.errorLog.forEach((error) => {
      errorsByType[error.errorType]++;
      errorsByVillage[error.villageId] =
        (errorsByVillage[error.villageId] || 0) + 1;

      if (error.timestamp >= oneHourAgo) {
        recentErrors++;
      }
    });

    return {
      totalErrors: this.errorLog.length,
      errorsByType,
      errorsByVillage,
      recentErrors,
    };
  }

  // プライベートメソッド

  private validateBasicData(
    village: Village,
    errors: EconomyError[],
    warnings: string[],
    villageId: string,
  ): void {
    // 人口の検証
    if (!this.isInRange(village.population, this.ranges.population)) {
      errors.push(
        this.createError(
          villageId,
          "data_integrity",
          `人口が範囲外: ${village.population}`,
          "人口を有効範囲に修正",
        ),
      );
    }

    // 収集範囲の検証
    if (
      !this.isInRange(village.collectionRadius, this.ranges.collectionRadius)
    ) {
      errors.push(
        this.createError(
          villageId,
          "data_integrity",
          `収集範囲が範囲外: ${village.collectionRadius}`,
          "収集範囲を有効範囲に修正",
        ),
      );
    }

    // ストレージの検証
    if (!village.storage) {
      errors.push(
        this.createError(
          villageId,
          "state_inconsistency",
          "ストレージデータが存在しない",
          "デフォルトストレージを作成",
        ),
      );
    }
  }

  private validateEconomyData(
    village: Village,
    errors: EconomyError[],
    warnings: string[],
    villageId: string,
  ): void {
    if (!village.economy) {
      errors.push(
        this.createError(
          villageId,
          "state_inconsistency",
          "経済データが存在しない",
          "デフォルト経済データを作成",
        ),
      );
      return;
    }

    // 生産データの検証
    if (village.economy.production) {
      Object.entries(village.economy.production).forEach(
        ([resource, value]) => {
          if (!this.isInRange(value as number, this.ranges.production)) {
            errors.push(
              this.createError(
                villageId,
                "data_integrity",
                `${resource}の生産量が範囲外: ${value}`,
                "生産量を有効範囲に修正",
              ),
            );
          }
        },
      );
    }

    // 消費データの検証
    if (village.economy.consumption) {
      Object.entries(village.economy.consumption).forEach(
        ([resource, value]) => {
          if (!this.isInRange(value as number, this.ranges.consumption)) {
            errors.push(
              this.createError(
                villageId,
                "data_integrity",
                `${resource}の消費量が範囲外: ${value}`,
                "消費量を有効範囲に修正",
              ),
            );
          }
        },
      );
    }

    // 建物データの検証
    if (village.economy.buildings) {
      if (
        !this.isInRange(village.economy.buildings.count, this.ranges.buildings)
      ) {
        errors.push(
          this.createError(
            villageId,
            "data_integrity",
            `建物数が範囲外: ${village.economy.buildings.count}`,
            "建物数を有効範囲に修正",
          ),
        );
      }
    }
  }

  private validateRelationships(
    village: Village,
    errors: EconomyError[],
    warnings: string[],
    villageId: string,
  ): void {
    if (!village.economy) return;

    // ストレージと経済ストックの整合性
    if (village.storage && village.economy.stock) {
      if (Math.abs(village.storage.food - village.economy.stock.food) > 0.1) {
        warnings.push(
          `食料ストックの不整合: storage=${village.storage.food}, economy=${village.economy.stock.food}`,
        );
      }
    }

    // 人口と建物数の関係性
    if (village.economy.buildings) {
      const expectedBuildings = Math.floor(
        village.population * this.config.buildingsPerPopulation,
      );
      const actualBuildings = village.economy.buildings.count;

      if (actualBuildings > village.population) {
        warnings.push(
          `建物数が人口を超過: 人口=${village.population}, 建物=${actualBuildings}`,
        );
      }
    }
  }

  private validateCalculationResults(
    village: Village,
    errors: EconomyError[],
    warnings: string[],
    villageId: string,
  ): void {
    if (!village.economy) return;

    // 生産量と消費量の妥当性
    if (village.economy.production && village.economy.consumption) {
      Object.keys(village.economy.production).forEach((resource) => {
        const production =
          village.economy.production[
            resource as keyof typeof village.economy.production
          ];
        const consumption =
          village.economy.consumption[
            resource as keyof typeof village.economy.consumption
          ];

        if (consumption > production * 10) {
          warnings.push(
            `${resource}の消費量が生産量に対して過大: 生産=${production}, 消費=${consumption}`,
          );
        }
      });
    }
  }

  private correctBasicData(village: Village, villageId: string): boolean {
    let corrected = false;

    // 人口の修正
    const originalPopulation = village.population;
    village.population = this.clampToRange(
      village.population,
      this.ranges.population,
    );
    if (village.population !== originalPopulation) {
      this.logCorrection(
        villageId,
        "population",
        originalPopulation,
        village.population,
      );
      corrected = true;
    }

    // 収集範囲の修正
    const originalRadius = village.collectionRadius;
    village.collectionRadius = this.clampToRange(
      village.collectionRadius,
      this.ranges.collectionRadius,
    );
    if (village.collectionRadius !== originalRadius) {
      this.logCorrection(
        villageId,
        "collectionRadius",
        originalRadius,
        village.collectionRadius,
      );
      corrected = true;
    }

    return corrected;
  }

  private correctEconomyData(village: Village, villageId: string): boolean {
    let corrected = false;

    if (!village.economy) {
      village.economy = this.createDefaultEconomy();
      this.logCorrection(villageId, "economy", null, "default");
      return true;
    }

    // 生産データの修正
    if (village.economy.production) {
      Object.keys(village.economy.production).forEach((resource) => {
        const key = resource as keyof typeof village.economy.production;
        const original = village.economy.production[key];
        village.economy.production[key] = this.clampToRange(
          original as number,
          this.ranges.production,
        );
        if (village.economy.production[key] !== original) {
          this.logCorrection(
            villageId,
            `production.${resource}`,
            original,
            village.economy.production[key],
          );
          corrected = true;
        }
      });
    }

    // 消費データの修正
    if (village.economy.consumption) {
      Object.keys(village.economy.consumption).forEach((resource) => {
        const key = resource as keyof typeof village.economy.consumption;
        const original = village.economy.consumption[key];
        village.economy.consumption[key] = this.clampToRange(
          original as number,
          this.ranges.consumption,
        );
        if (village.economy.consumption[key] !== original) {
          this.logCorrection(
            villageId,
            `consumption.${resource}`,
            original,
            village.economy.consumption[key],
          );
          corrected = true;
        }
      });
    }

    // 建物データの修正
    if (village.economy.buildings) {
      const originalCount = village.economy.buildings.count;
      village.economy.buildings.count = this.clampToRange(
        originalCount as number,
        this.ranges.buildings,
      );
      if (village.economy.buildings.count !== originalCount) {
        this.logCorrection(
          villageId,
          "buildings.count",
          originalCount,
          village.economy.buildings.count,
        );
        corrected = true;
      }

      // 建設キューの修正
      const originalQueue = village.economy.buildings.constructionQueue;
      village.economy.buildings.constructionQueue = Math.max(
        0,
        Math.min(10, originalQueue as number),
      );
      if (village.economy.buildings.constructionQueue !== originalQueue) {
        this.logCorrection(
          villageId,
          "buildings.constructionQueue",
          originalQueue,
          village.economy.buildings.constructionQueue,
        );
        corrected = true;
      }
    }

    return corrected;
  }

  private correctStorageData(village: Village, villageId: string): boolean {
    let corrected = false;

    if (!village.storage) {
      village.storage = { food: 0, wood: 0, ore: 0 };
      this.logCorrection(villageId, "storage", null, "default");
      corrected = true;
    }

    // 各資源の修正
    Object.keys(village.storage).forEach((resource) => {
      const key = resource as keyof typeof village.storage;
      const original = village.storage[key];
      village.storage[key] = this.clampToRange(
        original as number,
        this.ranges.resources,
      );
      if (village.storage[key] !== original) {
        this.logCorrection(
          villageId,
          `storage.${resource}`,
          original,
          village.storage[key],
        );
        corrected = true;
      }
    });

    return corrected;
  }

  private isInRange(value: number, range: NumericRange): boolean {
    return (
      typeof value === "number" &&
      isFinite(value) &&
      !isNaN(value) &&
      value >= range.min &&
      value <= range.max
    );
  }

  private clampToRange(value: number, range: NumericRange): number {
    if (typeof value !== "number" || !isFinite(value) || isNaN(value)) {
      return range.defaultValue;
    }
    return Math.max(range.min, Math.min(range.max, value));
  }

  private createDefaultEconomy(): VillageEconomy {
    return {
      production: { food: 0, wood: 0, ore: 0 },
      consumption: { food: 0, wood: 0, ore: 0 },
      stock: {
        food: 0,
        wood: 0,
        ore: 0,
        capacity: this.config.baseStorageCapacity,
      },
      buildings: {
        count: 0,
        targetCount: 0,
        constructionQueue: 0,
      },
      supplyDemandStatus: {
        food: "balanced",
        wood: "balanced",
        ore: "balanced",
      },
    };
  }

  private createError(
    villageId: string,
    errorType: EconomyErrorType,
    message: string,
    recoveryAction: string,
    originalValue?: any,
    correctedValue?: any,
  ): EconomyError {
    return {
      villageId,
      errorType,
      message,
      timestamp: Date.now(),
      recoveryAction,
      originalValue,
      correctedValue,
    };
  }

  private logError(error: EconomyError): void {
    this.errorLog.push(error);

    // ログサイズの制限
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }

    // コンソールにも出力（開発時のデバッグ用）
    console.warn(
      `[EconomyError] ${error.villageId}: ${error.message} (${error.recoveryAction})`,
    );
  }

  private logCorrection(
    villageId: string,
    field: string,
    originalValue: any,
    correctedValue: any,
  ): void {
    this.logError(
      this.createError(
        villageId,
        "data_integrity",
        `${field} を修正: ${originalValue} → ${correctedValue}`,
        "自動データ修正",
        originalValue,
        correctedValue,
      ),
    );
  }
}
