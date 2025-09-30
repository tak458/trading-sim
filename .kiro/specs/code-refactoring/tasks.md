# Implementation Plan

- [x] 1. 統合設定システムの作成
  - src/settings.tsファイルを作成し、全ての設定値を一元管理するシステムを実装
  - 既存の設定ファイル（supply-demand-config.ts、resource-manager.tsの設定部分）から設定値を統合
  - 型安全な設定管理クラス（SettingsManager）を実装
  - 設定値の検証とサニタイズ機能を実装
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2. 互換性レイヤーの実装
  - 既存のインポートパスを一時的にサポートする互換性レイヤーを作成
  - 既存コードが新しい設定システムを透過的に使用できるようにする
  - 非推奨警告を含む移行支援機能を実装
  - _Requirements: 4.1, 4.2, 5.1_

- [x] 3. 新しいフォルダ構造の作成
  - src/game-systems/フォルダとサブフォルダ（economy/, population/, world/, time/, integration/）を作成
  - src/graphics/フォルダとサブフォルダ（scenes/, ui/）を作成
  - 空のindex.tsファイルを各フォルダに配置してモジュール構造を準備
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 4. 経済システムファイルの移動と整理
  - village-economy.ts、resource-manager.ts、supply-demand-balancer.ts、economy-error-handler.tsをsrc/game-systems/economy/に移動
  - 移動したファイルのインポートパスを新しい設定システムを使用するように更新
  - 互換性レイヤー経由で既存のインポートパスをサポート
  - _Requirements: 3.1, 4.2, 5.2_

- [x] 5. 人口・建物システムファイルの移動
  - population-manager.ts、building-manager.tsをsrc/game-systems/population/に移動
  - 移動したファイルのインポートパスを更新
  - 新しい設定システムとの統合を実装
  - _Requirements: 3.1, 4.2, 5.2_

- [x] 6. ワールド・時間システムファイルの移動
  - map.ts、village.ts、trade.tsをsrc/game-systems/world/に移動
  - time-manager.tsをsrc/game-systems/time/に移動
  - 移動したファイルのインポートパスを更新し、新しい設定システムと統合
  - _Requirements: 3.1, 4.2, 5.2_

- [x] 7. 統合システムファイルの移動
  - village-economy-manager.ts、final-integration-system.ts、performance-optimizer.tsをsrc/game-systems/integration/に移動
  - これらのファイルを新しい設定システムと統合
  - システム間の依存関係を整理
  - _Requirements: 3.1, 4.2, 5.2_

- [x] 8. グラフィックスファイルの移動と分離
  - map-scene.ts、ui-scene.tsをsrc/graphics/scenes/に移動
  - village-status-ui.ts、resource-config-ui.tsをsrc/graphics/ui/に移動
  - Phaser3固有のコードとゲームロジックを分離
  - _Requirements: 1.1, 1.2, 3.2_

- [x] 9. メインファイルの更新
  - main.tsを新しいフォルダ構造に対応するように更新
  - 新しい設定システムを使用するように変更
  - エントリーポイントを最小限に保つ
  - _Requirements: 1.3, 4.2, 5.2_

- [x] 10. インポートパスの段階的更新
  - 各ファイルのインポート文を新しいフォルダ構造に合わせて更新
  - TypeScriptの型チェックエラーを解決
  - 循環依存を避けるように依存関係を整理
  - _Requirements: 4.2, 5.1, 5.2_

- [x] 11. 設定システムの統合テスト
  - 新しい設定システムが正しく動作することを確認するテストを作成
  - 設定値の検証とサニタイズ機能のテストを実装
  - 互換性レイヤーのテストを作成
  - _Requirements: 4.3, 5.1_

- [x] 12. システム分離の検証
  - ゲームシステムがグラフィックス部分から独立して動作することを確認
  - 各システムの単体テストを実装
  - 統合テストでシステム間の連携を確認
  - _Requirements: 1.1, 1.2, 4.3_

- [x] 13. 既存テストの更新（テスト検証をスキップ）
  - 既存のテストファイルを新しいフォルダ構造に対応するように更新
  - インポートパスを修正（テストの実行確認は不要）
  - 新しい設定システムを使用するテストに更新（動作確認は省略）
  - _Requirements: 4.3, 5.2_

- [x] 14. ビルドとTypeScript検証（テスト実行をスキップ）
  - 全ての変更後にTypeScriptコンパイルが成功することを確認
  - ビルドプロセスが正常に動作することを確認
  - 型エラーや警告を解決（テストコードの検証は不要）
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 15. 互換性レイヤーのクリーンアップ
  - 全ての移行が完了した後、互換性レイヤーを段階的に削除
  - 非推奨警告を削除し、最終的なクリーンな構造に移行
  - ドキュメントを更新して新しい構造を説明
  - _Requirements: 4.1, 4.2_