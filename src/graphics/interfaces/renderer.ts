// Graphics Renderer Interfaces - Abstracts rendering from game logic

import type { Tile } from "../../game-systems/world/map";
import type { Road } from "../../game-systems/world/trade";
import type { Village } from "../../game-systems/world/village";

export interface RenderConfig {
  tileSize: number;
  mapSize: number;
}

export interface CameraInfo {
  zoom: number;
  centerX: number;
  centerY: number;
  bounds: { left: number; right: number; top: number; bottom: number };
}

export interface VisualState {
  opacity: number;
  isDepleted: boolean;
  recoveryProgress: number;
}

/**
 * Interface for map rendering operations
 */
export interface MapRenderer {
  renderMap(map: Tile[][], config: RenderConfig): void;
  renderVillages(villages: Village[], config: RenderConfig): void;
  renderRoads(roads: Road[], config: RenderConfig): void;
  renderCollectionRanges(
    villages: Village[],
    show: boolean,
    config: RenderConfig,
  ): void;
  renderSelectedTile(tileX: number, tileY: number, config: RenderConfig): void;
  updateMapVisuals(map: Tile[][], config: RenderConfig): void;
  clear(): void;
}

/**
 * Interface for UI rendering operations
 */
export interface UIRenderer {
  showTooltip(x: number, y: number, content: string): void;
  hideTooltip(): void;
  updateVillageTexts(villages: Village[], config: RenderConfig): void;
  setVisible(visible: boolean): void;
}

/**
 * Interface for camera operations
 */
export interface CameraController {
  setZoom(zoom: number): void;
  getZoom(): number;
  centerOn(x: number, y: number): void;
  getCameraInfo(): CameraInfo;
  resetCamera(): void;
  worldToScreen(worldX: number, worldY: number): { x: number; y: number };
  screenToWorld(screenX: number, screenY: number): { x: number; y: number };
}

/**
 * Interface for input handling
 */
export interface InputHandler {
  onTileClick(
    callback: (tileX: number, tileY: number, button: "left" | "right") => void,
  ): void;
  onTileHover(callback: (tileX: number, tileY: number) => void): void;
  onKeyPress(key: string, callback: () => void): void;
  onZoom(
    callback: (delta: number, pointer: { x: number; y: number }) => void,
  ): void;
  onPan(callback: (deltaX: number, deltaY: number) => void): void;
}

/**
 * Main graphics system interface
 */
export interface GraphicsSystem {
  mapRenderer: MapRenderer;
  uiRenderer: UIRenderer;
  cameraController: CameraController;
  inputHandler: InputHandler;

  initialize(config: RenderConfig): void;
  update(): void;
  resize(width: number, height: number): void;
  destroy(): void;
}
