# プロジェクト構造 & アーキテクチャ

## ディレクトリ構造

```
src/
├── settings.ts                    # 一元化設定システム（シングルトン）
├── main.ts                        # アプリケーションエントリーポイント
├── config-example.ts              # 設定例
├── game-systems/                  # 純粋なビジネスロジック（グラフィックスなし）
│   ├── shared-types.ts            # 共通型定義
│   ├── economy/                   # 経済シミュレーション
│   │   ├── village-economy.ts     # 村の経済管理
│   │   ├── resource-manager.ts    # 資源生産/消費
│   │   ├── supply-demand-balancer.ts # 需給計算
│   │   └── economy-error-handler.ts  # 経済エラー処理
│   ├── population/                # 人口 & 建物システム
│   │   ├── population-manager.ts  # 人口増減
│   │   └── building-manager.ts    # 建物建設ロジック
│   ├── world/                     # ワールドシミュレーション
│   │   ├── map.ts                 # マップ生成とタイル管理
│   │   ├── village.ts             # 村エンティティと動作
│   │   └── trade.ts               # 交易ルート計算
│   ├── time/                      # 時間管理
│   │   └── time-manager.ts        # ゲーム時間とティックシステム
│   └── integration/               # システム調整
│       ├── village-economy-manager.ts    # 村-経済統合
│       ├── final-integration-system.ts  # マスターシステムコーディネーター
│       └── performance-optimizer.ts     # パフォーマンス管理
├── graphics/                      # Phaser 3レンダリング（プレゼンテーション層）
│   ├── interfaces/                # グラフィックス固有インターフェース
│   ├── scenes/                    # Phaserゲームシーン
│   │   ├── map-scene.ts           # メインゲームビュー
│   │   └── ui-scene.ts            # ユーザーインターフェースオーバーレイ
│   └── ui/                        # UIコンポーネント
│       ├── village-status-ui.ts   # 村情報表示
│       └── resource-config-ui.ts  # 資源設定インターフェース
└── test/                          # 包括的テストスイート
    ├── setup.ts                   # テスト環境セットアップ
    └── (各種テストファイル)       # ユニット、統合、システムテスト
```

## アーキテクチャパターン

### 設定システム
- **シングルトンパターン** - グローバル設定管理
- **検証とサニタイゼーション** - 全設定値の検証
- **変更リスナー** - リアクティブ更新
- **プリセットシステム** - 異なる難易度レベル

### システム統合
- **FinalIntegrationSystem** - 全ゲームシステムの調整
- **パフォーマンス最適化** - バッチ更新とメモリ管理
- **エラーハンドリング** - 優雅な劣化
- **モジュラー設計** - システムの独立テストを可能にする

### 主要コンポーネント
- **SettingsManager** - 設定の一元管理
- **VillageEconomyManager** - 村の経済システム統合
- **ResourceManager** - 資源生産・消費管理
- **PopulationManager** - 人口動態管理
- **BuildingManager** - 建物建設システム
- **TimeManager** - ゲーム時間管理