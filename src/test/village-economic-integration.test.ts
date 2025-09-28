/**
 * 村の経済システム統合テスト
 * タスク6の実装を検証
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createVillages, updateVillages, getEconomyStats, getEconomyManagers } from '../village';
import { generateMap } from '../map';
import { ResourceManager } from '../resource-manager';
import { TimeManager } from '../time-manager';

describe('Village Economic System Integration', () => {
  let map: any;
  let villages: any[];
  let roads: any[];
  let resourceManager: ResourceManager;
  let timeManager: TimeManager;

  beforeEach(() => {
    // マップとシステムを初期化
    map = generateMap(20);
    villages = createVillages(map, 3);
    roads = [];
    resourceManager = new ResourceManager();
    timeManager = new TimeManager();
    
    // 村に十分な資源を設定
    villages.forEach(village => {
      village.storage = { food: 50, wood: 30, ore: 20 };
    });
  });

  describe('Economic System Integration', () => {
    it('should initialize economic system for all villages', () => {
      // 村の更新を実行
      updateVillages(map, villages, roads, resourceManager, timeManager);
      
      // 全ての村に経済システムが初期化されていることを確認
      villages.forEach(village => {
        expect(village.economy).toBeDefined();
        expect(village.economy.production).toBeDefined();
        expect(village.economy.consumption).toBeDefined();
        expect(village.economy.stock).toBeDefined();
        expect(village.economy.buildings).toBeDefined();
        expect(village.economy.supplyDemandStatus).toBeDefined();
        expect(village.populationHistory).toBeDefined();
        expect(village.lastUpdateTime).toBeDefined();
      });
    });

    it('should update economic data during village updates', () => {
      // 初期状態を記録
      const initialProduction = villages[0].economy?.production || { food: 0, wood: 0, ore: 0 };
      
      // 村の更新を実行
      updateVillages(map, villages, roads, resourceManager, timeManager);
      
      // 経済データが更新されていることを確認
      expect(villages[0].economy.production).toBeDefined();
      expect(villages[0].economy.consumption).toBeDefined();
      
      // ストック情報が既存のstorageと同期されていることを確認
      expect(villages[0].economy.stock.food).toBe(villages[0].storage.food);
      expect(villages[0].economy.stock.wood).toBe(villages[0].storage.wood);
      expect(villages[0].economy.stock.ore).toBe(villages[0].storage.ore);
    });

    it('should handle time-based population changes', () => {
      const initialPopulation = villages[0].population;
      
      // 複数回更新を実行（時間経過をシミュレート）
      for (let i = 0; i < 10; i++) {
        updateVillages(map, villages, roads, resourceManager, timeManager);
      }
      
      // 人口履歴が記録されていることを確認
      expect(villages[0].populationHistory.length).toBeGreaterThan(1);
      
      // 人口が変化している可能性があることを確認（増加または減少）
      const finalPopulation = villages[0].population;
      expect(typeof finalPopulation).toBe('number');
      expect(finalPopulation).toBeGreaterThan(0);
    });

    it('should handle time-based building construction', () => {
      const initialBuildingCount = villages[0].economy.buildings.count;
      
      // 建設に必要な資源を十分に設定
      villages[0].storage = { food: 100, wood: 100, ore: 100 };
      villages[0].population = 20; // 建物需要を増やす
      
      // 複数回更新を実行
      for (let i = 0; i < 5; i++) {
        updateVillages(map, villages, roads, resourceManager, timeManager);
      }
      
      // 建物関連のデータが更新されていることを確認
      expect(villages[0].economy.buildings.targetCount).toBeGreaterThan(0);
      expect(villages[0].economy.buildings.count).toBeGreaterThanOrEqual(initialBuildingCount);
    });

    it('should maintain compatibility with existing resource collection', () => {
      const initialFood = villages[0].storage.food;
      
      // 村の更新を実行
      updateVillages(map, villages, roads, resourceManager, timeManager);
      
      // 資源収集が継続して動作していることを確認
      // （経済システム統合後も既存の資源収集が機能する）
      expect(villages[0].storage.food).toBeGreaterThanOrEqual(0);
      expect(villages[0].storage.wood).toBeGreaterThanOrEqual(0);
      expect(villages[0].storage.ore).toBeGreaterThanOrEqual(0);
    });

    it('should sync storage with economic stock after trading', () => {
      // 2つの村を設定
      villages[0].storage = { food: 100, wood: 10, ore: 10 };
      villages[1].storage = { food: 10, wood: 100, ore: 10 };
      
      // 道路を作成して交易を可能にする
      roads.push({
        a: villages[0],
        b: villages[1],
        usage: 0
      });
      
      // 村の更新を実行（交易が発生する可能性がある）
      updateVillages(map, villages, roads, resourceManager, timeManager);
      
      // 交易後もストック情報が同期されていることを確認
      expect(villages[0].economy.stock.food).toBe(villages[0].storage.food);
      expect(villages[0].economy.stock.wood).toBe(villages[0].storage.wood);
      expect(villages[1].economy.stock.food).toBe(villages[1].storage.food);
      expect(villages[1].economy.stock.wood).toBe(villages[1].storage.wood);
    });

    it('should provide economic statistics', () => {
      // 村の更新を実行
      updateVillages(map, villages, roads, resourceManager, timeManager);
      
      // 経済統計を取得
      const stats = getEconomyStats(villages);
      
      // 統計データが正しく計算されていることを確認
      expect(stats.totalVillages).toBe(villages.length);
      expect(stats.averagePopulation).toBeGreaterThan(0);
      expect(stats.totalProduction).toBeDefined();
      expect(stats.totalConsumption).toBeDefined();
      expect(typeof stats.criticalVillages).toBe('number');
      expect(typeof stats.shortageVillages).toBe('number');
      expect(typeof stats.surplusVillages).toBe('number');
    });

    it('should provide access to economic managers', () => {
      // 村の更新を実行（マネージャーを初期化）
      updateVillages(map, villages, roads, resourceManager, timeManager);
      
      // 経済マネージャーへのアクセスを確認
      const managers = getEconomyManagers();
      
      expect(managers.economyManager).toBeDefined();
      expect(managers.populationManager).toBeDefined();
      expect(managers.buildingManager).toBeDefined();
      expect(managers.supplyDemandBalancer).toBeDefined();
    });

    it('should handle village state integrity checks', () => {
      // 村の状態を意図的に破損させる
      villages[0].population = -5;
      villages[0].storage = { food: -10, wood: -5, ore: -3 };
      villages[0].collectionRadius = 0;
      villages[0].economy = null;
      
      // 村の更新を実行（整合性チェックが動作するはず）
      expect(() => {
        updateVillages(map, villages, roads, resourceManager, timeManager);
      }).not.toThrow();
      
      // 状態が修正されていることを確認
      expect(villages[0].population).toBeGreaterThan(0);
      expect(villages[0].storage.food).toBeGreaterThanOrEqual(0);
      expect(villages[0].storage.wood).toBeGreaterThanOrEqual(0);
      expect(villages[0].storage.ore).toBeGreaterThanOrEqual(0);
      expect(villages[0].collectionRadius).toBeGreaterThan(0);
      expect(villages[0].economy).toBeDefined();
    });
  });

  describe('Supply Demand Balance Integration', () => {
    it('should evaluate supply demand status for all villages', () => {
      // 村の更新を実行
      updateVillages(map, villages, roads, resourceManager, timeManager);
      
      // 全ての村の需給状況が評価されていることを確認
      villages.forEach(village => {
        expect(village.economy.supplyDemandStatus.food).toMatch(/surplus|balanced|shortage|critical/);
        expect(village.economy.supplyDemandStatus.wood).toMatch(/surplus|balanced|shortage|critical/);
        expect(village.economy.supplyDemandStatus.ore).toMatch(/surplus|balanced|shortage|critical/);
      });
    });

    it('should identify critical villages', () => {
      // 1つの村を危機的状況に設定
      villages[0].storage = { food: 0, wood: 0, ore: 0 };
      villages[0].population = 20; // 高い消費需要
      
      // 村の更新を実行
      updateVillages(map, villages, roads, resourceManager, timeManager);
      
      // 統計で危機的村が検出されることを確認
      const stats = getEconomyStats(villages);
      expect(stats.criticalVillages).toBeGreaterThan(0);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle errors gracefully during economic updates', () => {
      // 不正なマップデータを設定
      const corruptedMap = null;
      
      // エラーが発生しても処理が継続することを確認
      expect(() => {
        updateVillages(corruptedMap as any, villages, roads, resourceManager, timeManager);
      }).not.toThrow();
      
      // 村の基本状態が維持されていることを確認
      villages.forEach(village => {
        expect(village.population).toBeGreaterThan(0);
        expect(village.storage).toBeDefined();
      });
    });
  });
});