// src/graphics/scenes/map-scene.ts - Phaser3 rendering implementation
import Phaser from "phaser";
import { Tile } from "../../game-systems/world/map";
import { Village } from "../../game-systems/world/village";
import { Road } from "../../game-systems/world/trade";
import { GameStateManager, GameConfig } from "../../game-systems/integration/game-state-manager";
import { MapRenderer, UIRenderer, CameraController, InputHandler, RenderConfig, CameraInfo } from "../interfaces/renderer";

const TILE_SIZE = 8;
const MAP_SIZE = 64;

export class MapScene extends Phaser.Scene implements MapRenderer, UIRenderer, CameraController, InputHandler {
  // Game state manager (separated from graphics)
  private gameStateManager: GameStateManager;
  
  // Graphics objects (Phaser3-specific)
  private mapGraphics?: Phaser.GameObjects.Graphics;
  private roadsGraphics?: Phaser.GameObjects.Graphics;
  private villagesGraphics?: Phaser.GameObjects.Graphics;
  private collectionRangeGraphics?: Phaser.GameObjects.Graphics;
  private selectedTileGraphics?: Phaser.GameObjects.Graphics;
  private villageTexts: Phaser.GameObjects.Text[] = [];

  // Render configuration
  private renderConfig: RenderConfig;

  // Camera control (Phaser3-specific)
  private cameraZoom: number = 1.0;
  minZoom: number = 0.25;
  maxZoom: number = 4.0;
  private isDragging: boolean = false;
  private lastPointerPosition: { x: number; y: number } = { x: 0, y: 0 };

  // Screen dimensions
  private screenWidth: number = 0;
  private screenHeight: number = 0;

