// src/ui-scene.ts
import Phaser from "phaser";
import { Tile } from "../../game-systems/world/map";
import { MapScene } from "./map-scene";
import { VillageStatusUI } from "../ui/village-status-ui";
import { SupplyDemandBalancer } from "../../game-systems/economy/supply-demand-balancer";
import { getEconomyManagers } from "../../game-systems/world/village";

// Divine Intervention UI State Interface
interface DivineUIState {
  selectedTile: { x: number; y: number } | null;
  isActive: boolean;
  adjustmentMode: 'increase' | 'decrease' | 'set';
  selectedResource: keyof Tile['resources'] | 'all';
}

export class UIScene extends Phaser.Scene {
  // Screen dimensions
  screenWidth: number = 0;
  screenHeight: number = 0;

  // Divine Intervention State
  divineState: DivineUIState = {
    selectedTile: null,
    isActive: false,
    adjustmentMode: 'increase',
    selectedResource: 'all'
  };

  // Resource Information Display State
  resourceInfoState: {
    isDetailedMode: boolean;
  } = {
      isDetailedMode: false
    };

  // UI要素
  titleText?: Phaser.GameObjects.Text;
  instructionTexts: Phaser.GameObjects.Text[] = [];
  uiContainer?: Phaser.GameObjects.Container;

  // UI Elements
  divineUI?: Phaser.GameObjects.Container;
  tileInfoText?: Phaser.GameObjects.Text;

  // Resource Information UI Elements
  resourceInfoPanel?: Phaser.GameObjects.Container;
  resourceInfoText?: Phaser.GameObjects.Text;
  resourceInfoBackground?: Phaser.GameObjects.Graphics;

  // Performance Monitoring
  performanceMonitor?: Phaser.GameObjects.Container;
  performanceText?: Phaser.GameObjects.Text;
  showPerformanceMonitor: boolean = false;
  performanceStats = {
    frameCount: 0,
    lastFPSUpdate: 0,
    currentFPS: 60,
    updateTimes: [] as number[],
    averageUpdateTime: 0
  };

  // Time Display
  timeDisplay?: Phaser.GameObjects.Container;
  timeDisplayText?: Phaser.GameObjects.Text;
  showTimeDisplay: boolean = false;

  // Village Status UI
  villageStatusUI?: VillageStatusUI;
  showVillageStatus: boolean = false;
  lastStatusUIUpdateTime: number = 0;

  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    // 画面サイズを取得
    this.screenWidth = this.cameras.main.width;
    this.screenHeight = this.cameras.main.height;

    // 固定UI用のコンテナを作成
    this.uiContainer = this.add.container(0, 0);
    this.uiContainer.setDepth(1000); // 最前面に表示
    this.uiContainer.setScrollFactor(0); // カメラの影響を受けない

    // タイトル表示
    this.titleText = this.add.text(10, 10, "Trading Simulation", {
      fontSize: "16px",
      fontFamily: "Arial",
      color: "#ffffff",
      backgroundColor: "#000000",
      padding: { x: 4, y: 2 }
    });
    this.uiContainer.add(this.titleText);

    // 操作説明
    const instructions = [
      "Press 'R' to toggle collection ranges",
      "Press 'D' to toggle divine intervention mode",
      "Press 'I' to toggle detailed resource info",
      "Press 'P' to toggle performance monitor",
      "Press 'T' to toggle time display",
      "Press 'V' to toggle village status",
      "Press '+/-' to change game speed",
      "Mouse wheel: Zoom at cursor, Middle click + drag: Pan",
      "Press '=' to zoom in, Shift+'-' to zoom out",
      "Press 'Z' to reset camera to center",
      "Press 'H' to toggle this help"
    ];

    instructions.forEach((text, index) => {
      const instructionText = this.add.text(10, 35 + (index * 20), text, {
        fontSize: "12px",
        fontFamily: "Arial",
        color: "#ffffff",
        backgroundColor: "#000000",
        padding: { x: 4, y: 2 }
      });
      this.uiContainer?.add(instructionText);
      this.instructionTexts.push(instructionText);
    });

    // UI作成
    this.createDivineUI();
    this.createResourceInfoUI();
    this.createPerformanceMonitorUI();
    this.createTimeDisplayUI();
    this.createVillageStatusUI();

