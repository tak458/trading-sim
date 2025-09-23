# Design Document

## Overview

資源タイル消耗システムは、現在の無限資源システムを拡張し、タイルの資源が採取により減少し、時間経過で回復する動的なシステムを実装します。このシステムは既存のTileインターフェースを拡張し、村の採取ロジックを更新し、神の介入UIを追加します。

## Architecture

### Core Components

1. **Enhanced Tile System**: 現在のTileタイプに資源状態管理機能を追加
2. **Resource Depletion Manager**: 資源の消耗と回復を管理するシステム
3. **Visual Resource Indicator**: タイルの資源状態を視覚化するレンダリングシステム
4. **Divine Intervention Interface**: 神（プレイヤー）がタイルの資源を調整するUI
5. **Configuration System**: 消耗・回復速度などの設定を管理

### Data Flow

```
Village Collection → Resource Depletion → Tile State Update → Visual Update
                                    ↓
Time Progression → Resource Recovery → Tile State Update → Visual Update
                                    ↓
Divine Intervention → Direct Resource Modification → Tile State Update → Visual Update
```

## Components and Interfaces

### Enhanced Tile Interface

```typescript
export type Tile = {
  height: number;
  type: "water" | "land" | "forest" | "mountain";
  resources: {
    food: number;
    wood: number;
    ore: number;
  };
  // 新規追加
  maxResources: {
    food: number;
    wood: number;
    ore: number;
  };
  depletionState: {
    food: number; // 0-1, 0=完全枯渇, 1=満タン
    wood: number;
    ore: number;
  };
  recoveryTimer: {
    food: number; // 回復までの残り時間（フレーム数）
    wood: number;
    ore: number;
  };
  lastHarvestTime: number; // 最後に採取された時間
};
```

### Resource Configuration

```typescript
export interface ResourceConfig {
  depletionRate: number; // 採取時の消耗率 (0.1 = 10%減少)
  recoveryRate: number; // 回復率 (フレームあたり)
  recoveryDelay: number; // 枯渇後の回復開始遅延（フレーム数）
  minRecoveryThreshold: number; // 回復開始の最小閾値
  typeMultipliers: {
    land: { food: number; wood: number; ore: number };
    forest: { food: number; wood: number; ore: number };
    mountain: { food: number; wood: number; ore: number };
  };
}
```

### Resource Manager

```typescript
export class ResourceManager {
  private config: ResourceConfig;
  
  constructor(config: ResourceConfig);
  
  // 資源採取処理
  harvestResource(tile: Tile, resourceType: keyof Tile['resources'], amount: number): number;
  
  // 資源回復処理
  updateRecovery(tile: Tile, deltaTime: number): void;
  
  // 神の介入
  divineIntervention(tile: Tile, resourceType: keyof Tile['resources'], newAmount: number): void;
  
  // 視覚状態計算
  getVisualState(tile: Tile): ResourceVisualState;
}
```

## Data Models

### Resource Visual State

```typescript
export interface ResourceVisualState {
  opacity: number; // 0.3-1.0, 資源量に基づく透明度
  tint: number; // 色調整（枯渇時は赤みがかる）
  isDepleted: boolean; // 完全枯渇フラグ
  recoveryProgress: number; // 0-1, 回復進行度
}
```

### Divine Intervention UI State

```typescript
export interface DivineUIState {
  selectedTile: { x: number; y: number } | null;
  isActive: boolean;
  adjustmentMode: 'increase' | 'decrease' | 'set';
  selectedResource: keyof Tile['resources'] | 'all';
}
```

## Error Handling

### Resource Validation

1. **Negative Resource Prevention**: 資源量が負の値にならないよう制限
2. **Maximum Resource Capping**: 最大値を超えないよう制限
3. **Invalid Tile Access**: 存在しないタイルへのアクセスを防止
4. **Configuration Validation**: 設定値の妥当性チェック

### Recovery System Safeguards

1. **Recovery Rate Limits**: 異常な回復速度を防止
2. **Timer Overflow Protection**: 長時間実行時のタイマーオーバーフロー対策
3. **State Consistency**: タイル状態の整合性チェック

## Testing Strategy

### Unit Tests

1. **ResourceManager Tests**
   - 資源採取の正確性テスト
   - 回復システムのテスト
   - 神の介入機能のテスト
   - 設定値バリデーションのテスト

2. **Tile State Tests**
   - タイル状態更新の正確性
   - 視覚状態計算のテスト
   - 境界値テスト（0, 最大値）

### Integration Tests

1. **Village-Resource Integration**
   - 村の採取とタイル消耗の連携テスト
   - 複数村による同一タイル採取のテスト

2. **Visual System Integration**
   - 資源状態変化の視覚反映テスト
   - UI操作とタイル状態の連携テスト

### Performance Tests

1. **Large Map Performance**
   - 大きなマップでの回復処理性能
   - 多数のタイル同時更新の性能

2. **Memory Usage**
   - 拡張されたタイルデータのメモリ使用量
   - 長時間実行時のメモリリーク検証

## Implementation Considerations

### Performance Optimization

1. **Selective Updates**: 変更されたタイルのみ更新
2. **Batch Processing**: 複数タイルの一括処理
3. **Visual Update Throttling**: 視覚更新の頻度制限

### Backward Compatibility

1. **Gradual Migration**: 既存のTileデータを新形式に変換
2. **Default Values**: 新しいプロパティのデフォルト値設定
3. **Legacy Support**: 既存の村採取ロジックとの互換性維持

### User Experience

1. **Smooth Transitions**: 資源状態変化のスムーズなアニメーション
2. **Clear Feedback**: 神の介入時の明確なフィードバック
3. **Intuitive Controls**: 直感的な操作インターフェース