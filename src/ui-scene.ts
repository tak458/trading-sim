// src/ui-scene.ts
import Phaser from "phaser";

export class UIScene extends Phaser.Scene {
  // UI要素
  titleText?: Phaser.GameObjects.Text;
  instructionTexts: Phaser.GameObjects.Text[] = [];
  uiContainer?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
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
      this.uiContainer.add(instructionText);
      this.instructionTexts.push(instructionText);
    });

    // リサイズイベントを設定
    this.scale.on('resize', this.handleResize, this);

    // 'H'キーでヘルプの表示/非表示を切り替え
    this.input.keyboard?.on('keydown-H', () => {
      this.toggleInstructions();
    });

    // 初期状態では操作説明を表示
    this.showInstructions(true);
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
    // UIの位置調整が必要な場合はここで実装
    // 現在は左上固定なので特に処理なし
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
   * UIシーンを表示
   */
  showUI(): void {
    this.scene.setVisible(true);
  }

  /**
   * UIシーンを非表示
   */
  hideUI(): void {
    this.scene.setVisible(false);
  }
}