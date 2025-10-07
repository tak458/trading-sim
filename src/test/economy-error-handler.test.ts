/**
 * EconomyErrorHandler のテスト
 * エラーハンドリングとデータ整合性機能の検証
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  EconomyError,
  EconomyErrorHandler,
} from "../game-systems/economy/economy-error-handler";
import type { Village } from "../game-systems/world/village";
import { DEFAULT_SUPPLY_DEMAND_CONFIG } from "../settings";

describe("EconomyErrorHandler", () => {
  let errorHandler: EconomyErrorHandler;
  let testVillage: Village;

  beforeEach(() => {
    errorHandler = new EconomyErrorHandler(DEFAULT_SUPPLY_DEMAND_CONFIG);

    // テスト用の村を作成
    testVillage = {
      x: 5,
      y: 5,
      population: 10,
      storage: { food: 100, wood: 50, ore: 30 },
      collectionRadius: 2,
      lastUpdateTime: 0,
      populationHistory: [8, 9, 10],
      economy: {
        production: { food: 5, wood: 3, ore: 2 },
        consumption: { food: 2, wood: 1, ore: 1 },
        stock: { food: 100, wood: 50, ore: 30, capacity: 200 },
        buildings: { count: 2, targetCount: 3, constructionQueue: 1 },
        supplyDemandStatus: {
          food: "balanced",
          wood: "balanced",
          ore: "balanced",
        },
      },
    };
  });

  describe("データ整合性チェック", () => {
    it("正常なデータは検証をパスする", () => {
      const result = errorHandler.validateVillageEconomy(testVillage);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("負の人口を検出する", () => {
      testVillage.population = -5;

      const result = errorHandler.validateVillageEconomy(testVillage);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes("人口が範囲外")),
      ).toBe(true);
    });

    it("範囲外の収集範囲を検出する", () => {
      testVillage.collectionRadius = 15; // 最大値10を超過

      const result = errorHandler.validateVillageEconomy(testVillage);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes("収集範囲が範囲外")),
      ).toBe(true);
    });

    it("経済データが存在しない場合を検出する", () => {
      // @ts-expect-error - テスト用に意図的にundefinedを設定
      testVillage.economy = undefined;

      const result = errorHandler.validateVillageEconomy(testVillage);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes("経済データが存在しない")),
      ).toBe(true);
    });

    it("範囲外の生産量を検出する", () => {
      testVillage.economy.production.food = -10; // 負の値
      testVillage.economy.production.wood = 20000; // 最大値超過

      const result = errorHandler.validateVillageEconomy(testVillage);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes("foodの生産量が範囲外")),
      ).toBe(true);
      expect(
        result.errors.some((e) => e.message.includes("woodの生産量が範囲外")),
      ).toBe(true);
    });
  });

  describe("自動修正機能", () => {
    it("負の人口を修正する", () => {
      testVillage.population = -5;

      const corrected = errorHandler.correctInvalidValues(testVillage);

      expect(corrected).toBe(true);
      expect(testVillage.population).toBe(0); // 負の値は最小値（0）に修正される
    });

    it("範囲外の資源量を修正する", () => {
      testVillage.storage.food = -100;
      testVillage.storage.wood = 200000; // 最大値超過

      const corrected = errorHandler.correctInvalidValues(testVillage);

      expect(corrected).toBe(true);
      expect(testVillage.storage.food).toBe(0);
      expect(testVillage.storage.wood).toBe(100000); // 最大値に制限
    });

    it("経済データが存在しない場合にデフォルト値を作成する", () => {
      // @ts-expect-error - テスト用に意図的にundefinedを設定
      testVillage.economy = undefined;

      const corrected = errorHandler.correctInvalidValues(testVillage);

      expect(corrected).toBe(true);
      expect(testVillage.economy).toBeDefined();
      expect(testVillage.economy.production).toEqual({
        food: 0,
        wood: 0,
        ore: 0,
      });
    });

    it("範囲外の建物数を修正する", () => {
      testVillage.economy.buildings.count = -5;
      testVillage.economy.buildings.constructionQueue = 20; // 最大値超過

      const corrected = errorHandler.correctInvalidValues(testVillage);

      expect(corrected).toBe(true);
      expect(testVillage.economy.buildings.count).toBe(0);
      expect(testVillage.economy.buildings.constructionQueue).toBe(10); // 制限値
    });
  });

  describe("安全な計算処理", () => {
    it("正常な計算結果をそのまま返す", () => {
      const result = errorHandler.safeCalculation(
        () => 10 / 2,
        0,
        "division test",
      );

      expect(result).toBe(5);
    });

    it("ゼロ除算でフォールバック値を返す", () => {
      const result = errorHandler.safeCalculation(
        () => 10 / 0,
        -1,
        "zero division test",
      );

      expect(result).toBe(-1);
    });

    it("NaN結果でフォールバック値を返す", () => {
      const result = errorHandler.safeCalculation(
        () => Math.sqrt(-1),
        100,
        "NaN test",
      );

      expect(result).toBe(100);
    });

    it("例外発生時にフォールバック値を返す", () => {
      const result = errorHandler.safeCalculation(
        () => {
          throw new Error("Test error");
        },
        42,
        "exception test",
      );

      expect(result).toBe(42);
    });

    it("null/undefined結果でフォールバック値を返す", () => {
      const result1 = errorHandler.safeCalculation(
        () => null as any,
        "fallback",
        "null test",
      );

      const result2 = errorHandler.safeCalculation(
        () => undefined as any,
        "fallback",
        "undefined test",
      );

      expect(result1).toBe("fallback");
      expect(result2).toBe("fallback");
    });
  });

  describe("村経済データのリセット", () => {
    it("経済データをデフォルト値にリセットする", () => {
      // 異常な値を設定
      testVillage.economy.production.food = -100;
      testVillage.economy.consumption.wood = NaN;

      errorHandler.resetVillageEconomyToDefaults(testVillage);

      expect(testVillage.economy.production).toEqual({
        food: 0,
        wood: 0,
        ore: 0,
      });
      expect(testVillage.economy.consumption).toEqual({
        food: 0,
        wood: 0,
        ore: 0,
      });
      expect(testVillage.economy.supplyDemandStatus).toEqual({
        food: "balanced",
        wood: "balanced",
        ore: "balanced",
      });
    });

    it("経済データが存在しない場合に初期化する", () => {
      // @ts-expect-error - テスト用に意図的にundefinedを設定
      testVillage.economy = undefined;

      errorHandler.resetVillageEconomyToDefaults(testVillage);

      expect(testVillage.economy).toBeDefined();
      expect(testVillage.economy.buildings.count).toBe(0);
      expect(testVillage.economy.stock.capacity).toBe(
        DEFAULT_SUPPLY_DEMAND_CONFIG.baseStorageCapacity,
      );
    });

    it("ストレージデータと同期する", () => {
      testVillage.storage.food = 150;
      testVillage.storage.wood = 75;
      testVillage.storage.ore = 25;

      errorHandler.resetVillageEconomyToDefaults(testVillage);

      expect(testVillage.economy.stock.food).toBe(150);
      expect(testVillage.economy.stock.wood).toBe(75);
      expect(testVillage.economy.stock.ore).toBe(25);
    });
  });

  describe("エラーログ機能", () => {
    it("エラーログを記録する", () => {
      testVillage.population = -5;
      errorHandler.correctInvalidValues(testVillage);

      const errorLog = errorHandler.getErrorLog();

      expect(errorLog.length).toBeGreaterThan(0);
      expect(errorLog[0].villageId).toBe("5,5");
      expect(errorLog[0].errorType).toBe("data_integrity");
    });

    it("村固有のエラーログを取得する", () => {
      // 複数の村でエラーを発生させる
      testVillage.population = -5;
      errorHandler.correctInvalidValues(testVillage);

      const anotherVillage = { ...testVillage, x: 10, y: 10, population: -3 };
      errorHandler.correctInvalidValues(anotherVillage);

      const villageErrors = errorHandler.getVillageErrorLog("5,5");

      expect(villageErrors.length).toBeGreaterThan(0);
      expect(villageErrors.every((e) => e.villageId === "5,5")).toBe(true);
    });

    it("エラーログをクリアする", () => {
      testVillage.population = -5;
      errorHandler.correctInvalidValues(testVillage);

      expect(errorHandler.getErrorLog().length).toBeGreaterThan(0);

      errorHandler.clearErrorLog();

      expect(errorHandler.getErrorLog()).toHaveLength(0);
    });

    it("エラー統計を取得する", () => {
      // 複数のエラーを発生させる
      testVillage.population = -5;
      testVillage.collectionRadius = 15;
      errorHandler.correctInvalidValues(testVillage);

      const stats = errorHandler.getErrorStatistics();

      expect(stats.totalErrors).toBeGreaterThan(0);
      expect(stats.errorsByType.data_integrity).toBeGreaterThan(0);
      expect(stats.errorsByVillage["5,5"]).toBeGreaterThan(0);
    });
  });

  describe("エッジケース", () => {
    it("ストレージが存在しない村を処理する", () => {
      // @ts-expect-error - テスト用に意図的にundefinedを設定
      testVillage.storage = undefined;

      const result = errorHandler.validateVillageEconomy(testVillage);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) =>
          e.message.includes("ストレージデータが存在しない"),
        ),
      ).toBe(true);
    });

    it("人口履歴が存在しない村を処理する", () => {
      // @ts-expect-error - テスト用に意図的にundefinedを設定
      testVillage.populationHistory = undefined;

      // エラーが発生しないことを確認
      expect(() =>
        errorHandler.validateVillageEconomy(testVillage),
      ).not.toThrow();
    });

    it("極端に大きな値を適切に制限する", () => {
      testVillage.population = Number.MAX_SAFE_INTEGER;
      testVillage.storage.food = Number.MAX_SAFE_INTEGER;

      const corrected = errorHandler.correctInvalidValues(testVillage);

      expect(corrected).toBe(true);
      expect(testVillage.population).toBeLessThanOrEqual(1000); // 最大値制限
      expect(testVillage.storage.food).toBeLessThanOrEqual(100000); // 最大値制限
    });

    it("計算エラーが連続発生してもシステムが安定する", () => {
      // 複数の計算エラーを連続で発生させる
      for (let i = 0; i < 10; i++) {
        errorHandler.safeCalculation(
          () => {
            throw new Error(`Error ${i}`);
          },
          0,
          `test error ${i}`,
          "5,5",
        );
      }

      const stats = errorHandler.getErrorStatistics();
      expect(stats.totalErrors).toBe(10);
      expect(stats.errorsByType.calculation).toBe(10);
    });
  });
});
