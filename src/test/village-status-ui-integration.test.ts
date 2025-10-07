/**
 * VillageStatusUI 統合テストスイート
 * 実際の村経済システムとの統合を検証
 */

import type Phaser from "phaser";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BuildingManager } from "@/game-systems/population/building-manager";
import type { GameTime } from "@/game-systems/shared-types";
import { SupplyDemandBalancer } from "../game-systems/economy/supply-demand-balancer";
import { VillageEconomyManager } from "../game-systems/integration/village-economy-manager";
import { PopulationManager } from "../game-systems/population/population-manager";
import type { Tile } from "../game-systems/world/map";
import type { Village } from "../game-systems/world/village";
import { VillageStatusUI } from "../graphics/ui/village-status-ui";

// Helper function to create proper GameTime objects
function createGameTime(
  currentTime: number = 1000,
  deltaTime: number = 1.0,
): GameTime {
  return {
    currentTime,
    deltaTime,
    totalTicks: Math.floor(currentTime / 16.67),
    totalSeconds: Math.floor(currentTime / 1000),
    totalMinutes: Math.floor(currentTime / 60000),
    currentTick: Math.floor((currentTime % 1000) / 16.67),
  };
}

// Phaserのモック
const mockScene = {
  add: {
    container: vi.fn(() => ({
      setDepth: vi.fn().mockReturnThis(),
      setScrollFactor: vi.fn().mockReturnThis(),
      add: vi.fn(),
      setVisible: vi.fn(),
      setPosition: vi.fn(),
      destroy: vi.fn(),
    })),
    graphics: vi.fn(() => ({
      fillStyle: vi.fn().mockReturnThis(),
      fillRoundedRect: vi.fn().mockReturnThis(),
      lineStyle: vi.fn().mockReturnThis(),
      strokeRoundedRect: vi.fn().mockReturnThis(),
      clear: vi.fn().mockReturnThis(),
    })),
    text: vi.fn(() => ({
      setText: vi.fn().mockReturnThis(),
      setColor: vi.fn().mockReturnThis(),
      setWordWrapWidth: vi.fn().mockReturnThis(),
    })),
  },
} as unknown as Phaser.Scene;

// テスト用のマップを作成
function createTestMap(size: number = 10): Tile[][] {
  const map: Tile[][] = [];
  for (let y = 0; y < size; y++) {
    map[y] = [];
    for (let x = 0; x < size; x++) {
      map[y][x] = {
        type: "land" as const,
        height: 0.5,
        resources: { food: 10, wood: 8, ore: 5 },
        maxResources: { food: 20, wood: 15, ore: 10 },
        depletionState: { food: 0, wood: 0, ore: 0 },
        lastHarvestTime: 0,
        recoveryTimer: { food: 0, wood: 0, ore: 0 },
      };
    }
  }
  return map;
}

// テスト用の村を作成
function createTestVillage(x: number, y: number, population: number): Village {
  return {
    x,
    y,
    population,
    storage: { food: 10, wood: 10, ore: 5 },
    collectionRadius: 2,
    economy: {
      production: { food: 0, wood: 0, ore: 0 },
      consumption: { food: 0, wood: 0, ore: 0 },
      stock: { food: 10, wood: 10, ore: 5, capacity: 100 },
      buildings: { count: 1, targetCount: 1, constructionQueue: 0 },
      supplyDemandStatus: {
        food: "balanced",
        wood: "balanced",
        ore: "balanced",
      },
    },
    lastUpdateTime: 0,
    populationHistory: [population],
  };
}

