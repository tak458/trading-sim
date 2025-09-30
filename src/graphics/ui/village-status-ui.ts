/**
 * VillageStatusUI - 資源不足表示UIシステム
 * 要件 4.1, 4.2, 4.3, 4.4 に対応
 */

import Phaser from "phaser";
import { Village } from "../../game-systems/world/village";
import { SupplyDemandBalancer, ResourceType } from "../../game-systems/economy/supply-demand-balancer";
import { SupplyDemandLevel } from "../../game-systems/economy/village-economy";

/**
 * 村の資源不足情報を表示するインターフェース
 */
export interface VillageShortageInfo {
  village: Village;
  shortageResources: Array<{
    resourceType: ResourceType;
    level: SupplyDemandLevel;
    stockDays: number;
    production: number;
    consumption: number;
  }>;
  criticalLevel: 'none' | 'minor' | 'major' | 'critical';
}

/**
 * 村の資源不足表示UIクラス
 * 要件 4.1: プレイヤーがUIを確認する時にシステムは各村の資源不足情報を表示する
 * 要件 4.2: 村で資源が不足する時にシステムは不足している資源タイプを明示する
 * 要件 4.3: 複数の村で資源不足が発生している時にシステムは全ての不足情報を整理して表示する
 * 要件 4.4: 資源状況が改善される時にシステムはリアルタイムで表示を更新する
 */
export class VillageStatusUI {
  private scene: Phaser.Scene;
  private supplyDemandBalancer: SupplyDemandBalancer;
  
  // UI要素
  private statusPanel?: Phaser.GameObjects.Container;
  private statusBackground?: Phaser.GameObjects.Graphics;
  private statusTitle?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private scrollContainer?: Phaser.GameObjects.Container;
  
  // 表示状態
  private isVisible: boolean = false;
  private lastUpdateTime: number = 0;
  private updateInterval: number = 1000; // 1秒間隔で更新
  
  // 画面サイズ
  private panelWidth: number = 400;
  private panelHeight: number = 300;
  private panelX: number = 10;
  private panelY: number = 250;

  constructor(scene: Phaser.Scene, supplyDemandBalancer: SupplyDemandBalancer) {
    this.scene = scene;
    this.supplyDemandBalancer = supplyDemandBalancer;
    this.createUI();
  }

  /**
   * UIを作成
   */
  private createUI(): void {
    // メインコンテナを作成
    this.statusPanel = this.scene.add.container(this.panelX, this.panelY);
    this.statusPanel.setDepth(1003);
    this.statusPanel.setScrollFactor(0); // カメラの影響を受けない

    // 背景を作成
    this.statusBackground = this.scene.add.graphics();
    this.statusBackground.fillStyle(0x000000, 0.85);
    this.statusBackground.fillRoundedRect(0, 0, this.panelWidth, this.panelHeight, 8);
    this.statusBackground.lineStyle(2, 0x666666, 1.0);
    this.statusBackground.strokeRoundedRect(0, 0, this.panelWidth, this.panelHeight, 8);
    this.statusPanel.add(this.statusBackground);

    // タイトルを作成
    this.statusTitle = this.scene.add.text(15, 15, "Village Resource Status", {
      fontSize: "16px",
      fontFamily: "Arial",
      color: "#ffffff",
      fontStyle: "bold"
    });
    this.statusPanel.add(this.statusTitle);

    // スクロール可能なコンテナを作成
    this.scrollContainer = this.scene.add.container(15, 45);
    this.statusPanel.add(this.scrollContainer);

    // 状態表示テキストを作成
    this.statusText = this.scene.add.text(0, 0, "Loading village status...", {
      fontSize: "12px",
      fontFamily: "Arial",
      color: "#ffffff",
      wordWrap: { width: this.panelWidth - 30 },
      lineSpacing: 2
    });
    this.scrollContainer.add(this.statusText);

    // 初期状態では非表示
    this.statusPanel.setVisible(false);
  }

  /**
   * UIの表示/非表示を切り替え
   * @param visible 表示するかどうか
   */
  setVisible(visible: boolean): void {
    this.isVisible = visible;
    if (this.statusPanel) {
      this.statusPanel.setVisible(visible);
    }
  }

  /**
   * UIの表示状態を取得
   * @returns 現在の表示状態
   */
  getVisible(): boolean {
    return this.isVisible;
  }

  /**
   * 表示/非表示を切り替え
   */
  toggle(): void {
    this.setVisible(!this.isVisible);
  }

