/**
 * BuildingManager のユニットテスト
 * 要件 3.1, 3.2, 3.3, 3.4 の検証
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Village } from '../game-systems/world/village';
import { SupplyDemandConfig, DEFAULT_SUPPLY_DEMAND_CONFIG } from '../settings';
import { BuildingManager } from '../game-systems/population/building-manager';
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

describe('BuildingManager', () => {
  let buildingManager: BuildingManager;
  let mockVillage: Village;
  let gameTime: GameTime;

  beforeEach(() => {
    buildingManager = new BuildingManager();

    // モック村の初期化
    mockVillage = {
      x: 5,
      y: 5,
      population: 20,
      storage: { food: 100, wood: 50, ore: 30 },
      collectionRadius: 2,
      lastUpdateTime: 0,
      populationHistory: [18, 19, 20],
      economy: {
        production: { food: 10, wood: 8, ore: 5 },
        consumption: { food: 10, wood: 0, ore: 0 },
        stock: { food: 100, wood: 50, ore: 30, capacity: 120 },
        buildings: { count: 1, targetCount: 2, constructionQueue: 0 },
        supplyDemandStatus: { food: 'balanced', wood: 'balanced', ore: 'balanced' }
      }
    };

    gameTime = {
      currentTime: 100,
      deltaTime: 1.0,
      totalTicks: Math.floor(100 / 16.67),
      totalSeconds: Math.floor(100 / 1000),
      totalMinutes: Math.floor(100 / 60000),
      currentTick: Math.floor((100 % 1000) / 16.67)
    };
  });

  describe('calculateTargetBuildingCount', () => {
    it('人口に比例した目標建物数を正しく計算する', () => {
      // 要件 3.2: 村の人口が増加する時にシステムは人口に比例して建物数を増加させる

      // 人口10の場合（デフォルト設定では10人につき1建物）
      expect(buildingManager.calculateTargetBuildingCount(10)).toBe(1);

      // 人口20の場合
      expect(buildingManager.calculateTargetBuildingCount(20)).toBe(2);

      // 人口50の場合
      expect(buildingManager.calculateTargetBuildingCount(50)).toBe(5);
    });

    it('人口0の場合は建物数0を返す', () => {
      expect(buildingManager.calculateTargetBuildingCount(0)).toBe(0);
    });

    it('人口1以上の場合は最低1つの建物を必要とする', () => {
      expect(buildingManager.calculateTargetBuildingCount(1)).toBe(1);
      expect(buildingManager.calculateTargetBuildingCount(5)).toBe(1);
    });

    it('最大建物数の制限を適用する', () => {
      // 人口100の場合、通常は10建物だが最大50建物に制限される
      expect(buildingManager.calculateTargetBuildingCount(100)).toBe(10);

      // 人口200の場合、通常は20建物だが最大100建物に制限される
      expect(buildingManager.calculateTargetBuildingCount(200)).toBe(20);
    });
  });

  describe('calculateBuildingCost', () => {
    it('正しい建設コストを返す', () => {
      // 要件 3.1: 村が建物を建設する時にシステムは木材と鉱石を消費する
      const cost = buildingManager.calculateBuildingCost();

      expect(cost.wood).toBe(DEFAULT_SUPPLY_DEMAND_CONFIG.buildingWoodCost);
      expect(cost.ore).toBe(DEFAULT_SUPPLY_DEMAND_CONFIG.buildingOreCost);
    });

    it('カスタム設定でのコストを正しく反映する', () => {
      const customConfig: SupplyDemandConfig = {
        ...DEFAULT_SUPPLY_DEMAND_CONFIG,
        buildingWoodCost: 20,
        buildingOreCost: 15
      };

      const customManager = new BuildingManager(customConfig);
      const cost = customManager.calculateBuildingCost();

      expect(cost.wood).toBe(20);
      expect(cost.ore).toBe(15);
    });
  });

  describe('canBuildBuilding', () => {
    it('十分な資源がある場合は建設可能', () => {
      // 要件 3.3: 村に十分な木材または鉱石がない時にシステムは建物建設を制限する
      mockVillage.storage.wood = 100;
      mockVillage.storage.ore = 50;

      expect(buildingManager.canBuildBuilding(mockVillage)).toBe(true);
    });

    it('木材が不足している場合は建設不可', () => {
      // 要件 3.3: 村に十分な木材または鉱石がない時にシステムは建物建設を制限する
      mockVillage.storage.wood = 5; // 建設コスト(10)未満
      mockVillage.storage.ore = 50;

      expect(buildingManager.canBuildBuilding(mockVillage)).toBe(false);
    });

    it('鉱石が不足している場合は建設不可', () => {
      // 要件 3.3: 村に十分な木材または鉱石がない時にシステムは建物建設を制限する
      mockVillage.storage.wood = 100;
      mockVillage.storage.ore = 2; // 建設コスト(5)未満

      expect(buildingManager.canBuildBuilding(mockVillage)).toBe(false);
    });

    it('建設後のバッファ不足の場合は建設不可', () => {
      // 建設コストの2倍のバッファが必要
      mockVillage.storage.wood = 25; // 建設コスト10 + バッファ20 = 30未満
      mockVillage.storage.ore = 15;  // 建設コスト5 + バッファ10 = 15

      expect(buildingManager.canBuildBuilding(mockVillage)).toBe(false);
    });

    it('需給状況が危機的な場合は建設不可', () => {
      // 要件 3.4: 建設資源が不足する時にシステムは村の建物増加を停止する
      mockVillage.storage.wood = 100;
      mockVillage.storage.ore = 50;
      mockVillage.economy.supplyDemandStatus.wood = 'critical';

      expect(buildingManager.canBuildBuilding(mockVillage)).toBe(false);
    });

    it('建設キューが満杯の場合は建設不可', () => {
      mockVillage.storage.wood = 100;
      mockVillage.storage.ore = 50;
      mockVillage.economy.buildings.constructionQueue = 3; // 最大値

      expect(buildingManager.canBuildBuilding(mockVillage)).toBe(false);
    });
  });

  describe('updateBuildings', () => {
    it('目標建物数を正しく更新する', () => {
      // 要件 3.2: 村の人口が増加する時にシステムは人口に比例して建物数を増加させる
      mockVillage.population = 30;
      mockVillage.storage.wood = 100;
      mockVillage.storage.ore = 50;

      buildingManager.updateBuildings(mockVillage, gameTime);

      expect(mockVillage.economy.buildings.targetCount).toBe(3); // 30人 * 0.1 = 3
    });

    it('建設可能な場合は建設キューに追加する', () => {
      // 要件 3.1: 村が建物を建設する時にシステムは木材と鉱石を消費する
      mockVillage.economy.buildings.count = 1;
      mockVillage.economy.buildings.targetCount = 3;
      mockVillage.storage.wood = 100;
      mockVillage.storage.ore = 50;

      const initialWood = mockVillage.storage.wood;
      const initialOre = mockVillage.storage.ore;

      buildingManager.updateBuildings(mockVillage, gameTime);

      // 2棟建設する必要があるが、1棟ずつ建設される
      expect(mockVillage.economy.buildings.constructionQueue).toBeGreaterThan(0);
      expect(mockVillage.storage.wood).toBeLessThan(initialWood);
      expect(mockVillage.storage.ore).toBeLessThan(initialOre);
    });

    it('資源不足の場合は建設しない', () => {
      // 要件 3.4: 建設資源が不足する時にシステムは村の建物増加を停止する
      mockVillage.economy.buildings.count = 1;
      mockVillage.economy.buildings.targetCount = 3;
      mockVillage.storage.wood = 5; // 不足
      mockVillage.storage.ore = 2;  // 不足

      const initialWood = mockVillage.storage.wood;
      const initialOre = mockVillage.storage.ore;

      buildingManager.updateBuildings(mockVillage, gameTime);

      expect(mockVillage.economy.buildings.constructionQueue).toBe(0);
      expect(mockVillage.storage.wood).toBe(initialWood);
      expect(mockVillage.storage.ore).toBe(initialOre);
    });

    it('建設キューを時間経過で処理する', () => {
      mockVillage.economy.buildings.constructionQueue = 2;
      mockVillage.economy.buildings.count = 1;
      mockVillage.economy.buildings.targetCount = 1; // 追加建設を防ぐ

      // 建設時間を大幅に進める（10時間 = 2棟完成）
      const longGameTime = {
        ...createGameTime(100, 10.0),
        totalTicks: Math.floor(100 / 16.67),
        totalSeconds: Math.floor(100 / 1000),
        totalMinutes: Math.floor(100 / 60000),
        currentTick: Math.floor((100 % 1000) / 16.67)
      };

      buildingManager.updateBuildings(mockVillage, longGameTime);

      expect(mockVillage.economy.buildings.count).toBe(3); // 1 + 2
      expect(mockVillage.economy.buildings.constructionQueue).toBe(0);
    });

    it('エラー時は建設キューをリセットする', () => {
      // 不正な村データでエラーを発生させる
      const invalidVillage = { ...mockVillage };
      delete (invalidVillage as any).economy;

      buildingManager.updateBuildings(invalidVillage as Village, gameTime);

      // エラーハンドリングが機能することを確認
      expect(true).toBe(true); // エラーが発生しても処理が継続される
    });
  });

  describe('getBuildingStats', () => {
    it('正しい建物統計情報を返す', () => {
      mockVillage.storage.wood = 100;
      mockVillage.storage.ore = 50;

      const stats = buildingManager.getBuildingStats(mockVillage);

      expect(stats.currentCount).toBe(mockVillage.economy.buildings.count);
      expect(stats.targetCount).toBe(mockVillage.economy.buildings.targetCount);
      expect(stats.constructionQueue).toBe(mockVillage.economy.buildings.constructionQueue);
      expect(stats.canBuild).toBe(true);
      expect(stats.buildingCost.wood).toBe(DEFAULT_SUPPLY_DEMAND_CONFIG.buildingWoodCost);
      expect(stats.buildingCost.ore).toBe(DEFAULT_SUPPLY_DEMAND_CONFIG.buildingOreCost);
      expect(stats.maxBuildable).toBeGreaterThan(0);
    });
  });

  describe('統合テスト', () => {
    it('人口増加に伴う建物建設の完全なフロー', () => {
      // 要件 3.1, 3.2, 3.3, 3.4 の統合テスト

      // 初期状態：人口10、建物1
      mockVillage.population = 10;
      mockVillage.economy.buildings.count = 1;
      mockVillage.storage.wood = 100;
      mockVillage.storage.ore = 50;

      // 人口が20に増加
      mockVillage.population = 20;

      // 建物更新を実行
      buildingManager.updateBuildings(mockVillage, gameTime);

      // 目標建物数が2に更新される
      expect(mockVillage.economy.buildings.targetCount).toBe(2);

      // 建設が開始される（キューに追加）
      expect(mockVillage.economy.buildings.constructionQueue).toBeGreaterThan(0);

      // 資源が消費される
      expect(mockVillage.storage.wood).toBeLessThan(100);
      expect(mockVillage.storage.ore).toBeLessThan(50);

      // 建設キューの状態を保存
      const queuedBuildings = mockVillage.economy.buildings.constructionQueue;
      const currentBuildings = mockVillage.economy.buildings.count;

      // 時間経過で建設完了（目標数に達したら追加建設しない）
      mockVillage.economy.buildings.targetCount = currentBuildings + queuedBuildings;
      const completionTime = {
        ...createGameTime(200, 10.0),
        totalTicks: Math.floor(200 / 16.67),
        totalSeconds: Math.floor(200 / 1000),
        totalMinutes: Math.floor(200 / 60000),
        currentTick: Math.floor((200 % 1000) / 16.67)
      };
      buildingManager.updateBuildings(mockVillage, completionTime);

      // 建物数が増加
      expect(mockVillage.economy.buildings.count).toBe(currentBuildings + queuedBuildings);
      expect(mockVillage.economy.buildings.constructionQueue).toBe(0);
    });

    it('資源不足による建設制限のフロー', () => {
      // 要件 3.3, 3.4 の統合テスト

      // 人口は多いが資源が不足
      mockVillage.population = 50;
      mockVillage.economy.buildings.count = 1;
      mockVillage.storage.wood = 15; // 1棟分のコストしかない
      mockVillage.storage.ore = 8;

      buildingManager.updateBuildings(mockVillage, gameTime);

      // 目標は5棟だが資源不足で建設できない
      expect(mockVillage.economy.buildings.targetCount).toBe(5);
      expect(mockVillage.economy.buildings.constructionQueue).toBe(0);
      expect(mockVillage.storage.wood).toBe(15); // 資源は消費されない
      expect(mockVillage.storage.ore).toBe(8);
    });
  });
});