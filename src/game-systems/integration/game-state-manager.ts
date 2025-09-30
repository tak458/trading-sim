// Game State Manager - Separates game logic from graphics rendering
// This class manages the core game state without any Phaser3 dependencies

import { Tile, generateMap } from "../world/map";
import { Village, createVillages, updateVillages } from "../world/village";
import { Road, buildRoads, updateRoads } from "../world/trade";
import { ResourceManager } from "../economy/resource-manager";
import { TimeManager } from "../time/time-manager";

export interface GameConfig {
  mapSize: number;
  villageCount: number;
  seed?: number;
}

export interface GameState {
  map: Tile[][];
  villages: Village[];
  roads: Road[];
  resourceManager: ResourceManager;
  timeManager: TimeManager;
  isInitialized: boolean;
}

export interface DisplayState {
  showCollectionRanges: boolean;
  resourceInfoState: {
    isDetailedMode: boolean;
    hoveredTile: { x: number; y: number } | null;
    selectedTile: { x: number; y: number } | null;
  };
  divineState: {
    selectedTile: { x: number; y: number } | null;
    isActive: boolean;
    adjustmentMode: "increase" | "decrease" | "set";
    selectedResource: keyof Tile["resources"] | "all";
  };
}

/**
 * GameStateManager handles all game logic without graphics dependencies
 */
export class GameStateManager {
  private gameState: GameState;
  private displayState: DisplayState;
  private config: GameConfig;

  constructor(config: GameConfig) {
    this.config = config;
    
    // Initialize game state
    this.gameState = {
      map: [],
      villages: [],
      roads: [],
      resourceManager: new ResourceManager(),
      timeManager: new TimeManager(),
      isInitialized: false
    };

    // Initialize display state
    this.displayState = {
      showCollectionRanges: false,
      resourceInfoState: {
        isDetailedMode: false,
        hoveredTile: null,
        selectedTile: null
      },
      divineState: {
        selectedTile: null,
        isActive: false,
        adjustmentMode: "increase",
        selectedResource: "all"
      }
    };
  }

  /**
   * Initialize the game world
   */
  initializeGame(): void {
    // Generate map
    this.gameState.map = generateMap(this.config.mapSize, this.config.seed);

    // Create villages
    this.gameState.villages = createVillages(this.gameState.map, this.config.villageCount);

    // Build roads
    this.gameState.roads = buildRoads(this.gameState.map, this.gameState.villages);

    this.gameState.isInitialized = true;

    // Log seed if provided
    if (this.config.seed !== undefined) {
      console.log(`Map generated with seed: ${this.config.seed}`);
    } else {
      console.log("Map generated with random seed");
    }
  }

  /**
   * Update game systems
   */
  update(): void {
    if (!this.gameState.isInitialized) return;

    try {
      // Update time system
      this.gameState.timeManager.update();

      // Notify ResourceManager of current tick
      const gameTime = this.gameState.timeManager.getGameTime();
      this.gameState.resourceManager.updateTick(gameTime.totalTicks);

      // Execute time-based updates
      this.updateTimeBasedSystems();
    } catch (error) {
      console.error("Game state update error:", error);
      this.handleUpdateError(error);
    }
  }

  /**
   * Update time-based systems
   */
  private updateTimeBasedSystems(): void {
    // Resource recovery
    if (this.gameState.timeManager.shouldUpdateResources()) {
      this.updateResourcesOptimized();
    }

    // Village updates
    if (this.gameState.timeManager.shouldUpdateVillages()) {
      this.updateVillagesWithErrorHandling();
    }

    // Trade processing
    if (this.gameState.timeManager.shouldExecuteTrade()) {
      updateRoads(this.gameState.roads);
    }
  }

  /**
   * Optimized resource update
   */
  private updateResourcesOptimized(): void {
    for (let y = 0; y < this.config.mapSize; y++) {
      for (let x = 0; x < this.config.mapSize; x++) {
        try {
          this.gameState.resourceManager.updateRecovery(this.gameState.map[y][x]);
        } catch (error) {
          console.warn(`Resource recovery error at (${x}, ${y}):`, error);
        }
      }
    }
  }

