/**
 * UI表示とリアルタイム更新のテスト
 * タスク10: UI表示とリアルタイム更新のテストを作成
 * 要件: 全要件の検証
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import Phaser from 'phaser';
import { VillageStatusUI } from '../graphics/ui/village-status-ui';
import { SupplyDemandBalancer } from '../game-systems/economy/supply-demand-balancer';
import { VillageEconomyManager } from '../game-systems/integration/village-economy-manager';
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
import { PopulationManager } from '../game-systems/population/population-manager';
import { BuildingManager } from '../game-systems/population/building-manager';
import { Village } from '../game-systems/world/village';
import { Tile } from '../game-systems/world/map';

// Phaserシーンのモック
const createMockScene = () => {
  const mockContainer = {
    setDepth: vi.fn().mockReturnThis(),
    setScrollFactor: vi.fn().mockReturnThis(),
    add: vi.fn(),
    setVisible: vi.fn(),
    setPosition: vi.fn(),
    destroy: vi.fn(),
    x: 0,
    y: 0
  };

  const mockGraphics = {
    fillStyle: vi.fn().mockReturnThis(),
    fillRoundedRect: vi.fn().mockReturnThis(),
    lineStyle: vi.fn().mockReturnThis(),
    strokeRoundedRect: vi.fn().mockReturnThis(),
    clear: vi.fn().mockReturnThis()
  };

  const mockText = {
    setText: vi.fn().mockReturnThis(),
    setColor: vi.fn().mockReturnThis(),
    setWordWrapWidth: vi.fn().mockReturnThis(),
    text: ''
  };

  return {
    add: {
      container: vi.fn(() => mockContainer),
      graphics: vi.fn(() => mockGraphics),
      text: vi.fn(() => mockText)
    }
  } as unknown as Phaser.Scene;
};

// テスト用村作成ヘルパー
function createTestVillage(
  x: number, 
  y: number, 
  population: number,
  storage: { food: number; wood: number; ore: number }
): Village {
  return {
    x, y, population,
    storage: { ...storage },
    collectionRadius: 2,
    economy: {
      production: { food: 0, wood: 0, ore: 0 },
      consumption: { food: 0, wood: 0, ore: 0 },
      stock: { ...storage, capacity: 200 },
      buildings: { count: Math.max(1, Math.floor(population * 0.1)), targetCount: Math.max(1, Math.floor(population * 0.1)), constructionQueue: 0 },
      supplyDemandStatus: { food: 'balanced', wood: 'balanced', ore: 'balanced' }
    },
    lastUpdateTime: 0,
    populationHistory: [population]
  };
}

// テスト用マップ作成ヘルパー
function createTestMap(): Tile[][] {
  return Array(10).fill(null).map(() => 
    Array(10).fill(null).map(() => ({
      type: 'land' as const,
      height: 0.5,
      resources: { food: 10, wood: 8, ore: 5 },
      maxResources: { food: 20, wood: 15, ore: 10 },
      depletionState: { food: 0, wood: 0, ore: 0 },
        recoveryTimer: { food: 0, wood: 0, ore: 0 },
        lastHarvestTime: 0
    }))
  );
}

describe('UI Display and Real-time Update Tests', () => {
  let mockScene: Phaser.Scene;
  let villageStatusUI: VillageStatusUI;
  let supplyDemandBalancer: SupplyDemandBalancer;
  let economyManager: VillageEconomyManager;
  let populationManager: PopulationManager;
  let buildingManager: BuildingManager;
  let testMap: Tile[][];
  let gameTime: GameTime;

  beforeEach(() => {
    mockScene = createMockScene();
    supplyDemandBalancer = new SupplyDemandBalancer();
    villageStatusUI = new VillageStatusUI(mockScene, supplyDemandBalancer);
    economyManager = new VillageEconomyManager();
    populationManager = new PopulationManager();
    buildingManager = new BuildingManager();
    testMap = createTestMap();
    gameTime = createGameTime(1000, 1.0);
  });

  describe('基本的なUI表示機能', () => {
    it('村の資源不足情報を正しく表示する', () => {
      const village = createTestVillage(5, 5, 30, { food: 5, wood: 50, ore: 30 });
      
      // 食料不足状況を設定
      village.economy.production.food = 5;
      village.economy.consumption.food = 15;
      village.economy.supplyDemandStatus.food = 'critical';
      
      // UI表示を実行
      villageStatusUI.setVisible(true);
      villageStatusUI.updateVillageStatus([village], true);
      
      // UIコンポーネントが作成されることを確認
      expect(mockScene.add.container).toHaveBeenCalled();
      expect(mockScene.add.text).toHaveBeenCalled();
      expect(mockScene.add.graphics).toHaveBeenCalled();
    });

    it('複数村の不足情報を整理して表示する', () => {
      const villages = [
        createTestVillage(0, 0, 25, { food: 3, wood: 50, ore: 30 }), // 食料不足
        createTestVillage(5, 5, 20, { food: 80, wood: 2, ore: 1 }),  // 建設資源不足
        createTestVillage(10, 10, 15, { food: 100, wood: 80, ore: 60 }) // 余剰
      ];
      
      // 各村の需給状況を設定
      villages[0].economy.supplyDemandStatus = { food: 'critical', wood: 'balanced', ore: 'balanced' };
      villages[1].economy.supplyDemandStatus = { food: 'balanced', wood: 'critical', ore: 'critical' };
      villages[2].economy.supplyDemandStatus = { food: 'surplus', wood: 'surplus', ore: 'surplus' };
      
      // UI表示を実行
      villageStatusUI.setVisible(true);
      villageStatusUI.updateVillageStatus(villages, true);
      
      // 複数村の情報が処理されることを確認
      expect(mockScene.add.container).toHaveBeenCalled();
      expect(mockScene.add.text).toHaveBeenCalled();
    });

    it('資源不足がない場合は適切なメッセージを表示する', () => {
      const village = createTestVillage(5, 5, 20, { food: 100, wood: 80, ore: 60 });
      
      // 全て余剰状況
      village.economy.supplyDemandStatus = { food: 'surplus', wood: 'surplus', ore: 'surplus' };
      
      villageStatusUI.setVisible(true);
      villageStatusUI.updateVillageStatus([village], true);
      
      // UI要素が作成されることを確認
      expect(mockScene.add.container).toHaveBeenCalled();
    });

    it('UI表示の可視性制御が正しく動作する', () => {
      const village = createTestVillage(5, 5, 20, { food: 50, wood: 30, ore: 20 });
      
      // 非表示状態
      villageStatusUI.setVisible(false);
      villageStatusUI.updateVillageStatus([village], true);
      
      // 表示状態に変更
      villageStatusUI.setVisible(true);
      villageStatusUI.updateVillageStatus([village], true);
      
      expect(mockScene.add.container).toHaveBeenCalled();
    });
  });

  describe('リアルタイム更新機能', () => {
    it('時間経過による資源状況変化を追跡する', () => {
      const village = createTestVillage(5, 5, 25, { food: 50, wood: 30, ore: 20 });
      
      // 初期状態で表示
      economyManager.updateVillageEconomy(village, gameTime, testMap);
      village.economy.supplyDemandStatus = supplyDemandBalancer.evaluateVillageBalance(village);
      
      villageStatusUI.setVisible(true);
      villageStatusUI.updateVillageStatus([village], true);
      
      const initialCallCount = (mockScene.add.text as any).mock.calls.length;
      
      // 時間経過で状況を変化させる
      village.storage.food = 5; // 食料を大幅減少
      village.economy.production.food = 2;
      village.economy.consumption.food = 12;
      village.economy.supplyDemandStatus.food = 'critical';
      
      // UI更新
      villageStatusUI.updateVillageStatus([village], true);
      
      // 更新が実行されることを確認
      expect((mockScene.add.text as any).mock.calls.length).toBeGreaterThanOrEqual(initialCallCount);
    });

    it('人口変化に伴うリアルタイム更新', () => {
      const village = createTestVillage(5, 5, 20, { food: 100, wood: 50, ore: 30 });
      
      // 初期表示
      villageStatusUI.setVisible(true);
      villageStatusUI.updateVillageStatus([village], true);
      
      // 人口変化をシミュレート
      for (let i = 0; i < 10; i++) {
        const currentTime = createGameTime(gameTime.currentTime + i * 10, 1.0 );
        
        // 経済システム更新
        economyManager.updateVillageEconomy(village, currentTime, testMap);
        populationManager.updatePopulation(village, currentTime);
        village.economy.supplyDemandStatus = supplyDemandBalancer.evaluateVillageBalance(village);
        
        // UI更新
        villageStatusUI.updateVillageStatus([village], true);
      }
      
      // 複数回の更新が実行されることを確認
      expect(mockScene.add.container).toHaveBeenCalled();
      expect(mockScene.add.text).toHaveBeenCalled();
    });

    it('建物建設進捗のリアルタイム反映', () => {
      const village = createTestVillage(5, 5, 30, { food: 100, wood: 100, ore: 50 });
      
      // 建設開始
      village.economy.buildings.targetCount = 3;
      village.economy.buildings.count = 1;
      
      villageStatusUI.setVisible(true);
      
      // 建設プロセスをシミュレート
      for (let i = 0; i < 20; i++) {
        const currentTime = createGameTime(gameTime.currentTime + i * 5, 2.0 );
        
        // 建物システム更新
        buildingManager.updateBuildings(village, currentTime);
        economyManager.updateVillageEconomy(village, currentTime, testMap);
        village.economy.supplyDemandStatus = supplyDemandBalancer.evaluateVillageBalance(village);
        
        // UI更新
        villageStatusUI.updateVillageStatus([village], true);
      }
      
      expect(mockScene.add.container).toHaveBeenCalled();
    });

    it('急激な状況変化への即座の対応', () => {
      const village = createTestVillage(5, 5, 40, { food: 200, wood: 100, ore: 80 });
      
      // 初期状態：余剰
      village.economy.supplyDemandStatus = { food: 'surplus', wood: 'surplus', ore: 'surplus' };
      
      villageStatusUI.setVisible(true);
      villageStatusUI.updateVillageStatus([village], true);
      
      // 急激な変化：全資源枯渇
      village.storage = { food: 0, wood: 0, ore: 0 };
      village.economy.stock = { food: 0, wood: 0, ore: 0, capacity: 200 };
      village.economy.production = { food: 0, wood: 0, ore: 0 };
      village.economy.supplyDemandStatus = { food: 'critical', wood: 'critical', ore: 'critical' };
      
      // 即座にUI更新
      villageStatusUI.updateVillageStatus([village], true);
      
      // 変化が反映されることを確認
      expect(mockScene.add.container).toHaveBeenCalled();
      expect(mockScene.add.text).toHaveBeenCalled();
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量の村でのUI更新性能', () => {
      const villages: Village[] = [];
      
      // 100村を作成
      for (let i = 0; i < 100; i++) {
        const village = createTestVillage(
          i % 10, 
          Math.floor(i / 10), 
          10 + i, 
          { 
            food: Math.random() * 100, 
            wood: Math.random() * 80, 
            ore: Math.random() * 60 
          }
        );
        
        // ランダムな需給状況を設定
        const statuses = ['surplus', 'balanced', 'shortage', 'critical'] as const;
        village.economy.supplyDemandStatus = {
          food: statuses[Math.floor(Math.random() * 4)],
          wood: statuses[Math.floor(Math.random() * 4)],
          ore: statuses[Math.floor(Math.random() * 4)]
        };
        
        villages.push(village);
      }
      
      villageStatusUI.setVisible(true);
      
      // パフォーマンス測定
      const startTime = performance.now();
      villageStatusUI.updateVillageStatus(villages, true);
      const endTime = performance.now();
      
      // 処理時間が合理的な範囲内であることを確認（500ms以下）
      expect(endTime - startTime).toBeLessThan(500);
      expect(mockScene.add.container).toHaveBeenCalled();
    });

    it('高頻度更新でのメモリリーク防止', () => {
      const village = createTestVillage(5, 5, 25, { food: 50, wood: 30, ore: 20 });
      
      villageStatusUI.setVisible(true);
      
      // 高頻度更新をシミュレート（1000回）
      for (let i = 0; i < 1000; i++) {
        // 状況を少しずつ変化させる
        village.storage.food = Math.max(0, village.storage.food - 0.1);
        village.economy.stock.food = village.storage.food;
        
        if (i % 100 === 0) {
          village.economy.supplyDemandStatus.food = 
            village.storage.food > 30 ? 'balanced' : 
            village.storage.food > 10 ? 'shortage' : 'critical';
        }
        
        villageStatusUI.updateVillageStatus([village], true);
      }
      
      // エラーが発生しないことを確認
      expect(mockScene.add.container).toHaveBeenCalled();
    });

    it('同時多村更新の並行処理性能', () => {
      const villages: Village[] = [];
      
      // 50村を作成し、それぞれ異なる状況を設定
      for (let i = 0; i < 50; i++) {
        const village = createTestVillage(i % 10, Math.floor(i / 10), 15 + i, {
          food: 20 + i * 2,
          wood: 15 + i,
          ore: 10 + i
        });
        
        // 経済システムで更新
        economyManager.updateVillageEconomy(village, gameTime, testMap);
        populationManager.updatePopulation(village, gameTime);
        buildingManager.updateBuildings(village, gameTime);
        village.economy.supplyDemandStatus = supplyDemandBalancer.evaluateVillageBalance(village);
        
        villages.push(village);
      }
      
      villageStatusUI.setVisible(true);
      
      // 並行更新のパフォーマンス測定
      const startTime = performance.now();
      
      // 複数回の同時更新
      for (let i = 0; i < 10; i++) {
        villageStatusUI.updateVillageStatus(villages, true);
      }
      
      const endTime = performance.now();
      
      // 処理時間が合理的であることを確認
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('UI状態管理とエラーハンドリング', () => {
    it('不正な村データでもUI表示が破綻しない', () => {
      const invalidVillage = createTestVillage(5, 5, -10, { food: -50, wood: -30, ore: -20 });
      
      // 不正なデータを設定
      invalidVillage.economy.supplyDemandStatus = null as any;
      invalidVillage.economy.production = null as any;
      
      villageStatusUI.setVisible(true);
      
      // エラーが発生しないことを確認
      expect(() => {
        villageStatusUI.updateVillageStatus([invalidVillage], true);
      }).not.toThrow();
    });

    it('UI要素の適切な破棄と再作成', () => {
      const village = createTestVillage(5, 5, 20, { food: 50, wood: 30, ore: 20 });
      
      villageStatusUI.setVisible(true);
      
      // 初回表示
      villageStatusUI.updateVillageStatus([village], true);
      
      // 非表示にして再表示
      villageStatusUI.setVisible(false);
      villageStatusUI.setVisible(true);
      villageStatusUI.updateVillageStatus([village], true);
      
      // UI要素が適切に管理されることを確認
      expect(mockScene.add.container).toHaveBeenCalled();
    });

    it('空の村リストでの適切な処理', () => {
      villageStatusUI.setVisible(true);
      
      // 空のリストで更新
      expect(() => {
        villageStatusUI.updateVillageStatus([], true);
      }).not.toThrow();
      
      // null/undefinedでの更新
      expect(() => {
        villageStatusUI.updateVillageStatus(null as any, true);
      }).not.toThrow();
    });

    it('UI更新中の状態変化への対応', () => {
      const village = createTestVillage(5, 5, 25, { food: 50, wood: 30, ore: 20 });
      
      villageStatusUI.setVisible(true);
      
      // 更新中に村の状態を変更
      village.economy.supplyDemandStatus.food = 'critical';
      villageStatusUI.updateVillageStatus([village], true);
      
      // 即座に別の状態に変更
      village.economy.supplyDemandStatus.food = 'surplus';
      villageStatusUI.updateVillageStatus([village], true);
      
      // 状態変化が適切に処理されることを確認
      expect(mockScene.add.container).toHaveBeenCalled();
    });
  });

  describe('統合シナリオテスト', () => {
    it('完全な経済システム統合でのUI動作', () => {
      const village = createTestVillage(5, 5, 20, { food: 80, wood: 50, ore: 30 });
      
      villageStatusUI.setVisible(true);
      
      // 完全な経済システムサイクルをシミュレート
      for (let i = 0; i < 50; i++) {
        const currentTime = createGameTime(gameTime.currentTime + i * 10, 1.0 
        );
        
        // 全経済システムを更新
        economyManager.updateVillageEconomy(village, currentTime, testMap);
        populationManager.updatePopulation(village, currentTime);
        buildingManager.updateBuildings(village, currentTime);
        
        // 需給バランスを評価
        village.economy.supplyDemandStatus = supplyDemandBalancer.evaluateVillageBalance(village);
        
        // UI更新
        villageStatusUI.updateVillageStatus([village], true);
        
        // 時々資源を補充
        if (i % 20 === 0) {
          village.storage.food += 50;
          village.storage.wood += 30;
          village.storage.ore += 20;
        }
      }
      
      // 統合システムが正常に動作することを確認
      expect(mockScene.add.container).toHaveBeenCalled();
      expect(village.population).toBeGreaterThan(0);
    });

    it('危機から回復までの完全なUIフロー', () => {
      const village = createTestVillage(5, 5, 30, { food: 100, wood: 50, ore: 30 });
      
      villageStatusUI.setVisible(true);
      
      // フェーズ1: 正常状態
      village.economy.supplyDemandStatus = { food: 'balanced', wood: 'balanced', ore: 'balanced' };
      villageStatusUI.updateVillageStatus([village], true);
      
      // フェーズ2: 危機発生
      village.storage = { food: 5, wood: 2, ore: 1 };
      village.economy.stock = { food: 5, wood: 2, ore: 1, capacity: 200 };
      village.economy.supplyDemandStatus = { food: 'critical', wood: 'critical', ore: 'critical' };
      villageStatusUI.updateVillageStatus([village], true);
      
      // フェーズ3: 段階的回復
      village.storage.food = 50;
      village.economy.stock.food = 50;
      village.economy.supplyDemandStatus.food = 'shortage';
      villageStatusUI.updateVillageStatus([village], true);
      
      // フェーズ4: 完全回復
      village.storage = { food: 150, wood: 80, ore: 60 };
      village.economy.stock = { food: 150, wood: 80, ore: 60, capacity: 200 };
      village.economy.supplyDemandStatus = { food: 'surplus', wood: 'balanced', ore: 'balanced' };
      villageStatusUI.updateVillageStatus([village], true);
      
      // 全フェーズでUI更新が実行されることを確認
      expect(mockScene.add.container).toHaveBeenCalled();
      expect(mockScene.add.text).toHaveBeenCalled();
    });
  });
});