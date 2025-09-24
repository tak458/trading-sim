// src/map-scene.ts
import Phaser from "phaser";
import { generateMap, Tile } from "./map";
import { Village, createVillages, updateVillages } from "./village";
import { buildRoads, updateRoads, Road } from "./trade";
import { ResourceManager } from "./resource-manager";
import { TimeManager } from "./time-manager";

const TILE_SIZE = 8;
const MAP_SIZE = 64;

export class MapScene extends Phaser.Scene {
  // Map and game objects
  map: Tile[][] = [];
  villages: Village[] = [];
  roads: Road[] = [];
  villageTexts: Phaser.GameObjects.Text[] = [];

  // Graphics objects
  mapGraphics?: Phaser.GameObjects.Graphics;
  roadsGraphics?: Phaser.GameObjects.Graphics;
  villagesGraphics?: Phaser.GameObjects.Graphics;
  collectionRangeGraphics?: Phaser.GameObjects.Graphics;
  selectedTileGraphics?: Phaser.GameObjects.Graphics;

  // Managers
  resourceManager: ResourceManager;
  timeManager: TimeManager;

  // Display options
  showCollectionRanges: boolean = false;

  // Camera control
  cameraZoom: number = 1.0;
  minZoom: number = 0.25;
  maxZoom: number = 4.0;
  zoomStep: number = 0.1;
  isDragging: boolean = false;
  lastPointerPosition: { x: number; y: number } = { x: 0, y: 0 };

  // Screen dimensions
  screenWidth: number = 0;
  screenHeight: number = 0;

  // Resource Information Display State (moved from MainScene)
  resourceInfoState: {
    isDetailedMode: boolean;
    hoveredTile: { x: number; y: number } | null;
    selectedTile: { x: number; y: number } | null;
  } = {
      isDetailedMode: false,
      hoveredTile: null,
      selectedTile: null
    };

