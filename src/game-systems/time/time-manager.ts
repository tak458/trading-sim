// src/game-systems/time/time-manager.ts
// 時間概念を管理するシステム

export interface TimeConfig {
  // 基本時間設定
  gameSpeed: number; // ゲーム速度倍率 (1.0 = 通常速度)
  ticksPerSecond: number; // 1秒あたりのティック数
  
  // 資源関連の時間設定
  resourceUpdateInterval: number; // 資源更新間隔（ティック）
  harvestCooldown: number; // 採取後のクールダウン（ティック）
  
  // 村関連の時間設定
  villageUpdateInterval: number; // 村更新間隔（ティック）
  tradeInterval: number; // 交易間隔（ティック）
  
  // 視覚効果の時間設定
  visualUpdateInterval: number; // 視覚更新間隔（ティック）
}

import type { GameTime } from '../shared-types';

export const DEFAULT_TIME_CONFIG: TimeConfig = {
  gameSpeed: 1.0,
  ticksPerSecond: 1, // 1 TPS (1秒に1回)
  resourceUpdateInterval: 1, // 毎ティック資源更新（1秒に1回）
  harvestCooldown: 2, // 2秒のクールダウン
  villageUpdateInterval: 1, // 1秒間隔で村更新
  tradeInterval: 3, // 3秒間隔で交易
  visualUpdateInterval: 1 // 1秒間隔で視覚更新
};

/**
 * 時間管理システム
 * フレームレートに依存しない独立した時間概念を提供
 */
export class TimeManager {
  private config: TimeConfig;
  private gameTime: GameTime;
  private lastUpdateTime: number;
  private accumulatedTime: number;
  private tickInterval: number; // ミリ秒単位でのティック間隔
  
  // イベント管理
  private scheduledEvents: Map<number, (() => void)[]> = new Map();
  private intervalEvents: Map<string, { callback: () => void; interval: number; lastTick: number }> = new Map();
  
  constructor(config?: Partial<TimeConfig>) {
    this.config = { ...DEFAULT_TIME_CONFIG, ...config };
    this.gameTime = {
      currentTime: 0,
      deltaTime: 0,
      totalTicks: 0,
      totalSeconds: 0,
      totalMinutes: 0,
      currentTick: 0
    };
    
    this.lastUpdateTime = performance.now();
    this.accumulatedTime = 0;
    this.tickInterval = (1000 / this.config.ticksPerSecond) / this.config.gameSpeed;
  }

  /**
   * 時間システムを更新（メインループから呼び出し）
   */
  update(): void {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;
    
    // GameTime オブジェクトを更新
    this.gameTime.currentTime = currentTime;
    this.gameTime.deltaTime = deltaTime;
    
    // ゲーム速度を適用した時間を蓄積
    this.accumulatedTime += deltaTime * this.config.gameSpeed;
    
    // ティック処理
    while (this.accumulatedTime >= this.tickInterval) {
      this.processTick();
      this.accumulatedTime -= this.tickInterval;
    }
  }

  /**
   * 1ティックの処理
   */
  private processTick(): void {
    this.gameTime.totalTicks++;
    this.gameTime.currentTick = this.gameTime.totalTicks % this.config.ticksPerSecond;
    
    // 秒と分の計算
    if (this.gameTime.currentTick === 0) {
      this.gameTime.totalSeconds++;
      if (this.gameTime.totalSeconds % 60 === 0) {
        this.gameTime.totalMinutes++;
      }
    }
    
    // スケジュールされたイベントを実行
    this.processScheduledEvents();
    
    // 間隔イベントを実行
    this.processIntervalEvents();
  }

