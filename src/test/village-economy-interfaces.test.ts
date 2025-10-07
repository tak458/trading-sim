import { describe, expect, it } from "vitest";
import {
  Buildings,
  Consumption,
  Production,
  Stock,
  type SupplyDemandStatus,
  VillageEconomy,
} from "../game-systems/economy/village-economy";
import type { Tile } from "../game-systems/world/map";
import { createVillages, Village } from "../game-systems/world/village";
import { DEFAULT_SUPPLY_DEMAND_CONFIG, SupplyDemandConfig } from "../settings";

describe("Village Economy Interfaces", () => {
  // テスト用のマップを作成
  const createTestMap = (): Tile[][] => {
    const size = 10;
    const map: Tile[][] = [];
    for (let y = 0; y < size; y++) {
      map[y] = [];
      for (let x = 0; x < size; x++) {
        map[y][x] = {
          type: "land" as const,
          height: 0.5, // 村が作成可能な高さ
          resources: { food: 10, wood: 10, ore: 5 },
          maxResources: { food: 20, wood: 20, ore: 10 },
          lastHarvestTime: 0,
          recoveryTimer: { food: 0, wood: 0, ore: 0 },
          depletionState: { food: 0, wood: 0, ore: 0 },
        };
      }
    }
    return map;
  };

  it("should create villages with economy properties", () => {
    // 要件 1.1: 村ごとに生産・消費・ストック管理機能を追加
    const map = createTestMap();
    const villages = createVillages(map, 3);

    expect(villages).toHaveLength(3);

    villages.forEach((village) => {
      // 基本プロパティの確認
      expect(village.x).toBeGreaterThanOrEqual(0);
      expect(village.y).toBeGreaterThanOrEqual(0);
      expect(village.population).toBe(10);
      expect(village.collectionRadius).toBe(1);

      // 経済システムプロパティの確認
      expect(village.economy).toBeDefined();
      expect(village.lastUpdateTime).toBe(0);
      expect(village.populationHistory).toEqual([10]);
    });
  });

  it("should have properly structured VillageEconomy interface", () => {
    // 要件 1.2, 1.3, 1.4: ストック更新、資源量追跡、情報更新
    const map = createTestMap();
    const villages = createVillages(map, 1);
    const village = villages[0];
    const economy = village.economy;

    // 生産能力の確認
    expect(economy.production).toBeDefined();
    expect(economy.production.food).toBe(0);
    expect(economy.production.wood).toBe(0);
    expect(economy.production.ore).toBe(0);

    // 消費量の確認
    expect(economy.consumption).toBeDefined();
    expect(economy.consumption.food).toBe(0);
    expect(economy.consumption.wood).toBe(0);
    expect(economy.consumption.ore).toBe(0);

    // ストック情報の確認
    expect(economy.stock).toBeDefined();
    expect(economy.stock.food).toBe(5);
    expect(economy.stock.wood).toBe(5);
    expect(economy.stock.ore).toBe(2);
    expect(economy.stock.capacity).toBe(100);

    // 建物情報の確認
    expect(economy.buildings).toBeDefined();
    expect(economy.buildings.count).toBe(1);
    expect(economy.buildings.targetCount).toBe(1);
    expect(economy.buildings.constructionQueue).toBe(0);

    // 需給状況の確認
    expect(economy.supplyDemandStatus).toBeDefined();
    expect(economy.supplyDemandStatus.food).toBe("balanced");
    expect(economy.supplyDemandStatus.wood).toBe("balanced");
    expect(economy.supplyDemandStatus.ore).toBe("balanced");
  });

  it("should have valid SupplyDemandConfig interface", () => {
    const config = DEFAULT_SUPPLY_DEMAND_CONFIG;

    // 人口関連設定の確認
    expect(config.foodConsumptionPerPerson).toBe(0.2);
    expect(config.populationGrowthRate).toBe(0.02);
    expect(config.populationDeclineRate).toBe(0.05);

    // 建物関連設定の確認
    expect(config.buildingsPerPopulation).toBe(0.1);
    expect(config.buildingWoodCost).toBe(10);
    expect(config.buildingOreCost).toBe(5);

    // 需給バランス閾値の確認
    expect(config.surplusThreshold).toBe(1.5);
    expect(config.shortageThreshold).toBe(0.8);
    expect(config.criticalThreshold).toBe(0.3);

    // ストック関連設定の確認
    expect(config.baseStorageCapacity).toBe(100);
    expect(config.storageCapacityPerBuilding).toBe(20);
  });

  it("should maintain backward compatibility with existing storage", () => {
    // 既存のstorageプロパティとの互換性確認
    const map = createTestMap();
    const villages = createVillages(map, 1);
    const village = villages[0];

    // 既存のstorageプロパティが維持されていることを確認
    expect(village.storage).toBeDefined();
    expect(village.storage.food).toBe(5);
    expect(village.storage.wood).toBe(5);
    expect(village.storage.ore).toBe(2);

    // 新しいeconomy.stockと既存のstorageが同期していることを確認
    expect(village.economy.stock.food).toBe(village.storage.food);
    expect(village.economy.stock.wood).toBe(village.storage.wood);
    expect(village.economy.stock.ore).toBe(village.storage.ore);
  });

  it("should support all supply demand levels", () => {
    // 需給状況の全レベルをテスト
    const levels: Array<"surplus" | "balanced" | "shortage" | "critical"> = [
      "surplus",
      "balanced",
      "shortage",
      "critical",
    ];

    levels.forEach((level) => {
      const status: SupplyDemandStatus = {
        food: level,
        wood: level,
        ore: level,
      };

      expect(status.food).toBe(level);
      expect(status.wood).toBe(level);
      expect(status.ore).toBe(level);
    });
  });
});
