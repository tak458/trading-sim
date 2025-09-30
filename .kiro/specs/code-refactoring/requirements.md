# Requirements Document

## Introduction

現在のソースコードは機能別に分散しており、ゲームシステムとPhaser3のグラフィックス部分が混在している状況です。コードの保守性と拡張性を向上させるため、システムを論理的に分離し、設定を一元化する必要があります。

## Requirements

### Requirement 1

**User Story:** 開発者として、ゲームシステムとグラフィックス部分を分離したいので、コードの保守性と理解しやすさを向上させたい

#### Acceptance Criteria

1. WHEN コードを整理する THEN ゲームロジック（経済システム、村管理、資源管理など）とPhaser3のグラフィックス部分が明確に分離されている SHALL
2. WHEN 新しい機能を追加する THEN ゲームロジックとグラフィックス部分を独立して変更できる SHALL
3. WHEN コードを読む THEN どの部分がゲームシステムでどの部分がグラフィックスかが明確に分かる SHALL

### Requirement 2

**User Story:** 開発者として、設定値を一箇所で管理したいので、設定変更時の作業効率を向上させたい

#### Acceptance Criteria

1. WHEN 設定を変更する THEN src/settings.ts ファイル一箇所で全ての設定値を管理できる SHALL
2. WHEN 設定値を参照する THEN 各モジュールは settings.ts から設定値をインポートして使用する SHALL
3. WHEN 新しい設定項目を追加する THEN settings.ts に追加するだけで全システムで利用可能になる SHALL

### Requirement 3

**User Story:** 開発者として、フォルダ構造を論理的に整理したいので、ファイルの場所を直感的に理解できるようにしたい

#### Acceptance Criteria

1. WHEN ファイル構造を見る THEN ゲームシステム関連のファイルが適切なフォルダに分類されている SHALL
2. WHEN グラフィックス関連のファイルを探す THEN Phaser3関連のファイルが専用フォルダに整理されている SHALL
3. WHEN 設定ファイルを探す THEN 設定関連のファイルが分かりやすい場所に配置されている SHALL

### Requirement 4

**User Story:** 開発者として、既存の機能を壊さずにリファクタリングしたいので、動作確認しながら段階的に整理を進めたい

#### Acceptance Criteria

1. WHEN リファクタリングを実行する THEN 既存のゲーム機能が正常に動作し続ける SHALL
2. WHEN ファイルを移動する THEN インポート文が正しく更新され、ビルドエラーが発生しない SHALL
3. WHEN テストを実行する THEN 既存のテストが引き続き通る SHALL

### Requirement 5

**User Story:** 開発者として、TypeScriptの型安全性を維持したいので、リファクタリング後も型チェックが正常に機能するようにしたい

#### Acceptance Criteria

1. WHEN TypeScriptコンパイルを実行する THEN 型エラーが発生しない SHALL
2. WHEN インターフェースを移動する THEN 型定義が正しく参照され続ける SHALL
3. WHEN 新しい構造でコードを書く THEN IDEの型補完とエラー検出が正常に機能する SHALL