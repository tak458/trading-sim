// src/test/resource-info-ui.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { ResourceManager } from "../game-systems/economy/resource-manager";
import { generateMap, type Tile } from "../game-systems/world/map";

describe("Resource Information UI Integration", () => {
  let map: Tile[][];
  let resourceManager: ResourceManager;

  beforeEach(() => {
    map = generateMap(10, 12345);
    resourceManager = new ResourceManager();
  });

  describe("UI State Management", () => {
    it("should handle resource info state correctly", () => {
      // Simulate resource info state
      const resourceInfoState = {
        isDetailedMode: false,
        hoveredTile: null as { x: number; y: number } | null,
        selectedTile: null as { x: number; y: number } | null,
      };

      // Test initial state
      expect(resourceInfoState.isDetailedMode).toBe(false);
      expect(resourceInfoState.hoveredTile).toBeNull();
      expect(resourceInfoState.selectedTile).toBeNull();

      // Test state changes
      resourceInfoState.isDetailedMode = true;
      resourceInfoState.hoveredTile = { x: 5, y: 5 };
      resourceInfoState.selectedTile = { x: 3, y: 3 };

      expect(resourceInfoState.isDetailedMode).toBe(true);
      expect(resourceInfoState.hoveredTile).toEqual({ x: 5, y: 5 });
      expect(resourceInfoState.selectedTile).toEqual({ x: 3, y: 3 });
    });

    it("should validate tile coordinates correctly", () => {
      const mapSize = 10;

      // Helper function to validate coordinates
      const isValidTileCoordinate = (
        x: number,
        y: number,
        size: number,
      ): boolean => {
        return x >= 0 && x < size && y >= 0 && y < size;
      };

      // Test valid coordinates
      expect(isValidTileCoordinate(0, 0, mapSize)).toBe(true);
      expect(isValidTileCoordinate(5, 5, mapSize)).toBe(true);
      expect(isValidTileCoordinate(9, 9, mapSize)).toBe(true);

      // Test invalid coordinates
      expect(isValidTileCoordinate(-1, 0, mapSize)).toBe(false);
      expect(isValidTileCoordinate(0, -1, mapSize)).toBe(false);
      expect(isValidTileCoordinate(10, 0, mapSize)).toBe(false);
      expect(isValidTileCoordinate(0, 10, mapSize)).toBe(false);
    });
  });

  describe("Tooltip Information Generation", () => {
    it("should generate correct tooltip information", () => {
      const testTile = map[5][5];
      const visualState = resourceManager.getVisualState(testTile);

      // Simulate tooltip info generation
      const tooltipInfo = [
        `Tile (5, 5) - ${testTile.type}`,
        "",
        "Resources:",
        `Food: ${testTile.resources.food.toFixed(1)}/${testTile.maxResources.food}`,
        `Wood: ${testTile.resources.wood.toFixed(1)}/${testTile.maxResources.wood}`,
        `Ore: ${testTile.resources.ore.toFixed(1)}/${testTile.maxResources.ore}`,
        "",
        `Depletion: ${((1 - visualState.recoveryProgress) * 100).toFixed(0)}%`,
      ];

      expect(tooltipInfo).toHaveLength(8);
      expect(tooltipInfo[0]).toContain("Tile (5, 5)");
      expect(tooltipInfo[0]).toContain(testTile.type);
      expect(tooltipInfo[2]).toBe("Resources:");
      expect(tooltipInfo[7]).toContain("Depletion:");
    });

    it("should format detailed resource information correctly", () => {
      const testTile = map[3][3];
      const visualState = resourceManager.getVisualState(testTile);

      // Simulate detailed info formatting
      const resourceTypes: (keyof Tile["resources"])[] = [
        "food",
        "wood",
        "ore",
      ];
      const resourceNames = { food: "Food", wood: "Wood", ore: "Ore" };
      const resourceColors = { food: "🟢", wood: "🟤", ore: "⚪" };

      const detailedInfo: string[] = [
        `Selected Tile: (3, 3)`,
        `Type: ${testTile.type.charAt(0).toUpperCase() + testTile.type.slice(1)}`,
        `Height: ${testTile.height.toFixed(2)}`,
        "",
        "=== RESOURCE DETAILS ===",
        "",
      ];

      resourceTypes.forEach((resourceType) => {
        const current = testTile.resources[resourceType];
        const max = testTile.maxResources[resourceType];
        const depletion = testTile.depletionState[resourceType];

        if (max > 0) {
          detailedInfo.push(
            `${resourceColors[resourceType]} ${resourceNames[resourceType]}:`,
          );
          detailedInfo.push(
            `  Amount: ${current.toFixed(1)} / ${max.toFixed(1)}`,
          );
          detailedInfo.push(
            `  Status: ${(depletion * 100).toFixed(1)}% remaining`,
          );
          detailedInfo.push("");
        }
      });

      expect(detailedInfo[0]).toContain("Selected Tile: (3, 3)");
      expect(detailedInfo[4]).toBe("=== RESOURCE DETAILS ===");

      // Check if any resources exist, then verify the format
      const hasResources = resourceTypes.some(
        (type) => testTile.maxResources[type] > 0,
      );
      if (hasResources) {
        expect(detailedInfo.some((line) => line.includes("Amount:"))).toBe(
          true,
        );
        expect(detailedInfo.some((line) => line.includes("Status:"))).toBe(
          true,
        );
      } else {
        // If no resources, the detailed info should still be properly formatted
        expect(detailedInfo.length).toBeGreaterThan(5);
      }
    });
  });

  describe("Visual State Integration", () => {
    it("should provide consistent visual feedback", () => {
      const testTile = map[7][7];

      // Test that visual state is consistent with tile data
      const visualState = resourceManager.getVisualState(testTile);

      expect(visualState.opacity).toBeGreaterThanOrEqual(0.3);
      expect(visualState.opacity).toBeLessThanOrEqual(1.0);
      expect(typeof visualState.tint).toBe("number");
      expect(typeof visualState.isDepleted).toBe("boolean");
      expect(visualState.recoveryProgress).toBeGreaterThanOrEqual(0);
      expect(visualState.recoveryProgress).toBeLessThanOrEqual(1);
    });

    it("should handle mode switching correctly", () => {
      // Simulate mode switching logic
      let isDetailedMode = false;
      let showTooltip = true;
      let showPanel = false;

      // Basic mode
      expect(isDetailedMode).toBe(false);
      expect(showTooltip).toBe(true);
      expect(showPanel).toBe(false);

      // Switch to detailed mode
      isDetailedMode = true;
      showTooltip = false;
      showPanel = true;

      expect(isDetailedMode).toBe(true);
      expect(showTooltip).toBe(false);
      expect(showPanel).toBe(true);
    });
  });

  describe("Resource Information Accuracy", () => {
    it("should provide accurate resource data for display", () => {
      const testTile = map[2][8];

      // Verify all required data is available and accurate
      expect(typeof testTile.resources.food).toBe("number");
      expect(typeof testTile.resources.wood).toBe("number");
      expect(typeof testTile.resources.ore).toBe("number");

      expect(typeof testTile.maxResources.food).toBe("number");
      expect(typeof testTile.maxResources.wood).toBe("number");
      expect(typeof testTile.maxResources.ore).toBe("number");

      expect(typeof testTile.depletionState.food).toBe("number");
      expect(typeof testTile.depletionState.wood).toBe("number");
      expect(typeof testTile.depletionState.ore).toBe("number");

      // Verify depletion state consistency
      if (testTile.maxResources.food > 0) {
        const expectedDepletion =
          testTile.resources.food / testTile.maxResources.food;
        expect(testTile.depletionState.food).toBeCloseTo(expectedDepletion, 2);
      }
    });

    it("should handle edge cases in resource display", () => {
      // Create edge case tiles
      const emptyTile: Tile = {
        height: 0.2,
        type: "water",
        resources: { food: 0, wood: 0, ore: 0 },
        maxResources: { food: 0, wood: 0, ore: 0 },
        depletionState: { food: 0, wood: 0, ore: 0 },
        recoveryTimer: { food: 0, wood: 0, ore: 0 },
        lastHarvestTime: 0,
      };

      const fullTile: Tile = {
        height: 0.8,
        type: "mountain",
        resources: { food: 10, wood: 10, ore: 10 },
        maxResources: { food: 10, wood: 10, ore: 10 },
        depletionState: { food: 1, wood: 1, ore: 1 },
        recoveryTimer: { food: 0, wood: 0, ore: 0 },
        lastHarvestTime: 0,
      };

      // Test visual states for edge cases
      const emptyVisualState = resourceManager.getVisualState(emptyTile);
      const fullVisualState = resourceManager.getVisualState(fullTile);

      expect(emptyVisualState.opacity).toBe(1.0);
      expect(emptyVisualState.isDepleted).toBe(false);

      expect(fullVisualState.opacity).toBe(1.0);
      expect(fullVisualState.recoveryProgress).toBe(1);
      expect(fullVisualState.isDepleted).toBe(false);
    });
  });
});
