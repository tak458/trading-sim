# Design Document

## Overview

現在のソースコードは機能的には動作しているものの、ゲームロジックとPhaser3のグラフィックス部分が混在し、設定値が複数のファイルに分散している状況です。この設計では、コードの保守性と拡張性を向上させるため、以下の原則に基づいてリファクタリングを行います：

1. **関心の分離**: ゲームロジックとグラフィックス部分を明確に分離
2. **設定の一元化**: 全ての設定値をsrc/settings.tsで管理
3. **論理的なフォルダ構造**: 機能別にファイルを整理
4. **段階的移行**: 既存機能を壊さずに段階的にリファクタリング

## Architecture

### 新しいフォルダ構造

```
src/
├── settings.ts                    # 全設定の一元管理
├── main.ts                        # エントリーポイント（最小限）
├── game-systems/                  # ゲームシステム（ビジネスロジック）
│   ├── economy/
│   │   ├── village-economy.ts
│   │   ├── resource-manager.ts
│   │   ├── supply-demand-balancer.ts
│   │   └── economy-error-handler.ts
│   ├── population/
│   │   ├── population-manager.ts
│   │   └── building-manager.ts
│   ├── world/
│   │   ├── map.ts
│   │   ├── village.ts
│   │   └── trade.ts
│   ├── time/
│   │   └── time-manager.ts
│   └── integration/
│       ├── village-economy-manager.ts
│       ├── final-integration-system.ts
│       └── performance-optimizer.ts
├── graphics/                      # Phaser3グラフィックス
│   ├── scenes/
│   │   ├── map-scene.ts
│   │   └── ui-scene.ts
│   └── ui/
│       ├── village-status-ui.ts
│       └── resource-config-ui.ts
└── test/                          # テストファイル
    └── (既存のテストファイル)
```

### 設定システムの統合

現在、設定値が以下のファイルに分散しています：
- `supply-demand-config.ts` - 需給システム設定
- `resource-manager.ts` - 資源管理設定
- `config-example.ts` - 設定例

これらを`src/settings.ts`に統合し、型安全な設定管理システムを構築します。

## Components and Interfaces

### 1. 設定管理システム (src/settings.ts)

```typescript
// 統合設定インターフェース
export interface GameSettings {
  // 資源管理設定
  resources: ResourceConfig;
  
  // 需給システム設定
  supplyDemand: SupplyDemandConfig;
  
  // 時間システム設定
  time: TimeConfig;
  
  // グラフィックス設定
  graphics: GraphicsConfig;
  
  // ゲームプレイ設定
  gameplay: GameplayConfig;
}

// 設定管理クラス
export class SettingsManager {
  private static instance: SettingsManager;
  private settings: GameSettings;
  
  static getInstance(): SettingsManager;
  getSettings(): GameSettings;
  updateSettings(partial: Partial<GameSettings>): void;
  resetToDefaults(): void;
  validateSettings(): ValidationResult;
}
```

### 2. ゲームシステム抽象化

```typescript
// ゲームシステムの基底インターフェース
export interface GameSystem {
  initialize(settings: GameSettings): void;
  update(deltaTime: number): void;
  cleanup(): void;
}

// 経済システム
export class EconomySystem implements GameSystem {
  // 資源管理、需給バランス、村経済を統合管理
}

// 人口システム
export class PopulationSystem implements GameSystem {
  // 人口管理、建物管理を統合
}
```

### 3. グラフィックスシステム分離

```typescript
// グラフィックス抽象化インターフェース
export interface GraphicsRenderer {
  renderMap(mapData: MapData): void;
  renderVillages(villages: Village[]): void;
  renderUI(uiData: UIData): void;
}

// Phaser3実装
export class PhaserRenderer implements GraphicsRenderer {
  // Phaser3固有の実装
}
```

## Data Models

### 統合設定モデル

```typescript
// 資源設定
export interface ResourceConfig {
  depletionRate: number;
  recoveryRate: number;
  recoveryDelay: number;
  minRecoveryThreshold: number;
  typeMultipliers: TileTypeMultipliers;
}

// 時間設定
export interface TimeConfig {
  gameSpeed: number;
  ticksPerSecond: number;
  updateIntervals: {
    resources: number;
    villages: number;
    trade: number;
    visuals: number;
  };
}

// グラフィックス設定
export interface GraphicsConfig {
  tileSize: number;
  mapSize: number;
  cameraSettings: CameraConfig;
  uiSettings: UIConfig;
}

// ゲームプレイ設定
export interface GameplayConfig {
  difficulty: 'easy' | 'normal' | 'hard' | 'extreme';
  villageCount: number;
  initialResources: ResourceAmounts;
}
```