describe("VillageStatusUI Integration", () => {
  let villageStatusUI: VillageStatusUI;
  let supplyDemandBalancer: SupplyDemandBalancer;
  let economyManager: VillageEconomyManager;
  let populationManager: PopulationManager;
  let buildingManager: BuildingManager;
  let map: Tile[][];

  beforeEach(() => {
    supplyDemandBalancer = new SupplyDemandBalancer();
    economyManager = new VillageEconomyManager();
    populationManager = new PopulationManager();
    buildingManager = new BuildingManager();
    villageStatusUI = new VillageStatusUI(mockScene, supplyDemandBalancer);
    map = createTestMap();
  });

  describe("経済システムとの統合", () => {
    it("経済システムで更新された村の状態を正しく表示する", () => {
      // テスト村を作成
      const village = createTestVillage(5, 5, 100);

      // 経済システムで村を更新
      const gameTime = createGameTime(1000, 1.0);
      economyManager.updateVillageEconomy(village, gameTime, map);
      populationManager.updatePopulation(village, gameTime);
      buildingManager.updateBuildings(village, gameTime);

      // 需給バランスを評価
      village.economy.supplyDemandStatus =
        supplyDemandBalancer.evaluateVillageBalance(village);

      // UIで表示
      villageStatusUI.setVisible(true);
      villageStatusUI.updateVillageStatus([village], true);

      expect(mockScene.add.text).toHaveBeenCalled();
    });

    it("食料不足シナリオを正しく検出・表示する", () => {
      // 食料不足の村を作成
      const village = createTestVillage(5, 5, 200); // 大きな人口
      village.economy.stock.food = 1; // 食料を極端に少なく
      village.economy.consumption.food = 50; // 大きな消費量
      village.economy.production.food = 5; // 少ない生産量

      // 需給バランスを評価
      village.economy.supplyDemandStatus =
        supplyDemandBalancer.evaluateVillageBalance(village);

      // UIで表示
      villageStatusUI.setVisible(true);
      villageStatusUI.updateVillageStatus([village], true);

      expect(mockScene.add.text).toHaveBeenCalled();
      // 食料不足が検出されることを確認
      expect(village.economy.supplyDemandStatus.food).toBe("critical");
    });

    it("建設資源不足シナリオを正しく検出・表示する", () => {
      // 建設資源不足の村を作成
      const village = createTestVillage(5, 5, 150);
      village.economy.stock.wood = 2; // 木材を少なく
      village.economy.stock.ore = 1; // 鉱石を少なく
      village.economy.consumption.wood = 20; // 大きな消費量
      village.economy.consumption.ore = 10;
      village.economy.production.wood = 3; // 少ない生産量
      village.economy.production.ore = 2;

      // 需給バランスを評価
      village.economy.supplyDemandStatus =
        supplyDemandBalancer.evaluateVillageBalance(village);

      // UIで表示
      villageStatusUI.setVisible(true);
      villageStatusUI.updateVillageStatus([village], true);

      expect(mockScene.add.text).toHaveBeenCalled();
      // 建設資源不足が検出されることを確認
      expect(village.economy.supplyDemandStatus.wood).toBe("critical");
      expect(village.economy.supplyDemandStatus.ore).toBe("critical");
    });

    it("複数村の複雑な需給状況を正しく表示する", () => {
      const villages: Village[] = [
        // 食料余剰村
        createTestVillage(0, 0, 50),
        // 食料不足村
        createTestVillage(5, 5, 200),
        // 建設資源不足村
        createTestVillage(10, 10, 100),
        // バランス良好村
        createTestVillage(15, 15, 75),
      ];

      // 各村の状況を設定
      villages[0].economy.production.food = 60; // 1.5倍以上で余剰
      villages[0].economy.consumption.food = 20;
      villages[0].economy.stock.food = 250; // 10日以上のストック (250/20 = 12.5日)

      villages[1].economy.production.food = 10;
      villages[1].economy.consumption.food = 80;
      villages[1].economy.stock.food = 5;

      villages[2].economy.production.wood = 2;
      villages[2].economy.consumption.wood = 25;
      villages[2].economy.stock.wood = 3;
      villages[2].economy.production.ore = 1;
      villages[2].economy.consumption.ore = 15;
      villages[2].economy.stock.ore = 2;

      // 各村の需給バランスを評価
      for (const village of villages) {
        village.economy.supplyDemandStatus =
          supplyDemandBalancer.evaluateVillageBalance(village);
      }

      // UIで表示
      villageStatusUI.setVisible(true);
      villageStatusUI.updateVillageStatus(villages, true);

      expect(mockScene.add.text).toHaveBeenCalled();

      // 各村の状況を確認
      expect(villages[0].economy.supplyDemandStatus.food).toBe("surplus");
      expect(villages[1].economy.supplyDemandStatus.food).toBe("critical");
      expect(villages[2].economy.supplyDemandStatus.wood).toBe("critical");
      expect(villages[2].economy.supplyDemandStatus.ore).toBe("critical");
    });
  });

  describe("リアルタイム更新の統合テスト", () => {
    it("時間経過による状況変化を追跡・表示する", () => {
      const village = createTestVillage(5, 5, 100);

      // 初期状態
      let gameTime: GameTime = {
        currentTime: 0,
        deltaTime: 1.0,
        totalTicks: 0,
        totalSeconds: 0,
        totalMinutes: 0,
        currentTick: 0,
      };
      economyManager.updateVillageEconomy(village, gameTime, map);
      village.economy.supplyDemandStatus =
        supplyDemandBalancer.evaluateVillageBalance(village);

      villageStatusUI.setVisible(true);
      villageStatusUI.updateVillageStatus([village], true);

      // 時間経過後の状態
      gameTime = {
        currentTime: 100,
        deltaTime: 1.0,
        totalTicks: 0,
        totalSeconds: 0,
        totalMinutes: 0,
        currentTick: 0,
      };

      // 資源を枯渇させる
      village.economy.stock.food = 1;
      village.economy.consumption.food = 50;
      village.economy.production.food = 2;

      economyManager.updateVillageEconomy(village, gameTime, map);
      village.economy.supplyDemandStatus =
        supplyDemandBalancer.evaluateVillageBalance(village);

      // 変化後の状態を表示
      villageStatusUI.updateVillageStatus([village], true);

      expect(mockScene.add.text).toHaveBeenCalled();
      expect(village.economy.supplyDemandStatus.food).toBe("critical");
    });

    it("状況改善を正しく反映する", () => {
      // 最初は不足状態の村
      const village = createTestVillage(5, 5, 100);
      village.economy.stock.food = 2;
      village.economy.consumption.food = 40;
      village.economy.production.food = 5;

      village.economy.supplyDemandStatus =
        supplyDemandBalancer.evaluateVillageBalance(village);
      expect(village.economy.supplyDemandStatus.food).toBe("critical");

      villageStatusUI.setVisible(true);
      villageStatusUI.updateVillageStatus([village], true);

      // 状況を改善
      village.economy.stock.food = 350; // 10日以上のストック (350/30 = 11.7日)
      village.economy.production.food = 60; // 1.5倍以上で余剰
      village.economy.consumption.food = 30;

      village.economy.supplyDemandStatus =
        supplyDemandBalancer.evaluateVillageBalance(village);

      // 改善された状況を表示
      villageStatusUI.updateVillageStatus([village], true);

      expect(mockScene.add.text).toHaveBeenCalled();
      expect(village.economy.supplyDemandStatus.food).toBe("surplus");
    });
  });

  describe("パフォーマンステスト", () => {
    it("大量の村での統合処理性能", () => {
      const villages: Village[] = [];

      // 50村を作成
      for (let i = 0; i < 50; i++) {
        const village = createTestVillage(i % 10, Math.floor(i / 10), 50 + i);

        // ランダムな経済状況を設定
        village.economy.production.food = Math.random() * 30;
        village.economy.consumption.food = Math.random() * 40;
        village.economy.stock.food = Math.random() * 50;

        village.economy.production.wood = Math.random() * 20;
        village.economy.consumption.wood = Math.random() * 25;
        village.economy.stock.wood = Math.random() * 30;

        village.economy.production.ore = Math.random() * 15;
        village.economy.consumption.ore = Math.random() * 20;
        village.economy.stock.ore = Math.random() * 25;

        // 需給バランスを評価
        village.economy.supplyDemandStatus =
          supplyDemandBalancer.evaluateVillageBalance(village);

        villages.push(village);
      }

      villageStatusUI.setVisible(true);

      const startTime = performance.now();
      villageStatusUI.updateVillageStatus(villages, true);
      const endTime = performance.now();

      // 処理時間が合理的な範囲内であることを確認（200ms以下）
      expect(endTime - startTime).toBeLessThan(200);
      expect(mockScene.add.text).toHaveBeenCalled();
    });
  });
});
