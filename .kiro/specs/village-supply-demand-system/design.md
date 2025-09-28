# 設計書

## 概要

村の需要と供給システムは、各村が生産・消費・ストックを管理し、人口に基づく資源消費と建物建設による資源利用を実現します。このシステムにより、村の発展がより現実的で戦略的なものになります。

## アーキテクチャ

### システム構成

```
VillageSupplyDemandSystem
├── VillageEconomyManager (村経済管理)
├── PopulationManager (人口管理)
├── BuildingManager (建物管理)
├── ResourceDemandCalculator (需要計算)
├── SupplyDemandBalancer (需給バランサー)
└── VillageStatusUI (状況表示UI)
```

### データフロー

```
時間経過 → 人口による食料消費 → 人口変化
       → 建物建設による資源消費 → 建物数変化
       → 需給バランス計算 → UI更新
```

## コンポーネントとインターフェース

### 1. VillageEconomy インターフェース

```typescript
interface VillageEconomy {
  // 生産能力
  production: {
    food: number;
    wood: number;
    ore: number;
  };
  
  // 消費量
  consumption: {
    food: number;        // 人口による消費
    wood: number;        // 建物建設による消費
    ore: number;         // 建物建設による消費
  };
  
  // ストック情報（既存のstorageを拡張）
  stock: {
    food: number;
    wood: number;
    ore: number;
    capacity: number;    // ストック容量
  };
  
  // 建物情報
  buildings: {
    count: number;       // 現在の建物数
    targetCount: number; // 人口に基づく目標建物数
    constructionQueue: number; // 建設待ち数
  };
  
  // 需給状況
  supplyDemandStatus: {
    food: 'surplus' | 'balanced' | 'shortage' | 'critical';
    wood: 'surplus' | 'balanced' | 'shortage' | 'critical';
    ore: 'surplus' | 'balanced' | 'shortage' | 'critical';
  };
}
```

### 2. VillageEconomyManager クラス

```typescript
class VillageEconomyManager {
  // 村の経済状況を更新
  updateVillageEconomy(village: Village, gameTime: GameTime): void;
  
  // 生産能力を計算
  calculateProduction(village: Village, availableResources: ResourceInfo): Production;
  
  // 消費量を計算
  calculateConsumption(village: Village): Consumption;
  
  // 需給バランスを評価
  evaluateSupplyDemand(village: Village): SupplyDemandStatus;
  
  // 資源不足の村を特定
  getResourceShortageVillages(): Village[];
}
```

### 3. PopulationManager クラス

```typescript
class PopulationManager {
  // 食料消費による人口変化を処理
  updatePopulation(village: Village, gameTime: GameTime): void;
  
  // 食料消費量を計算
  calculateFoodConsumption(population: number): number;
  
  // 人口増加条件をチェック
  canPopulationGrow(village: Village): boolean;
  
  // 人口減少条件をチェック
  shouldPopulationDecrease(village: Village): boolean;
}
```

### 4. BuildingManager クラス

```typescript
class BuildingManager {
  // 建物建設を処理
  updateBuildings(village: Village, gameTime: GameTime): void;
  
  // 目標建物数を計算
  calculateTargetBuildingCount(population: number): number;
  
  // 建設に必要な資源を計算
  calculateBuildingCost(): { wood: number; ore: number };
  
  // 建設可能かチェック
  canBuildBuilding(village: Village): boolean;
}
```

## データモデル

### Village インターフェース拡張

既存のVillageインターフェースを拡張：

```typescript
interface Village {
  // 既存プロパティ
  x: number;
  y: number;
  population: number;
  storage: { food: number; wood: number; ore: number };
  collectionRadius: number;
  
  // 新規追加プロパティ
  economy: VillageEconomy;
  lastUpdateTime: number;
  populationHistory: number[]; // 人口変化の履歴
}
```

### 設定インターフェース

```typescript
interface SupplyDemandConfig {
  // 人口関連
  foodConsumptionPerPerson: number;    // 1人当たりの食料消費量
  populationGrowthRate: number;        // 人口増加率
  populationDeclineRate: number;       // 人口減少率
  
  // 建物関連
  buildingsPerPopulation: number;      // 人口当たりの建物数
  buildingWoodCost: number;           // 建物1つの木材コスト
  buildingOreCost: number;            // 建物1つの鉱石コスト
  
  // 需給バランス閾値
  surplusThreshold: number;           // 余剰判定閾値
  shortageThreshold: number;          // 不足判定閾値
  criticalThreshold: number;          // 危機判定閾値
}
```

## エラーハンドリング

### エラー処理戦略

1. **データ整合性エラー**
   - 負の値の検出と修正
   - 範囲外の値の正規化

2. **計算エラー**
   - ゼロ除算の防止
   - NaN/Infinityの処理

3. **状態不整合エラー**
   - 村の状態復旧機能
   - デフォルト値への復帰

### エラーログ

```typescript
interface EconomyError {
  villageId: number;
  errorType: 'calculation' | 'data_integrity' | 'state_inconsistency';
  message: string;
  timestamp: number;
  recoveryAction: string;
}
```

## テスト戦略

### 1. ユニットテスト

- **VillageEconomyManager**
  - 生産能力計算の正確性
  - 消費量計算の正確性
  - 需給バランス評価の正確性

- **PopulationManager**
  - 食料消費計算
  - 人口増減ロジック
  - 境界条件の処理

- **BuildingManager**
  - 建物数計算
  - 建設コスト計算
  - 建設可能性判定

### 2. 統合テスト

- **村システム統合**
  - 人口変化と建物建設の連携
  - 資源消費と生産のバランス
  - 時間経過による状態変化

- **UI統合**
  - 資源不足情報の表示
  - リアルタイム更新
  - ユーザーインタラクション

### 3. パフォーマンステスト

- **大規模シミュレーション**
  - 多数の村での処理性能
  - メモリ使用量の監視
  - フレームレート維持

### 4. エッジケーステスト

- **極端な状況**
  - 全資源枯渇状態
  - 人口ゼロ状態
  - 建物数上限到達

## 実装フェーズ

### フェーズ1: 基盤システム
- VillageEconomyインターフェース定義
- 基本的な需給計算ロジック

### フェーズ2: 人口システム
- PopulationManager実装
- 食料消費による人口変化

### フェーズ3: 建物システム
- BuildingManager実装
- 建設による資源消費

### フェーズ4: UI統合
- 資源不足表示システム
- リアルタイム状況更新

### フェーズ5: 最適化
- パフォーマンス改善
- エラーハンドリング強化

## パフォーマンス考慮事項

### 最適化戦略

1. **計算頻度の最適化**
   - 重い計算の間隔調整
   - 変化がない場合のスキップ

2. **データ構造の最適化**
   - 効率的なデータアクセス
   - メモリ使用量の削減

3. **UI更新の最適化**
   - 必要な場合のみ更新
   - バッチ処理による効率化

### メモリ管理

- 不要なデータの定期的なクリーンアップ
- 履歴データの適切な制限
- オブジェクトプールの活用

## セキュリティ考慮事項

### データ検証

- 入力値の範囲チェック
- 計算結果の妥当性検証
- 状態の整合性確認

### 不正操作防止

- 村の状態改変の制限
- 計算ロジックの保護
- デバッグ機能の適切な制御