### ゲームシステム間のデータフロー

```typescript
// システム間通信用のイベントシステム
export interface GameEvent {
  type: string;
  data: any;
  timestamp: number;
}

export class EventBus {
  emit(event: GameEvent): void;
  subscribe(eventType: string, handler: (event: GameEvent) => void): void;
  unsubscribe(eventType: string, handler: Function): void;
}
```

## Error Handling

### 段階的移行エラー処理

1. **互換性レイヤー**: 既存のインポートパスを一時的にサポート
2. **検証システム**: 移行後の整合性チェック
3. **フォールバック機能**: 移行に失敗した場合の安全な復旧

```typescript
// 移行支援システム
export class MigrationHelper {
  static createCompatibilityLayer(): void;
  static validateMigration(): MigrationResult;
  static rollbackIfNeeded(): void;
}
```

### 設定エラー処理

```typescript
// 設定検証システム
export interface SettingsValidation {
  validateResourceConfig(config: ResourceConfig): ValidationResult;
  validateTimeConfig(config: TimeConfig): ValidationResult;
  validateGraphicsConfig(config: GraphicsConfig): ValidationResult;
  sanitizeSettings(settings: Partial<GameSettings>): GameSettings;
}
```

## Testing Strategy

### 1. 移行テスト戦略

- **段階的テスト**: 各移行ステップ後にテスト実行
- **回帰テスト**: 既存機能の動作確認
- **統合テスト**: 新しい構造での動作確認

### 2. 設定システムテスト

```typescript
// 設定システムのテスト
describe('SettingsManager', () => {
  test('should merge settings correctly');
  test('should validate settings');
  test('should handle invalid settings gracefully');
  test('should maintain backward compatibility');
});
```

### 3. システム分離テスト

```typescript
// ゲームシステムとグラフィックスの分離テスト
describe('System Separation', () => {
  test('game systems should work without graphics');
  test('graphics should render with mock data');
  test('event bus should handle system communication');
});
```

## Implementation Phases

### Phase 1: 設定システム統合
- `src/settings.ts`の作成
- 既存設定ファイルからの移行
- 互換性レイヤーの実装

### Phase 2: フォルダ構造整理
- 新しいフォルダ構造の作成
- ファイルの段階的移動
- インポートパスの更新

### Phase 3: システム分離
- ゲームロジックとグラフィックスの分離
- イベントシステムの実装
- 抽象化レイヤーの追加

### Phase 4: 最適化と検証
- パフォーマンステスト
- 統合テスト
- ドキュメント更新

## Migration Strategy

### 互換性維持

```typescript
// 既存のインポートパスをサポート（一時的）
// src/resource-manager.ts (deprecated)
export * from './game-systems/economy/resource-manager';
console.warn('This import path is deprecated. Use ./game-systems/economy/resource-manager instead.');
```

### 段階的移行手順

1. **設定統合**: 設定ファイルを統合し、既存コードは互換性レイヤー経由でアクセス
2. **ファイル移動**: 新しい構造にファイルを移動し、インポートパスを段階的に更新
3. **システム分離**: ゲームロジックとグラフィックスを分離
4. **クリーンアップ**: 互換性レイヤーを削除し、最終的な構造に移行

### 検証ポイント

- 各段階でビルドが成功すること
- 既存のテストが通ること
- ゲーム機能が正常に動作すること
- TypeScriptの型チェックが通ること

## Benefits

### 保守性の向上
- 関心の分離により、変更の影響範囲が明確
- 設定の一元化により、調整作業が効率化
- 論理的なフォルダ構造により、ファイルの場所が直感的

### 拡張性の向上
- ゲームシステムとグラフィックスの分離により、独立した拡張が可能
- 抽象化により、異なるレンダリングエンジンへの対応が容易
- イベントシステムにより、新しいシステムの追加が簡単

### テスタビリティの向上
- システム分離により、単体テストが容易
- 設定システムにより、異なる条件でのテストが簡単
- モックシステムの実装が容易