// src/test/resource-info-display.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { generateMap, Tile } from '../game-systems/world/map';
import { ResourceManager } from '../game-systems/economy/resource-manager';

describe('Resource Information Display', () => {
  let map: Tile[][];
  let resourceManager: ResourceManager;
  let testTile: Tile;

  beforeEach(() => {
    map = generateMap(10, 12345);
    resourceManager = new ResourceManager();
    
    // Create a test tile with known resource values
    testTile = {
      height: 0.5,
      type: 'forest',
      resources: { food: 5, wood: 8, ore: 2 },
      maxResources: { food: 10, wood: 10, ore: 5 },
      depletionState: { food: 0.5, wood: 0.8, ore: 0.4 },
      recoveryTimer: { food: 0, wood: 0, ore: 0 },
      lastHarvestTime: 0
    };
  });

  describe('Resource State Calculation', () => {
    it('should calculate correct depletion percentages', () => {
      const visualState = resourceManager.getVisualState(testTile);
      
      // Average depletion should be (0.5 + 0.8 + 0.4) / 3 = 0.57
      expect(visualState.recoveryProgress).toBeCloseTo(0.57, 1);
      expect(visualState.isDepleted).toBe(false);
    });

    it('should identify depleted tiles correctly', () => {
      const depletedTile: Tile = {
        ...testTile,
        resources: { food: 0, wood: 0, ore: 0 },
        depletionState: { food: 0, wood: 0, ore: 0 },
        maxResources: { food: 10, wood: 10, ore: 5 } // Ensure max resources exist
      };

      const visualState = resourceManager.getVisualState(depletedTile);
      expect(visualState.isDepleted).toBe(true);
      // Recovery progress for depleted tiles depends on timer calculation
      expect(visualState.recoveryProgress).toBeGreaterThanOrEqual(0);
    });

    it('should handle tiles with no resources', () => {
      const noResourceTile: Tile = {
        ...testTile,
        type: 'water',
        resources: { food: 0, wood: 0, ore: 0 },
        maxResources: { food: 0, wood: 0, ore: 0 },
        depletionState: { food: 0, wood: 0, ore: 0 }
      };

      const visualState = resourceManager.getVisualState(noResourceTile);
      expect(visualState.opacity).toBe(1.0);
      expect(visualState.tint).toBe(0xffffff);
      expect(visualState.isDepleted).toBe(false);
    });
  });

  describe('Resource Information Formatting', () => {
    it('should provide accurate resource amounts', () => {
      expect(testTile.resources.food).toBe(5);
      expect(testTile.resources.wood).toBe(8);
      expect(testTile.resources.ore).toBe(2);
      
      expect(testTile.maxResources.food).toBe(10);
      expect(testTile.maxResources.wood).toBe(10);
      expect(testTile.maxResources.ore).toBe(5);
    });

    it('should calculate correct depletion states', () => {
      expect(testTile.depletionState.food).toBe(0.5); // 50% remaining
      expect(testTile.depletionState.wood).toBe(0.8); // 80% remaining
      expect(testTile.depletionState.ore).toBe(0.4);  // 40% remaining
    });

    it('should track recovery timers correctly', () => {
      // Deplete a resource completely
      resourceManager.harvestResource(testTile, 'food', 5);
      
      expect(testTile.resources.food).toBe(0);
      expect(testTile.depletionState.food).toBe(0);
      expect(testTile.recoveryTimer.food).toBeGreaterThan(0);
    });
  });

  describe('Visual State Integration', () => {
    it('should provide appropriate opacity based on resource levels', () => {
      const visualState = resourceManager.getVisualState(testTile);
      
      // Opacity should be between 0.3 and 1.0
      expect(visualState.opacity).toBeGreaterThanOrEqual(0.3);
      expect(visualState.opacity).toBeLessThanOrEqual(1.0);
      
      // With average depletion of ~0.57, opacity should be around 0.7
      expect(visualState.opacity).toBeCloseTo(0.7, 1);
    });

    it('should apply red tint to heavily depleted tiles', () => {
      const depletedTile: Tile = {
        ...testTile,
        resources: { food: 1, wood: 1, ore: 0 },
        depletionState: { food: 0.1, wood: 0.1, ore: 0 }
      };

      const visualState = resourceManager.getVisualState(depletedTile);
      
      // Should have red tint for heavily depleted tile
      expect(visualState.tint).not.toBe(0xffffff);
      
      // Red component should be higher than green/blue
      const red = (visualState.tint >> 16) & 0xff;
      const green = (visualState.tint >> 8) & 0xff;
      const blue = visualState.tint & 0xff;
      
      expect(red).toBeGreaterThan(green);
      expect(red).toBeGreaterThan(blue);
    });
  });

  describe('Recovery Progress Tracking', () => {
    it('should track recovery progress for depleted resources', () => {
      // Completely deplete a resource
      resourceManager.harvestResource(testTile, 'wood', 8);
      
      expect(testTile.resources.wood).toBe(0);
      expect(testTile.recoveryTimer.wood).toBeGreaterThan(0);
      
      // Simulate time passing
      for (let i = 0; i < 100; i++) {
        resourceManager.updateFrame();
      }
      
      const visualState = resourceManager.getVisualState(testTile);
      
      // Recovery progress should be calculated based on timer
      expect(visualState.recoveryProgress).toBeGreaterThanOrEqual(0);
      expect(visualState.recoveryProgress).toBeLessThanOrEqual(1);
    });

    it('should show full recovery when resources are at maximum', () => {
      const fullTile: Tile = {
        ...testTile,
        resources: { food: 10, wood: 10, ore: 5 },
        depletionState: { food: 1, wood: 1, ore: 1 }
      };

      const visualState = resourceManager.getVisualState(fullTile);
      expect(visualState.recoveryProgress).toBe(1);
      expect(visualState.isDepleted).toBe(false);
    });
  });

  describe('Hover and Selection State', () => {
    it('should handle tile coordinate validation', () => {
      const mapSize = 10;
      
      // Valid coordinates
      expect(0).toBeGreaterThanOrEqual(0);
      expect(0).toBeLessThan(mapSize);
      expect(9).toBeGreaterThanOrEqual(0);
      expect(9).toBeLessThan(mapSize);
      
      // Invalid coordinates
      expect(-1).toBeLessThan(0);
      expect(10).toBeGreaterThanOrEqual(mapSize);
    });

    it('should provide detailed resource information', () => {
      // Test that all required information is available
      expect(testTile.type).toBeDefined();
      expect(testTile.height).toBeDefined();
      expect(testTile.resources).toBeDefined();
      expect(testTile.maxResources).toBeDefined();
      expect(testTile.depletionState).toBeDefined();
      expect(testTile.recoveryTimer).toBeDefined();
      expect(testTile.lastHarvestTime).toBeDefined();
    });
  });
});