  // Tooltip UI (Phaser3-specific)
  private hoverTooltip?: Phaser.GameObjects.Container;
  private hoverTooltipText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "MapScene" });
    
    // Initialize game state manager
    const gameConfig: GameConfig = {
      mapSize: MAP_SIZE,
      villageCount: 6
    };
    
    // Get seed from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const seedParam = urlParams.get("seed");
    if (seedParam) {
      gameConfig.seed = parseInt(seedParam, 10);
    }
    
    this.gameStateManager = new GameStateManager(gameConfig);
    
    // Initialize render configuration
    this.renderConfig = {
      tileSize: TILE_SIZE,
      mapSize: MAP_SIZE
    };
  }

  create() {
    // Launch UI Scene
    this.scene.launch("UIScene");

    // Get screen dimensions
    this.screenWidth = this.cameras.main.width;
    this.screenHeight = this.cameras.main.height;

    // Set up resize event
    this.scale.on("resize", this.handleResize, this);

    // Initialize game state
    this.gameStateManager.initializeGame();

    // Set up camera
    this.setupCamera();

    // Initialize graphics
    this.initializeGraphics();

    // Render initial state
    this.renderAll();

    // Set up input handling
    this.setupInput();

    // Create hover tooltip
    this.createHoverTooltip();

    // Perform final system integration check
    this.time.delayedCall(1000, () => {
      this.performFinalSystemIntegration();
    });
  }

  update() {
    try {
      if (!this.gameStateManager.isInitialized()) return;

      // Update game state (separated from graphics)
      this.gameStateManager.update();

      // Update graphics based on game state
      const gameTime = this.gameStateManager.getTimeManager().getGameTime();
      const shouldUpdateVisuals = gameTime.totalTicks % 10 === 0; // Update visuals every 10 ticks

      if (shouldUpdateVisuals) {
        this.updateVillageTexts(this.gameStateManager.getVillages(), this.renderConfig);
        
        // Update map visuals if needed
        if (this.gameStateManager.getTimeManager().shouldUpdateVisuals()) {
          this.updateMapVisuals(this.gameStateManager.getMap(), this.renderConfig);
        }
      }
    } catch (error) {
      console.error("Map scene update loop error:", error);
    }
  }

  /**
   * Initialize graphics objects
   */
  private initializeGraphics(): void {
    // Map graphics
    this.mapGraphics = this.add.graphics();
    this.mapGraphics.setDepth(0);

    // Roads graphics
    this.roadsGraphics = this.add.graphics();
    this.roadsGraphics.setDepth(10);

    // Villages graphics
    this.villagesGraphics = this.add.graphics();
    this.villagesGraphics.setDepth(20);

    // Collection range graphics
    this.collectionRangeGraphics = this.add.graphics();
    this.collectionRangeGraphics.setDepth(50);

    // Selected tile graphics
    this.selectedTileGraphics = this.add.graphics();
    this.selectedTileGraphics.setDepth(60);
  }

  /**
   * Render all game elements
   */
  private renderAll(): void {
    this.renderMap(this.gameStateManager.getMap(), this.renderConfig);
    this.renderVillages(this.gameStateManager.getVillages(), this.renderConfig);
    this.renderRoads(this.gameStateManager.getRoads(), this.renderConfig);
    this.renderCollectionRanges(
      this.gameStateManager.getVillages(), 
      this.gameStateManager.getDisplayState().showCollectionRanges, 
      this.renderConfig
    );
    this.updateVillageTexts(this.gameStateManager.getVillages(), this.renderConfig);
  }

  // MapRenderer interface implementation
  renderMap(map: Tile[][], config: RenderConfig): void {
    if (!this.mapGraphics) return;
    this.mapGraphics.clear();
    this.renderMapTiles(map, config);
  }

  renderVillages(villages: Village[], config: RenderConfig): void {
    if (!this.villagesGraphics) return;
    this.villagesGraphics.clear();

    villages.forEach((v) => {
      this.villagesGraphics!.fillStyle(0xff0000);
      this.villagesGraphics!.fillCircle(
        v.x * config.tileSize + config.tileSize / 2, 
        v.y * config.tileSize + config.tileSize / 2, 
        6
      );
    });
  }

  renderRoads(roads: Road[], config: RenderConfig): void {
    if (!this.roadsGraphics) return;
    this.roadsGraphics.clear();

    roads.forEach((road) => {
      if (road.path.length === 0) return;

      const color = road.usage > 5 ? 0xffd700 : 0xaaaaaa;
      this.roadsGraphics!.lineStyle(2, color, 1.0);
      this.roadsGraphics!.beginPath();
      this.roadsGraphics!.moveTo(
        road.path[0].x * config.tileSize + config.tileSize / 2,
        road.path[0].y * config.tileSize + config.tileSize / 2
      );
      road.path.forEach((p) =>
        this.roadsGraphics!.lineTo(
          p.x * config.tileSize + config.tileSize / 2, 
          p.y * config.tileSize + config.tileSize / 2
        )
      );
      this.roadsGraphics!.strokePath();
    });
  }

  renderCollectionRanges(villages: Village[], show: boolean, config: RenderConfig): void {
    if (!this.collectionRangeGraphics) return;
    this.collectionRangeGraphics.clear();

    if (show) {
      villages.forEach((v) => {
        this.collectionRangeGraphics!.lineStyle(1, 0xff0000, 0.5);
        this.collectionRangeGraphics!.strokeCircle(
          v.x * config.tileSize + config.tileSize / 2,
          v.y * config.tileSize + config.tileSize / 2,
          v.collectionRadius * config.tileSize
        );
      });
    }
  }

  renderSelectedTile(tileX: number, tileY: number, config: RenderConfig): void {
    if (!this.selectedTileGraphics) return;
    this.selectedTileGraphics.clear();

    // Highlight selected tile
    this.selectedTileGraphics.lineStyle(2, 0xffff00, 1.0);
    this.selectedTileGraphics.strokeRect(
      tileX * config.tileSize, 
      tileY * config.tileSize, 
      config.tileSize, 
      config.tileSize
    );

    // Add corner markers
    this.selectedTileGraphics.fillStyle(0xffff00, 1.0);
    const markerSize = 2;
    this.selectedTileGraphics.fillRect(tileX * config.tileSize, tileY * config.tileSize, markerSize, markerSize);
    this.selectedTileGraphics.fillRect(tileX * config.tileSize + config.tileSize - markerSize, tileY * config.tileSize, markerSize, markerSize);
    this.selectedTileGraphics.fillRect(tileX * config.tileSize, tileY * config.tileSize + config.tileSize - markerSize, markerSize, markerSize);
    this.selectedTileGraphics.fillRect(
      tileX * config.tileSize + config.tileSize - markerSize,
      tileY * config.tileSize + config.tileSize - markerSize,
      markerSize,
      markerSize
    );
  }

  updateMapVisuals(map: Tile[][], config: RenderConfig): void {
    this.renderMapTiles(map, config);
    this.renderRoads(this.gameStateManager.getRoads(), config);
  }

  clear(): void {
    this.mapGraphics?.clear();
    this.roadsGraphics?.clear();
    this.villagesGraphics?.clear();
    this.collectionRangeGraphics?.clear();
    this.selectedTileGraphics?.clear();
  }

  /**
   * Render map tiles with visual effects
   */
  private renderMapTiles(map: Tile[][], config: RenderConfig): void {
    if (!this.mapGraphics) return;

    for (let y = 0; y < config.mapSize; y++) {
      for (let x = 0; x < config.mapSize; x++) {
        const tile = map[y][x];

        // Determine base color
        let baseColor = 0x228b22; // Grassland
        if (tile.height < 0.3) baseColor = 0x1e90ff; // Sea
        else if (tile.height > 0.7) baseColor = 0x8b4513; // Mountain

        const resourceManager = this.gameStateManager.getResourceManager();
        if (resourceManager) {
          // Apply visual effects based on resource state
          const visualState = resourceManager.getVisualState(tile);
          const finalColor = this.applyVisualEffects(baseColor, visualState);

          this.mapGraphics.fillStyle(finalColor, visualState.opacity);
          this.mapGraphics.fillRect(x * config.tileSize, y * config.tileSize, config.tileSize, config.tileSize);

          // Show depletion indicator
          if (visualState.isDepleted) {
            this.renderDepletionIndicator(this.mapGraphics, x, y, visualState.recoveryProgress, config);
          }
        }
      }
    }
  }

  /**
   * Apply visual effects to base color
   */
  private applyVisualEffects(baseColor: number, visualState: any): number {
    if (visualState.isDepleted) {
      const baseColorObj = Phaser.Display.Color.ValueToColor(baseColor);
      const targetColorObj = Phaser.Display.Color.ValueToColor(0xff4444);
      const interpolatedColor = Phaser.Display.Color.Interpolate.ColorWithColor(
        baseColorObj,
        targetColorObj,
        1,
        visualState.recoveryProgress
      );
      return Phaser.Display.Color.GetColor(interpolatedColor.r, interpolatedColor.g, interpolatedColor.b);
    }
    return baseColor;
  }

  /**
   * Render depletion indicator
   */
  private renderDepletionIndicator(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    recoveryProgress: number,
    config: RenderConfig
  ): void {
    const alpha = 0.7 * (1 - recoveryProgress);
    graphics.fillStyle(0xff0000, alpha);
    graphics.fillRect(x * config.tileSize, y * config.tileSize, config.tileSize, config.tileSize);
  }

  // UIRenderer interface implementation
  showTooltip(x: number, y: number, content: string): void {
    if (!this.hoverTooltip || !this.hoverTooltipText) return;
    
    this.hoverTooltipText.setText(content);
    this.hoverTooltip.setPosition(x, y);
    this.hoverTooltip.setVisible(true);
  }

  hideTooltip(): void {
    if (this.hoverTooltip) {
      this.hoverTooltip.setVisible(false);
    }
  }

  updateVillageTexts(villages: Village[], config: RenderConfig): void {
    // Clear existing texts
    this.villageTexts.forEach(text => text.destroy());
    this.villageTexts = [];

    // Create new texts
    this.villageTexts = villages.map((v) => {
      const text = `Pop:${v.population}\nF:${Math.floor(v.storage.food)} W:${Math.floor(v.storage.wood)} O:${Math.floor(v.storage.ore)}`;

      const textObj = this.add.text(
        v.x * config.tileSize + config.tileSize / 2, 
        v.y * config.tileSize - 5, 
        text, 
        {
          fontSize: "12px",
          fontFamily: "Arial",
          color: "#ffffff",
          backgroundColor: "#000000",
          padding: { x: 4, y: 2 },
        }
      );

      textObj.setOrigin(0.5, 1);
      textObj.setDepth(100);

      return textObj;
    });
  }

  setVisible(visible: boolean): void {
    this.scene.setVisible(visible);
  }

  /**
   * Show hover tooltip for a specific tile
   */
  private showHoverTooltipForTile(mouseX: number, mouseY: number, tileX: number, tileY: number): void {
    const tileInfo = this.gameStateManager.getTileInfo(tileX, tileY);
    if (!tileInfo) return;

    const { tile } = tileInfo;
    const resourceManager = this.gameStateManager.getResourceManager();
    if (!resourceManager) return;

    const visualState = resourceManager.getVisualState(tile);

    const tooltipInfo = [
      `Tile (${tileX}, ${tileY}) - ${tile.type}`,
      "",
      "Resources:",
      `Food: ${tile.resources.food.toFixed(1)}/${tile.maxResources.food}`,
      `Wood: ${tile.resources.wood.toFixed(1)}/${tile.maxResources.wood}`,
      `Ore: ${tile.resources.ore.toFixed(1)}/${tile.maxResources.ore}`,
      "",
      `Depletion: ${((1 - visualState.recoveryProgress) * 100).toFixed(0)}%`,
    ];

    // Convert screen coordinates to world coordinates for tooltip positioning
    const worldPoint = this.cameras.main.getWorldPoint(mouseX, mouseY);
    const tooltipX = tileX * this.renderConfig.tileSize + this.renderConfig.tileSize;
    const tooltipY = tileY * this.renderConfig.tileSize;

    this.showTooltip(tooltipX, tooltipY, tooltipInfo.join("\n"));
  }

  // CameraController interface implementation
  setZoom(zoom: number): void {
    this.cameraZoom = Phaser.Math.Clamp(zoom, this.minZoom, this.maxZoom);
    this.cameras.main.setZoom(this.cameraZoom);
  }

  getZoom(): number {
    return this.cameraZoom;
  }

  centerOn(x: number, y: number): void {
    this.cameras.main.centerOn(x, y);
  }

  getCameraInfo(): CameraInfo {
    const camera = this.cameras.main;
    const centerX = camera.scrollX + this.screenWidth / 2;
    const centerY = camera.scrollY + this.screenHeight / 2;

    return {
      zoom: this.cameraZoom,
      centerX,
      centerY,
      bounds: {
        left: camera.scrollX,
        right: camera.scrollX + this.screenWidth,
        top: camera.scrollY,
        bottom: camera.scrollY + this.screenHeight,
      },
    };
  }

  resetCamera(): void {
    this.cameraZoom = 1.0;
    this.cameras.main.setZoom(this.cameraZoom);
    this.centerMapOnScreen();
    this.stopCameraPan();
  }

  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    const camera = this.cameras.main;
    return {
      x: (worldX - camera.scrollX) * this.cameraZoom,
      y: (worldY - camera.scrollY) * this.cameraZoom
    };
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const worldPoint = this.cameras.main.getWorldPoint(screenX, screenY);
    return { x: worldPoint.x, y: worldPoint.y };
  }

  // InputHandler interface implementation
  onTileClick(callback: (tileX: number, tileY: number, button: 'left' | 'right') => void): void {
    // This would be implemented if we need external tile click handling
  }

  onTileHover(callback: (tileX: number, tileY: number) => void): void {
    // This would be implemented if we need external tile hover handling
  }

  onKeyPress(key: string, callback: () => void): void {
    this.input.keyboard?.on(`keydown-${key}`, callback);
  }

  onZoom(callback: (delta: number, pointer: { x: number; y: number }) => void): void {
    // This would be implemented if we need external zoom handling
  }

  onPan(callback: (deltaX: number, deltaY: number) => void): void {
    // This would be implemented if we need external pan handling
  }

  /**
   * 入力設定
   */
  setupInput(): void {
    // キーボード入力設定
    this.input.keyboard?.on("keydown-R", () => {
      const currentState = this.gameStateManager.getDisplayState().showCollectionRanges;
      this.gameStateManager.setShowCollectionRanges(!currentState);
      this.renderCollectionRanges(
        this.gameStateManager.getVillages(), 
        !currentState, 
        this.renderConfig
      );
    });

    this.input.keyboard?.on("keydown-Z", () => {
      this.resetCamera();
    });

    // キーボードでのズーム操作
    this.input.keyboard?.on("keydown-EQUAL", () => {
      const centerPointer = {
        x: this.screenWidth / 2,
        y: this.screenHeight / 2,
      };
      this.handleZoom(-100, centerPointer as Phaser.Input.Pointer);
    });

    this.input.keyboard?.on("keydown-MINUS", () => {
      if (this.input.keyboard?.checkDown(this.input.keyboard.addKey("SHIFT"))) {
        const centerPointer = {
          x: this.screenWidth / 2,
          y: this.screenHeight / 2,
        };
        this.handleZoom(100, centerPointer as Phaser.Input.Pointer);
      }
    });

    // マウス入力設定
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      this.handleCameraPan(pointer);
      this.handleTileHover(pointer);
    });

    // マウスホイールでズーム
    this.input.on(
      "wheel",
      (
        pointer: Phaser.Input.Pointer,
        gameObjects: Phaser.GameObjects.GameObject[],
        deltaX: number,
        deltaY: number,
        deltaZ: number
      ) => {
        this.handleZoom(deltaY, pointer);
      }
    );

    // 中クリックでパン開始/終了
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.middleButtonDown()) {
        this.startCameraPan(pointer);
      } else {
        this.handleTileClick(pointer);
        this.handleResourceInfoClick(pointer);
      }
    });

    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 1) {
        // 中クリック
        this.stopCameraPan();
      }
    });
  }





  /**
   * カメラ設定
   */
  setupCamera(): void {
    // 初期ズームを1.0に設定
    this.cameraZoom = 1.0;
    this.cameras.main.setZoom(this.cameraZoom);

    // マップを画面中央に配置
    this.centerMapOnScreen();
  }

  /**
   * マップ中央をカメラ中心に配置
   */
  centerMapOnScreen(): void {
    const mapWidth = MAP_SIZE * TILE_SIZE;
    const mapHeight = MAP_SIZE * TILE_SIZE;

    // マップの中央座標を計算
    const mapCenterX = mapWidth / 2;
    const mapCenterY = mapHeight / 2;

    // カメラをマップ中央に向ける
    this.cameras.main.centerOn(mapCenterX, mapCenterY);
  }



  /**
   * ズーム処理（マウス位置を中心にズーム）
   */
  handleZoom(deltaY: number, pointer: Phaser.Input.Pointer): void {
    // ホイールの回転量に基づいてズーム量を調整
    const wheelSensitivity = 0.001;
    const zoomFactor = 1 - deltaY * wheelSensitivity;

    const oldZoom = this.cameraZoom;
    const newZoom = Phaser.Math.Clamp(this.cameraZoom * zoomFactor, this.minZoom, this.maxZoom);

    if (newZoom !== oldZoom) {
      // ズーム前のマウス位置のワールド座標を取得
      const camera = this.cameras.main;

      // 新しいズームレベルを適用
      this.cameraZoom = newZoom;
      camera.setZoom(newZoom);
    }
  }

  /**
   * カメラパン開始
   */
  startCameraPan(pointer: Phaser.Input.Pointer): void {
    this.isDragging = true;
    this.lastPointerPosition = { x: pointer.x, y: pointer.y };
    this.input.setDefaultCursor("grabbing");
  }

  /**
   * カメラパン終了
   */
  stopCameraPan(): void {
    this.isDragging = false;
    this.input.setDefaultCursor("default");
  }

  /**
   * カメラパン処理
   */
  handleCameraPan(pointer: Phaser.Input.Pointer): void {
    if (!this.isDragging || !pointer.middleButtonDown()) {
      return;
    }

    const deltaX = pointer.x - this.lastPointerPosition.x;
    const deltaY = pointer.y - this.lastPointerPosition.y;

    // ズームレベルに応じてパン速度を調整
    const panSpeed = 1 / this.cameraZoom;

    const camera = this.cameras.main;
    const newScrollX = camera.scrollX - deltaX * panSpeed;
    const newScrollY = camera.scrollY - deltaY * panSpeed;

    camera.setScroll(newScrollX, newScrollY);

    this.lastPointerPosition = { x: pointer.x, y: pointer.y };
  }

  /**
   * ウィンドウリサイズ処理
   */
  handleResize(gameSize: Phaser.Structs.Size): void {
    this.screenWidth = gameSize.width;
    this.screenHeight = gameSize.height;

    // カメラサイズを更新
    this.cameras.main.setSize(this.screenWidth, this.screenHeight);
  }





  /**
   * システム統合の最終チェック
   */
  performFinalSystemIntegration(): void {
    try {
      // 村とマップの整合性チェック
      this.getVillages().forEach((village, index) => {
        if (village.x < 0 || village.x >= MAP_SIZE || village.y < 0 || village.y >= MAP_SIZE) {
          console.warn(`Village ${index} is outside map bounds`);
        }
      });

      // 道の整合性チェック
      this.getRoads().forEach((road, index) => {
        if (road.path.length === 0) {
          console.warn(`Road ${index} has empty path`);
        }
      });

      console.log("Map scene system integration check completed");
    } catch (error) {
      console.error("System integration error:", error);
    }
  }

  /**
   * 更新エラーハンドリング
   */
  handleUpdateError(error: any): void {
    console.error("Map scene update error details:", {
      error: error.message || error,
      stack: error.stack,
      villageCount: this.getVillages().length,
      roadCount: this.getRoads().length,
      mapSize: `${MAP_SIZE}x${MAP_SIZE}`,
    });
  }





  /**
   * タイルクリック処理
   */
  handleTileClick(pointer: Phaser.Input.Pointer): void {
    const divineState = this.gameStateManager.getDisplayState().divineState;
    if (!divineState.isActive) return;

    // クリック位置をワールド座標に変換してからタイル座標に変換
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tileX = Math.floor(worldPoint.x / this.renderConfig.tileSize);
    const tileY = Math.floor(worldPoint.y / this.renderConfig.tileSize);

    // マップ範囲内かチェック
    if (tileX < 0 || tileX >= this.renderConfig.mapSize || tileY < 0 || tileY >= this.renderConfig.mapSize) return;

    // タイルを選択
    this.gameStateManager.setDivineState({ selectedTile: { x: tileX, y: tileY } });
    this.renderSelectedTile(tileX, tileY, this.renderConfig);

    // UISceneのタイル情報を更新
    const uiScene = this.scene.get("UIScene") as any;
    if (uiScene && uiScene.updateTileInfo) {
      uiScene.updateTileInfo();
    }

    // 右クリックまたはShift+クリックで資源調整を実行
    if (pointer.rightButtonDown() || pointer.event.shiftKey) {
      this.gameStateManager.performDivineIntervention(tileX, tileY);
    }
  }

  /**
   * タイルホバー処理
   */
  handleTileHover(pointer: Phaser.Input.Pointer): void {
    // カメラパン中は処理しない
    if (this.isDragging) return;

    // クリック位置をワールド座標に変換してからタイル座標に変換
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tileX = Math.floor(worldPoint.x / this.renderConfig.tileSize);
    const tileY = Math.floor(worldPoint.y / this.renderConfig.tileSize);

    // マップ範囲内かチェック
    if (tileX < 0 || tileX >= this.renderConfig.mapSize || tileY < 0 || tileY >= this.renderConfig.mapSize) {
      this.gameStateManager.setResourceInfoState({ hoveredTile: null });
      this.hideTooltip();
      return;
    }

    // ホバー状態を更新
    this.gameStateManager.setResourceInfoState({ hoveredTile: { x: tileX, y: tileY } });

    // 詳細モードでない場合はツールチップを表示
    const resourceInfoState = this.gameStateManager.getDisplayState().resourceInfoState;
    if (!resourceInfoState.isDetailedMode) {
      this.showHoverTooltipForTile(pointer.x, pointer.y, tileX, tileY);
    } else {
      this.hideTooltip();
    }
  }

  /**
   * Resource Info クリック処理
   */
  handleResourceInfoClick(pointer: Phaser.Input.Pointer): void {
    // Divine Interventionモードがアクティブな場合は処理しない
    const mainScene = this.scene.get("MainScene") as any;
    if (mainScene && mainScene.divineState.isActive) return;

    // クリック位置をワールド座標に変換してからタイル座標に変換
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tileX = Math.floor(worldPoint.x / TILE_SIZE);
    const tileY = Math.floor(worldPoint.y / TILE_SIZE);

    // マップ範囲内かチェック
    if (tileX < 0 || tileX >= MAP_SIZE || tileY < 0 || tileY >= MAP_SIZE) {
      this.getResourceInfoState().selectedTile = null;
      return;
    }

    // 詳細モードの場合のみタイル選択を処理
    if (this.getResourceInfoState().isDetailedMode) {
      this.getResourceInfoState().selectedTile = { x: tileX, y: tileY };
    }
  }

  /**
   * ホバーツールチップ作成
   */
  createHoverTooltip(): void {
    // ホバーツールチップコンテナ
    this.hoverTooltip = this.add.container(0, 0);
    this.hoverTooltip.setDepth(1003);
    // カメラの影響を受けるように変更（ワールド座標で配置）
    this.hoverTooltip.setScrollFactor(1);

    // ツールチップ背景
    const tooltipBg = this.add.graphics();
    tooltipBg.fillStyle(0x000000, 0.9);
    tooltipBg.fillRoundedRect(0, 0, 200, 100, 3);
    tooltipBg.lineStyle(1, 0x666666, 1.0);
    tooltipBg.strokeRoundedRect(0, 0, 200, 100, 3);
    this.hoverTooltip.add(tooltipBg);

    // ツールチップテキスト
    this.hoverTooltipText = this.add.text(5, 5, "", {
      fontSize: "10px",
      fontFamily: "Arial",
      color: "#ffffff",
      wordWrap: { width: 190 },
    });
    this.hoverTooltip.add(this.hoverTooltipText);

    // 初期状態では非表示
    this.hoverTooltip.setVisible(false);
  }

  /**
   * ホバーツールチップ表示
   */
  showHoverTooltip(_mouseX: number, _mouseY: number, tileX: number, tileY: number): void {
    if (!this.hoverTooltip || !this.hoverTooltipText) return;

    const tile = this.getMap()[tileY][tileX];

    const resourceManager = this.getResourceManager();
    if (!resourceManager) return;
    const visualState = resourceManager.getVisualState(tile);

    // ツールチップ内容を作成
    const tooltipInfo = [
      `Tile (${tileX}, ${tileY}) - ${tile.type}`,
      "",
      "Resources:",
      `Food: ${tile.resources.food.toFixed(1)}/${tile.maxResources.food}`,
      `Wood: ${tile.resources.wood.toFixed(1)}/${tile.maxResources.wood}`,
      `Ore: ${tile.resources.ore.toFixed(1)}/${tile.maxResources.ore}`,
      "",
      `Depletion: ${((1 - visualState.recoveryProgress) * 100).toFixed(0)}%`,
    ];

    this.hoverTooltipText.setText(tooltipInfo.join("\n"));

    // ワールド座標でツールチップを配置
    // タイルの右上角に表示
    const tooltipX = tileX * TILE_SIZE + TILE_SIZE;
    const tooltipY = tileY * TILE_SIZE;

    this.hoverTooltip.setPosition(tooltipX, tooltipY);
    this.hoverTooltip.setVisible(true);
  }












  // Public getters for other scenes to access game state (backward compatibility)
  getMap(): Tile[][] {
    return this.gameStateManager.getMap();
  }

  getVillages(): Village[] {
    return this.gameStateManager.getVillages();
  }

  getRoads(): Road[] {
    return this.gameStateManager.getRoads();
  }

  getResourceManager() {
    return this.gameStateManager.getResourceManager();
  }

  getTimeManager() {
    return this.gameStateManager.getTimeManager();
  }

  getResourceInfoState() {
    return this.gameStateManager.getDisplayState().resourceInfoState;
  }

  getDivineState() {
    return this.gameStateManager.getDisplayState().divineState;
  }

  getSelectedTileInfo() {
    return this.gameStateManager.getSelectedTileInfo();
  }

  getHoveredTileInfo() {
    return this.gameStateManager.getHoveredTileInfo();
  }

  // Methods for UI Scene to control display state
  setDivineState(state: any): void {
    this.gameStateManager.setDivineState(state);
    
    // Update visual representation if needed
    const selectedTile = this.gameStateManager.getDisplayState().divineState.selectedTile;
    if (selectedTile) {
      this.renderSelectedTile(selectedTile.x, selectedTile.y, this.renderConfig);
    } else {
      this.selectedTileGraphics?.clear();
    }
  }

  setResourceInfoState(state: any): void {
    this.gameStateManager.setResourceInfoState(state);
  }

  // Focus camera on a specific tile
  focusOnTile(tileX: number, tileY: number): void {
    const worldX = tileX * this.renderConfig.tileSize + this.renderConfig.tileSize / 2;
    const worldY = tileY * this.renderConfig.tileSize + this.renderConfig.tileSize / 2;
    this.centerOn(worldX, worldY);
  }
}
