import Phaser from "phaser";
import { generateMap, Tile } from "./map";
import { Village, createVillages, updateVillages } from "./village";
import { buildRoads, updateRoads, Road } from "./trade";
import { ResourceManager } from "./resource-manager";

// Divine Intervention UI State Interface
interface DivineUIState {
  selectedTile: { x: number; y: number } | null;
  isActive: boolean;
  adjustmentMode: 'increase' | 'decrease' | 'set';
  selectedResource: keyof Tile['resources'] | 'all';
}

// Resource Information Display State Interface
interface ResourceInfoState {
  isDetailedMode: boolean;
  hoveredTile: { x: number; y: number } | null;
  selectedTile: { x: number; y: number } | null;
}

const TILE_SIZE = 8;
const MAP_SIZE = 64;

class MainScene extends Phaser.Scene {
  map: Tile[][] = [];
  villages: Village[] = [];
  roads: Road[] = [];
  villageTexts: Phaser.GameObjects.Text[] = [];
  showCollectionRanges: boolean = false;
  collectionRangeGraphics?: Phaser.GameObjects.Graphics;
  resourceManager: ResourceManager;
  mapGraphics?: Phaser.GameObjects.Graphics;
  roadsGraphics?: Phaser.GameObjects.Graphics;
  villagesGraphics?: Phaser.GameObjects.Graphics;
  
  // Divine Intervention State
  divineState: DivineUIState = {
    selectedTile: null,
    isActive: false,
    adjustmentMode: 'increase',
    selectedResource: 'all'
  };
  
  // Resource Information Display State
  resourceInfoState: ResourceInfoState = {
    isDetailedMode: false,
    hoveredTile: null,
    selectedTile: null
  };
  
  // Divine Intervention UI Elements
  divineUI?: Phaser.GameObjects.Container;
  selectedTileGraphics?: Phaser.GameObjects.Graphics;
  tileInfoText?: Phaser.GameObjects.Text;
  
  // Resource Information UI Elements
  resourceInfoPanel?: Phaser.GameObjects.Container;
  resourceInfoText?: Phaser.GameObjects.Text;
  hoverTooltip?: Phaser.GameObjects.Container;
  hoverTooltipText?: Phaser.GameObjects.Text;
  resourceInfoBackground?: Phaser.GameObjects.Graphics;
  
  // Error Feedback UI
  errorFeedbackText?: Phaser.GameObjects.Text;
  
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

  preload() { }

