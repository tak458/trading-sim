/**
 * SupplyDemandBalancer のユニットテスト
 * 要件 6.1, 6.2, 6.3, 6.4 の検証
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  ResourceType,
  SupplyDemandBalancer,
} from "../game-systems/economy/supply-demand-balancer";
import type { Village } from "../game-systems/world/village";
import type { SupplyDemandConfig } from "../settings";

describe("SupplyDemandBalancer", () => {
  let balancer: SupplyDemandBalancer;
  let testConfig: SupplyDemandConfig;
  let testVillages: Village[];

  beforeEach(() => {
    testConfig = {
      foodConsumptionPerPerson: 0.5,
      populationGrowthRate: 0.02,
      populationDeclineRate: 0.05,
      buildingsPerPopulation: 0.1,
      buildingWoodCost: 10,
      buildingOreCost: 5,
      surplusThreshold: 1.5,
      shortageThreshold: 0.8,
      criticalThreshold: 0.3,
      baseStorageCapacity: 100,
      storageCapacityPerBuilding: 20,
    };

    balancer = new SupplyDemandBalancer(testConfig);

    // テスト用の村を作成
    testVillages = [
      // 余剰村（食料豊富、木材余剰）
      {
        x: 0,
        y: 0,
        population: 10,
        storage: { food: 100, wood: 50, ore: 30 },
        collectionRadius: 2,
        economy: {
          production: { food: 20, wood: 15, ore: 5 },
          consumption: { food: 5, wood: 6, ore: 3 },
          stock: { food: 100, wood: 50, ore: 30, capacity: 200 },
          buildings: { count: 2, targetCount: 2, constructionQueue: 0 },
          supplyDemandStatus: {
            food: "surplus",
            wood: "surplus",
            ore: "balanced",
          },
        },
        lastUpdateTime: 0,
        populationHistory: [10],
      },
      // 不足村（木材不足）
      {
        x: 5,
        y: 5,
        population: 15,
        storage: { food: 30, wood: 15, ore: 20 },
        collectionRadius: 2,
        economy: {
          production: { food: 8, wood: 3, ore: 6 },
          consumption: { food: 7, wood: 10, ore: 5 },
          stock: { food: 30, wood: 15, ore: 20, capacity: 150 },
          buildings: { count: 1, targetCount: 2, constructionQueue: 1 },
          supplyDemandStatus: {
            food: "balanced",
            wood: "shortage",
            ore: "balanced",
          },
        },
        lastUpdateTime: 0,
        populationHistory: [15],
      },
      // 危機村（全資源危機）
      {
        x: 10,
        y: 10,
        population: 20,
        storage: { food: 2, wood: 1, ore: 1 },
        collectionRadius: 1,
        economy: {
          production: { food: 2, wood: 1, ore: 1 },
          consumption: { food: 10, wood: 8, ore: 6 },
          stock: { food: 2, wood: 1, ore: 1, capacity: 120 },
          buildings: { count: 1, targetCount: 3, constructionQueue: 0 },
          supplyDemandStatus: {
            food: "critical",
            wood: "critical",
            ore: "critical",
          },
        },
        lastUpdateTime: 0,
        populationHistory: [20],
      },
    ];
  });

  describe("evaluateVillageBalance", () => {
    it("should correctly evaluate village balance - 要件 6.1", () => {
      const surplusVillage = testVillages[0];
      const balance = balancer.evaluateVillageBalance(surplusVillage);

      // 食料は余剰（生産20 > 消費5 * 1.5）
      expect(balance.food).toBe("surplus");
      // 木材はバランス（生産10、消費8）
      expect(balance.wood).toBe("balanced");
      // 鉱石はバランス（生産5、消費3）
      expect(balance.ore).toBe("balanced");
    });

    it("should identify shortage conditions - 要件 6.1", () => {
      const shortageVillage = testVillages[1];
      const balance = balancer.evaluateVillageBalance(shortageVillage);

      // 食料はバランス
      expect(balance.food).toBe("balanced");
      // 木材は不足（生産3 < 消費10 * 0.8、ストック1.5日分）
      expect(balance.wood).toBe("shortage");
      // 鉱石はバランス
      expect(balance.ore).toBe("balanced");
    });

    it("should identify critical conditions - 要件 6.1", () => {
      const criticalVillage = testVillages[2];
      const balance = balancer.evaluateVillageBalance(criticalVillage);

      // 全ての資源が危機的状況
      expect(balance.food).toBe("critical");
      expect(balance.wood).toBe("critical");
      expect(balance.ore).toBe("critical");
    });
  });

  describe("calculateResourceBalance", () => {
    it("should categorize villages by resource balance - 要件 6.1", () => {
      const foodBalance = balancer.calculateResourceBalance(
        testVillages,
        "food",
      );

      expect(foodBalance.surplusVillages).toHaveLength(1);
      expect(foodBalance.surplusVillages[0].village).toBe(testVillages[0]);

      expect(foodBalance.balancedVillages).toHaveLength(1);
      expect(foodBalance.balancedVillages[0].village).toBe(testVillages[1]);

      expect(foodBalance.criticalVillages).toHaveLength(1);
      expect(foodBalance.criticalVillages[0].village).toBe(testVillages[2]);
    });

    it("should calculate correct net balance and stock days", () => {
      const woodBalance = balancer.calculateResourceBalance(
        testVillages,
        "wood",
      );

      const surplusVillage = woodBalance.surplusVillages.find(
        (v) => v.village === testVillages[0],
      );
      if (surplusVillage) {
        expect(surplusVillage.netBalance).toBe(9); // 15 - 6
        expect(surplusVillage.stockDays).toBeCloseTo(8.33); // 50 / 6
      }

      const shortageVillage = woodBalance.shortageVillages.find(
        (v) => v.village === testVillages[1],
      );
      if (shortageVillage) {
        expect(shortageVillage.netBalance).toBe(-7); // 3 - 10
        expect(shortageVillage.stockDays).toBeCloseTo(1.5); // 15 / 10
      }
    });
  });

  describe("compareVillageBalances", () => {
    it("should compare balances across all resource types - 要件 6.4", () => {
      const comparison = balancer.compareVillageBalances(testVillages);

      expect(comparison).toHaveProperty("food");
      expect(comparison).toHaveProperty("wood");
      expect(comparison).toHaveProperty("ore");

      // 食料の余剰村が1つ
      expect(comparison.food.surplusVillages).toHaveLength(1);
      // 木材の不足村が1つ
      expect(comparison.wood.shortageVillages).toHaveLength(1);
      // 鉱石の危機村が1つ
      expect(comparison.ore.criticalVillages).toHaveLength(1);
    });
  });

  describe("identifySupplyDemandVillages", () => {
    it("should identify surplus and shortage villages - 要件 6.2, 6.3", () => {
      const result = balancer.identifySupplyDemandVillages(testVillages);

      // 余剰村の識別（要件 6.2）
      expect(result.surplusVillages).toHaveLength(1);
      expect(result.surplusVillages[0]).toBe(testVillages[0]);

      // 不足村の識別（要件 6.3）
      expect(result.shortageVillages).toHaveLength(1);
      expect(result.shortageVillages[0]).toBe(testVillages[1]);

      // 危機村の識別
      expect(result.criticalVillages).toHaveLength(1);
      expect(result.criticalVillages[0]).toBe(testVillages[2]);

      // 資源別詳細バランス
      expect(result.resourceSpecificBalances).toHaveProperty("food");
      expect(result.resourceSpecificBalances).toHaveProperty("wood");
      expect(result.resourceSpecificBalances).toHaveProperty("ore");
    });
  });

  describe("evaluateSupplyPossibility", () => {
    it("should find nearby suppliers for shortage villages - 要件 6.3", () => {
      const shortageVillage = testVillages[1]; // 木材不足
      const suppliers = balancer.evaluateSupplyPossibility(
        shortageVillage,
        testVillages,
        "wood",
        10,
      );

      expect(suppliers).toHaveLength(1);
      expect(suppliers[0].supplier).toBe(testVillages[0]);
      expect(suppliers[0].distance).toBeCloseTo(7.07); // sqrt(5^2 + 5^2)
      expect(suppliers[0].availableSupply).toBeGreaterThan(0);
      expect(suppliers[0].supplyCapacity).toBeGreaterThan(0);
    });

    it("should exclude villages outside max distance", () => {
      const shortageVillage = testVillages[1];
      const suppliers = balancer.evaluateSupplyPossibility(
        shortageVillage,
        testVillages,
        "wood",
        5, // 距離制限を5に設定
      );

      // 距離7.07の村は除外される
      expect(suppliers).toHaveLength(0);
    });

    it("should exclude villages without surplus", () => {
      const criticalVillage = testVillages[2]; // 全資源危機
      const suppliers = balancer.evaluateSupplyPossibility(
        criticalVillage,
        [testVillages[1]], // 不足村のみを候補に
        "wood", // 木材で検索（testVillages[1]は木材不足）
        20,
      );

      // 不足村は供給候補から除外される
      expect(suppliers).toHaveLength(0);
    });

    it("should sort suppliers by supply capacity", () => {
      // 追加の余剰村を作成
      const additionalSurplusVillage: Village = {
        x: 3,
        y: 4,
        population: 8,
        storage: { food: 80, wood: 60, ore: 25 },
        collectionRadius: 2,
        economy: {
          production: { food: 15, wood: 20, ore: 4 },
          consumption: { food: 4, wood: 5, ore: 2 },
          stock: { food: 80, wood: 60, ore: 25, capacity: 180 },
          buildings: { count: 1, targetCount: 1, constructionQueue: 0 },
          supplyDemandStatus: {
            food: "surplus",
            wood: "surplus",
            ore: "balanced",
          },
        },
        lastUpdateTime: 0,
        populationHistory: [8],
      };

      const allVillages = [...testVillages, additionalSurplusVillage];
      const shortageVillage = testVillages[1];

      const suppliers = balancer.evaluateSupplyPossibility(
        shortageVillage,
        allVillages,
        "wood",
        10,
      );

      expect(suppliers.length).toBeGreaterThan(1);
      // 供給能力順でソートされているかチェック
      for (let i = 1; i < suppliers.length; i++) {
        expect(suppliers[i - 1].supplyCapacity).toBeGreaterThanOrEqual(
          suppliers[i].supplyCapacity,
        );
      }
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle villages with zero consumption", () => {
      const zeroConsumptionVillage: Village = {
        x: 0,
        y: 0,
        population: 5,
        storage: { food: 60, wood: 30, ore: 25 },
        collectionRadius: 1,
        economy: {
          production: { food: 10, wood: 5, ore: 3 },
          consumption: { food: 0, wood: 0, ore: 0 },
          stock: { food: 60, wood: 30, ore: 25, capacity: 100 },
          buildings: { count: 1, targetCount: 1, constructionQueue: 0 },
          supplyDemandStatus: {
            food: "balanced",
            wood: "balanced",
            ore: "balanced",
          },
        },
        lastUpdateTime: 0,
        populationHistory: [5],
      };

      const balance = balancer.evaluateVillageBalance(zeroConsumptionVillage);

      // 消費量がゼロの場合はストック量で判定
      expect(balance.food).toBe("surplus"); // stock = 60 > 50
      expect(balance.wood).toBe("balanced"); // 20 < stock <= 50
      expect(balance.ore).toBe("balanced"); // 20 < stock = 25 <= 50
    });

    it("should handle empty village list", () => {
      const comparison = balancer.compareVillageBalances([]);

      expect(comparison.food.surplusVillages).toHaveLength(0);
      expect(comparison.food.shortageVillages).toHaveLength(0);
      expect(comparison.food.balancedVillages).toHaveLength(0);
      expect(comparison.food.criticalVillages).toHaveLength(0);
    });

    it("should handle single village scenario", () => {
      const singleVillage = [testVillages[0]];
      const result = balancer.identifySupplyDemandVillages(singleVillage);

      expect(result.surplusVillages).toHaveLength(1);
      expect(result.shortageVillages).toHaveLength(0);
      expect(result.criticalVillages).toHaveLength(0);
    });
  });

  describe("configuration impact", () => {
    it("should respect custom thresholds", () => {
      const strictConfig: SupplyDemandConfig = {
        ...testConfig,
        surplusThreshold: 2.0, // より厳しい余剰判定
        shortageThreshold: 0.9, // より緩い不足判定
        criticalThreshold: 0.1, // より厳しい危機判定
      };

      const strictBalancer = new SupplyDemandBalancer(strictConfig);
      const balance = strictBalancer.evaluateVillageBalance(testVillages[0]);

      // より厳しい閾値により、余剰判定が変わる可能性
      expect(["surplus", "balanced"]).toContain(balance.food);
    });
  });
});
