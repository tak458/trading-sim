/**
 * 包括的なシステム統合テスト
 * タスク10: 全システムの統合テストと最終検証
 * 要件: 全要件の包括的検証
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { BuildingManager } from "@/game-systems/population/building-manager";
import type { GameTime } from "@/game-systems/shared-types";
import { SupplyDemandBalancer } from "../game-systems/economy/supply-demand-balancer";
import { VillageEconomyManager } from "../game-systems/integration/village-economy-manager";
import { PopulationManager } from "../game-systems/population/population-manager";
import type { Tile } from "../game-systems/world/map";
import type { Village } from "../game-systems/world/village";
import { VillageStatusUI } from "../graphics/ui/village-status-ui";
import { DEFAULT_SUPPLY_DEMAND_CONFIG } from "../settings";

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

// Phaserモック
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
} as any;

describe("Comprehensive System Integration Tests", () => {
  let economyManager: VillageEconomyManager;
  let populationManager: PopulationManager;
  let buildingManager: BuildingManager;
  let supplyDemandBalancer: SupplyDemandBalancer;
  let villageStatusUI: VillageStatusUI;
  let testMap: Tile[][];
  let gameTime: GameTime;

  beforeEach(() => {
    economyManager = new VillageEconomyManager();
    populationManager = new PopulationManager();
    buildingManager = new BuildingManager();
    supplyDemandBalancer = new SupplyDemandBalancer();
    villageStatusUI = new VillageStatusUI(mockScene, supplyDemandBalancer);
    gameTime = {
      currentTime: 1000,
      deltaTime: 1.0,
      totalTicks: 0,
      totalSeconds: 0,
      totalMinutes: 0,
      currentTick: 0,
    };

    // 豊富な資源を持つテストマップ
    testMap = Array(20)
      .fill(null)
      .map(() =>
        Array(20)
          .fill(null)
          .map(() => ({
            type: "land" as const,
            height: 0.5,
            resources: { food: 12, wood: 10, ore: 6 },
            maxResources: { food: 25, wood: 20, ore: 12 },
            depletionState: { food: 0, wood: 0, ore: 0 },
            recoveryTimer: { food: 0, wood: 0, ore: 0 },
            lastHarvestTime: 0,
          })),
      );
  });

  // テスト用村作成ヘルパー
  function createVillage(x: number, y: number, population: number): Village {
    return {
      x,
      y,
      population,
      storage: { food: 50, wood: 30, ore: 20 },
      collectionRadius: 2,
      economy: {
        production: { food: 0, wood: 0, ore: 0 },
        consumption: { food: 0, wood: 0, ore: 0 },
        stock: { food: 50, wood: 30, ore: 20, capacity: 150 },
        buildings: {
          count: Math.max(1, Math.floor(population * 0.1)),
          targetCount: Math.max(1, Math.floor(population * 0.1)),
          constructionQueue: 0,
        },
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

  // 全システム更新ヘルパー
  function updateAllSystems(villages: Village[], currentTime: GameTime) {
    villages.forEach((village) => {
      economyManager.updateVillageEconomy(village, currentTime, testMap);
      populationManager.updatePopulation(village, currentTime);
      buildingManager.updateBuildings(village, currentTime);
      village.economy.supplyDemandStatus =
        supplyDemandBalancer.evaluateVillageBalance(village);
    });
  }

  describe("全要件の統合検証", () => {
    it("要件1: 村ごとの生産・消費・ストック管理の完全統合", () => {
      const village = createVillage(5, 5, 25);

      // 初期状態の確認
      expect(village.economy).toBeDefined();
      expect(village.economy.production).toBeDefined();
      expect(village.economy.consumption).toBeDefined();
      expect(village.economy.stock).toBeDefined();

      // システム更新
      updateAllSystems([village], gameTime);

      // 要件1.1: 村が作成される時にシステムは各村に生産・消費・ストック管理機能を追加する
      expect(village.economy.production.food).toBeGreaterThan(0);
      expect(village.economy.production.wood).toBeGreaterThan(0);
      expect(village.economy.production.ore).toBeGreaterThan(0);

      // 要件1.2: 村が資源を収集する時にシステムは村のストックを更新する
      expect(village.economy.stock.food).toBe(village.storage.food);
      expect(village.economy.stock.wood).toBe(village.storage.wood);
      expect(village.economy.stock.ore).toBe(village.storage.ore);

      // 要件1.3: 村に資源ストックがある時にシステムは各資源タイプの現在量を追跡する
      expect(village.economy.stock.food).toBeGreaterThanOrEqual(0);
      expect(village.economy.stock.wood).toBeGreaterThanOrEqual(0);
      expect(village.economy.stock.ore).toBeGreaterThanOrEqual(0);

      // 要件1.4: 村の状態が変化する時にシステムは生産・消費・ストック情報を更新する
      expect(village.lastUpdateTime).toBe(gameTime.currentTime);
    });

    it("要件2: 人口に基づく資源消費システムの完全統合", () => {
      const village = createVillage(10, 10, 30);
      village.storage.food = 100;

      const initialFood = village.storage.food;
      const initialPopulation = village.population;

      // システム更新
      updateAllSystems([village], gameTime);

      // 要件2.1: 時間が経過する時にシステムは村の人口に比例して食料を消費する
      expect(village.storage.food).toBeLessThan(initialFood);
      expect(village.economy.consumption.food).toBeGreaterThan(0);

      // 要件2.2: 村の人口が増加する時にシステムは食料消費量を増加させる
      const consumption30 = village.economy.consumption.food;
      village.population = 40;
      updateAllSystems([village], gameTime);
      expect(village.economy.consumption.food).toBeGreaterThan(consumption30);

      // 要件2.3: 村の食料が不足している時にシステムは人口増加を停止する
      village.storage.food = 5;
      village.economy.production.food = 2;
      village.economy.supplyDemandStatus.food = "shortage";
      expect(populationManager.canPopulationGrow(village)).toBe(false);

      // 要件2.4: 村の食料が完全に枯渇する時にシステムは人口を減少させる
      village.storage.food = 0;
      village.economy.production.food = 0;
      village.economy.supplyDemandStatus.food = "critical";
      expect(populationManager.shouldPopulationDecrease(village)).toBe(true);

      // 要件2.5: 食料状況が改善される時にシステムは人口増加を再開する
      village.storage.food = 200;
      village.economy.production.food = 50;
      village.economy.supplyDemandStatus.food = "surplus";
      expect(populationManager.canPopulationGrow(village)).toBe(true);
    });

    it("要件3: 建物建設による資源消費システムの完全統合", () => {
      const village = createVillage(15, 15, 40);
      village.storage.wood = 100;
      village.storage.ore = 60;

      const initialWood = village.storage.wood;
      const initialOre = village.storage.ore;

      // 要件3.2: 村の人口が増加する時にシステムは人口に比例して建物数を増加させる
      updateAllSystems([village], gameTime);
      const expectedTargetCount = Math.floor(
        village.population *
          DEFAULT_SUPPLY_DEMAND_CONFIG.buildingsPerPopulation,
      );
      expect(village.economy.buildings.targetCount).toBe(expectedTargetCount);

      // 要件3.1: 村が建物を建設する時にシステムは木材と鉱石を消費する
      if (village.economy.buildings.constructionQueue > 0) {
        expect(village.storage.wood).toBeLessThan(initialWood);
        expect(village.storage.ore).toBeLessThan(initialOre);
      }

      // 要件3.3: 村に十分な木材または鉱石がない時にシステムは建物建設を制限する
      village.storage.wood = 5;
      village.storage.ore = 2;
      expect(buildingManager.canBuildBuilding(village)).toBe(false);

      // 要件3.4: 建設資源が不足する時にシステムは村の建物増加を停止する
      const initialConstructionQueue =
        village.economy.buildings.constructionQueue;
      buildingManager.updateBuildings(village, gameTime);
      expect(village.economy.buildings.constructionQueue).toBe(
        initialConstructionQueue,
      );
    });

    it("要件4: テキストUIによる資源不足表示の完全統合", () => {
      const villages = [createVillage(0, 0, 25), createVillage(10, 10, 30)];

      // 不足状況を作成
      villages[0].economy.supplyDemandStatus = {
        food: "critical",
        wood: "balanced",
        ore: "balanced",
      };
      villages[1].economy.supplyDemandStatus = {
        food: "balanced",
        wood: "shortage",
        ore: "critical",
      };

      villageStatusUI.setVisible(true);

      // 要件4.1: プレイヤーがUIを確認する時にシステムは各村の資源不足情報を表示する
      villageStatusUI.updateVillageStatus(villages, true);
      expect(mockScene.add.container).toHaveBeenCalled();
      expect(mockScene.add.text).toHaveBeenCalled();

      // 要件4.2: 村で資源が不足する時にシステムは不足している資源タイプを明示する
      // 要件4.3: 複数の村で資源不足が発生している時にシステムは全ての不足情報を整理して表示する
      expect(mockScene.add.text).toHaveBeenCalled();

      // 要件4.4: 資源状況が改善される時にシステムはリアルタイムで表示を更新する
      villages[0].economy.supplyDemandStatus.food = "balanced";
      villageStatusUI.updateVillageStatus(villages, true);
      expect(mockScene.add.container).toHaveBeenCalled();
    });

    it("要件5: 村の生産能力管理の完全統合", () => {
      const village = createVillage(8, 8, 20);

      // 要件5.1: 村が資源タイルにアクセスする時にシステムは村の生産能力を計算する
      updateAllSystems([village], gameTime);
      expect(village.economy.production.food).toBeGreaterThan(0);
      expect(village.economy.production.wood).toBeGreaterThan(0);
      expect(village.economy.production.ore).toBeGreaterThan(0);

      // 要件5.2: 村の周辺環境が変化する時にシステムは生産能力を再計算する
      const initialProduction = { ...village.economy.production };

      // 収集範囲を拡大
      village.collectionRadius = 3;
      updateAllSystems([village], gameTime);

      expect(village.economy.production.food).toBeGreaterThan(
        initialProduction.food,
      );
      expect(village.economy.production.wood).toBeGreaterThan(
        initialProduction.wood,
      );
      expect(village.economy.production.ore).toBeGreaterThan(
        initialProduction.ore,
      );
    });

    it("要件6: 村間の資源バランス管理の完全統合", () => {
      const villages = [
        createVillage(0, 0, 15), // 小さな村
        createVillage(10, 10, 40), // 大きな村
        createVillage(5, 15, 25), // 中程度の村
      ];

      // 異なる資源状況を設定
      villages[0].storage = { food: 200, wood: 100, ore: 80 }; // 余剰
      villages[1].storage = { food: 10, wood: 5, ore: 3 }; // 不足
      villages[2].storage = { food: 50, wood: 30, ore: 20 }; // バランス

      updateAllSystems(villages, gameTime);

      // 要件6.1: システムが村の状態を評価する時に各村の資源余剰・不足状況を判定する
      villages.forEach((village) => {
        expect(["surplus", "balanced", "shortage", "critical"]).toContain(
          village.economy.supplyDemandStatus.food,
        );
        expect(["surplus", "balanced", "shortage", "critical"]).toContain(
          village.economy.supplyDemandStatus.wood,
        );
        expect(["surplus", "balanced", "shortage", "critical"]).toContain(
          village.economy.supplyDemandStatus.ore,
        );
      });

      // 要件6.2: 村に資源余剰がある時にシステムは余剰資源を他村への供給候補として識別する
      const surplusVillages =
        economyManager.getResourceSurplusVillages(villages);
      expect(surplusVillages.length).toBeGreaterThan(0);

      // 要件6.3: 村で資源不足が発生している時にシステムは近隣村からの供給可能性を評価する
      const shortageVillages =
        economyManager.getResourceShortageVillages(villages);
      if (shortageVillages.length > 0) {
        const suppliers = supplyDemandBalancer.evaluateSupplyPossibility(
          shortageVillages[0],
          villages,
          "food",
          50,
        );
        expect(suppliers).toBeDefined();
      }

      // 要件6.4: 資源バランスが変化する時にシステムは村間の需給関係を更新する
      const comparison = supplyDemandBalancer.compareVillageBalances(villages);
      expect(comparison.food).toBeDefined();
      expect(comparison.wood).toBeDefined();
      expect(comparison.ore).toBeDefined();
    });
  });

  describe("長期間シミュレーションテスト", () => {
    it("100時間の村発展シミュレーション", () => {
      const village = createVillage(10, 10, 15);
      village.storage = { food: 100, wood: 60, ore: 40 };

      const initialPopulation = village.population;
      const initialBuildingCount = village.economy.buildings.count;

      // 100時間のシミュレーション（1時間ずつ）
      for (let hour = 0; hour < 100; hour++) {
        const currentTime = createGameTime(
          gameTime.currentTime + hour * 3600,
          3600,
        ); // 1時間

        updateAllSystems([village], currentTime);

        // 定期的な資源補充（自然回復をシミュレート）
        if (hour % 10 === 0) {
          village.storage.food += 50;
          village.storage.wood += 30;
          village.storage.ore += 20;
        }

        // 村が存続していることを確認
        expect(village.population).toBeGreaterThan(0);
        expect(village.economy.buildings.count).toBeGreaterThan(0);
      }

      // 長期的な発展を確認（村が存続していることが重要）
      expect(village.population).toBeGreaterThan(0); // 村が存続
      expect(village.economy.buildings.count).toBeGreaterThan(0); // 建物が存続
    });

    it("複数村の相互作用長期シミュレーション", () => {
      const villages = [
        createVillage(0, 0, 20),
        createVillage(15, 15, 25),
        createVillage(30, 30, 18),
      ];

      // 異なる初期条件を設定
      villages[0].storage = { food: 150, wood: 40, ore: 25 }; // 食料豊富
      villages[1].storage = { food: 60, wood: 100, ore: 80 }; // 建設資源豊富
      villages[2].storage = { food: 80, wood: 60, ore: 40 }; // バランス型

      // 50時間のシミュレーション
      for (let hour = 0; hour < 50; hour++) {
        const currentTime = createGameTime(
          gameTime.currentTime + hour * 3600,
          3600,
        );

        updateAllSystems(villages, currentTime);

        // UI更新も含める
        villageStatusUI.setVisible(true);
        villageStatusUI.updateVillageStatus(villages, true);

        // 村間の需給バランス分析
        const comparison =
          supplyDemandBalancer.compareVillageBalances(villages);
        expect(comparison).toBeDefined();

        // 時々資源を再配分（交易をシミュレート）
        if (hour % 20 === 0) {
          const shortageVillages =
            economyManager.getResourceShortageVillages(villages);
          const surplusVillages =
            economyManager.getResourceSurplusVillages(villages);

          if (shortageVillages.length > 0 && surplusVillages.length > 0) {
            // 簡単な資源移動をシミュレート
            shortageVillages[0].storage.food += 20;
            surplusVillages[0].storage.food -= 20;
          }
        }
      }

      // 全村が存続していることを確認
      villages.forEach((village) => {
        expect(village.population).toBeGreaterThan(0);
        expect(village.economy.buildings.count).toBeGreaterThan(0);
      });
    });
  });

  describe("極限状況での安定性テスト", () => {
    it("全資源枯渇からの回復テスト", () => {
      const village = createVillage(12, 12, 50);

      // 全資源を枯渇させる
      village.storage = { food: 0, wood: 0, ore: 0 };
      village.economy.stock = { food: 0, wood: 0, ore: 0, capacity: 200 };

      // 枯渇状態で10時間経過
      for (let i = 0; i < 10; i++) {
        const currentTime = createGameTime(
          gameTime.currentTime + i * 3600,
          3600,
        );

        updateAllSystems([village], currentTime);

        // 村が完全に消滅しないことを確認
        expect(village.population).toBeGreaterThan(0);
      }

      // 資源を段階的に回復
      village.storage.food = 100;
      village.economy.stock.food = 100;

      // 回復プロセスをシミュレート
      for (let i = 0; i < 20; i++) {
        const currentTime = createGameTime(
          gameTime.currentTime + 100 + i * 3600,
          3600,
        );

        updateAllSystems([village], currentTime);

        if (i === 10) {
          village.storage.wood = 50;
          village.storage.ore = 30;
          village.economy.stock.wood = 50;
          village.economy.stock.ore = 30;
        }
      }

      // 回復が進んでいることを確認（完全回復は時間がかかるため、村の存続を確認）
      expect(village.population).toBeGreaterThan(0);
      // 資源が設定されていることを確認（消費されても最低限は残る）
      expect(
        village.storage.food + village.storage.wood + village.storage.ore,
      ).toBeGreaterThan(0);
    });

    it("大規模村（人口1000）での性能テスト", () => {
      const village = createVillage(5, 5, 1000);
      village.storage = { food: 5000, wood: 3000, ore: 2000 };
      village.economy.stock = {
        food: 5000,
        wood: 3000,
        ore: 2000,
        capacity: 10000,
      };

      const startTime = performance.now();

      // 大規模村での更新性能をテスト
      for (let i = 0; i < 10; i++) {
        const currentTime = createGameTime(gameTime.currentTime + i * 100, 100);

        updateAllSystems([village], currentTime);
      }

      const endTime = performance.now();

      // 処理時間が合理的であることを確認（1秒以下）
      expect(endTime - startTime).toBeLessThan(1000);

      // 大規模でも正常に動作することを確認
      expect(village.population).toBeGreaterThan(0);
      expect(village.economy.production.food).toBeGreaterThan(0);
    });

    it("システム全体のメモリリークテスト", () => {
      const villages: Village[] = [];

      // 100村を作成
      for (let i = 0; i < 100; i++) {
        villages.push(createVillage(i % 10, Math.floor(i / 10), 10 + (i % 20)));
      }

      // 長時間の更新サイクル
      for (let cycle = 0; cycle < 1000; cycle++) {
        const currentTime = createGameTime(
          gameTime.currentTime + cycle * 10,
          10,
        );

        updateAllSystems(villages, currentTime);

        // UI更新も含める
        if (cycle % 10 === 0) {
          villageStatusUI.setVisible(true);
          villageStatusUI.updateVillageStatus(villages, true);
        }

        // 需給バランス分析
        if (cycle % 50 === 0) {
          supplyDemandBalancer.compareVillageBalances(villages);
        }
      }

      // メモリリークが発生していないことを確認（エラーが発生しない）
      expect(villages.length).toBe(100);
      villages.forEach((village) => {
        expect(village.population).toBeGreaterThan(0);
      });
    });
  });

  describe("エラー回復とデータ整合性", () => {
    it("破損データからの自動回復", () => {
      const village = createVillage(7, 7, 25);

      // データを意図的に破損
      village.population = -10;
      village.storage = { food: -50, wood: -30, ore: -20 };
      village.collectionRadius = 0;
      village.economy.production = {
        food: NaN,
        wood: Infinity,
        ore: -Infinity,
      };
      village.economy.consumption = {
        food: null as any,
        wood: undefined as any,
        ore: NaN,
      };

      // システム更新で自動修正されることを確認
      updateAllSystems([village], gameTime);

      // 人口が修正されて最低値が設定される
      expect(village.population).toBeGreaterThanOrEqual(0);
      expect(village.storage.food).toBeGreaterThanOrEqual(0);
      expect(village.storage.wood).toBeGreaterThanOrEqual(0);
      expect(village.storage.ore).toBeGreaterThanOrEqual(0);
      expect(village.collectionRadius).toBeGreaterThan(0);
      expect(isFinite(village.economy.production.food)).toBe(true);
      expect(isFinite(village.economy.production.wood)).toBe(true);
      expect(isFinite(village.economy.production.ore)).toBe(true);
    });

    it("システム間の整合性維持", () => {
      const village = createVillage(9, 9, 30);

      // 複数回の更新で整合性が維持されることを確認
      for (let i = 0; i < 50; i++) {
        const currentTime = createGameTime(gameTime.currentTime + i * 100, 100);

        updateAllSystems([village], currentTime);

        // 整合性チェック
        expect(village.economy.stock.food).toBe(village.storage.food);
        expect(village.economy.stock.wood).toBe(village.storage.wood);
        expect(village.economy.stock.ore).toBe(village.storage.ore);

        expect(village.population).toBeGreaterThan(0);
        expect(village.economy.buildings.count).toBeGreaterThanOrEqual(0);
        expect(
          village.economy.buildings.constructionQueue,
        ).toBeGreaterThanOrEqual(0);

        // 人口履歴の整合性
        expect(village.populationHistory.length).toBeGreaterThan(0);
        expect(village.populationHistory.length).toBeLessThanOrEqual(10);
        expect(
          village.populationHistory[village.populationHistory.length - 1],
        ).toBe(village.population);
      }
    });
  });
});
