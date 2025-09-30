/**
 * BuildingManager 統合テスト
 * 他のシステムとの連携を検証
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VillageEconomyManager } from '../game-systems/integration/village-economy-manager';
import { BuildingManager } from '../game-systems/population/building-manager';
import { PopulationManager } from '../game-systems/population/population-manager';
import { Village } from '../game-systems/world/village';
import { Tile } from '../game-systems/world/map';
import { DEFAULT_SUPPLY_DEMAND_CONFIG } from '../settings';
import { GameTime } from '../game-systems/shared-types';

// Helper function to create proper GameTime objects
function createGameTime(currentTime: number = 1000, deltaTime: number = 1.0): GameTime {
  return {
    currentTime,
    deltaTime,
    totalTicks: Math.floor(currentTime / 16.67),
    totalSeconds: Math.floor(currentTime / 1000),
    totalMinutes: Math.floor(currentTime / 60000),
    currentTick: Math.floor((currentTime % 1000) / 16.67)
  };
}

describe('BuildingManager 統合テスト', () => {
  let buildingManager: BuildingManager;
  let economyManager: VillageEconomyManager;
  let populationManager: PopulationManager;
  let mockVillage: Village;
  let mockMap: Tile[][];
  let gameTime: GameTime;

  beforeEach(() => {
    buildingManager = new BuildingManager();
    economyManager = new VillageEconomyManager();
    populationManager = new PopulationManager();

    // モック村の初期化
    mockVillage = {
      x: 5,
      y: 5,
      population: 15,
      storage: { food: 100, wood: 80, ore: 40 },
      collectionRadius: 2,
      lastUpdateTime: 0,
      populationHistory: [13, 14, 15],
      economy: {
        production: { food: 12, wood: 10, ore: 6 },
        consumption: { food: 7.5, wood: 0, ore: 0 },
        stock: { food: 100, wood: 80, ore: 40, capacity: 140 },
        buildings: { count: 1, targetCount: 1, constructionQueue: 0 },
        supplyDemandStatus: { food: 'balanced', wood: 'surplus', ore: 'balanced' }
      }
    };

    // モックマップの初期化（村の周辺に資源を配置）
    mockMap = Array(11).fill(null).map(() =>
      Array(11).fill(null).map(() => ({
        height: 1,
        type: 'land' as const,
        resources: { food: 2, wood: 3, ore: 1 },
        maxResources: { food: 10, wood: 10, ore: 10 },
        depletionState: { food: 1, wood: 1, ore: 1 },
        recoveryTimer: { food: 0, wood: 0, ore: 0 },
        lastHarvestTime: 0
      }))
    );

    gameTime = {
      currentTime: 100, deltaTime: 1.0, totalTicks: 0,
      totalSeconds: 0,
      totalMinutes: 0,
      currentTick: 0
    };
  });

  describe('経済システムとの統合', () => {
    it('建物建設が経済システムの消費計算に反映される', () => {
      // 建物建設を開始
      mockVillage.population = 25; // 目標建物数を2.5 → 2に
      buildingManager.updateBuildings(mockVillage, gameTime);

      // 経済システムを更新
      economyManager.updateVillageEconomy(mockVillage, gameTime, mockMap);

      // 建設による木材・鉱石消費が反映されているか確認
      expect(mockVillage.economy.consumption.wood).toBeGreaterThan(0);
      expect(mockVillage.economy.consumption.ore).toBeGreaterThan(0);

      // 建設キューがある場合の消費量計算
      const expectedWoodConsumption = mockVillage.economy.buildings.constructionQueue * DEFAULT_SUPPLY_DEMAND_CONFIG.buildingWoodCost;
      const expectedOreConsumption = mockVillage.economy.buildings.constructionQueue * DEFAULT_SUPPLY_DEMAND_CONFIG.buildingOreCost;

      expect(mockVillage.economy.consumption.wood).toBe(expectedWoodConsumption);
      expect(mockVillage.economy.consumption.ore).toBe(expectedOreConsumption);
    });

    it('建物完成後にストック容量が増加する', () => {
      const initialCapacity = mockVillage.economy.stock.capacity;

      // 建設キューに建物を追加
      mockVillage.economy.buildings.constructionQueue = 2;

      // 時間を大幅に進めて建設完了
      const longGameTime = createGameTime(200, 15.0);
      buildingManager.updateBuildings(mockVillage, longGameTime);

      // ストック容量が増加していることを確認
      const expectedCapacity = DEFAULT_SUPPLY_DEMAND_CONFIG.baseStorageCapacity +
        (mockVillage.economy.buildings.count * DEFAULT_SUPPLY_DEMAND_CONFIG.storageCapacityPerBuilding);

      expect(mockVillage.economy.stock.capacity).toBe(expectedCapacity);
      expect(mockVillage.economy.stock.capacity).toBeGreaterThan(initialCapacity);
    });
  });

  describe('人口システムとの統合', () => {
    it('人口増加に伴って建物需要が増加する', () => {
      const initialTargetCount = mockVillage.economy.buildings.targetCount;

      // 人口を大幅に増加
      mockVillage.population = 50;

      buildingManager.updateBuildings(mockVillage, gameTime);

      // 目標建物数が増加していることを確認
      expect(mockVillage.economy.buildings.targetCount).toBeGreaterThan(initialTargetCount);
      expect(mockVillage.economy.buildings.targetCount).toBe(5); // 50 * 0.1 = 5
    });

    it('人口減少時は既存建物を維持する', () => {
      // 建物を3つに増加
      mockVillage.economy.buildings.count = 3;
      mockVillage.economy.buildings.targetCount = 3;

      // 人口を減少
      mockVillage.population = 10; // 目標建物数は1になる

      buildingManager.updateBuildings(mockVillage, gameTime);

      // 目標は減少するが既存建物は維持される
      expect(mockVillage.economy.buildings.targetCount).toBe(1);
      expect(mockVillage.economy.buildings.count).toBe(3); // 既存建物は維持
      expect(mockVillage.economy.buildings.constructionQueue).toBe(0); // 新規建設はしない
    });
  });

  describe('資源制約との統合', () => {
    it('資源不足時は需給バランスが建設を制限する', () => {
      // 資源を不足状態に設定
      mockVillage.storage.wood = 15;
      mockVillage.storage.ore = 8;
      mockVillage.economy.supplyDemandStatus.wood = 'shortage';
      mockVillage.economy.supplyDemandStatus.ore = 'critical';

      // 人口を増加して建物需要を作る
      mockVillage.population = 30;

      const initialWood = mockVillage.storage.wood;
      const initialOre = mockVillage.storage.ore;

      buildingManager.updateBuildings(mockVillage, gameTime);

      // 需給状況が悪いため建設されない
      expect(mockVillage.economy.buildings.constructionQueue).toBe(0);
      expect(mockVillage.storage.wood).toBe(initialWood);
      expect(mockVillage.storage.ore).toBe(initialOre);
    });

    it('資源状況改善後は建設が再開される', () => {
      // 最初は資源不足
      mockVillage.storage.wood = 15;
      mockVillage.storage.ore = 8;
      mockVillage.economy.supplyDemandStatus.wood = 'shortage';
      mockVillage.population = 30;

      buildingManager.updateBuildings(mockVillage, gameTime);
      expect(mockVillage.economy.buildings.constructionQueue).toBe(0);

      // 資源状況を改善
      mockVillage.storage.wood = 100;
      mockVillage.storage.ore = 50;
      mockVillage.economy.supplyDemandStatus.wood = 'balanced';
      mockVillage.economy.supplyDemandStatus.ore = 'balanced';

      buildingManager.updateBuildings(mockVillage, gameTime);

      // 建設が再開される
      expect(mockVillage.economy.buildings.constructionQueue).toBeGreaterThan(0);
    });
  });

  describe('完全な村シミュレーション', () => {
    it('時間経過による村の発展シミュレーション', () => {
      // 初期状態の記録
      const initialPopulation = mockVillage.population;
      const initialBuildings = mockVillage.economy.buildings.count;

      // 発展しやすい条件を設定
      mockVillage.storage.food = 200;
      mockVillage.storage.wood = 150;
      mockVillage.storage.ore = 100;
      mockVillage.population = 25; // 建物需要を作る

      let buildingsBuilt = 0;

      // 複数回の時間経過をシミュレート
      for (let i = 0; i < 10; i++) {
        const currentTime = createGameTime(100 + i * 5, 5.0);

        // 各システムを順次更新
        economyManager.updateVillageEconomy(mockVillage, currentTime, mockMap);
        populationManager.updatePopulation(mockVillage, currentTime);
        buildingManager.updateBuildings(mockVillage, currentTime);

        // 建設が発生したかチェック
        if (mockVillage.economy.buildings.count > initialBuildings + buildingsBuilt) {
          buildingsBuilt = mockVillage.economy.buildings.count - initialBuildings;
        }

        // 村の状態が健全であることを確認
        expect(mockVillage.population).toBeGreaterThanOrEqual(1);
        expect(mockVillage.economy.buildings.count).toBeGreaterThanOrEqual(initialBuildings);
        expect(mockVillage.storage.food).toBeGreaterThanOrEqual(0);
        expect(mockVillage.storage.wood).toBeGreaterThanOrEqual(0);
        expect(mockVillage.storage.ore).toBeGreaterThanOrEqual(0);
      }

      // 建物が建設されたことを確認（人口25なら目標建物数は2-3になるはず）
      expect(mockVillage.economy.buildings.targetCount).toBeGreaterThan(initialBuildings);

      // 建設活動があったことを確認（建設キューまたは完成建物の増加）
      const totalBuildingActivity = mockVillage.economy.buildings.count +
        mockVillage.economy.buildings.constructionQueue;
      expect(totalBuildingActivity).toBeGreaterThan(initialBuildings);
    });

    it('資源枯渇シナリオでの建設停止', () => {
      // 資源を極端に少なくする
      mockVillage.storage.wood = 5;
      mockVillage.storage.ore = 2;
      mockVillage.economy.production.wood = 0;
      mockVillage.economy.production.ore = 0;

      // 人口は多いが建設できない状況
      mockVillage.population = 50;

      const initialBuildings = mockVillage.economy.buildings.count;

      // 複数回更新しても建設されない
      for (let i = 0; i < 5; i++) {
        const currentTime = createGameTime(100 + i * 2, 2.0);
        economyManager.updateVillageEconomy(mockVillage, currentTime, mockMap);
        buildingManager.updateBuildings(mockVillage, currentTime);
      }

      // 建物数は増加しない
      expect(mockVillage.economy.buildings.count).toBe(initialBuildings);
      expect(mockVillage.economy.buildings.constructionQueue).toBe(0);
    });
  });
});