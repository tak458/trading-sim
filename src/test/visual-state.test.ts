// src/test/visual-state.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ResourceManager } from '../game-systems/economy/resource-manager';
import { Tile } from '../game-systems/world/map';

describe('視覚状態システム', () => {
  let resourceManager: ResourceManager;
  let testTile: Tile;

  beforeEach(() => {
    resourceManager = new ResourceManager();
    testTile = {
      height: 0.5,
      type: 'land',
      resources: { food: 10, wood: 5, ore: 3 },
      maxResources: { food: 10, wood: 5, ore: 3 },
      depletionState: { food: 1, wood: 1, ore: 1 },
      recoveryTimer: { food: 0, wood: 0, ore: 0 },
      lastHarvestTime: 0
    };
  });

  describe('視覚状態の取得', () => {
    it('資源が満タンのタイルに対して完全な不透明度と白い色調を返す', () => {
      const visualState = resourceManager.getVisualState(testTile);
      
      expect(visualState.opacity).toBe(1.0);
      expect(visualState.tint).toBe(0xffffff);
      expect(visualState.isDepleted).toBe(false);
      expect(visualState.recoveryProgress).toBe(1);
    });

    it('should return reduced opacity for partially depleted tile', () => {
      // 部分的に消耗させる
      testTile.resources.food = 5;
      testTile.depletionState.food = 0.5;
      
      const visualState = resourceManager.getVisualState(testTile);
      
      // 平均消耗状態: (0.5 + 1 + 1) / 3 = 0.833...
      // 透明度: 0.3 + (0.833... * 0.7) = 0.883...
      expect(visualState.opacity).toBeCloseTo(0.883, 2);
      expect(visualState.isDepleted).toBe(false);
    });

    it('should return red tint for heavily depleted tile', () => {
      // 大幅に消耗させる
      testTile.resources.food = 1;
      testTile.resources.wood = 0;
      testTile.resources.ore = 0;
      testTile.depletionState.food = 0.1;
      testTile.depletionState.wood = 0;
      testTile.depletionState.ore = 0;
      
      const visualState = resourceManager.getVisualState(testTile);
      
      // 平均消耗状態: (0.1 + 0 + 0) / 3 = 0.033...
      expect(visualState.opacity).toBeCloseTo(0.323, 2);
      expect(visualState.tint).not.toBe(0xffffff); // 赤みがかった色になるはず
      expect(visualState.isDepleted).toBe(false);
    });

    it('should return isDepleted true for completely depleted tile', () => {
      // 完全に消耗させる
      testTile.resources = { food: 0, wood: 0, ore: 0 };
      testTile.depletionState = { food: 0, wood: 0, ore: 0 };
      
      const visualState = resourceManager.getVisualState(testTile);
      
      expect(visualState.opacity).toBe(0.3); // 最小透明度
      expect(visualState.isDepleted).toBe(true);
      expect(visualState.recoveryProgress).toBeGreaterThanOrEqual(0);
    });

    it('should handle tiles with no resources gracefully', () => {
      // 資源のないタイル（水など）
      testTile.maxResources = { food: 0, wood: 0, ore: 0 };
      testTile.resources = { food: 0, wood: 0, ore: 0 };
      testTile.depletionState = { food: 0, wood: 0, ore: 0 };
      
      const visualState = resourceManager.getVisualState(testTile);
      
      expect(visualState.opacity).toBe(1.0);
      expect(visualState.tint).toBe(0xffffff);
      expect(visualState.isDepleted).toBe(false);
      expect(visualState.recoveryProgress).toBe(0);
    });

    it('should calculate recovery progress correctly for depleted tiles', () => {
      // 完全に消耗させて回復タイマーを設定
      testTile.resources = { food: 0, wood: 0, ore: 0 };
      testTile.depletionState = { food: 0, wood: 0, ore: 0 };
      testTile.recoveryTimer = { food: 100, wood: 100, ore: 100 };
      
      // フレームを進める
      for (let i = 0; i < 50; i++) {
        resourceManager.updateFrame();
      }
      
      const visualState = resourceManager.getVisualState(testTile);
      
      expect(visualState.isDepleted).toBe(true);
      expect(visualState.recoveryProgress).toBeLessThanOrEqual(1);
    });

    it('should handle mixed resource states correctly', () => {
      // 一部の資源は豊富、一部は枯渇
      testTile.resources = { food: 10, wood: 0, ore: 0 };
      testTile.depletionState = { food: 1, wood: 0, ore: 0 };
      
      const visualState = resourceManager.getVisualState(testTile);
      
      // 平均消耗状態: (1 + 0 + 0) / 3 = 0.333...
      expect(visualState.opacity).toBeCloseTo(0.533, 2);
      expect(visualState.isDepleted).toBe(false);
    });
  });

  describe('Visual Effects Integration', () => {
    it('should provide consistent visual state over time', () => {
      const initialState = resourceManager.getVisualState(testTile);
      
      // 時間を進める（資源変化なし）
      for (let i = 0; i < 100; i++) {
        resourceManager.updateFrame();
        resourceManager.updateRecovery(testTile);
      }
      
      const laterState = resourceManager.getVisualState(testTile);
      
      // 資源が満タンの場合、視覚状態は変わらないはず
      expect(laterState.opacity).toBe(initialState.opacity);
      expect(laterState.tint).toBe(initialState.tint);
      expect(laterState.isDepleted).toBe(initialState.isDepleted);
    });

    it('should show visual changes after resource harvesting', () => {
      const initialState = resourceManager.getVisualState(testTile);
      
      // 資源を採取
      resourceManager.harvestResource(testTile, 'food', 8);
      
      const afterHarvestState = resourceManager.getVisualState(testTile);
      
      // 採取後は透明度が下がるはず
      expect(afterHarvestState.opacity).toBeLessThan(initialState.opacity);
      expect(afterHarvestState.recoveryProgress).toBeLessThan(initialState.recoveryProgress);
    });
  });
});