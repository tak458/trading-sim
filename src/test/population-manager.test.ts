/**
 * PopulationManager のユニットテスト
 * 要件 2.1, 2.2, 2.3, 2.4, 2.5 の検証
 */

import { beforeEach, describe, expect, it } from "vitest";
import type { GameTime } from "@/game-systems/shared-types";
import { PopulationManager } from "../game-systems/population/population-manager";
import type { Village } from "../game-systems/world/village";
import {
  DEFAULT_SUPPLY_DEMAND_CONFIG,
  type SupplyDemandConfig,
} from "../settings";

// Helper function to create proper GameTime objects
function createGameTime(
  currentTime: number = 100,
  deltaTime: number = 1,
): GameTime {
  return {
    currentTime,
    deltaTime,
    totalTicks: Math.floor(currentTime / 16.67), // Assuming 60 FPS
    totalSeconds: Math.floor(currentTime / 1000),
    totalMinutes: Math.floor(currentTime / 60000),
    currentTick: Math.floor((currentTime % 1000) / 16.67),
  };
}

describe("PopulationManager", () => {
  let populationManager: PopulationManager;
  let testVillage: Village;
  let gameTime: GameTime;

  beforeEach(() => {
    populationManager = new PopulationManager();
    gameTime = createGameTime(100, 1.0);

    // テスト用の村を作成
    testVillage = {
      x: 5,
      y: 5,
      population: 10,
      storage: { food: 50, wood: 20, ore: 10 },
      collectionRadius: 2,
      economy: {
        production: { food: 5, wood: 3, ore: 1 },
        consumption: { food: 5, wood: 2, ore: 1 },
        stock: { food: 50, wood: 20, ore: 10, capacity: 100 },
        buildings: { count: 1, targetCount: 1, constructionQueue: 0 },
        supplyDemandStatus: {
          food: "balanced",
          wood: "balanced",
          ore: "balanced",
        },
      },
      lastUpdateTime: 0,
      populationHistory: [10],
    };
  });

  describe("calculateFoodConsumption", () => {
    it("要件 2.1: 人口に比例して食料消費量を計算する", () => {
      // 人口10人の場合
      const consumption10 = populationManager.calculateFoodConsumption(10);
      const expected10 =
        10 * DEFAULT_SUPPLY_DEMAND_CONFIG.foodConsumptionPerPerson * 1.0; // 効率性ファクター込み
      expect(consumption10).toBeCloseTo(expected10, 2);

      // 人口20人の場合（要件 2.2: 人口増加時に消費量増加）
      const consumption20 = populationManager.calculateFoodConsumption(20);
      expect(consumption20).toBeGreaterThan(consumption10);
      // 効率性ファクターを考慮した期待値
      const expected20 =
        20 * DEFAULT_SUPPLY_DEMAND_CONFIG.foodConsumptionPerPerson * 0.98;
      expect(consumption20).toBeCloseTo(expected20, 2);
    });

    it("人口0の場合は消費量0を返す", () => {
      const consumption = populationManager.calculateFoodConsumption(0);
      expect(consumption).toBe(0);
    });

    it("負の人口の場合は消費量0を返す", () => {
      const consumption = populationManager.calculateFoodConsumption(-5);
      expect(consumption).toBe(0);
    });

    it("大きな人口では効率性ボーナスが適用される", () => {
      const consumption50 = populationManager.calculateFoodConsumption(50);
      const expectedBase =
        50 * DEFAULT_SUPPLY_DEMAND_CONFIG.foodConsumptionPerPerson;
      // 効率性により若干少なくなることを確認
      expect(consumption50).toBeLessThan(expectedBase);
    });
  });

  describe("canPopulationGrow", () => {
    it("要件 2.5: 食料状況が良好な場合は人口増加可能", () => {
      // 十分な食料と生産能力がある場合
      testVillage.storage.food = 100;
      testVillage.economy.production.food = 10;
      testVillage.economy.supplyDemandStatus.food = "surplus";

      const canGrow = populationManager.canPopulationGrow(testVillage);
      expect(canGrow).toBe(true);
    });

    it("要件 2.3: 食料不足時は人口増加停止", () => {
      // 食料が不足している場合
      testVillage.storage.food = 1;
      testVillage.economy.production.food = 1;
      testVillage.economy.supplyDemandStatus.food = "shortage";

      const canGrow = populationManager.canPopulationGrow(testVillage);
      expect(canGrow).toBe(false);
    });

    it("食料ストックが不十分な場合は増加不可", () => {
      testVillage.storage.food = 5; // 将来の消費に対して不十分
      testVillage.economy.production.food = 10;

      const canGrow = populationManager.canPopulationGrow(testVillage);
      expect(canGrow).toBe(false);
    });

    it("生産が将来の消費を下回る場合は増加不可", () => {
      testVillage.storage.food = 100;
      testVillage.economy.production.food = 1; // 将来の消費に対して不十分

      const canGrow = populationManager.canPopulationGrow(testVillage);
      expect(canGrow).toBe(false);
    });

    it("人口上限に達している場合は増加不可", () => {
      testVillage.population = 100; // 上限
      testVillage.storage.food = 1000;
      testVillage.economy.production.food = 100;

      const canGrow = populationManager.canPopulationGrow(testVillage);
      expect(canGrow).toBe(false);
    });

    it("需給状況が危機的な場合は増加不可", () => {
      testVillage.storage.food = 100;
      testVillage.economy.production.food = 10;
      testVillage.economy.supplyDemandStatus.food = "critical";

      const canGrow = populationManager.canPopulationGrow(testVillage);
      expect(canGrow).toBe(false);
    });
  });

  describe("shouldPopulationDecrease", () => {
    it("要件 2.4: 食料完全枯渇時は人口減少", () => {
      testVillage.storage.food = 0; // 完全枯渇
      testVillage.economy.production.food = 0;
      testVillage.economy.supplyDemandStatus.food = "critical";

      const shouldDecrease =
        populationManager.shouldPopulationDecrease(testVillage);
      expect(shouldDecrease).toBe(true);
    });

    it("生産が極めて不十分で危機的状況の場合は減少", () => {
      testVillage.storage.food = 5;
      testVillage.economy.production.food = 0.5; // 消費量の30%未満
      testVillage.economy.supplyDemandStatus.food = "critical";

      const shouldDecrease =
        populationManager.shouldPopulationDecrease(testVillage);
      expect(shouldDecrease).toBe(true);
    });

    it("食料が十分にある場合は減少しない", () => {
      testVillage.storage.food = 100;
      testVillage.economy.production.food = 10;
      testVillage.economy.supplyDemandStatus.food = "balanced";

      const shouldDecrease =
        populationManager.shouldPopulationDecrease(testVillage);
      expect(shouldDecrease).toBe(false);
    });

    it("人口が1人の場合は減少しない（最低人口維持）", () => {
      testVillage.population = 1;
      testVillage.storage.food = 0;
      testVillage.economy.production.food = 0;
      testVillage.economy.supplyDemandStatus.food = "critical";

      const shouldDecrease =
        populationManager.shouldPopulationDecrease(testVillage);
      expect(shouldDecrease).toBe(false);
    });

    it("生産が不十分でも需給状況が危機的でなければ減少しない", () => {
      testVillage.storage.food = 5;
      testVillage.economy.production.food = 0.5;
      testVillage.economy.supplyDemandStatus.food = "shortage"; // critical ではない

      const shouldDecrease =
        populationManager.shouldPopulationDecrease(testVillage);
      expect(shouldDecrease).toBe(false);
    });
  });

  describe("updatePopulation", () => {
    it("要件 2.1: 時間経過で食料を消費する", () => {
      const initialFood = testVillage.storage.food;
      const expectedConsumption = populationManager.calculateFoodConsumption(
        testVillage.population,
      );

      populationManager.updatePopulation(testVillage, gameTime);

      const actualConsumption = initialFood - testVillage.storage.food;
      expect(actualConsumption).toBeCloseTo(
        expectedConsumption * gameTime.deltaTime,
        2,
      );
    });

    it("食料ストックと経済ストックが同期される", () => {
      populationManager.updatePopulation(testVillage, gameTime);

      expect(testVillage.economy.stock.food).toBe(testVillage.storage.food);
    });

    it("人口履歴が更新される", () => {
      const initialHistoryLength = testVillage.populationHistory.length;

      populationManager.updatePopulation(testVillage, gameTime);

      expect(testVillage.populationHistory.length).toBe(
        initialHistoryLength + 1,
      );
      expect(
        testVillage.populationHistory[testVillage.populationHistory.length - 1],
      ).toBe(testVillage.population);
    });

    it("人口履歴は最大10件まで保持される", () => {
      // 履歴を10件以上にする
      testVillage.populationHistory = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

      populationManager.updatePopulation(testVillage, gameTime);

      expect(testVillage.populationHistory.length).toBe(10);
      expect(testVillage.populationHistory[0]).toBe(3); // 最初の2つの要素が削除される（1と2）
    });

    it("食料が不足している場合は利用可能分のみ消費", () => {
      testVillage.storage.food = 1; // 消費量より少ない
      const expectedConsumption = populationManager.calculateFoodConsumption(
        testVillage.population,
      );

      populationManager.updatePopulation(testVillage, gameTime);

      expect(testVillage.storage.food).toBe(0); // 全て消費される
    });

    it("人口増加条件を満たす場合は増加の可能性がある", () => {
      // 成長に有利な条件を設定
      testVillage.storage.food = 1000;
      testVillage.economy.production.food = 100;
      testVillage.economy.supplyDemandStatus.food = "surplus";

      // 複数回実行して増加することを確認（確率的なため）
      let populationIncreased = false;
      for (let i = 0; i < 100; i++) {
        const initialPopulation = testVillage.population;
        populationManager.updatePopulation(testVillage, gameTime);
        if (testVillage.population > initialPopulation) {
          populationIncreased = true;
          break;
        }
      }

      expect(populationIncreased).toBe(true);
    });

    it("人口減少条件を満たす場合は減少の可能性がある", () => {
      // 減少に不利な条件を設定
      testVillage.storage.food = 0;
      testVillage.economy.production.food = 0;
      testVillage.economy.supplyDemandStatus.food = "critical";
      testVillage.population = 10; // 最低人口より多く設定

      // 複数回実行して減少することを確認（確率的なため）
      let populationDecreased = false;
      for (let i = 0; i < 100; i++) {
        const initialPopulation = testVillage.population;
        populationManager.updatePopulation(testVillage, gameTime);
        if (testVillage.population < initialPopulation) {
          populationDecreased = true;
          break;
        }
      }

      expect(populationDecreased).toBe(true);
    });
  });

  describe("getPopulationStats", () => {
    it("正確な人口統計情報を返す", () => {
      const stats = populationManager.getPopulationStats(testVillage);

      expect(stats.currentPopulation).toBe(testVillage.population);
      expect(stats.foodConsumption).toBe(
        populationManager.calculateFoodConsumption(testVillage.population),
      );
      expect(stats.canGrow).toBe(
        populationManager.canPopulationGrow(testVillage),
      );
      expect(stats.shouldDecline).toBe(
        populationManager.shouldPopulationDecrease(testVillage),
      );
      expect(["growing", "stable", "declining"]).toContain(
        stats.populationTrend,
      );
    });

    it("人口トレンドを正しく判定する", () => {
      // 成長トレンド
      testVillage.populationHistory = [8, 9, 10];
      let stats = populationManager.getPopulationStats(testVillage);
      expect(stats.populationTrend).toBe("growing");

      // 減少トレンド
      testVillage.populationHistory = [12, 11, 10];
      stats = populationManager.getPopulationStats(testVillage);
      expect(stats.populationTrend).toBe("declining");

      // 安定トレンド
      testVillage.populationHistory = [10, 10, 10];
      stats = populationManager.getPopulationStats(testVillage);
      expect(stats.populationTrend).toBe("stable");
    });

    it("履歴が不十分な場合は安定トレンドを返す", () => {
      testVillage.populationHistory = [10];
      const stats = populationManager.getPopulationStats(testVillage);
      expect(stats.populationTrend).toBe("stable");
    });
  });

  describe("カスタム設定での動作", () => {
    it("カスタム設定で正しく動作する", () => {
      const customConfig: SupplyDemandConfig = {
        ...DEFAULT_SUPPLY_DEMAND_CONFIG,
        foodConsumptionPerPerson: 1.0, // デフォルトの2倍
        populationGrowthRate: 0.1, // デフォルトの5倍
        populationDeclineRate: 0.2, // デフォルトの4倍
      };

      const customManager = new PopulationManager(customConfig);

      // 消費量がカスタム設定に基づいて計算される
      const consumption = customManager.calculateFoodConsumption(10);
      const expected = 10 * 1.0 * 1.0; // 人口10では効率性ファクターは1.0
      expect(consumption).toBeCloseTo(expected, 2);
    });
  });

  describe("エラーハンドリング", () => {
    it("不正な村データでもエラーを起こさない", () => {
      // 不正なデータを設定
      testVillage.population = -1;
      testVillage.storage.food = -10;

      expect(() => {
        populationManager.updatePopulation(testVillage, gameTime);
      }).not.toThrow();
    });

    it("NaNやInfinityが発生しても適切に処理される", () => {
      testVillage.population = 0;
      testVillage.storage.food = 0;
      testVillage.economy.production.food = 0;

      expect(() => {
        populationManager.updatePopulation(testVillage, gameTime);
        populationManager.getPopulationStats(testVillage);
      }).not.toThrow();
    });
  });
});
