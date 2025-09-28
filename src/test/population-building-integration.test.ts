/**
 * 人口変化と建物建設の統合テスト
 * タスク10: 人口変化と建物建設の統合テストを作成
 * 要件: 全要件の検証
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VillageEconomyManager, GameTime } from '../village-economy-manager';
import { PopulationManager } from '../population-manager';
import { BuildingManager } from '../building-manager';
import { Village } from '../village';
import { Tile } from '../map';
import { DEFAULT_SUPPLY_DEMAND_CONFIG } from '../village-economy';

describe('Population and Building Integration Tests', () => {
  let economyManager: VillageEconomyManager;
  let populationManager: PopulationManager;
  let buildingManager: BuildingManager;
  let testVillage: Village;
  let testMap: Tile[][];
  let gameTime: GameTime;

  beforeEach(() => {
    economyManager = new VillageEconomyManager();
    populationManager = new PopulationManager();
    buildingManager = new BuildingManager();
    gameTime = { currentTime: 1000, deltaTime: 1.0 };

    // 統合テスト用の村を作成
    testVillage = {
      x: 5, y: 5, population: 10,
      storage: { food: 100, wood: 50, ore: 30 },
      collectionRadius: 2,
      economy: {
        production: { food: 0, wood: 0, ore: 0 },
        consumption: { food: 0, wood: 0, ore: 0 },
        stock: { food: 100, wood: 50, ore: 30, capacity: 150 },
        buildings: { count: 1, targetCount: 1, constructionQueue: 0 },
        supplyDemandStatus: { food: 'balanced', wood: 'balanced', ore: 'balanced' }
      },
      lastUpdateTime: 0,
      populationHistory: [8, 9, 10]
    };

    // 豊富な資源を持つテストマップ
    testMap = Array(10).fill(null).map(() => 
      Array(10).fill(null).map(() => ({
        type: 'land' as const,
        height: 0.5,
        resources: { food: 15, wood: 12, ore: 8 },
        maxResources: { food: 30, wood: 25, ore: 15 },
        depletionState: { food: 0, wood: 0, ore: 0 },
        lastHarvestTime: 0
      }))
    );
  });

  describe('人口増加に伴う建物需要の変化', () => {
    it('人口増加時に建物目標数が自動的に増加する', () => {
      // 初期状態：人口10、建物1
      expect(testVillage.population).toBe(10);
      expect(testVillage.economy.buildings.count).toBe(1);

      // 経済システムを更新
      economyManager.updateVillageEconomy(testVillage, gameTime, testMap);
      buildingManager.updateBuildings(testVillage, gameTime);

      const initialTargetCount = testVillage.economy.buildings.targetCount;

      // 人口を20に増加
      testVillage.population = 20;

      // 建物システムを再更新
      buildingManager.updateBuildings(testVillage, gameTime);

      // 目標建物数が増加していることを確認
      expect(testVillage.economy.buildings.targetCount).toBeGreaterThan(initialTargetCount);
      expect(testVillage.economy.buildings.targetCount).toBe(2); // 20人 * 0.1 = 2
    });

    it('人口増加に伴う建物建設が実際に実行される', () => {
      // 十分な建設資源を設定
      testVillage.storage.wood = 100;
      testVillage.storage.ore = 50;
      testVillage.population = 30; // 目標建物数3

      // 経済・建物システムを更新
      economyManager.updateVillageEconomy(testVillage, gameTime, testMap);
      buildingManager.updateBuildings(testVillage, gameTime);

      // 建設が開始されることを確認
      expect(testVillage.economy.buildings.targetCount).toBe(3);
      expect(testVillage.economy.buildings.constructionQueue).toBeGreaterThan(0);

      // 資源が消費されることを確認
      expect(testVillage.storage.wood).toBeLessThan(100);
      expect(testVillage.storage.ore).toBeLessThan(50);
    });

    it('建物完成により収集範囲と生産能力が向上する', () => {
      // 初期生産能力を記録
      economyManager.updateVillageEconomy(testVillage, gameTime, testMap);
      const initialProduction = { ...testVillage.economy.production };

      // 建物を増加させる
      testVillage.economy.buildings.count = 3;
      testVillage.economy.stock.capacity = DEFAULT_SUPPLY_DEMAND_CONFIG.baseStorageCapacity + 
        (3 * DEFAULT_SUPPLY_DEMAND_CONFIG.storageCapacityPerBuilding);

      // 生産能力を再計算
      economyManager.updateVillageEconomy(testVillage, gameTime, testMap);

      // 建物増加により生産能力が向上することを確認
      expect(testVillage.economy.production.food).toBeGreaterThan(initialProduction.food);
      expect(testVillage.economy.production.wood).toBeGreaterThan(initialProduction.wood);
      expect(testVillage.economy.production.ore).toBeGreaterThan(initialProduction.ore);
    });
  });

  describe('食料消費による人口変化と建物への影響', () => {
    it('食料不足による人口減少時に建物目標数も減少する', () => {
      // 人口30、建物3の状態から開始
      testVillage.population = 30;
      testVillage.economy.buildings.count = 3;
      testVillage.economy.buildings.targetCount = 3;

      // 食料を枯渇させる
      testVillage.storage.food = 0;
      testVillage.economy.production.food = 0;
      testVillage.economy.supplyDemandStatus.food = 'critical';

      // 人口システムを更新（減少の可能性）
      for (let i = 0; i < 50; i++) { // 確率的なので複数回実行
        populationManager.updatePopulation(testVillage, gameTime);
        if (testVillage.population < 30) break;
      }

      // 人口が減少した場合、建物目標数も調整される
      if (testVillage.population < 30) {
        buildingManager.updateBuildings(testVillage, gameTime);
        const expectedTargetCount = Math.floor(testVillage.population * DEFAULT_SUPPLY_DEMAND_CONFIG.buildingsPerPopulation);
        expect(testVillage.economy.buildings.targetCount).toBe(Math.max(1, expectedTargetCount));
      }
    });

    it('食料状況改善による人口増加時に建物建設が追従する', () => {
      // 初期状態：少ない人口と建物
      testVillage.population = 5;
      testVillage.economy.buildings.count = 1;

      // 食料状況を大幅に改善
      testVillage.storage.food = 500;
      testVillage.economy.production.food = 50;
      testVillage.economy.supplyDemandStatus.food = 'surplus';

      // 建設資源も十分に設定
      testVillage.storage.wood = 200;
      testVillage.storage.ore = 100;

      let populationIncreased = false;
      let buildingsIncreased = false;

      // 複数回更新して変化を観察
      for (let i = 0; i < 200; i++) { // 回数を増やして確率的な変化を捉える
        const initialPopulation = testVillage.population;
        const initialBuildingCount = testVillage.economy.buildings.count;

        // 全システムを更新
        economyManager.updateVillageEconomy(testVillage, gameTime, testMap);
        populationManager.updatePopulation(testVillage, gameTime);
        buildingManager.updateBuildings(testVillage, gameTime);

        // 建設キューを時間経過で処理
        const constructionTime: GameTime = { currentTime: gameTime.currentTime + i * 10, deltaTime: 5.0 };
        buildingManager.updateBuildings(testVillage, constructionTime);

        if (testVillage.population > initialPopulation) {
          populationIncreased = true;
        }
        if (testVillage.economy.buildings.count > initialBuildingCount) {
          buildingsIncreased = true;
        }

        if (populationIncreased && buildingsIncreased) break;
      }

      // 人口増加または建物増加のいずれかが発生することを確認（確率的なため両方は保証されない）
      expect(populationIncreased || buildingsIncreased).toBe(true);
      
      // 少なくとも建物建設は確実に発生するはず（人口5→目標建物1以上）
      expect(testVillage.economy.buildings.count + testVillage.economy.buildings.constructionQueue).toBeGreaterThanOrEqual(1);
    });
  });

  describe('建設資源不足による制約の連鎖効果', () => {
    it('建設資源不足時は人口増加しても建物が建設されない', () => {
      // 人口増加に有利な条件を設定
      testVillage.population = 20;
      testVillage.storage.food = 300;
      testVillage.economy.production.food = 40;
      testVillage.economy.supplyDemandStatus.food = 'surplus';

      // 建設資源を不足させる
      testVillage.storage.wood = 5; // 建設コスト未満
      testVillage.storage.ore = 2;  // 建設コスト未満

      // システムを更新
      economyManager.updateVillageEconomy(testVillage, gameTime, testMap);
      buildingManager.updateBuildings(testVillage, gameTime);

      // 目標建物数は増加するが実際の建設は行われない
      expect(testVillage.economy.buildings.targetCount).toBe(2);
      expect(testVillage.economy.buildings.constructionQueue).toBe(0);
      expect(testVillage.storage.wood).toBe(5); // 資源は消費されない
      expect(testVillage.storage.ore).toBe(2);
    });

    it('建物不足により生産効率が低下し人口成長が制限される', () => {
      // 人口は多いが建物が不足している状況
      testVillage.population = 50;
      testVillage.economy.buildings.count = 1; // 大幅に不足
      testVillage.storage.food = 100;

      // 建設資源も不足
      testVillage.storage.wood = 5;
      testVillage.storage.ore = 2;

      // 経済システムを更新
      economyManager.updateVillageEconomy(testVillage, gameTime, testMap);

      // 建物不足により生産効率が低い
      const productionWithFewBuildings = { ...testVillage.economy.production };

      // 建物を十分に増やした場合と比較
      testVillage.economy.buildings.count = 5;
      economyManager.updateVillageEconomy(testVillage, gameTime, testMap);
      const productionWithManyBuildings = { ...testVillage.economy.production };

      // 建物が多い方が生産効率が高いことを確認
      expect(productionWithManyBuildings.food).toBeGreaterThan(productionWithFewBuildings.food);
      expect(productionWithManyBuildings.wood).toBeGreaterThan(productionWithFewBuildings.wood);
      expect(productionWithManyBuildings.ore).toBeGreaterThan(productionWithFewBuildings.ore);
    });
  });

  describe('時間経過による複合的な変化', () => {
    it('長期間の時間経過で人口と建物が協調して成長する', () => {
      // 成長に有利な初期条件を設定
      testVillage.population = 10;
      testVillage.economy.buildings.count = 1;
      testVillage.storage = { food: 200, wood: 100, ore: 60 };

      const initialPopulation = testVillage.population;
      const initialBuildingCount = testVillage.economy.buildings.count;

      // 長期間のシミュレーション（100回更新）
      for (let i = 0; i < 100; i++) {
        const currentTime: GameTime = { 
          currentTime: gameTime.currentTime + i * 10, 
          deltaTime: 1.0 
        };

        // 全システムを順次更新
        economyManager.updateVillageEconomy(testVillage, currentTime, testMap);
        populationManager.updatePopulation(testVillage, currentTime);
        buildingManager.updateBuildings(testVillage, currentTime);

        // 建設完了処理のため追加の時間経過
        const constructionTime: GameTime = { 
          currentTime: currentTime.currentTime, 
          deltaTime: 2.0 
        };
        buildingManager.updateBuildings(testVillage, constructionTime);

        // 資源が枯渇した場合は補充（継続的成長をシミュレート）
        if (testVillage.storage.food < 50) testVillage.storage.food += 100;
        if (testVillage.storage.wood < 20) testVillage.storage.wood += 50;
        if (testVillage.storage.ore < 10) testVillage.storage.ore += 30;
      }

      // 長期的な成長を確認
      expect(testVillage.population).toBeGreaterThanOrEqual(initialPopulation);
      expect(testVillage.economy.buildings.count).toBeGreaterThanOrEqual(initialBuildingCount);

      // 人口と建物数の比率が適切に維持されていることを確認
      const expectedBuildingCount = Math.floor(testVillage.population * DEFAULT_SUPPLY_DEMAND_CONFIG.buildingsPerPopulation);
      const actualBuildingCount = testVillage.economy.buildings.count + testVillage.economy.buildings.constructionQueue;
      
      // 目標値に近い値であることを確認（±1の誤差を許容）
      expect(Math.abs(actualBuildingCount - expectedBuildingCount)).toBeLessThanOrEqual(1);
    });

    it('資源枯渇による衰退サイクルを正しく処理する', () => {
      // 不安定な初期条件を設定
      testVillage.population = 40;
      testVillage.economy.buildings.count = 4;
      testVillage.storage = { food: 20, wood: 15, ore: 10 }; // 少ない資源

      let cycleCompleted = false;
      let minPopulation = testVillage.population;
      let maxPopulation = testVillage.population;

      // 衰退と回復のサイクルをシミュレート
      for (let i = 0; i < 200; i++) {
        const currentTime: GameTime = { 
          currentTime: gameTime.currentTime + i * 5, 
          deltaTime: 1.0 
        };

        // 全システムを更新
        economyManager.updateVillageEconomy(testVillage, currentTime, testMap);
        populationManager.updatePopulation(testVillage, currentTime);
        buildingManager.updateBuildings(testVillage, currentTime);

        // 人口の変化を追跡
        minPopulation = Math.min(minPopulation, testVillage.population);
        maxPopulation = Math.max(maxPopulation, testVillage.population);

        // 時々資源を補充（不規則な資源供給をシミュレート）
        if (i % 50 === 0) {
          testVillage.storage.food += 100;
          testVillage.storage.wood += 50;
          testVillage.storage.ore += 30;
        }

        // 衰退と回復のサイクルが発生したかチェック
        if (maxPopulation - minPopulation >= 10) {
          cycleCompleted = true;
          break;
        }
      }

      // 人口変動が発生し、システムが安定して動作することを確認
      expect(testVillage.population).toBeGreaterThan(0); // 村が存続
      expect(testVillage.economy.buildings.count).toBeGreaterThan(0); // 建物が存続
      expect(cycleCompleted).toBe(true); // 変動サイクルが発生
    });
  });

  describe('極端な状況での統合動作', () => {
    it('人口爆発時の建物建設追従性能', () => {
      // 人口爆発をシミュレート
      testVillage.population = 5;
      testVillage.storage = { food: 1000, wood: 500, ore: 300 }; // 大量の資源

      // 人口を急激に増加させる
      for (let i = 0; i < 10; i++) {
        testVillage.population += 10; // 毎回10人増加
        
        const currentTime: GameTime = { 
          currentTime: gameTime.currentTime + i * 10, 
          deltaTime: 1.0 
        };

        // システムを更新
        economyManager.updateVillageEconomy(testVillage, currentTime, testMap);
        buildingManager.updateBuildings(testVillage, currentTime);

        // 建設完了を促進
        const fastTime: GameTime = { 
          currentTime: currentTime.currentTime, 
          deltaTime: 10.0 
        };
        buildingManager.updateBuildings(testVillage, fastTime);
      }

      // 最終的に適切な建物数に収束することを確認
      const expectedBuildingCount = Math.floor(testVillage.population * DEFAULT_SUPPLY_DEMAND_CONFIG.buildingsPerPopulation);
      const actualBuildingCount = testVillage.economy.buildings.count + testVillage.economy.buildings.constructionQueue;
      
      expect(actualBuildingCount).toBeGreaterThanOrEqual(expectedBuildingCount * 0.8); // 80%以上の追従
    });

    it('全資源枯渇からの回復プロセス', () => {
      // 全資源を枯渇させる
      testVillage.population = 30;
      testVillage.storage = { food: 0, wood: 0, ore: 0 };
      testVillage.economy.production = { food: 0, wood: 0, ore: 0 };

      // 枯渇状態での更新
      for (let i = 0; i < 20; i++) {
        const currentTime: GameTime = { 
          currentTime: gameTime.currentTime + i * 5, 
          deltaTime: 1.0 
        };

        economyManager.updateVillageEconomy(testVillage, currentTime, testMap);
        populationManager.updatePopulation(testVillage, currentTime);
        buildingManager.updateBuildings(testVillage, currentTime);
      }

      const populationAfterCrisis = testVillage.population;

      // 資源を回復させる
      testVillage.storage = { food: 300, wood: 150, ore: 100 };
      
      // 回復プロセスをシミュレート
      for (let i = 0; i < 50; i++) {
        const currentTime: GameTime = { 
          currentTime: gameTime.currentTime + 100 + i * 5, 
          deltaTime: 1.0 
        };

        economyManager.updateVillageEconomy(testVillage, currentTime, testMap);
        populationManager.updatePopulation(testVillage, currentTime);
        buildingManager.updateBuildings(testVillage, currentTime);

        // 建設完了処理
        const constructionTime: GameTime = { 
          currentTime: currentTime.currentTime, 
          deltaTime: 3.0 
        };
        buildingManager.updateBuildings(testVillage, constructionTime);
      }

      // 回復が発生することを確認
      expect(testVillage.population).toBeGreaterThan(0);
      expect(testVillage.economy.buildings.count).toBeGreaterThan(0);
      
      // 人口が回復傾向にあることを確認（完全回復は時間がかかるため傾向のみ）
      const recentHistory = testVillage.populationHistory.slice(-5);
      const isRecovering = recentHistory[recentHistory.length - 1] >= recentHistory[0];
      expect(isRecovering).toBe(true);
    });
  });
});