  create() {
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

    // タイトル表示
    this.add.text(10, 10, "Trading Simulation", {
      fontSize: "16px",
      fontFamily: "Arial",
      color: "#ffffff",
      backgroundColor: "#000000",
      padding: { x: 4, y: 2 }
    });

    // 操作説明
    this.add.text(10, 35, "Press 'R' to toggle collection ranges", {
      fontSize: "12px",
      fontFamily: "Arial",
      color: "#ffffff",
      backgroundColor: "#000000",
      padding: { x: 4, y: 2 }
    });

    this.add.text(10, 55, "Press 'D' to toggle divine intervention mode", {
      fontSize: "12px",
      fontFamily: "Arial",
      color: "#ffffff",
      backgroundColor: "#000000",
      padding: { x: 4, y: 2 }
    });

    this.add.text(10, 75, "Press 'I' to toggle detailed resource info", {
      fontSize: "12px",
      fontFamily: "Arial",
      color: "#ffffff",
      backgroundColor: "#000000",
      padding: { x: 4, y: 2 }
    });

    this.add.text(10, 95, "Press 'P' to toggle performance monitor", {
      fontSize: "12px",
      fontFamily: "Arial",
      color: "#ffffff",
      backgroundColor: "#000000",
      padding: { x: 4, y: 2 }
    });

    // 収集範囲描画用グラフィックス
    this.collectionRangeGraphics = this.add.graphics();
    this.collectionRangeGraphics.setDepth(50); // 村より下、地形より上

    // 選択タイル描画用グラフィックス
    this.selectedTileGraphics = this.add.graphics();
    this.selectedTileGraphics.setDepth(60);

    // Divine Intervention UI作成
    this.createDivineUI();
    
    // Resource Information UI作成
    this.createResourceInfoUI();
    
    // Performance Monitor UI作成
    this.createPerformanceMonitorUI();

    // キーボード入力設定
    this.input.keyboard?.on('keydown-R', () => {
      this.showCollectionRanges = !this.showCollectionRanges;
      this.renderCollectionRanges();
    });

    this.input.keyboard?.on('keydown-D', () => {
      this.divineState.isActive = !this.divineState.isActive;
      this.updateDivineUI();
    });

    this.input.keyboard?.on('keydown-I', () => {
      this.resourceInfoState.isDetailedMode = !this.resourceInfoState.isDetailedMode;
      this.updateResourceInfoUI();
    });

    this.input.keyboard?.on('keydown-P', () => {
      this.showPerformanceMonitor = !this.showPerformanceMonitor;
      this.updatePerformanceMonitorUI();
    });

    // マウス/タッチ入力設定
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handleTileClick(pointer);
      this.handleResourceInfoClick(pointer);
    });

    // マウス移動設定（ホバー用）
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.handleTileHover(pointer);
    });

    // システム統合の最終チェックを実行
    this.time.delayedCall(1000, () => {
      this.performFinalSystemIntegration();
    });
  }

  update() {
    const updateStartTime = performance.now();
    
    try {
      // ResourceManagerのフレームを更新
      this.resourceManager.updateFrame();
      
      // パフォーマンス最適化: 資源回復処理をバッチ処理
      this.updateResourcesOptimized();

      // 村とロードの更新（エラーハンドリング付き）
      this.updateVillagesWithErrorHandling();
      updateRoads(this.roads);

      // UI更新（パフォーマンス最適化）
      this.updateUIOptimized();
      
      // 視覚効果の更新（スムーズな遷移）
      this.updateVisualEffectsSmooth();
      
      // パフォーマンス統計の更新
      this.updatePerformanceStats(updateStartTime);
      
    } catch (error) {
      console.error('Update loop error:', error);
      // エラーが発生してもゲームを継続
      this.handleUpdateError(error);
    }
  }

  createDivineUI() {
    // Divine Intervention UIコンテナを作成
    this.divineUI = this.add.container(MAP_SIZE * TILE_SIZE + 10, 10);
    this.divineUI.setDepth(200);

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

  updateDivineUI() {
    if (!this.divineUI) return;

    // UIの表示/非表示を切り替え
    this.divineUI.setVisible(this.divineState.isActive);

    if (!this.divineState.isActive) {
      this.divineState.selectedTile = null;
      this.renderSelectedTile();
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

  handleTileClick(pointer: Phaser.Input.Pointer) {
    if (!this.divineState.isActive) return;

    // クリック位置をタイル座標に変換
    const tileX = Math.floor(pointer.x / TILE_SIZE);
    const tileY = Math.floor(pointer.y / TILE_SIZE);

    // マップ範囲内かチェック
    if (tileX < 0 || tileX >= MAP_SIZE || tileY < 0 || tileY >= MAP_SIZE) return;

    // タイルを選択
    this.divineState.selectedTile = { x: tileX, y: tileY };
    this.renderSelectedTile();
    this.updateTileInfo();

    // 右クリックまたはShift+クリックで資源調整を実行
    if (pointer.rightButtonDown() || pointer.event.shiftKey) {
      this.performDivineIntervention(tileX, tileY);
    }
  }

  renderSelectedTile() {
    if (!this.selectedTileGraphics) return;

    this.selectedTileGraphics.clear();

    if (this.divineState.selectedTile) {
      const { x, y } = this.divineState.selectedTile;
      
      // 選択されたタイルをハイライト
      this.selectedTileGraphics.lineStyle(2, 0xffff00, 1.0);
      this.selectedTileGraphics.strokeRect(
        x * TILE_SIZE, 
        y * TILE_SIZE, 
        TILE_SIZE, 
        TILE_SIZE
      );
      
      // 角にマーカーを追加
      this.selectedTileGraphics.fillStyle(0xffff00, 1.0);
      const markerSize = 2;
      this.selectedTileGraphics.fillRect(x * TILE_SIZE, y * TILE_SIZE, markerSize, markerSize);
      this.selectedTileGraphics.fillRect(x * TILE_SIZE + TILE_SIZE - markerSize, y * TILE_SIZE, markerSize, markerSize);
      this.selectedTileGraphics.fillRect(x * TILE_SIZE, y * TILE_SIZE + TILE_SIZE - markerSize, markerSize, markerSize);
      this.selectedTileGraphics.fillRect(x * TILE_SIZE + TILE_SIZE - markerSize, y * TILE_SIZE + TILE_SIZE - markerSize, markerSize, markerSize);
    }
  }

  updateTileInfo() {
    if (!this.tileInfoText || !this.divineState.selectedTile) {
      if (this.tileInfoText) {
        this.tileInfoText.setText("Select a tile to view info");
      }
      return;
    }

    const { x, y } = this.divineState.selectedTile;
    const tile = this.map[y][x];

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

  performDivineIntervention(tileX: number, tileY: number) {
    const tile = this.map[tileY][tileX];
    const resourceTypes: (keyof Tile['resources'])[] = 
      this.divineState.selectedResource === 'all' 
        ? ['food', 'wood', 'ore'] 
        : [this.divineState.selectedResource as keyof Tile['resources']];

    resourceTypes.forEach(resourceType => {
      const currentAmount = tile.resources[resourceType];
      const maxAmount = tile.maxResources[resourceType];
      let newAmount = currentAmount;

      switch (this.divineState.adjustmentMode) {
        case 'increase':
          newAmount = Math.min(maxAmount, currentAmount + maxAmount * 0.25); // 25%増加
          break;
        case 'decrease':
          newAmount = Math.max(0, currentAmount - maxAmount * 0.25); // 25%減少
          break;
        case 'set':
          // 現在の状態に応じて設定値を決定
          if (currentAmount === 0) {
            newAmount = maxAmount; // 枯渇している場合は満タンに
          } else if (currentAmount === maxAmount) {
            newAmount = 0; // 満タンの場合は枯渇に
          } else {
            newAmount = maxAmount; // その他の場合は満タンに
          }
          break;
      }

      // ResourceManagerのdivineInterventionメソッドを使用
      this.resourceManager.divineIntervention(tile, resourceType, newAmount);
    });

    // タイル情報を更新
    this.updateTileInfo();
  }

  createResourceInfoUI() {
    // Resource Information UIコンテナを作成
    this.resourceInfoPanel = this.add.container(10, MAP_SIZE * TILE_SIZE - 200);
    this.resourceInfoPanel.setDepth(150);

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

    // ホバーツールチップ作成
    this.createHoverTooltip();

    // 初期状態では非表示
    this.resourceInfoPanel.setVisible(false);
  }

  createHoverTooltip() {
    // ホバーツールチップコンテナ
    this.hoverTooltip = this.add.container(0, 0);
    this.hoverTooltip.setDepth(300);

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

  updateResourceInfoUI() {
    if (!this.resourceInfoPanel) return;

    // モード表示を更新
    const modeText = this.resourceInfoPanel.list[2] as Phaser.GameObjects.Text;
    const modeLabel = this.resourceInfoState.isDetailedMode ? "Detailed" : "Basic";
    modeText.setText(`Mode: ${modeLabel} (Press 'I' to toggle)`);

    // パネルの表示/非表示を切り替え
    this.resourceInfoPanel.setVisible(this.resourceInfoState.isDetailedMode);
  }

  handleTileHover(pointer: Phaser.Input.Pointer) {
    // タイル座標を計算
    const tileX = Math.floor(pointer.x / TILE_SIZE);
    const tileY = Math.floor(pointer.y / TILE_SIZE);

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

  handleResourceInfoClick(pointer: Phaser.Input.Pointer) {
    // Divine Interventionモードがアクティブな場合は処理しない
    if (this.divineState.isActive) return;

    // タイル座標を計算
    const tileX = Math.floor(pointer.x / TILE_SIZE);
    const tileY = Math.floor(pointer.y / TILE_SIZE);

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

  showHoverTooltip(mouseX: number, mouseY: number, tileX: number, tileY: number) {
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

    // ツールチップ位置を調整（画面端を考慮）
    let tooltipX = mouseX + 10;
    let tooltipY = mouseY - 50;

    // 画面右端を超える場合は左側に表示
    if (tooltipX + 200 > this.cameras.main.width) {
      tooltipX = mouseX - 210;
    }

    // 画面上端を超える場合は下側に表示
    if (tooltipY < 0) {
      tooltipY = mouseY + 10;
    }

    this.hoverTooltip.setPosition(tooltipX, tooltipY);
    this.hoverTooltip.setVisible(true);
  }

  updateResourceInfoDisplay() {
    if (!this.resourceInfoState.isDetailedMode || !this.resourceInfoText) return;

    let displayInfo = "";

    // ホバーされているタイルの情報を表示
    if (this.resourceInfoState.hoveredTile) {
      const { x, y } = this.resourceInfoState.hoveredTile;
      const tile = this.map[y][x];
      const visualState = this.resourceManager.getVisualState(tile);

      displayInfo = this.formatDetailedResourceInfo(tile, x, y, visualState, "Hovered");
    }

    // 選択されているタイルの情報を表示（優先）
    if (this.resourceInfoState.selectedTile) {
      const { x, y } = this.resourceInfoState.selectedTile;
      const tile = this.map[y][x];
      const visualState = this.resourceManager.getVisualState(tile);

      displayInfo = this.formatDetailedResourceInfo(tile, x, y, visualState, "Selected");
    }

    // 情報がない場合のデフォルトメッセージ
    if (!displayInfo) {
      displayInfo = "Click on a tile to view detailed resource information";
    }

    this.resourceInfoText.setText(displayInfo);
  }

  formatDetailedResourceInfo(tile: Tile, x: number, y: number, visualState: import("./resource-manager").ResourceVisualState, status: string): string {
    const resourceTypes: (keyof Tile['resources'])[] = ['food', 'wood', 'ore'];
    const resourceNames = { food: "Food", wood: "Wood", ore: "Ore" };
    const resourceColors = { food: "🟢", wood: "🟤", ore: "⚪" };

    const info = [
      `${status} Tile: (${x}, ${y})`,
      `Type: ${tile.type.charAt(0).toUpperCase() + tile.type.slice(1)}`,
      `Height: ${tile.height.toFixed(2)}`,
      "",
      "=== RESOURCE DETAILS ===",
      ""
    ];

    resourceTypes.forEach(resourceType => {
      const current = tile.resources[resourceType];
      const max = tile.maxResources[resourceType];
      const depletion = tile.depletionState[resourceType];
      const recoveryTimer = tile.recoveryTimer[resourceType];

      if (max > 0) {
        info.push(`${resourceColors[resourceType]} ${resourceNames[resourceType]}:`);
        info.push(`  Amount: ${current.toFixed(1)} / ${max.toFixed(1)}`);
        info.push(`  Status: ${(depletion * 100).toFixed(1)}% remaining`);
        
        if (current === 0 && recoveryTimer > 0) {
          const framesUntilRecovery = Math.max(0, recoveryTimer - this.resourceManager['currentFrame']);
          const secondsUntilRecovery = (framesUntilRecovery / 60).toFixed(1);
          info.push(`  Recovery: ${secondsUntilRecovery}s remaining`);
        } else if (current > 0 && current < max) {
          info.push(`  Recovery: Active`);
        } else if (current >= max) {
          info.push(`  Recovery: Full`);
        }
        info.push("");
      }
    });

    // 全体的な状態
    info.push("=== OVERALL STATUS ===");
    if (visualState.isDepleted) {
      info.push("Status: DEPLETED");
      info.push(`Recovery: ${(visualState.recoveryProgress * 100).toFixed(0)}%`);
    } else {
      info.push(`Status: ${(visualState.recoveryProgress * 100).toFixed(0)}% available`);
    }

    const timeSinceHarvest = this.resourceManager['currentFrame'] - tile.lastHarvestTime;
    if (timeSinceHarvest < 300) { // 5 seconds
      info.push(`Last harvest: ${(timeSinceHarvest / 60).toFixed(1)}s ago`);
    }

    return info.join("\n");
  }

  renderMap() {
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

  renderMapTiles() {
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

  renderRoads() {
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

  renderVillages() {
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

  updateMapVisuals() {
    // マップタイルの視覚状態を更新
    this.renderMapTiles();
    
    // 道の使用状況が変わった場合は道も更新
    this.renderRoads();
  }

  /**
   * パフォーマンス最適化された資源更新処理
   */
  updateResourcesOptimized(): void {
    // バッチ処理で資源回復を実行（メモリ効率とパフォーマンス向上）
    const batchSize = 64; // 8x8のタイルブロック
    const totalTiles = MAP_SIZE * MAP_SIZE;
    const currentBatch = this.resourceManager['currentFrame'] % Math.ceil(totalTiles / batchSize);
    
    const startIndex = currentBatch * batchSize;
    const endIndex = Math.min(startIndex + batchSize, totalTiles);
    
    for (let i = startIndex; i < endIndex; i++) {
      const x = i % MAP_SIZE;
      const y = Math.floor(i / MAP_SIZE);
      
      try {
        this.resourceManager.updateRecovery(this.map[y][x]);
      } catch (error) {
        console.warn(`Resource recovery error at (${x}, ${y}):`, error);
        // 個別のタイルエラーは無視して続行
      }
    }
    
    // 毎フレーム全タイルを更新する場合（小さなマップ用）
    if (MAP_SIZE <= 32) {
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
  }

  /**
   * エラーハンドリング付きの村更新処理
   */
  updateVillagesWithErrorHandling(): void {
    try {
      updateVillages(this.map, this.villages, this.roads, this.resourceManager);
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
   * パフォーマンス最適化されたUI更新
   */
  updateUIOptimized(): void {
    // 村ストック表示の更新（フレームレート制限）
    const shouldUpdateVillageText = this.resourceManager['currentFrame'] % 10 === 0; // 6FPSで更新
    
    if (shouldUpdateVillageText) {
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

    // 収集範囲の更新（必要時のみ）
    if (this.showCollectionRanges) {
      const shouldUpdateRanges = this.resourceManager['currentFrame'] % 30 === 0; // 2FPSで更新
      if (shouldUpdateRanges) {
        this.renderCollectionRanges();
      }
    }
  }

  /**
   * スムーズな視覚効果の更新
   */
  updateVisualEffectsSmooth(): void {
    // マップの視覚状態を段階的に更新（パフォーマンス向上）
    const shouldUpdateVisuals = this.resourceManager['currentFrame'] % 5 === 0; // 12FPSで更新
    
    if (shouldUpdateVisuals) {
      this.updateMapVisualsSmooth();
    }
    
    // Divine Intervention UIの更新
    if (this.divineState.isActive && this.divineState.selectedTile) {
      try {
        this.updateTileInfo();
      } catch (error) {
        console.warn('Divine intervention UI update error:', error);
      }
    }
    
    // Resource Information UIの更新
    try {
      this.updateResourceInfoDisplay();
    } catch (error) {
      console.warn('Resource info display update error:', error);
    }
  }

  /**
   * スムーズな視覚遷移を持つマップ更新
   */
  updateMapVisualsSmooth(): void {
    if (!this.mapGraphics) return;

    // 変更されたタイルのみを更新（パフォーマンス最適化）
    const changedTiles: { x: number; y: number }[] = [];
    
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const tile = this.map[y][x];
        const currentFrame = this.resourceManager['currentFrame'];
        
        // 最近変更されたタイルかチェック
        const timeSinceLastHarvest = currentFrame - tile.lastHarvestTime;
        const isRecovering = tile.resources.food < tile.maxResources.food || 
                           tile.resources.wood < tile.maxResources.wood || 
                           tile.resources.ore < tile.maxResources.ore;
        
        if (timeSinceLastHarvest < 300 || isRecovering) { // 5秒以内に変更されたか回復中
          changedTiles.push({ x, y });
        }
      }
    }
    
    // 変更されたタイルが多い場合は全体を更新
    if (changedTiles.length > MAP_SIZE * MAP_SIZE * 0.1) {
      this.renderMapTiles();
    } else {
      // 個別タイルの更新
      changedTiles.forEach(({ x, y }) => {
        this.renderSingleTileSmooth(x, y);
      });
    }
    
    // 道路の更新（使用状況の変化をチェック）
    const shouldUpdateRoads = this.resourceManager['currentFrame'] % 60 === 0; // 1FPSで更新
    if (shouldUpdateRoads) {
      this.renderRoads();
    }
  }

  /**
   * 単一タイルのスムーズな描画
   */
  renderSingleTileSmooth(tileX: number, tileY: number): void {
    if (!this.mapGraphics) return;

    const tile = this.map[tileY][tileX];
    
    // 基本色を決定
    let baseColor = 0x228b22; // 草地
    if (tile.height < 0.3) baseColor = 0x1e90ff; // 海
    else if (tile.height > 0.7) baseColor = 0x8b4513; // 山

    // 資源状態に基づく視覚効果を適用
    const visualState = this.resourceManager.getVisualState(tile);
    const finalColor = this.applyVisualEffectsSmooth(baseColor, visualState);
    
    // タイルを再描画
    this.mapGraphics.fillStyle(finalColor, visualState.opacity);
    this.mapGraphics.fillRect(tileX * TILE_SIZE, tileY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    
    // 枯渇インジケーターを表示
    if (visualState.isDepleted) {
      this.renderDepletionIndicatorSmooth(this.mapGraphics, tileX, tileY, visualState.recoveryProgress);
    }
  }

  /**
   * スムーズな視覚効果の適用
   */
  applyVisualEffectsSmooth(baseColor: number, visualState: import("./resource-manager").ResourceVisualState): number {
    // 基本色のRGB成分を抽出
    const baseR = (baseColor >> 16) & 0xff;
    const baseG = (baseColor >> 8) & 0xff;
    const baseB = baseColor & 0xff;
    
    // tintのRGB成分を抽出
    const tintR = (visualState.tint >> 16) & 0xff;
    const tintG = (visualState.tint >> 8) & 0xff;
    const tintB = visualState.tint & 0xff;
    
    // スムーズな遷移のための補間強度
    const mixStrength = this.calculateSmoothMixStrength(1 - visualState.recoveryProgress);
    
    const finalR = Math.floor(baseR * (1 - mixStrength * 0.5) + tintR * mixStrength * 0.5);
    const finalG = Math.floor(baseG * (1 - mixStrength * 0.5) + tintG * mixStrength * 0.5);
    const finalB = Math.floor(baseB * (1 - mixStrength * 0.5) + tintB * mixStrength * 0.5);
    
    return (finalR << 16) | (finalG << 8) | finalB;
  }

  /**
   * スムーズな遷移のための補間強度を計算
   */
  calculateSmoothMixStrength(rawStrength: number): number {
    // イージング関数を適用してスムーズな遷移を実現
    // Ease-in-out cubic function
    return rawStrength < 0.5 
      ? 4 * rawStrength * rawStrength * rawStrength
      : 1 - Math.pow(-2 * rawStrength + 2, 3) / 2;
  }

  /**
   * スムーズな枯渇インジケーターの描画
   */
  renderDepletionIndicatorSmooth(graphics: Phaser.GameObjects.Graphics, tileX: number, tileY: number, recoveryProgress: number): void {
    const centerX = tileX * TILE_SIZE + TILE_SIZE / 2;
    const centerY = tileY * TILE_SIZE + TILE_SIZE / 2;
    
    // アニメーション効果のための時間ベースの値
    const currentFrame = this.resourceManager['currentFrame'];
    const pulsePhase = (currentFrame * 0.1) % (Math.PI * 2);
    const pulseIntensity = (Math.sin(pulsePhase) + 1) * 0.5; // 0-1の範囲
    
    // 枯渇を示す赤い×マーク（パルス効果付き）
    const opacity = 0.6 + (pulseIntensity * 0.4);
    graphics.lineStyle(1, 0xff0000, opacity);
    const size = TILE_SIZE * 0.3;
    graphics.beginPath();
    graphics.moveTo(centerX - size, centerY - size);
    graphics.lineTo(centerX + size, centerY + size);
    graphics.moveTo(centerX + size, centerY - size);
    graphics.lineTo(centerX - size, centerY + size);
    graphics.strokePath();
    
    // 回復進行度を示す円形プログレスバー（スムーズなアニメーション）
    if (recoveryProgress > 0) {
      const radius = TILE_SIZE * 0.4;
      const startAngle = -Math.PI / 2; // 上から開始
      const smoothProgress = this.calculateSmoothMixStrength(recoveryProgress);
      const endAngle = startAngle + (smoothProgress * 2 * Math.PI);
      
      // 背景円（薄いグレー）
      graphics.lineStyle(2, 0x666666, 0.3);
      graphics.strokeCircle(centerX, centerY, radius);
      
      // 進行度円（緑色、グラデーション効果）
      const progressOpacity = 0.5 + (smoothProgress * 0.5);
      graphics.lineStyle(2, 0x00ff00, progressOpacity);
      graphics.beginPath();
      graphics.arc(centerX, centerY, radius, startAngle, endAngle);
      graphics.strokePath();
    }
  }

  /**
   * 更新エラーのハンドリング
   */
  handleUpdateError(error: any): void {
    // エラーログを記録
    console.error('Game update error:', error);
    
    // システムの整合性チェックと修復
    try {
      this.performSystemIntegrityCheck();
    } catch (recoveryError) {
      console.error('System recovery failed:', recoveryError);
    }
    
    // ユーザーへのフィードバック（非侵入的）
    this.showErrorFeedback('システムエラーが発生しましたが、ゲームは継続されます。');
  }

  /**
   * システム整合性チェック
   */
  performSystemIntegrityCheck(): void {
    // 村の整合性チェック
    this.villages.forEach((village, index) => {
      if (village.population < 0) {
        village.population = 10;
        console.warn(`Village ${index} population reset to 10`);
      }
      
      if (village.collectionRadius < 1 || village.collectionRadius > 10) {
        village.collectionRadius = Math.max(1, Math.min(10, village.collectionRadius));
        console.warn(`Village ${index} collection radius normalized`);
      }
      
      // ストレージの負の値を修正
      Object.keys(village.storage).forEach(key => {
        if (village.storage[key as keyof typeof village.storage] < 0) {
          village.storage[key as keyof typeof village.storage] = 0;
          console.warn(`Village ${index} ${key} storage reset to 0`);
        }
      });
    });
    
    // マップタイルの整合性チェック
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const tile = this.map[y][x];
        
        // 資源量の整合性チェック
        Object.keys(tile.resources).forEach(resourceType => {
          const key = resourceType as keyof typeof tile.resources;
          if (tile.resources[key] < 0) {
            tile.resources[key] = 0;
            console.warn(`Tile (${x}, ${y}) ${resourceType} reset to 0`);
          }
          
          if (tile.resources[key] > tile.maxResources[key]) {
            tile.resources[key] = tile.maxResources[key];
            console.warn(`Tile (${x}, ${y}) ${resourceType} capped to max`);
          }
          
          // 消耗状態の整合性チェック
          if (tile.depletionState[key] < 0 || tile.depletionState[key] > 1) {
            tile.depletionState[key] = tile.maxResources[key] > 0 ? tile.resources[key] / tile.maxResources[key] : 0;
            console.warn(`Tile (${x}, ${y}) ${resourceType} depletion state recalculated`);
          }
        });
      }
    }
  }

  /**
   * エラーフィードバックの表示
   */
  showErrorFeedback(message: string): void {
    // 既存のエラーメッセージがあれば削除
    if (this.errorFeedbackText) {
      this.errorFeedbackText.destroy();
    }
    
    // エラーメッセージを表示
    this.errorFeedbackText = this.add.text(10, MAP_SIZE * TILE_SIZE - 30, message, {
      fontSize: "12px",
      fontFamily: "Arial",
      color: "#ff6666",
      backgroundColor: "#330000",
      padding: { x: 4, y: 2 }
    });
    
    this.errorFeedbackText.setDepth(1000);
    
    // 5秒後に自動的に削除
    this.time.delayedCall(5000, () => {
      if (this.errorFeedbackText) {
        this.errorFeedbackText.destroy();
        this.errorFeedbackText = undefined;
      }
    });
  }

  renderCollectionRanges() {
    if (!this.collectionRangeGraphics) return;
    
    this.collectionRangeGraphics.clear();
    
    if (this.showCollectionRanges) {
      this.villages.forEach(village => {
        const centerX = village.x * TILE_SIZE + TILE_SIZE / 2;
        const centerY = village.y * TILE_SIZE + TILE_SIZE / 2;
        const radius = village.collectionRadius * TILE_SIZE;
        
        // 半透明の円で収集範囲を表示
        this.collectionRangeGraphics!.fillStyle(0x00ff00, 0.2); // 緑色、透明度20%
        this.collectionRangeGraphics!.fillCircle(centerX, centerY, radius);
        
        // 境界線を描画
        this.collectionRangeGraphics!.lineStyle(2, 0x00ff00, 0.8); // 緑色、透明度80%
        this.collectionRangeGraphics!.strokeCircle(centerX, centerY, radius);
      });
    }
  }

  /**
   * 視覚効果を基本色に適用
   * @param baseColor 基本色
   * @param visualState 視覚状態
   * @returns 効果適用後の色
   */
  applyVisualEffects(baseColor: number, visualState: import("./resource-manager").ResourceVisualState): number {
    // 基本色のRGB成分を抽出
    const baseR = (baseColor >> 16) & 0xff;
    const baseG = (baseColor >> 8) & 0xff;
    const baseB = baseColor & 0xff;
    
    // tintのRGB成分を抽出
    const tintR = (visualState.tint >> 16) & 0xff;
    const tintG = (visualState.tint >> 8) & 0xff;
    const tintB = visualState.tint & 0xff;
    
    // 基本色とtintを混合（tintの強度は消耗度に基づく）
    const mixStrength = 1 - visualState.recoveryProgress;
    const finalR = Math.floor(baseR * (1 - mixStrength * 0.5) + tintR * mixStrength * 0.5);
    const finalG = Math.floor(baseG * (1 - mixStrength * 0.5) + tintG * mixStrength * 0.5);
    const finalB = Math.floor(baseB * (1 - mixStrength * 0.5) + tintB * mixStrength * 0.5);
    
    return (finalR << 16) | (finalG << 8) | finalB;
  }

  /**
   * 枯渇インジケーターを描画
   * @param graphics グラフィックスオブジェクト
   * @param tileX タイルのX座標
   * @param tileY タイルのY座標
   * @param recoveryProgress 回復進行度 (0-1)
   */
  renderDepletionIndicator(graphics: Phaser.GameObjects.Graphics, tileX: number, tileY: number, recoveryProgress: number): void {
    const centerX = tileX * TILE_SIZE + TILE_SIZE / 2;
    const centerY = tileY * TILE_SIZE + TILE_SIZE / 2;
    
    // 枯渇を示す赤い×マーク
    graphics.lineStyle(1, 0xff0000, 0.8);
    const size = TILE_SIZE * 0.3;
    graphics.beginPath();
    graphics.moveTo(centerX - size, centerY - size);
    graphics.lineTo(centerX + size, centerY + size);
    graphics.moveTo(centerX + size, centerY - size);
    graphics.lineTo(centerX - size, centerY + size);
    graphics.strokePath();
    
    // 回復進行度を示す円形プログレスバー
    if (recoveryProgress > 0) {
      const radius = TILE_SIZE * 0.4;
      const startAngle = -Math.PI / 2; // 上から開始
      const endAngle = startAngle + (recoveryProgress * 2 * Math.PI);
      
      // 背景円（薄いグレー）
      graphics.lineStyle(2, 0x666666, 0.3);
      graphics.strokeCircle(centerX, centerY, radius);
      
      // 進行度円（緑色）
      graphics.lineStyle(2, 0x00ff00, 0.7);
      graphics.beginPath();
      graphics.arc(centerX, centerY, radius, startAngle, endAngle);
      graphics.strokePath();
    }
  }

  /**
   * パフォーマンスモニターUIの作成
   */
  createPerformanceMonitorUI(): void {
    // Performance Monitor UIコンテナを作成
    this.performanceMonitor = this.add.container(MAP_SIZE * TILE_SIZE + 10, 350);
    this.performanceMonitor.setDepth(250);

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
    this.performanceText = this.add.text(10, 35, "Initializing...", {
      fontSize: "10px",
      fontFamily: "Arial",
      color: "#ffffff",
      wordWrap: { width: 180 }
    });
    this.performanceMonitor.add(this.performanceText);

    // 初期状態では非表示
    this.performanceMonitor.setVisible(false);
  }

  /**
   * パフォーマンスモニターUIの更新
   */
  updatePerformanceMonitorUI(): void {
    if (!this.performanceMonitor) return;
    this.performanceMonitor.setVisible(this.showPerformanceMonitor);
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
    
    // フレームカウントとFPS計算
    this.performanceStats.frameCount++;
    const currentTime = Date.now();
    
    if (currentTime - this.performanceStats.lastFPSUpdate > 1000) {
      this.performanceStats.currentFPS = this.performanceStats.frameCount;
      this.performanceStats.frameCount = 0;
      this.performanceStats.lastFPSUpdate = currentTime;
    }
    
    // パフォーマンスモニターの表示更新
    if (this.showPerformanceMonitor && this.performanceText) {
      this.updatePerformanceDisplay();
    }
  }

  /**
   * パフォーマンス表示の更新
   */
  updatePerformanceDisplay(): void {
    if (!this.performanceText) return;
    
    const stats = this.performanceStats;
    const memoryUsage = (performance as any).memory ? (performance as any).memory.usedJSHeapSize / 1024 / 1024 : 0;
    
    // システム統計を収集
    const totalTiles = MAP_SIZE * MAP_SIZE;
    const totalVillages = this.villages.length;
    const totalRoads = this.roads.length;
    
    // 資源統計を計算
    let totalResources = 0;
    let depletedTiles = 0;
    let recoveringTiles = 0;
    
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const tile = this.map[y][x];
        const tileResources = tile.resources.food + tile.resources.wood + tile.resources.ore;
        const maxResources = tile.maxResources.food + tile.maxResources.wood + tile.maxResources.ore;
        
        totalResources += tileResources;
        
        if (tileResources === 0 && maxResources > 0) {
          depletedTiles++;
        } else if (tileResources < maxResources && maxResources > 0) {
          recoveringTiles++;
        }
      }
    }
    
    const performanceInfo = [
      `FPS: ${stats.currentFPS}`,
      `Update: ${stats.averageUpdateTime.toFixed(2)}ms`,
      `Memory: ${memoryUsage.toFixed(1)}MB`,
      "",
      "=== SYSTEM STATS ===",
      `Map: ${MAP_SIZE}x${MAP_SIZE} (${totalTiles} tiles)`,
      `Villages: ${totalVillages}`,
      `Roads: ${totalRoads}`,
      "",
      "=== RESOURCE STATS ===",
      `Total Resources: ${totalResources.toFixed(0)}`,
      `Depleted Tiles: ${depletedTiles}`,
      `Recovering Tiles: ${recoveringTiles}`,
      `Resource Efficiency: ${((totalResources / (totalTiles * 30)) * 100).toFixed(1)}%`
    ];
    
    this.performanceText.setText(performanceInfo.join("\n"));
    
    // パフォーマンス警告
    if (stats.currentFPS < 30) {
      this.performanceText.setColor("#ff6666");
    } else if (stats.currentFPS < 45) {
      this.performanceText.setColor("#ffff66");
    } else {
      this.performanceText.setColor("#ffffff");
    }
  }

  /**
   * システム統合の最終チェック
   */
  performFinalSystemIntegration(): void {
    try {
      // 全システムの整合性を確認
      this.performSystemIntegrityCheck();
      
      // パフォーマンス最適化の適用
      this.optimizeSystemPerformance();
      
      // ユーザーフィードバックシステムの初期化
      this.initializeUserFeedbackSystem();
      
      console.log('System integration completed successfully');
    } catch (error) {
      console.error('System integration failed:', error);
      this.showErrorFeedback('システム統合でエラーが発生しました。');
    }
  }

  /**
   * システムパフォーマンスの最適化
   */
  optimizeSystemPerformance(): void {
    // ガベージコレクションの最適化
    if (typeof global !== 'undefined' && global.gc) {
      // 開発環境でのみガベージコレクションを実行
      global.gc();
    }
    
    // テクスチャキャッシュの最適化
    this.textures.each((texture: Phaser.Textures.Texture) => {
      if (!texture.source || texture.source.length === 0) {
        console.warn('Unused texture detected:', texture.key);
      }
    });
  }

  /**
   * ユーザーフィードバックシステムの初期化
   */
  initializeUserFeedbackSystem(): void {
    // 成功フィードバックの表示
    this.showSuccessFeedback('資源消耗システムが正常に統合されました！');
    
    // システム状態の監視開始
    this.startSystemMonitoring();
  }

  /**
   * 成功フィードバックの表示
   */
  showSuccessFeedback(message: string): void {
    const successText = this.add.text(10, MAP_SIZE * TILE_SIZE - 60, message, {
      fontSize: "12px",
      fontFamily: "Arial",
      color: "#66ff66",
      backgroundColor: "#003300",
      padding: { x: 4, y: 2 }
    });
    
    successText.setDepth(1000);
    
    // 3秒後に自動的に削除
    this.time.delayedCall(3000, () => {
      successText.destroy();
    });
  }

  /**
   * システム監視の開始
   */
  startSystemMonitoring(): void {
    // 定期的なシステムヘルスチェック
    this.time.addEvent({
      delay: 30000, // 30秒ごと
      callback: () => {
        this.performSystemHealthCheck();
      },
      loop: true
    });
    
    // メモリ使用量の監視
    this.time.addEvent({
      delay: 60000, // 1分ごと
      callback: () => {
        this.checkMemoryUsage();
      },
      loop: true
    });
  }

  /**
   * システムヘルスチェック
   */
  performSystemHealthCheck(): void {
    try {
      // パフォーマンスチェック
      if (this.performanceStats.currentFPS < 20) {
        console.warn('Low FPS detected:', this.performanceStats.currentFPS);
        this.showErrorFeedback('パフォーマンスが低下しています。');
      }
      
      // 村の状態チェック
      const unhealthyVillages = this.villages.filter(v => 
        v.population < 0 || 
        v.storage.food < 0 || 
        v.storage.wood < 0 || 
        v.storage.ore < 0
      );
      
      if (unhealthyVillages.length > 0) {
        console.warn('Unhealthy villages detected:', unhealthyVillages.length);
        this.performSystemIntegrityCheck();
      }
      
      // 資源システムの状態チェック
      let invalidTiles = 0;
      for (let y = 0; y < MAP_SIZE; y++) {
        for (let x = 0; x < MAP_SIZE; x++) {
          const tile = this.map[y][x];
          if (tile.resources.food < 0 || tile.resources.wood < 0 || tile.resources.ore < 0) {
            invalidTiles++;
          }
        }
      }
      
      if (invalidTiles > 0) {
        console.warn('Invalid tiles detected:', invalidTiles);
        this.performSystemIntegrityCheck();
      }
      
    } catch (error) {
      console.error('System health check failed:', error);
    }
  }

  /**
   * メモリ使用量のチェック
   */
  checkMemoryUsage(): void {
    if ((performance as any).memory) {
      const memoryInfo = (performance as any).memory;
      const usedMB = memoryInfo.usedJSHeapSize / 1024 / 1024;
      const limitMB = memoryInfo.jsHeapSizeLimit / 1024 / 1024;
      
      if (usedMB > limitMB * 0.8) {
        console.warn('High memory usage detected:', usedMB.toFixed(1), 'MB');
        this.showErrorFeedback('メモリ使用量が高くなっています。');
        
        // メモリクリーンアップの実行
        this.performMemoryCleanup();
      }
    }
  }

  /**
   * メモリクリーンアップの実行
   */
  performMemoryCleanup(): void {
    try {
      // 未使用のテクスチャを削除
      this.textures.each((texture: Phaser.Textures.Texture) => {
        if (texture.key.startsWith('__TEMP__')) {
          this.textures.remove(texture.key);
        }
      });
      
      // ガベージコレクションを促進
      if (typeof global !== 'undefined' && global.gc) {
        global.gc();
      }
      
      console.log('Memory cleanup completed');
    } catch (error) {
      console.error('Memory cleanup failed:', error);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: MAP_SIZE * TILE_SIZE + 200, // 神の介入UI用に幅を拡張
  height: MAP_SIZE * TILE_SIZE,
  scene: MainScene,
});