  /**
   * 村の資源不足情報を更新
   * 要件 4.4: 資源状況が改善される時にシステムはリアルタイムで表示を更新する
   * @param villages 全ての村のリスト
   * @param forceUpdate 強制更新フラグ
   */
  updateVillageStatus(villages: Village[], forceUpdate: boolean = false): void {
    if (!this.isVisible && !forceUpdate) {
      return; // 非表示時は更新をスキップ（パフォーマンス向上）
    }

    const currentTime = Date.now();
    if (!forceUpdate && currentTime - this.lastUpdateTime < this.updateInterval) {
      return; // 更新間隔チェック
    }

    this.lastUpdateTime = currentTime;

    try {
      // 村の資源不足情報を分析
      const shortageInfo = this.analyzeVillageShortages(villages);
      
      // UI表示を更新
      this.updateStatusDisplay(shortageInfo);
      
    } catch (error) {
      console.error('村の資源状況更新でエラー:', error);
      if (this.statusText) {
        this.statusText.setText("Error updating village status");
      }
    }
  }

  /**
   * 村の資源不足情報を分析
   * 要件 4.2: 村で資源が不足する時にシステムは不足している資源タイプを明示する
   * 要件 4.3: 複数の村で資源不足が発生している時にシステムは全ての不足情報を整理して表示する
   * @param villages 全ての村のリスト
   * @returns 村の不足情報リスト
   */
  private analyzeVillageShortages(villages: Village[]): VillageShortageInfo[] {
    const shortageInfoList: VillageShortageInfo[] = [];

    for (const village of villages) {
      // 村データの妥当性チェック
      if (!village || !village.economy || !village.economy.supplyDemandStatus) {
        continue; // 無効な村データはスキップ
      }
      const shortageResources: VillageShortageInfo['shortageResources'] = [];
      let criticalCount = 0;
      let shortageCount = 0;

      // 各資源タイプをチェック
      const resourceTypes: ResourceType[] = ['food', 'wood', 'ore'];
      
      for (const resourceType of resourceTypes) {
        const level = (village.economy.supplyDemandStatus as any)[resourceType];
        
        if (level === 'shortage' || level === 'critical') {
          const production = (village.economy.production as any)[resourceType];
          const consumption = (village.economy.consumption as any)[resourceType];
          const stock = (village.economy.stock as any)[resourceType];
          const stockDays = consumption > 0 ? stock / consumption : (stock > 0 ? Infinity : 0);

          shortageResources.push({
            resourceType,
            level,
            stockDays,
            production,
            consumption
          });

          if (level === 'critical') {
            criticalCount++;
          } else {
            shortageCount++;
          }
        }
      }

      // 不足がある村のみリストに追加
      if (shortageResources.length > 0) {
        let criticalLevel: VillageShortageInfo['criticalLevel'] = 'none';
        
        if (criticalCount >= 2) {
          criticalLevel = 'critical';
        } else if (criticalCount >= 1) {
          criticalLevel = 'major';
        } else if (shortageCount >= 2) {
          criticalLevel = 'major';
        } else {
          criticalLevel = 'minor';
        }

        shortageInfoList.push({
          village,
          shortageResources,
          criticalLevel
        });
      }
    }

    // 危機レベル順でソート（critical > major > minor）
    shortageInfoList.sort((a, b) => {
      const levelOrder = { 'critical': 3, 'major': 2, 'minor': 1, 'none': 0 };
      return levelOrder[b.criticalLevel] - levelOrder[a.criticalLevel];
    });

    return shortageInfoList;
  }

