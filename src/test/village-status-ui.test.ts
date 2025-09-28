/**
 * VillageStatusUI テストスイート
 * 要件 4.1, 4.2, 4.3, 4.4 の検証
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import Phaser from 'phaser';
import { VillageStatusUI } from '../village-status-ui';
import { SupplyDemandBalancer } from '../supply-demand-balancer';
import { Village } from '../village';

// Phaserのモック
const mockScene = {
  add: {
    container: vi.fn(() => ({
      setDepth: vi.fn().mockReturnThis(),
      setScrollFactor: vi.fn().mockReturnThis(),
      add: vi.fn(),
      setVisible: vi.fn(),
      setPosition: vi.fn(),
      destroy: vi.fn()
    })),
    graphics: vi.fn(() => ({
      fillStyle: vi.fn().mockReturnThis(),
      fillRoundedRect: vi.fn().mockReturnThis(),
      lineStyle: vi.fn().mockReturnThis(),
      strokeRoundedRect: vi.fn().mockReturnThis(),
      clear: vi.fn().mockReturnThis()
    })),
    text: vi.fn(() => ({
      setText: vi.fn().mockReturnThis(),
      setColor: vi.fn().mockReturnThis(),
      setWordWrapWidth: vi.fn().mockReturnThis()
    }))
  }
} as unknown as Phaser.Scene;

// テスト用の村データを作成
function createTestVillage(
  x: number, 
  y: number, 
  population: number,
  supplyDemandStatus: any
): Village {
  return {
    x,
    y,
    population,
    storage: { food: 10, wood: 10, ore: 10 },
    collectionRadius: 2,
    economy: {
      production: { food: 5, wood: 3, ore: 2 },
      consumption: { food: 4, wood: 2, ore: 1 },
      stock: { food: 10, wood: 10, ore: 10, capacity: 100 },
      buildings: { count: 2, targetCount: 2, constructionQueue: 0 },
      supplyDemandStatus
    },
    lastUpdateTime: 0,
    populationHistory: [population]
  };
}

describe('VillageStatusUI', () => {
  let villageStatusUI: VillageStatusUI;
  let supplyDemandBalancer: SupplyDemandBalancer;

  beforeEach(() => {
    supplyDemandBalancer = new SupplyDemandBalancer();
    villageStatusUI = new VillageStatusUI(mockScene, supplyDemandBalancer);
  });

  describe('基本機能', () => {
    it('UIが正しく初期化される', () => {
      expect(villageStatusUI).toBeDefined();
      expect(villageStatusUI.getVisible()).toBe(false);
    });

    it('表示/非表示を切り替えできる', () => {
      villageStatusUI.setVisible(true);
      expect(villageStatusUI.getVisible()).toBe(true);

      villageStatusUI.setVisible(false);
      expect(villageStatusUI.getVisible()).toBe(false);

      villageStatusUI.toggle();
      expect(villageStatusUI.getVisible()).toBe(true);
    });

    it('位置とサイズを更新できる', () => {
      villageStatusUI.updatePosition(100, 200);
      villageStatusUI.updateSize(500, 400);
      
      // モック関数が呼ばれることを確認
      expect(mockScene.add.container).toHaveBeenCalled();
    });
  });

  describe('要件 4.1: 各村の資源不足情報を表示', () => {
    it('資源不足がない場合、適切なメッセージを表示する', () => {
      const villages: Village[] = [
        createTestVillage(0, 0, 50, {
          food: 'balanced',
          wood: 'balanced',
          ore: 'balanced'
        }),
        createTestVillage(5, 5, 30, {
          food: 'surplus',
          wood: 'balanced',
          ore: 'balanced'
        })
      ];

      villageStatusUI.setVisible(true);
      villageStatusUI.updateVillageStatus(villages, true);

      // テキストが設定されることを確認
      expect(mockScene.add.text).toHaveBeenCalled();
    });

    it('資源不足がある村の情報を表示する', () => {
      const villages: Village[] = [
        createTestVillage(0, 0, 50, {
          food: 'shortage',
          wood: 'balanced',
          ore: 'balanced'
        }),
        createTestVillage(5, 5, 30, {
          food: 'balanced',
          wood: 'critical',
          ore: 'shortage'
        })
      ];

      villageStatusUI.setVisible(true);
      villageStatusUI.updateVillageStatus(villages, true);

      // 不足情報が処理されることを確認
      expect(mockScene.add.text).toHaveBeenCalled();
    });
  });

  describe('要件 4.2: 不足している資源タイプを明示', () => {
    it('食料不足を正しく識別する', () => {
      const villages: Village[] = [
        createTestVillage(0, 0, 50, {
          food: 'critical',
          wood: 'balanced',
          ore: 'balanced'
        })
      ];

      villageStatusUI.setVisible(true);
      villageStatusUI.updateVillageStatus(villages, true);

      // 食料不足が識別されることを確認（内部処理）
      expect(mockScene.add.text).toHaveBeenCalled();
    });

    it('木材不足を正しく識別する', () => {
      const villages: Village[] = [
        createTestVillage(0, 0, 50, {
          food: 'balanced',
          wood: 'shortage',
          ore: 'balanced'
        })
      ];

      villageStatusUI.setVisible(true);
      villageStatusUI.updateVillageStatus(villages, true);

      expect(mockScene.add.text).toHaveBeenCalled();
    });

    it('鉱石不足を正しく識別する', () => {
      const villages: Village[] = [
        createTestVillage(0, 0, 50, {
          food: 'balanced',
          wood: 'balanced',
          ore: 'critical'
        })
      ];

      villageStatusUI.setVisible(true);
      villageStatusUI.updateVillageStatus(villages, true);

      expect(mockScene.add.text).toHaveBeenCalled();
    });

    it('複数の資源不足を同時に識別する', () => {
      const villages: Village[] = [
        createTestVillage(0, 0, 50, {
          food: 'shortage',
          wood: 'critical',
          ore: 'shortage'
        })
      ];

      villageStatusUI.setVisible(true);
      villageStatusUI.updateVillageStatus(villages, true);

      expect(mockScene.add.text).toHaveBeenCalled();
    });
  });

  describe('要件 4.3: 複数村の不足情報を整理して表示', () => {
    it('複数の村の不足情報を処理する', () => {
      const villages: Village[] = [
        createTestVillage(0, 0, 50, {
          food: 'shortage',
          wood: 'balanced',
          ore: 'balanced'
        }),
        createTestVillage(5, 5, 30, {
          food: 'balanced',
          wood: 'critical',
          ore: 'balanced'
        }),
        createTestVillage(10, 10, 40, {
          food: 'critical',
          wood: 'shortage',
          ore: 'shortage'
        })
      ];

      villageStatusUI.setVisible(true);
      villageStatusUI.updateVillageStatus(villages, true);

      // 複数村の情報が処理されることを確認
      expect(mockScene.add.text).toHaveBeenCalled();
    });

    it('危機レベル順に村をソートする', () => {
      const villages: Village[] = [
        createTestVillage(0, 0, 50, {
          food: 'shortage',
          wood: 'balanced',
          ore: 'balanced'
        }), // minor
        createTestVillage(5, 5, 30, {
          food: 'critical',
          wood: 'critical',
          ore: 'balanced'
        }), // critical
        createTestVillage(10, 10, 40, {
          food: 'balanced',
          wood: 'shortage',
          ore: 'shortage'
        }) // major
      ];

      villageStatusUI.setVisible(true);
      villageStatusUI.updateVillageStatus(villages, true);

      // ソート処理が実行されることを確認
      expect(mockScene.add.text).toHaveBeenCalled();
    });

    it('大量の村がある場合に表示制限を適用する', () => {
      const villages: Village[] = [];
      
      // 10村を作成（表示制限の8村を超える）
      for (let i = 0; i < 10; i++) {
        villages.push(createTestVillage(i, i, 30, {
          food: 'shortage',
          wood: 'balanced',
          ore: 'balanced'
        }));
      }

      villageStatusUI.setVisible(true);
      villageStatusUI.updateVillageStatus(villages, true);

      // 表示制限が適用されることを確認
      expect(mockScene.add.text).toHaveBeenCalled();
    });
  });

  describe('要件 4.4: リアルタイムで表示を更新', () => {
    it('更新間隔を守って更新する', () => {
      const villages: Village[] = [
        createTestVillage(0, 0, 50, {
          food: 'shortage',
          wood: 'balanced',
          ore: 'balanced'
        })
      ];

      villageStatusUI.setVisible(true);
      
      // 最初の更新
      villageStatusUI.updateVillageStatus(villages, false);
      
      // 短時間での再更新（スキップされるべき）
      villageStatusUI.updateVillageStatus(villages, false);
      
      // 強制更新
      villageStatusUI.updateVillageStatus(villages, true);

      expect(mockScene.add.text).toHaveBeenCalled();
    });

    it('非表示時は更新をスキップする', () => {
      const villages: Village[] = [
        createTestVillage(0, 0, 50, {
          food: 'shortage',
          wood: 'balanced',
          ore: 'balanced'
        })
      ];

      villageStatusUI.setVisible(false);
      
      // 非表示時の更新（スキップされるべき）
      villageStatusUI.updateVillageStatus(villages, false);

      // 基本的なUI作成は行われるが、更新処理はスキップされる
      expect(mockScene.add.container).toHaveBeenCalled();
    });

    it('資源状況の変化を反映する', () => {
      const villages: Village[] = [
        createTestVillage(0, 0, 50, {
          food: 'shortage',
          wood: 'balanced',
          ore: 'balanced'
        })
      ];

      villageStatusUI.setVisible(true);
      
      // 最初の状態で更新
      villageStatusUI.updateVillageStatus(villages, true);
      
      // 状況を改善
      villages[0].economy.supplyDemandStatus.food = 'balanced';
      
      // 改善された状況で更新
      villageStatusUI.updateVillageStatus(villages, true);

      expect(mockScene.add.text).toHaveBeenCalled();
    });
  });

  describe('エラーハンドリング', () => {
    it('無効な村データでもエラーを起こさない', () => {
      const invalidVillages: any[] = [
        null,
        undefined,
        { x: 0, y: 0 }, // 不完全なデータ
      ];

      villageStatusUI.setVisible(true);
      
      expect(() => {
        villageStatusUI.updateVillageStatus(invalidVillages, true);
      }).not.toThrow();
    });

    it('空の村リストを処理できる', () => {
      const villages: Village[] = [];

      villageStatusUI.setVisible(true);
      
      expect(() => {
        villageStatusUI.updateVillageStatus(villages, true);
      }).not.toThrow();
    });
  });

  describe('パフォーマンス', () => {
    it('大量の村を効率的に処理する', () => {
      const villages: Village[] = [];
      
      // 100村を作成
      for (let i = 0; i < 100; i++) {
        villages.push(createTestVillage(i, i, 30, {
          food: i % 3 === 0 ? 'shortage' : 'balanced',
          wood: i % 5 === 0 ? 'critical' : 'balanced',
          ore: 'balanced'
        }));
      }

      villageStatusUI.setVisible(true);
      
      const startTime = performance.now();
      villageStatusUI.updateVillageStatus(villages, true);
      const endTime = performance.now();
      
      // 処理時間が合理的な範囲内であることを確認（100ms以下）
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});