  // Tooltip UI (moved from MainScene)
  hoverTooltip?: Phaser.GameObjects.Container;
  hoverTooltipText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'MapScene' });
  }

  create() {
    // 画面サイズを取得
    this.screenWidth = this.cameras.main.width;
    this.screenHeight = this.cameras.main.height;

    // リサイズイベントを設定
    this.scale.on('resize', this.handleResize, this);

    // TimeManager初期化
    this.timeManager = new TimeManager();

    // ResourceManager初期化
    this.resourceManager = new ResourceManager();

    // URLパラメータからシード値を取得
    const urlParams = new URLSearchParams(window.location.search);
    const seedParam = urlParams.get('seed');
    const seed = seedParam ? parseInt(seedParam, 10) : undefined;

    // マップ生成（シード値指定可能）
    this.map = generateMap(MAP_SIZE, seed);

    // シード値をコンソールに出力
    if (seed !== undefined) {
      console.log(`Map generated with seed: ${seed}`);
    } else {
      console.log('Map generated with random seed');
    }

    // 村生成
    this.villages = createVillages(this.map, 6);

    // 道生成 (最近傍 + ブレゼンハム直線)
    this.roads = buildRoads(this.map, this.villages);

    // カメラの初期設定
    this.setupCamera();

    // マップ描画
    this.renderMap();
    this.renderCollectionRanges();

    // 村ストック表示用テキスト（マップ描画後に作成）
    this.villageTexts = this.villages.map((v) => {
      const initialText = `Pop:${v.population}\nF:${v.storage.food} W:${v.storage.wood} O:${v.storage.ore}`;

      const textObj = this.add.text(
        v.x * TILE_SIZE + TILE_SIZE / 2,
        v.y * TILE_SIZE - 5,
        initialText,
        {
          fontSize: "12px",
          fontFamily: "Arial",
          color: "#ffffff",
          backgroundColor: "#000000",
          padding: { x: 4, y: 2 }
        }
      );

      textObj.setOrigin(0.5, 1);
      textObj.setDepth(100);

      return textObj;
    });

    // 収集範囲描画用グラフィックス
    this.collectionRangeGraphics = this.add.graphics();
    this.collectionRangeGraphics.setDepth(50); // 村より下、地形より上

    // 選択タイル描画用グラフィックス
    this.selectedTileGraphics = this.add.graphics();
    this.selectedTileGraphics.setDepth(60);

    // ホバーツールチップ作成
    this.createHoverTooltip();

    // 入力設定
    this.setupInput();

    // システム統合の最終チェックを実行
    this.time.delayedCall(1000, () => {
      this.performFinalSystemIntegration();
    });
  }

  update() {
    const updateStartTime = performance.now();

    try {
      // 時間システムを更新
      this.timeManager.update();

      // ResourceManagerに現在のティックを通知
      const gameTime = this.timeManager.getGameTime();
      this.resourceManager.updateTick(gameTime.totalTicks);

      // 時間ベースの処理を実行
      this.updateTimeBasedSystems();

      // 村ストック表示の更新（フレームレート制限）
      const shouldUpdateVillageText = gameTime.totalTicks % 10 === 0; // 1秒に1回更新

      if (shouldUpdateVillageText) {
        this.updateVillageTexts();
      }

    } catch (error) {
      console.error('Map scene update loop error:', error);
      // エラーが発生してもゲームを継続
      this.handleUpdateError(error);
    }
  }

  /**
   * 入力設定
   */
  setupInput(): void {
    // キーボード入力設定
    this.input.keyboard?.on('keydown-R', () => {
      this.showCollectionRanges = !this.showCollectionRanges;
      this.renderCollectionRanges();
    });

    this.input.keyboard?.on('keydown-Z', () => {
      this.resetCamera();
    });

    // キーボードでのズーム操作
    this.input.keyboard?.on('keydown-EQUAL', () => {
      const centerPointer = {
        x: this.screenWidth / 2,
        y: this.screenHeight / 2
      };
      this.handleZoom(-100, centerPointer as Phaser.Input.Pointer);
    });

    this.input.keyboard?.on('keydown-MINUS', () => {
      if (this.input.keyboard?.checkDown(this.input.keyboard.addKey('SHIFT'))) {
        const centerPointer = {
          x: this.screenWidth / 2,
          y: this.screenHeight / 2
        };
        this.handleZoom(100, centerPointer as Phaser.Input.Pointer);
      }
    });

    // マウス入力設定
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.handleCameraPan(pointer);
      this.handleTileHover(pointer);
    });

    // マウスホイールでズーム
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[], deltaX: number, deltaY: number, deltaZ: number) => {
      this.handleZoom(deltaY, pointer);
    });

    // 中クリックでパン開始/終了
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.middleButtonDown()) {
        this.startCameraPan(pointer);
      } else {
        this.handleResourceInfoClick(pointer);
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 1) { // 中クリック
        this.stopCameraPan();
      }
    });
  }

  /**
   * 時間ベースのシステム更新
   */
  updateTimeBasedSystems(): void {
    // 資源回復処理（時間ベース）
    if (this.timeManager.shouldUpdateResources()) {
      this.updateResourcesTimeBasedOptimized();
    }

    // 村の更新（時間ベース）
    if (this.timeManager.shouldUpdateVillages()) {
      this.updateVillagesWithErrorHandling();
    }

    // 交易処理（時間ベース）
    if (this.timeManager.shouldExecuteTrade()) {
      updateRoads(this.roads);
    }

    // 視覚更新（時間ベース）
    if (this.timeManager.shouldUpdateVisuals()) {
      this.updateMapVisuals();
    }
  }

  /**
   * 時間ベースの資源更新処理（最適化版）
   */
  updateResourcesTimeBasedOptimized(): void {
    // 全タイルの資源回復を処理
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        try {
          this.resourceManager.updateRecovery(this.map[y][x]);
        } catch (error) {
          console.warn(`Resource recovery error at (${x}, ${y}):`, error);
        }
      }
    }
  }

  /**
   * エラーハンドリング付きの村更新処理
   */
  updateVillagesWithErrorHandling(): void {
    try {
      updateVillages(this.map, this.villages, this.roads, this.resourceManager, this.timeManager);
    } catch (error) {
      console.error('Village update error:', error);

      // 個別の村を安全に更新
      this.villages.forEach((village, index) => {
        try {
          // 村の基本的な整合性チェック
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
  }

  /**
   * 村テキストの更新
   */
  updateVillageTexts(): void {
    this.villages.forEach((v, i) => {
      if (this.villageTexts[i]) {
        try {
          const text = `Pop:${v.population}\nF:${Math.floor(v.storage.food)} W:${Math.floor(v.storage.wood)} O:${Math.floor(v.storage.ore)}`;
          this.villageTexts[i].setText(text);
        } catch (error) {
          console.warn(`Village text update error for village ${i}:`, error);
        }
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
   * カメラをリセット
   */
  resetCamera(): void {
    this.cameraZoom = 1.0;
    this.cameras.main.setZoom(this.cameraZoom);

    // マップ中央をカメラ中心に配置
    this.centerMapOnScreen();

    this.stopCameraPan();
  }

  /**
   * ズーム処理（マウス位置を中心にズーム）
   */
  handleZoom(deltaY: number, pointer: Phaser.Input.Pointer): void {
    // ホイールの回転量に基づいてズーム量を調整
    const wheelSensitivity = 0.001;
    const zoomFactor = 1 - (deltaY * wheelSensitivity);

    const oldZoom = this.cameraZoom;
    const newZoom = Phaser.Math.Clamp(
      this.cameraZoom * zoomFactor,
      this.minZoom,
      this.maxZoom
    );

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
    this.input.setDefaultCursor('grabbing');
  }

  /**
   * カメラパン終了
   */
  stopCameraPan(): void {
    this.isDragging = false;
    this.input.setDefaultCursor('default');
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
    const newScrollX = camera.scrollX - (deltaX * panSpeed);
    const newScrollY = camera.scrollY - (deltaY * panSpeed);

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
   * マップ描画
   */
  renderMap(): void {
    // マップタイル用グラフィックス
    this.mapGraphics = this.add.graphics();
    this.mapGraphics.setDepth(0);

    // 道用グラフィックス
    this.roadsGraphics = this.add.graphics();
    this.roadsGraphics.setDepth(10);

    // 村用グラフィックス
    this.villagesGraphics = this.add.graphics();
    this.villagesGraphics.setDepth(20);

    this.renderMapTiles();
    this.renderRoads();
    this.renderVillages();
  }

  renderMapTiles(): void {
    if (!this.mapGraphics) return;

    this.mapGraphics.clear();

    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const t = this.map[y][x];

        // 基本色を決定
        let baseColor = 0x228b22; // 草地
        if (t.height < 0.3) baseColor = 0x1e90ff; // 海
        else if (t.height > 0.7) baseColor = 0x8b4513; // 山

        // 資源状態に基づく視覚効果を適用
        const visualState = this.resourceManager.getVisualState(t);
        const finalColor = this.applyVisualEffects(baseColor, visualState);

        this.mapGraphics.fillStyle(finalColor, visualState.opacity);
        this.mapGraphics.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

        // 枯渇インジケーターを表示
        if (visualState.isDepleted) {
          this.renderDepletionIndicator(this.mapGraphics, x, y, visualState.recoveryProgress);
        }
      }
    }
  }

  renderRoads(): void {
    if (!this.roadsGraphics) return;

    this.roadsGraphics.clear();

    this.roads.forEach(road => {
      if (road.path.length === 0) return;

      const color = road.usage > 5 ? 0xffd700 : 0xaaaaaa;
      this.roadsGraphics!.lineStyle(2, color, 1.0);
      this.roadsGraphics!.beginPath();
      this.roadsGraphics!.moveTo(road.path[0].x * TILE_SIZE + TILE_SIZE / 2, road.path[0].y * TILE_SIZE + TILE_SIZE / 2);
      road.path.forEach(p => this.roadsGraphics!.lineTo(p.x * TILE_SIZE + TILE_SIZE / 2, p.y * TILE_SIZE + TILE_SIZE / 2));
      this.roadsGraphics!.strokePath();
    });
  }

  renderVillages(): void {
    if (!this.villagesGraphics) return;

    this.villagesGraphics.clear();

    this.villages.forEach(v => {
      this.villagesGraphics!.fillStyle(0xff0000);
      this.villagesGraphics!.fillCircle(
        v.x * TILE_SIZE + TILE_SIZE / 2,
        v.y * TILE_SIZE + TILE_SIZE / 2,
        6
      );
    });
  }

  renderCollectionRanges(): void {
    if (!this.collectionRangeGraphics) return;

    this.collectionRangeGraphics.clear();

    if (this.showCollectionRanges) {
      this.villages.forEach(v => {
        this.collectionRangeGraphics!.lineStyle(1, 0xff0000, 0.5);
        this.collectionRangeGraphics!.strokeCircle(
          v.x * TILE_SIZE + TILE_SIZE / 2,
          v.y * TILE_SIZE + TILE_SIZE / 2,
          v.collectionRadius * TILE_SIZE
        );
      });
    }
  }

  updateMapVisuals(): void {
    // マップタイルの視覚状態を更新
    this.renderMapTiles();

    // 道の使用状況が変わった場合は道も更新
    this.renderRoads();
  }

  /**
   * 視覚効果を適用
   */
  applyVisualEffects(baseColor: number, visualState: import("./resource-manager").ResourceVisualState): number {
    if (visualState.isDepleted) {
      // 枯渇時は赤みがかった色に
      return Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(baseColor),
        Phaser.Display.Color.ValueToColor(0xff4444),
        1,
        visualState.recoveryProgress
      );
    }

    return baseColor;
  }

  /**
   * 枯渇インジケーターを描画
   */
  renderDepletionIndicator(graphics: Phaser.GameObjects.Graphics, x: number, y: number, recoveryProgress: number): void {
    // 回復進行度に基づいて色を決定
    const alpha = 0.7 * (1 - recoveryProgress);
    graphics.fillStyle(0xff0000, alpha);
    graphics.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  }

  /**
   * システム統合の最終チェック
   */
  performFinalSystemIntegration(): void {
    try {
      // 村とマップの整合性チェック
      this.villages.forEach((village, index) => {
        if (village.x < 0 || village.x >= MAP_SIZE || village.y < 0 || village.y >= MAP_SIZE) {
          console.warn(`Village ${index} is outside map bounds`);
        }
      });

      // 道の整合性チェック
      this.roads.forEach((road, index) => {
        if (road.path.length === 0) {
          console.warn(`Road ${index} has empty path`);
        }
      });

      console.log('Map scene system integration check completed');
    } catch (error) {
      console.error('System integration error:', error);
    }
  }

  /**
   * 更新エラーハンドリング
   */
  handleUpdateError(error: any): void {
    console.error('Map scene update error details:', {
      error: error.message || error,
      stack: error.stack,
      villageCount: this.villages.length,
      roadCount: this.roads.length,
      mapSize: `${MAP_SIZE}x${MAP_SIZE}`
    });
  }

  /**
   * 指定座標にカメラを移動
   */
  focusOnTile(tileX: number, tileY: number): void {
    const worldX = tileX * TILE_SIZE + TILE_SIZE / 2;
    const worldY = tileY * TILE_SIZE + TILE_SIZE / 2;

    // 指定位置をカメラ中心に配置
    this.cameras.main.centerOn(worldX, worldY);
  }

  /**
   * 現在のカメラ情報を取得
   */
  getCameraInfo(): {
    zoom: number;
    centerX: number;
    centerY: number;
    bounds: { left: number; right: number; top: number; bottom: number };
  } {
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
        bottom: camera.scrollY + this.screenHeight
      }
    };
  }

  /**
   * タイルホバー処理 (moved from MainScene)
   */
  handleTileHover(pointer: Phaser.Input.Pointer): void {
    // カメラパン中は処理しない
    if (this.isDragging) return;

    // クリック位置をワールド座標に変換してからタイル座標に変換
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tileX = Math.floor(worldPoint.x / TILE_SIZE);
    const tileY = Math.floor(worldPoint.y / TILE_SIZE);

    // マップ範囲内かチェック
    if (tileX < 0 || tileX >= MAP_SIZE || tileY < 0 || tileY >= MAP_SIZE) {
      this.resourceInfoState.hoveredTile = null;
      if (this.hoverTooltip) {
        this.hoverTooltip.setVisible(false);
      }
      return;
    }

    // ホバー状態を更新
    this.resourceInfoState.hoveredTile = { x: tileX, y: tileY };

    // 詳細モードでない場合はツールチップを表示
    if (!this.resourceInfoState.isDetailedMode) {
      this.showHoverTooltip(pointer.x, pointer.y, tileX, tileY);
    } else {
      // 詳細モードの場合はツールチップを非表示
      if (this.hoverTooltip) {
        this.hoverTooltip.setVisible(false);
      }
    }
  }

  /**
   * Resource Info クリック処理 (moved from MainScene)
   */
  handleResourceInfoClick(pointer: Phaser.Input.Pointer): void {
    // Divine Interventionモードがアクティブな場合は処理しない
    const mainScene = this.scene.get('MainScene') as any;
    if (mainScene && mainScene.divineState.isActive) return;

    // クリック位置をワールド座標に変換してからタイル座標に変換
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tileX = Math.floor(worldPoint.x / TILE_SIZE);
    const tileY = Math.floor(worldPoint.y / TILE_SIZE);

    // マップ範囲内かチェック
    if (tileX < 0 || tileX >= MAP_SIZE || tileY < 0 || tileY >= MAP_SIZE) {
      this.resourceInfoState.selectedTile = null;
      return;
    }

    // 詳細モードの場合のみタイル選択を処理
    if (this.resourceInfoState.isDetailedMode) {
      this.resourceInfoState.selectedTile = { x: tileX, y: tileY };
    }
  }

  /**
   * ホバーツールチップ作成 (moved from MainScene)
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
      wordWrap: { width: 190 }
    });
    this.hoverTooltip.add(this.hoverTooltipText);

    // 初期状態では非表示
    this.hoverTooltip.setVisible(false);
  }

  /**
   * ホバーツールチップ表示 (moved from MainScene)
   */
  showHoverTooltip(_mouseX: number, _mouseY: number, tileX: number, tileY: number): void {
    if (!this.hoverTooltip || !this.hoverTooltipText) return;

    const tile = this.map[tileY][tileX];
    const visualState = this.resourceManager.getVisualState(tile);

    // ツールチップ内容を作成
    const tooltipInfo = [
      `Tile (${tileX}, ${tileY}) - ${tile.type}`,
      "",
      "Resources:",
      `Food: ${tile.resources.food.toFixed(1)}/${tile.maxResources.food}`,
      `Wood: ${tile.resources.wood.toFixed(1)}/${tile.maxResources.wood}`,
      `Ore: ${tile.resources.ore.toFixed(1)}/${tile.maxResources.ore}`,
      "",
      `Depletion: ${((1 - visualState.recoveryProgress) * 100).toFixed(0)}%`
    ];

    this.hoverTooltipText.setText(tooltipInfo.join("\n"));

    // ワールド座標でツールチップを配置
    // タイルの右上角に表示
    const tooltipX = tileX * TILE_SIZE + TILE_SIZE;
    const tooltipY = tileY * TILE_SIZE;

    this.hoverTooltip.setPosition(tooltipX, tooltipY);
    this.hoverTooltip.setVisible(true);
  }

  /**
   * Resource Info状態を設定 (called from MainScene)
   */
  setResourceInfoState(state: Partial<typeof this.resourceInfoState>): void {
    Object.assign(this.resourceInfoState, state);
  }

  /**
   * ホバーされたタイルの情報を取得 (called from MainScene)
   */
  getHoveredTileInfo(): { x: number; y: number; tile: Tile } | null {
    if (!this.resourceInfoState.hoveredTile) return null;

    const { x, y } = this.resourceInfoState.hoveredTile;
    return {
      x,
      y,
      tile: this.map[y][x]
    };
  }

  // Public getters for other scenes to access
  getMap(): Tile[][] { return this.map; }
  getVillages(): Village[] { return this.villages; }
  getRoads(): Road[] { return this.roads; }
  getResourceManager(): ResourceManager { return this.resourceManager; }
  getTimeManager(): TimeManager { return this.timeManager; }
  getResourceInfoState() { return this.resourceInfoState; }
}