  /**
   * 状態表示を更新
   * 要件 4.1: プレイヤーがUIを確認する時にシステムは各村の資源不足情報を表示する
   * @param shortageInfoList 村の不足情報リスト
   */
  private updateStatusDisplay(shortageInfoList: VillageShortageInfo[]): void {
    if (!this.statusText) return;

    if (shortageInfoList.length === 0) {
      // 不足がない場合
      this.statusText.setText("All villages have adequate resources.\nNo shortages detected.");
      this.statusText.setColor("#00ff00");
      return;
    }

    // 不足情報を整理して表示
    const displayLines: string[] = [];
    
    // サマリー情報
    const criticalVillages = shortageInfoList.filter(info => info.criticalLevel === 'critical').length;
    const majorVillages = shortageInfoList.filter(info => info.criticalLevel === 'major').length;
    const minorVillages = shortageInfoList.filter(info => info.criticalLevel === 'minor').length;
    
    displayLines.push(`Resource Shortage Summary:`);
    displayLines.push(`Critical: ${criticalVillages} | Major: ${majorVillages} | Minor: ${minorVillages}`);
    displayLines.push('');

    // 各村の詳細情報
    for (let i = 0; i < Math.min(shortageInfoList.length, 8); i++) { // 最大8村まで表示
      const info = shortageInfoList[i];
      const village = info.village;
      
      // 村の基本情報
      const criticalIcon = this.getCriticalLevelIcon(info.criticalLevel);
      displayLines.push(`${criticalIcon} Village (${village.x}, ${village.y}) Pop: ${village.population}`);
      
      // 不足資源の詳細
      for (const shortage of info.shortageResources) {
        const resourceIcon = this.getResourceIcon(shortage.resourceType);
        const levelColor = this.getLevelIndicator(shortage.level);
        const stockInfo = shortage.stockDays === Infinity ? 
          'No consumption' : 
          `${shortage.stockDays.toFixed(1)} days`;
        
        displayLines.push(`  ${resourceIcon} ${shortage.resourceType.toUpperCase()} ${levelColor} (${stockInfo})`);
        displayLines.push(`    Prod: ${shortage.production.toFixed(1)} | Cons: ${shortage.consumption.toFixed(1)}`);
      }
      displayLines.push('');
    }

    // 表示しきれない村がある場合
    if (shortageInfoList.length > 8) {
      displayLines.push(`... and ${shortageInfoList.length - 8} more villages with shortages`);
    }

    // 最終更新時刻
    const now = new Date();
    displayLines.push(`Last updated: ${now.toLocaleTimeString()}`);

    // テキストを設定
    this.statusText.setText(displayLines.join('\n'));
    
    // 全体の危機レベルに応じて色を設定
    if (criticalVillages > 0) {
      this.statusText.setColor("#ff4444"); // 赤色（危機的）
    } else if (majorVillages > 0) {
      this.statusText.setColor("#ffaa00"); // オレンジ色（重大）
    } else {
      this.statusText.setColor("#ffff44"); // 黄色（軽微）
    }
  }

  /**
   * 危機レベルのアイコンを取得
   * @param level 危機レベル
   * @returns アイコン文字列
   */
  private getCriticalLevelIcon(level: VillageShortageInfo['criticalLevel']): string {
    switch (level) {
      case 'critical': return '🔴';
      case 'major': return '🟠';
      case 'minor': return '🟡';
      default: return '🟢';
    }
  }

  /**
   * 資源タイプのアイコンを取得
   * @param resourceType 資源タイプ
   * @returns アイコン文字列
   */
  private getResourceIcon(resourceType: ResourceType): string {
    switch (resourceType) {
      case 'food': return '🌾';
      case 'wood': return '🪵';
      case 'ore': return '⛏️';
      default: return '❓';
    }
  }

  /**
   * レベル表示を取得
   * @param level 需給レベル
   * @returns レベル表示文字列
   */
  private getLevelIndicator(level: SupplyDemandLevel): string {
    switch (level) {
      case 'critical': return '[CRITICAL]';
      case 'shortage': return '[SHORT]';
      case 'balanced': return '[OK]';
      case 'surplus': return '[SURPLUS]';
      default: return '[UNKNOWN]';
    }
  }

  /**
   * UIの位置を更新
   * @param x X座標
   * @param y Y座標
   */
  updatePosition(x: number, y: number): void {
    this.panelX = x;
    this.panelY = y;
    if (this.statusPanel) {
      this.statusPanel.setPosition(x, y);
    }
  }

  /**
   * UIのサイズを更新
   * @param width 幅
   * @param height 高さ
   */
  updateSize(width: number, height: number): void {
    this.panelWidth = width;
    this.panelHeight = height;
    
    if (this.statusBackground) {
      this.statusBackground.clear();
      this.statusBackground.fillStyle(0x000000, 0.85);
      this.statusBackground.fillRoundedRect(0, 0, width, height, 8);
      this.statusBackground.lineStyle(2, 0x666666, 1.0);
      this.statusBackground.strokeRoundedRect(0, 0, width, height, 8);
    }
    
    if (this.statusText) {
      this.statusText.setWordWrapWidth(width - 30);
    }
  }

  /**
   * リソースを解放
   */
  destroy(): void {
    if (this.statusPanel) {
      this.statusPanel.destroy();
    }
  }
}