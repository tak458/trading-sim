// src/test/divine-intervention.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { generateMap, Tile } from '../game-systems/world/map';
import { ResourceManager } from '../game-systems/economy/resource-manager';

describe('Divine Intervention', () => {
  let map: Tile[][];
  let resourceManager: ResourceManager;

  beforeEach(() => {
    map = generateMap(10, 12345); // 固定シードでテスト
    resourceManager = new ResourceManager();
  });

  describe('Divine Intervention Method', () => {
    it('should increase resource amount correctly', () => {
      // 食料を持つタイルを見つける
      let tile: Tile | null = null;
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          if (map[y][x].maxResources.food > 0) {
            tile = map[y][x];
            break;
          }
        }
        if (tile) break;
      }
      
      expect(tile).not.toBeNull();
      if (!tile) return;
      
      const originalFood = tile.resources.food;
      const maxFood = tile.maxResources.food;
      
      // 神の介入で食料を増加
      const newAmount = Math.min(maxFood, originalFood + maxFood * 0.5);
      resourceManager.divineIntervention(tile, 'food', newAmount);
      
      expect(tile.resources.food).toBe(newAmount);
      expect(tile.depletionState.food).toBe(newAmount / maxFood);
    });

    it('should decrease resource amount correctly', () => {
      // 木材を持つタイルを見つける
      let tile: Tile | null = null;
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          if (map[y][x].maxResources.wood > 0) {
            tile = map[y][x];
            break;
          }
        }
        if (tile) break;
      }
      
      expect(tile).not.toBeNull();
      if (!tile) return;
      
      const originalWood = tile.resources.wood;
      const maxWood = tile.maxResources.wood;
      
      // 神の介入で木材を減少
      const newAmount = Math.max(0, originalWood - maxWood * 0.3);
      resourceManager.divineIntervention(tile, 'wood', newAmount);
      
      expect(tile.resources.wood).toBe(newAmount);
      expect(tile.depletionState.wood).toBe(newAmount / maxWood);
    });

    it('should set resource to specific amount', () => {
      // 鉱石を持つタイルを見つける
      let tile: Tile | null = null;
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          if (map[y][x].maxResources.ore > 0) {
            tile = map[y][x];
            break;
          }
        }
        if (tile) break;
      }
      
      expect(tile).not.toBeNull();
      if (!tile) return;
      
      const maxOre = tile.maxResources.ore;
      
      // 神の介入で鉱石を特定量に設定
      const targetAmount = maxOre * 0.75;
      resourceManager.divineIntervention(tile, 'ore', targetAmount);
      
      expect(tile.resources.ore).toBe(targetAmount);
      expect(tile.depletionState.ore).toBe(0.75);
    });

    it('should clamp values to valid range (0 to max)', () => {
      // 食料を持つタイルを見つける
      let tile: Tile | null = null;
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          if (map[y][x].maxResources.food > 0) {
            tile = map[y][x];
            break;
          }
        }
        if (tile) break;
      }
      
      expect(tile).not.toBeNull();
      if (!tile) return;
      
      const maxFood = tile.maxResources.food;
      
      // 最大値を超える値を設定しようとする
      resourceManager.divineIntervention(tile, 'food', maxFood * 2);
      expect(tile.resources.food).toBe(maxFood);
      expect(tile.depletionState.food).toBe(1);
      
      // 負の値を設定しようとする
      resourceManager.divineIntervention(tile, 'food', -100);
      expect(tile.resources.food).toBe(0);
      expect(tile.depletionState.food).toBe(0);
    });

    it('should reset recovery timer when resource is restored from depletion', () => {
      // 木材を持つタイルを見つける
      let tile: Tile | null = null;
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          if (map[y][x].maxResources.wood > 0) {
            tile = map[y][x];
            break;
          }
        }
        if (tile) break;
      }
      
      expect(tile).not.toBeNull();
      if (!tile) return;
      
      // まず資源を完全に枯渇させる
      resourceManager.divineIntervention(tile, 'wood', 0);
      expect(tile.resources.wood).toBe(0);
      
      // 回復タイマーを設定（通常は採取時に設定される）
      tile.recoveryTimer.wood = 1000;
      
      // 神の介入で資源を回復
      resourceManager.divineIntervention(tile, 'wood', tile.maxResources.wood * 0.5);
      
      expect(tile.resources.wood).toBeGreaterThan(0);
      expect(tile.recoveryTimer.wood).toBe(0); // タイマーがリセットされる
    });

    it('should update lastHarvestTime when divine intervention occurs', () => {
      // 食料を持つタイルを見つける
      let tile: Tile | null = null;
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          if (map[y][x].maxResources.food > 0) {
            tile = map[y][x];
            break;
          }
        }
        if (tile) break;
      }
      
      expect(tile).not.toBeNull();
      if (!tile) return;
      
      const originalTime = tile.lastHarvestTime;
      
      // フレームを進める
      resourceManager.updateFrame();
      resourceManager.updateFrame();
      
      // 神の介入を実行
      resourceManager.divineIntervention(tile, 'food', tile.maxResources.food * 0.8);
      
      expect(tile.lastHarvestTime).toBeGreaterThan(originalTime);
    });
  });

  describe('Resource State Validation', () => {
    it('should maintain consistent depletion state after divine intervention', () => {
      const tile = map[6][6];
      const resourceTypes: (keyof Tile['resources'])[] = ['food', 'wood', 'ore'];
      
      resourceTypes.forEach(resourceType => {
        const maxAmount = tile.maxResources[resourceType];
        if (maxAmount > 0) {
          // 様々な値で神の介入をテスト
          const testValues = [0, maxAmount * 0.25, maxAmount * 0.5, maxAmount * 0.75, maxAmount];
          
          testValues.forEach(testValue => {
            resourceManager.divineIntervention(tile, resourceType, testValue);
            
            expect(tile.resources[resourceType]).toBe(testValue);
            expect(tile.depletionState[resourceType]).toBe(testValue / maxAmount);
            expect(tile.resources[resourceType]).toBeGreaterThanOrEqual(0);
            expect(tile.resources[resourceType]).toBeLessThanOrEqual(maxAmount);
          });
        }
      });
    });
  });
});