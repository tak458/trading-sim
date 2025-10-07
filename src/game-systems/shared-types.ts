// Shared types across game systems
// This file contains common interfaces and types used by multiple game systems

/**
 * ゲーム時間を表すインターフェース
 * 全てのゲームシステムで共通して使用される時間情報
 */
export interface GameTime {
  currentTime: number; // 現在時刻（ミリ秒）
  deltaTime: number; // 前フレームからの経過時間（ミリ秒）
  totalTicks: number; // 総ティック数
  totalSeconds: number; // 総秒数
  totalMinutes: number; // 総分数
  currentTick: number; // 現在のティック（1秒内での位置）
}

/**
 * 資源情報を表すインターフェース
 */
export interface ResourceInfo {
  food: number;
  wood: number;
  ore: number;
}