  /**
   * スケジュールされたイベントを処理
   */
  private processScheduledEvents(): void {
    const events = this.scheduledEvents.get(this.gameTime.totalTicks);
    if (events) {
      events.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error('Scheduled event error:', error);
        }
      });
      this.scheduledEvents.delete(this.gameTime.totalTicks);
    }
  }

  /**
   * 間隔イベントを処理
   */
  private processIntervalEvents(): void {
    this.intervalEvents.forEach((event, key) => {
      if (this.gameTime.totalTicks - event.lastTick >= event.interval) {
        try {
          event.callback();
          event.lastTick = this.gameTime.totalTicks;
        } catch (error) {
          console.error(`Interval event error (${key}):`, error);
        }
      }
    });
  }

  /**
   * 指定ティック後にイベントをスケジュール
   */
  scheduleEvent(ticksFromNow: number, callback: () => void): void {
    const targetTick = this.gameTime.totalTicks + ticksFromNow;
    
    if (!this.scheduledEvents.has(targetTick)) {
      this.scheduledEvents.set(targetTick, []);
    }
    
    this.scheduledEvents.get(targetTick)!.push(callback);
  }

  /**
   * 間隔イベントを登録
   */
  registerIntervalEvent(key: string, interval: number, callback: () => void): void {
    this.intervalEvents.set(key, {
      callback,
      interval,
      lastTick: this.gameTime.totalTicks
    });
  }

  /**
   * 間隔イベントを削除
   */
  unregisterIntervalEvent(key: string): void {
    this.intervalEvents.delete(key);
  }

  /**
   * 特定の間隔でイベントが実行されるべきかチェック
   */
  shouldExecuteInterval(interval: number, offset: number = 0): boolean {
    return (this.gameTime.totalTicks + offset) % interval === 0;
  }

  /**
   * 資源更新のタイミングかチェック
   */
  shouldUpdateResources(): boolean {
    return this.shouldExecuteInterval(this.config.resourceUpdateInterval);
  }

  /**
   * 村更新のタイミングかチェック
   */
  shouldUpdateVillages(): boolean {
    return this.shouldExecuteInterval(this.config.villageUpdateInterval);
  }

  /**
   * 交易のタイミングかチェック
   */
  shouldExecuteTrade(): boolean {
    return this.shouldExecuteInterval(this.config.tradeInterval);
  }

  /**
   * 視覚更新のタイミングかチェック
   */
  shouldUpdateVisuals(): boolean {
    return this.shouldExecuteInterval(this.config.visualUpdateInterval);
  }

  /**
   * 採取クールダウンが終了しているかチェック
   */
  isHarvestCooldownExpired(lastHarvestTick: number): boolean {
    return this.gameTime.totalTicks - lastHarvestTick >= this.config.harvestCooldown;
  }

  /**
   * 現在のゲーム時間を取得
   */
  getGameTime(): GameTime {
    return { ...this.gameTime };
  }

  /**
   * 時間設定を取得
   */
  getConfig(): TimeConfig {
    return { ...this.config };
  }

  /**
   * 時間設定を更新
   */
  updateConfig(newConfig: Partial<TimeConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.tickInterval = (1000 / this.config.ticksPerSecond) / this.config.gameSpeed;
  }

  /**
   * ゲーム速度を変更
   */
  setGameSpeed(speed: number): void {
    this.config.gameSpeed = Math.max(0.1, Math.min(10.0, speed)); // 0.1x - 10x の範囲
    this.tickInterval = (1000 / this.config.ticksPerSecond) / this.config.gameSpeed;
  }

  /**
   * 時間を一時停止/再開
   */
  pause(): void {
    this.setGameSpeed(0);
  }

  resume(speed: number = 1.0): void {
    this.setGameSpeed(speed);
  }

  /**
   * 時間情報を文字列として取得（デバッグ用）
   */
  getTimeString(): string {
    const minutes = Math.floor(this.gameTime.totalMinutes);
    const seconds = Math.floor(this.gameTime.totalSeconds % 60);
    const ticks = this.gameTime.currentTick;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ticks}`;
  }

  /**
   * パフォーマンス統計を取得
   */
  getPerformanceStats(): {
    ticksPerSecond: number;
    actualTPS: number;
    gameSpeed: number;
    scheduledEvents: number;
    intervalEvents: number;
  } {
    return {
      ticksPerSecond: this.config.ticksPerSecond,
      actualTPS: this.config.ticksPerSecond * this.config.gameSpeed,
      gameSpeed: this.config.gameSpeed,
      scheduledEvents: Array.from(this.scheduledEvents.values()).reduce((sum, events) => sum + events.length, 0),
      intervalEvents: this.intervalEvents.size
    };
  }

  /**
   * 時間システムをリセット
   */
  reset(): void {
    this.gameTime = {
      currentTime: 0,
      deltaTime: 0,
      totalTicks: 0,
      totalSeconds: 0,
      totalMinutes: 0,
      currentTick: 0
    };
    
    this.scheduledEvents.clear();
    this.intervalEvents.clear();
    this.lastUpdateTime = performance.now();
    this.accumulatedTime = 0;
  }
}