  /**
   * Village update with error handling
   */
  private async updateVillagesWithErrorHandling(): Promise<void> {
    try {
      await updateVillages(
        this.gameState.map,
        this.gameState.villages,
        this.gameState.roads,
        this.gameState.resourceManager,
        this.gameState.timeManager
      );
    } catch (error) {
      console.error("Village update error:", error);
      this.recoverVillages();
    }
  }

  /**
   * Recover villages from errors
   */
  private recoverVillages(): void {
    this.gameState.villages.forEach((village, index) => {
      try {
        if (village.population < 0) village.population = 10;
        if (village.storage.food < 0) village.storage.food = 0;
        if (village.storage.wood < 0) village.storage.wood = 0;
        if (village.storage.ore < 0) village.storage.ore = 0;
        if (village.collectionRadius < 1) village.collectionRadius = 1;
      } catch (villageError) {
        console.warn(`Village ${index} recovery error:`, villageError);
      }
    });
  }

  /**
   * Handle update errors
   */
  private handleUpdateError(error: any): void {
    console.error("Game state update error details:", {
      error: error.message || error,
      stack: error.stack,
      villageCount: this.gameState.villages.length,
      roadCount: this.gameState.roads.length,
      mapSize: `${this.config.mapSize}x${this.config.mapSize}`,
    });
  }

  /**
   * Perform divine intervention on a tile
   */
  performDivineIntervention(tileX: number, tileY: number): void {
    if (tileX < 0 || tileX >= this.config.mapSize || tileY < 0 || tileY >= this.config.mapSize) {
      return;
    }

    const tile = this.gameState.map[tileY][tileX];
    const resourceTypes: (keyof Tile["resources"])[] =
      this.displayState.divineState.selectedResource === "all"
        ? ["food", "wood", "ore"]
        : [this.displayState.divineState.selectedResource as keyof Tile["resources"]];

    resourceTypes.forEach((resourceType) => {
      const currentAmount = tile.resources[resourceType];
      const maxAmount = tile.maxResources[resourceType];
      let newAmount = currentAmount;

      switch (this.displayState.divineState.adjustmentMode) {
        case "increase":
          newAmount = Math.min(maxAmount, currentAmount + maxAmount * 0.25);
          break;
        case "decrease":
          newAmount = Math.max(0, currentAmount - maxAmount * 0.25);
          break;
        case "set":
          if (currentAmount === 0) {
            newAmount = maxAmount;
          } else if (currentAmount === maxAmount) {
            newAmount = 0;
          } else {
            newAmount = maxAmount;
          }
          break;
      }

      this.gameState.resourceManager.divineIntervention(tile, resourceType, newAmount);
    });
  }

  // Getters for game state
  getMap(): Tile[][] { return this.gameState.map; }
  getVillages(): Village[] { return this.gameState.villages; }
  getRoads(): Road[] { return this.gameState.roads; }
  getResourceManager(): ResourceManager { return this.gameState.resourceManager; }
  getTimeManager(): TimeManager { return this.gameState.timeManager; }
  isInitialized(): boolean { return this.gameState.isInitialized; }

  // Getters for display state
  getDisplayState(): DisplayState { return this.displayState; }
  
  // Setters for display state
  setShowCollectionRanges(show: boolean): void {
    this.displayState.showCollectionRanges = show;
  }

  setResourceInfoState(state: Partial<DisplayState['resourceInfoState']>): void {
    Object.assign(this.displayState.resourceInfoState, state);
  }

  setDivineState(state: Partial<DisplayState['divineState']>): void {
    Object.assign(this.displayState.divineState, state);
  }

  // Utility methods
  getTileInfo(x: number, y: number): { x: number; y: number; tile: Tile } | null {
    if (x < 0 || x >= this.config.mapSize || y < 0 || y >= this.config.mapSize) {
      return null;
    }
    return { x, y, tile: this.gameState.map[y][x] };
  }

  getSelectedTileInfo(): { x: number; y: number; tile: Tile } | null {
    const selected = this.displayState.divineState.selectedTile;
    if (!selected) return null;
    return this.getTileInfo(selected.x, selected.y);
  }

  getHoveredTileInfo(): { x: number; y: number; tile: Tile } | null {
    const hovered = this.displayState.resourceInfoState.hoveredTile;
    if (!hovered) return null;
    return this.getTileInfo(hovered.x, hovered.y);
  }
}