    // 入力設定
    this.setupInput();

    // リサイズイベントを設定
    this.scale.on('resize', this.handleResize, this);

    // 初期状態では操作説明を表示
    this.showInstructions(true);
  }

  update() {
    const updateStartTime = performance.now();

    try {
      // UI更新
      if (this.showTimeDisplay) {
        this.updateTimeDisplayUI();
      }

      // Village Status UI更新（最適化された更新頻度制御）
      if (this.showVillageStatus && this.villageStatusUI) {
        const mapScene = this.scene.get('MapScene') as MapScene;
        if (mapScene) {
          const villages = mapScene.getVillages();
          
          // 最終統合システムが利用可能な場合は最適化された更新を使用
          const economyManagers = getEconomyManagers();
          if (economyManagers.economyManager) {
            // 統合システムのUI更新制御を使用（実装は簡略化）
            const shouldUpdate = Date.now() - this.lastStatusUIUpdateTime > 2000; // 2秒間隔
            if (shouldUpdate) {
              this.villageStatusUI.updateVillageStatus(villages);
              this.lastStatusUIUpdateTime = Date.now();
            }
          } else {
            // フォールバック: 従来の更新
            this.villageStatusUI.updateVillageStatus(villages);
          }
        }
      }

      // パフォーマンス統計の更新
      this.updatePerformanceStats(updateStartTime);

    } catch (error) {
      console.error('UI scene update loop error:', error);
    }
  }

  /**
   * 操作説明の表示/非表示を切り替え
   */
  toggleInstructions(): void {
    const isVisible = this.instructionTexts[0]?.visible ?? true;
    this.showInstructions(!isVisible);
  }

  /**
   * 操作説明の表示/非表示を設定
   */
  showInstructions(show: boolean): void {
    this.instructionTexts.forEach(text => {
      text.setVisible(show);
    });
  }

  /**
   * ウィンドウリサイズ処理
   */
  handleResize(gameSize: Phaser.Structs.Size): void {
    this.screenWidth = gameSize.width;
    this.screenHeight = gameSize.height;

    // UI位置を更新
    this.updateUIPositions();
  }

  /**
   * タイトルテキストを更新
   */
  updateTitle(newTitle: string): void {
    if (this.titleText) {
      this.titleText.setText(newTitle);
    }
  }

  /**
   * 操作説明を動的に更新
   */
  updateInstructions(newInstructions: string[]): void {
    // 既存の操作説明を削除
    this.instructionTexts.forEach(text => {
      if (this.uiContainer) {
        this.uiContainer.remove(text);
      }
      text.destroy();
    });
    this.instructionTexts = [];

    // 新しい操作説明を追加
    newInstructions.forEach((text, index) => {
      const instructionText = this.add.text(10, 35 + (index * 20), text, {
        fontSize: "12px",
        fontFamily: "Arial",
        color: "#ffffff",
        backgroundColor: "#000000",
        padding: { x: 4, y: 2 }
      });
      if (this.uiContainer) {
        this.uiContainer.add(instructionText);
      }
      this.instructionTexts.push(instructionText);
    });
  }

  /**
   * 入力設定
   */
  setupInput(): void {
    // Divine Intervention関連
    this.input.keyboard?.on('keydown-D', () => {
      this.divineState.isActive = !this.divineState.isActive;
      const mapScene = this.scene.get('MapScene') as MapScene;
      if (mapScene) {
        mapScene.setDivineState({ isActive: this.divineState.isActive });
      }
      this.updateDivineUI();
    });

    // Resource Information関連
    this.input.keyboard?.on('keydown-I', () => {
      this.resourceInfoState.isDetailedMode = !this.resourceInfoState.isDetailedMode;
      const mapScene = this.scene.get('MapScene') as MapScene;
      if (mapScene) {
        mapScene.setResourceInfoState({ isDetailedMode: this.resourceInfoState.isDetailedMode });
      }
      this.updateResourceInfoUI();
    });

    // Performance Monitor関連
    this.input.keyboard?.on('keydown-P', () => {
      this.showPerformanceMonitor = !this.showPerformanceMonitor;
      this.updatePerformanceMonitorUI();
    });

    // Time Display関連
    this.input.keyboard?.on('keydown-T', () => {
      this.showTimeDisplay = !this.showTimeDisplay;
      this.updateTimeDisplayUI();
    });

    // Village Status関連
    this.input.keyboard?.on('keydown-V', () => {
      this.showVillageStatus = !this.showVillageStatus;
      this.updateVillageStatusUI();
    });

    // 'H'キーでヘルプの表示/非表示を切り替え
    this.input.keyboard?.on('keydown-H', () => {
      this.toggleInstructions();
    });
  }

  /**
   * Divine Intervention UI作成
   */
  createDivineUI() {
    // Divine Intervention UIコンテナを作成（画面右側に配置）
    this.divineUI = this.add.container(this.screenWidth - 220, 10);
    this.divineUI.setDepth(1001);
    this.divineUI.setScrollFactor(0); // カメラの影響を受けない

    // タイトル
    const title = this.add.text(0, 0, "Divine Intervention", {
      fontSize: "14px",
      fontFamily: "Arial",
      color: "#ffffff",
      backgroundColor: "#000080",
      padding: { x: 4, y: 2 }
    });
    this.divineUI.add(title);

    // 状態表示
    const statusText = this.add.text(0, 25, "Mode: OFF", {
      fontSize: "12px",
      fontFamily: "Arial",
      color: "#ffffff",
      backgroundColor: "#333333",
      padding: { x: 4, y: 2 }
    });
    this.divineUI.add(statusText);

    // 調整モード選択
    const modeTitle = this.add.text(0, 50, "Adjustment Mode:", {
      fontSize: "12px",
      fontFamily: "Arial",
      color: "#ffffff"
    });
    this.divineUI.add(modeTitle);

    // 増加ボタン
    const increaseBtn = this.add.text(0, 70, "[+] Increase", {
      fontSize: "11px",
      fontFamily: "Arial",
      color: "#00ff00",
      backgroundColor: "#004400",
      padding: { x: 4, y: 2 }
    }).setInteractive().on('pointerdown', () => {
      this.divineState.adjustmentMode = 'increase';
      const mapScene = this.scene.get('MapScene') as MapScene;
      if (mapScene) {
        mapScene.setDivineState({ adjustmentMode: 'increase' });
      }
      this.updateDivineUI();
    });
    this.divineUI.add(increaseBtn);

    // 減少ボタン
    const decreaseBtn = this.add.text(0, 90, "[-] Decrease", {
      fontSize: "11px",
      fontFamily: "Arial",
      color: "#ff4444",
      backgroundColor: "#440000",
      padding: { x: 4, y: 2 }
    }).setInteractive().on('pointerdown', () => {
      this.divineState.adjustmentMode = 'decrease';
      const mapScene = this.scene.get('MapScene') as MapScene;
      if (mapScene) {
        mapScene.setDivineState({ adjustmentMode: 'decrease' });
      }
      this.updateDivineUI();
    });
    this.divineUI.add(decreaseBtn);

    // 設定ボタン
    const setBtn = this.add.text(0, 110, "[=] Set Amount", {
      fontSize: "11px",
      fontFamily: "Arial",
      color: "#ffff00",
      backgroundColor: "#444400",
      padding: { x: 4, y: 2 }
    }).setInteractive().on('pointerdown', () => {
      this.divineState.adjustmentMode = 'set';
      const mapScene = this.scene.get('MapScene') as MapScene;
      if (mapScene) {
        mapScene.setDivineState({ adjustmentMode: 'set' });
      }
      this.updateDivineUI();
    });
    this.divineUI.add(setBtn);

    // 資源タイプ選択
    const resourceTitle = this.add.text(0, 140, "Resource Type:", {
      fontSize: "12px",
      fontFamily: "Arial",
      color: "#ffffff"
    });
    this.divineUI.add(resourceTitle);

    // 全資源ボタン
    const allBtn = this.add.text(0, 160, "All Resources", {
      fontSize: "11px",
      fontFamily: "Arial",
      color: "#ffffff",
      backgroundColor: "#666666",
      padding: { x: 4, y: 2 }
    }).setInteractive().on('pointerdown', () => {
      this.divineState.selectedResource = 'all';
      const mapScene = this.scene.get('MapScene') as MapScene;
      if (mapScene) {
        mapScene.setDivineState({ selectedResource: 'all' });
      }
      this.updateDivineUI();
    });
    this.divineUI.add(allBtn);

    // 食料ボタン
    const foodBtn = this.add.text(0, 180, "Food", {
      fontSize: "11px",
      fontFamily: "Arial",
      color: "#00ff00",
      backgroundColor: "#004400",
      padding: { x: 4, y: 2 }
    }).setInteractive().on('pointerdown', () => {
      this.divineState.selectedResource = 'food';
      const mapScene = this.scene.get('MapScene') as MapScene;
      if (mapScene) {
        mapScene.setDivineState({ selectedResource: 'food' });
      }
      this.updateDivineUI();
    });
    this.divineUI.add(foodBtn);

    // 木材ボタン
    const woodBtn = this.add.text(0, 200, "Wood", {
      fontSize: "11px",
      fontFamily: "Arial",
      color: "#8b4513",
      backgroundColor: "#2d1b06",
      padding: { x: 4, y: 2 }
    }).setInteractive().on('pointerdown', () => {
      this.divineState.selectedResource = 'wood';
      const mapScene = this.scene.get('MapScene') as MapScene;
      if (mapScene) {
        mapScene.setDivineState({ selectedResource: 'wood' });
      }
      this.updateDivineUI();
    });
    this.divineUI.add(woodBtn);

    // 鉱石ボタン
    const oreBtn = this.add.text(0, 220, "Ore", {
      fontSize: "11px",
      fontFamily: "Arial",
      color: "#c0c0c0",
      backgroundColor: "#404040",
      padding: { x: 4, y: 2 }
    }).setInteractive().on('pointerdown', () => {
      this.divineState.selectedResource = 'ore';
      const mapScene = this.scene.get('MapScene') as MapScene;
      if (mapScene) {
        mapScene.setDivineState({ selectedResource: 'ore' });
      }
      this.updateDivineUI();
    });
    this.divineUI.add(oreBtn);

    // タイル情報表示
    this.tileInfoText = this.add.text(0, 250, "Select a tile to view info", {
      fontSize: "11px",
      fontFamily: "Arial",
      color: "#ffffff",
      backgroundColor: "#333333",
      padding: { x: 4, y: 2 },
      wordWrap: { width: 150 }
    });
    this.divineUI.add(this.tileInfoText);

    // 初期状態でUIを非表示
    this.divineUI.setVisible(false);
  }
  /**

   * Divine Intervention UI更新
   */
  updateDivineUI() {
    if (!this.divineUI) return;

    // UIの表示/非表示を切り替え
    this.divineUI.setVisible(this.divineState.isActive);

    if (!this.divineState.isActive) {
      this.divineState.selectedTile = null;
      const mapScene = this.scene.get('MapScene') as MapScene;
      if (mapScene) {
        mapScene.setDivineState({ isActive: false, selectedTile: null });
      }
      return;
    }

    // 状態表示を更新
    const statusText = this.divineUI.list[1] as Phaser.GameObjects.Text;
    statusText.setText(`Mode: ${this.divineState.isActive ? 'ON' : 'OFF'}`);

    // ボタンの色を更新（選択状態を示す）
    const buttons = this.divineUI.list.slice(4, 7) as Phaser.GameObjects.Text[];
    buttons.forEach((btn, index) => {
      const modes = ['increase', 'decrease', 'set'];
      if (modes[index] === this.divineState.adjustmentMode) {
        btn.setStyle({ backgroundColor: "#ffffff", color: "#000000" });
      } else {
        const colors = ["#004400", "#440000", "#444400"];
        const textColors = ["#00ff00", "#ff4444", "#ffff00"];
        btn.setStyle({ backgroundColor: colors[index], color: textColors[index] });
      }
    });

    // 資源タイプボタンの色を更新
    const resourceButtons = this.divineUI.list.slice(9, 13) as Phaser.GameObjects.Text[];
    const resourceTypes = ['all', 'food', 'wood', 'ore'];
    resourceButtons.forEach((btn, index) => {
      if (resourceTypes[index] === this.divineState.selectedResource) {
        btn.setStyle({ backgroundColor: "#ffffff", color: "#000000" });
      } else {
        const colors = ["#666666", "#004400", "#2d1b06", "#404040"];
        const textColors = ["#ffffff", "#00ff00", "#8b4513", "#c0c0c0"];
        btn.setStyle({ backgroundColor: colors[index], color: textColors[index] });
      }
    });

    // タイル情報を更新
    this.updateTileInfo();
  }

  /**
   * タイル情報更新
   */
  updateTileInfo() {
    if (!this.tileInfoText) return;

    const mapScene = this.scene.get('MapScene') as MapScene;
    if (!mapScene) return;

    const selectedTileInfo = mapScene.getSelectedTileInfo();
    if (!selectedTileInfo) {
      this.tileInfoText.setText("Select a tile to view info");
      return;
    }

    const { x, y, tile } = selectedTileInfo;

    const info = [
      `Tile: (${x}, ${y})`,
      `Type: ${tile.type}`,
      `Height: ${tile.height.toFixed(2)}`,
      "",
      "Resources:",
      `Food: ${tile.resources.food.toFixed(1)}/${tile.maxResources.food}`,
      `Wood: ${tile.resources.wood.toFixed(1)}/${tile.maxResources.wood}`,
      `Ore: ${tile.resources.ore.toFixed(1)}/${tile.maxResources.ore}`,
      "",
      "Depletion State:",
      `Food: ${(tile.depletionState.food * 100).toFixed(1)}%`,
      `Wood: ${(tile.depletionState.wood * 100).toFixed(1)}%`,
      `Ore: ${(tile.depletionState.ore * 100).toFixed(1)}%`,
      "",
      "Right-click or Shift+click to adjust"
    ];

    this.tileInfoText.setText(info.join("\n"));
  }

  /**
   * Resource Information UI作成
   */
  createResourceInfoUI() {
    // Resource Information UIコンテナを作成（画面左下に配置）
    this.resourceInfoPanel = this.add.container(10, this.screenHeight - 200);
    this.resourceInfoPanel.setDepth(1002);
    this.resourceInfoPanel.setScrollFactor(0); // カメラの影響を受けない

    // 背景を作成
    this.resourceInfoBackground = this.add.graphics();
    this.resourceInfoBackground.fillStyle(0x000000, 0.8);
    this.resourceInfoBackground.fillRoundedRect(0, 0, 300, 180, 5);
    this.resourceInfoBackground.lineStyle(2, 0x444444, 1.0);
    this.resourceInfoBackground.strokeRoundedRect(0, 0, 300, 180, 5);
    this.resourceInfoPanel.add(this.resourceInfoBackground);

    // タイトル
    const title = this.add.text(10, 10, "Resource Information", {
      fontSize: "14px",
      fontFamily: "Arial",
      color: "#ffffff",
      fontStyle: "bold"
    });
    this.resourceInfoPanel.add(title);

    // モード表示
    const modeText = this.add.text(10, 30, "Mode: Basic (Press 'I' for detailed)", {
      fontSize: "11px",
      fontFamily: "Arial",
      color: "#cccccc"
    });
    this.resourceInfoPanel.add(modeText);

    // 資源情報表示テキスト
    this.resourceInfoText = this.add.text(10, 50, "Hover over a tile to see resource info", {
      fontSize: "11px",
      fontFamily: "Arial",
      color: "#ffffff",
      wordWrap: { width: 280 }
    });
    this.resourceInfoPanel.add(this.resourceInfoText);

    // 初期状態では非表示
    this.resourceInfoPanel.setVisible(false);
  }

  /**
   * Resource Information UI更新
   */
  updateResourceInfoUI() {
    if (!this.resourceInfoPanel) return;

    // モード表示を更新
    const modeText = this.resourceInfoPanel.list[2] as Phaser.GameObjects.Text;
    const modeLabel = this.resourceInfoState.isDetailedMode ? "Detailed" : "Basic";
    modeText.setText(`Mode: ${modeLabel} (Press 'I' to toggle)`);

    // パネルの表示/非表示を切り替え
    this.resourceInfoPanel.setVisible(this.resourceInfoState.isDetailedMode);
  }

  /**
   * Performance Monitor UI作成
   */
  createPerformanceMonitorUI(): void {
    // Performance Monitor UIコンテナを作成（画面右側中央に配置）
    this.performanceMonitor = this.add.container(this.screenWidth - 220, 350);
    this.performanceMonitor.setDepth(1004);
    this.performanceMonitor.setScrollFactor(0); // カメラの影響を受けない

    // 背景を作成
    const background = this.add.graphics();
    background.fillStyle(0x000000, 0.8);
    background.fillRoundedRect(0, 0, 200, 150, 5);
    background.lineStyle(2, 0x444444, 1.0);
    background.strokeRoundedRect(0, 0, 200, 150, 5);
    this.performanceMonitor.add(background);

    // タイトル
    const title = this.add.text(10, 10, "Performance Monitor", {
      fontSize: "14px",
      fontFamily: "Arial",
      color: "#ffffff",
      fontStyle: "bold"
    });
    this.performanceMonitor.add(title);

    // パフォーマンス情報表示テキスト
    this.performanceText = this.add.text(10, 35, "", {
      fontSize: "11px",
      fontFamily: "Arial",
      color: "#ffffff",
      wordWrap: { width: 180 }
    });
    this.performanceMonitor.add(this.performanceText);

    // 初期状態では非表示
    this.performanceMonitor.setVisible(false);
  }

  /**
   * Performance Monitor UI更新
   */
  updatePerformanceMonitorUI(): void {
    if (!this.performanceMonitor) return;
    this.performanceMonitor.setVisible(this.showPerformanceMonitor);
  }

  /**
   * Village Status UI作成
   */
  createVillageStatusUI() {
    // SupplyDemandBalancerのインスタンスを作成
    const supplyDemandBalancer = new SupplyDemandBalancer();
    
    // VillageStatusUIを作成
    this.villageStatusUI = new VillageStatusUI(this, supplyDemandBalancer);
    
    // 初期位置を設定（画面左側中央）
    this.villageStatusUI.updatePosition(10, this.screenHeight / 2 - 150);
  }

  /**
   * Village Status UI更新
   */
  updateVillageStatusUI() {
    if (!this.villageStatusUI) return;
    
    this.villageStatusUI.setVisible(this.showVillageStatus);
    
    // 表示状態が変わった時に即座に更新
    if (this.showVillageStatus) {
      const mapScene = this.scene.get('MapScene') as MapScene;
      if (mapScene) {
        const villages = mapScene.getVillages();
        this.villageStatusUI.updateVillageStatus(villages, true); // 強制更新
      }
    }
  }

  /**
   * Time Display UI作成
   */
  createTimeDisplayUI() {
    // Time Display UIコンテナを作成（画面右下に配置）
    this.timeDisplay = this.add.container(this.screenWidth - 300, this.screenHeight - 200);
    this.timeDisplay.setDepth(1005);
    this.timeDisplay.setScrollFactor(0); // カメラの影響を受けない

    // 背景を作成
    const background = this.add.graphics();
    background.fillStyle(0x000000, 0.8);
    background.fillRoundedRect(0, 0, 280, 180, 5);
    background.lineStyle(2, 0x444444, 1.0);
    background.strokeRoundedRect(0, 0, 280, 180, 5);
    this.timeDisplay.add(background);

    // タイトル
    const title = this.add.text(10, 10, "Game Time", {
      fontSize: "14px",
      fontFamily: "Arial",
      color: "#ffffff",
      fontStyle: "bold"
    });
    this.timeDisplay.add(title);

    // 時間情報表示テキスト
    this.timeDisplayText = this.add.text(10, 35, "", {
      fontSize: "11px",
      fontFamily: "Arial",
      color: "#ffffff",
      wordWrap: { width: 260 }
    });
    this.timeDisplay.add(this.timeDisplayText);

    // 初期状態では非表示
    this.timeDisplay.setVisible(false);
  }

  /**
   * Time Display UI更新
   */
  updateTimeDisplayUI() {
    if (!this.timeDisplay || !this.timeDisplayText) return;

    this.timeDisplay.setVisible(this.showTimeDisplay);

    if (this.showTimeDisplay) {
      const mapScene = this.scene.get('MapScene') as MapScene;
      if (!mapScene) return;

      const gameTime = mapScene.getTimeManager().getGameTime();
      const config = mapScene.getTimeManager().getConfig();
      const perfStats = mapScene.getTimeManager().getPerformanceStats();
      const cameraInfo = mapScene.getCameraInfo();

      const timeInfo = [
        `Time: ${mapScene.getTimeManager().getTimeString()}`,
        `Total Ticks: ${gameTime.totalTicks}`,
        `Total Seconds: ${gameTime.totalSeconds}`,
        `Total Minutes: ${gameTime.totalMinutes}`,
        "",
        `Game Speed: ${config.gameSpeed.toFixed(1)}x`,
        `TPS: ${config.ticksPerSecond}`,
        `Actual TPS: ${perfStats.actualTPS.toFixed(1)}`,
        "",
        `Camera Zoom: ${cameraInfo.zoom.toFixed(2)}x (${mapScene.minZoom}x - ${mapScene.maxZoom}x)`,
        `Camera Center: (${Math.round(cameraInfo.centerX)}, ${Math.round(cameraInfo.centerY)})`,
        `Zoom Range: ${((cameraInfo.zoom - mapScene.minZoom) / (mapScene.maxZoom - mapScene.minZoom) * 100).toFixed(0)}%`,
        "",
        `Scheduled Events: ${perfStats.scheduledEvents}`,
        `Interval Events: ${perfStats.intervalEvents}`
      ];

      this.timeDisplayText.setText(timeInfo.join("\n"));
    }
  }

  /**
   * UI位置を画面サイズに合わせて更新
   */
  updateUIPositions(): void {
    // Divine Intervention UI
    if (this.divineUI) {
      this.divineUI.setPosition(this.screenWidth - 220, 10);
    }

    // Resource Information UI
    if (this.resourceInfoPanel) {
      this.resourceInfoPanel.setPosition(10, this.screenHeight - 200);
    }

    // Performance Monitor UI
    if (this.performanceMonitor) {
      this.performanceMonitor.setPosition(this.screenWidth - 220, 350);
    }

    // Time Display UI
    if (this.timeDisplay) {
      this.timeDisplay.setPosition(this.screenWidth - 300, this.screenHeight - 200);
    }

    // Village Status UI
    if (this.villageStatusUI) {
      this.villageStatusUI.updatePosition(10, this.screenHeight / 2 - 150);
    }
  }

  /**
   * パフォーマンス統計の更新
   */
  updatePerformanceStats(updateStartTime: number): void {
    const updateEndTime = performance.now();
    const updateTime = updateEndTime - updateStartTime;

    // 更新時間の履歴を管理
    this.performanceStats.updateTimes.push(updateTime);
    if (this.performanceStats.updateTimes.length > 60) {
      this.performanceStats.updateTimes.shift();
    }

    // 平均更新時間を計算
    this.performanceStats.averageUpdateTime =
      this.performanceStats.updateTimes.reduce((sum, time) => sum + time, 0) /
      this.performanceStats.updateTimes.length;

    // FPS計算
    this.performanceStats.frameCount++;
    const now = updateEndTime;
    if (now - this.performanceStats.lastFPSUpdate >= 1000) {
      this.performanceStats.currentFPS =
        this.performanceStats.frameCount * 1000 / (now - this.performanceStats.lastFPSUpdate);
      this.performanceStats.frameCount = 0;
      this.performanceStats.lastFPSUpdate = now;
    }

    // パフォーマンスモニターの更新
    if (this.showPerformanceMonitor && this.performanceText) {
      const mapScene = this.scene.get('MapScene') as MapScene;
      const villageCount = mapScene ? mapScene.getVillages().length : 0;
      const roadCount = mapScene ? mapScene.getRoads().length : 0;

      const perfInfo = [
        `FPS: ${this.performanceStats.currentFPS.toFixed(1)}`,
        `Update Time: ${this.performanceStats.averageUpdateTime.toFixed(2)}ms`,
        `Villages: ${villageCount}`,
        `Roads: ${roadCount}`,
        "",
        "Memory Usage:",
        `Textures: ${Object.keys(this.textures.list).length}`,
        `Sounds: ${this.sound.getAllPlaying ? this.sound.getAllPlaying().length : 0}`,
        "",
        "Scene Status:",
        `Active Scenes: ${this.scene.manager.scenes.length}`,
        `Main Scene: ${this.scene.isActive('MainScene') ? 'Active' : 'Inactive'}`,
        `Map Scene: ${this.scene.isActive('MapScene') ? 'Active' : 'Inactive'}`,
        `UI Scene: Active`
      ];

      this.performanceText.setText(perfInfo.join("\n"));
    }
  }
}
