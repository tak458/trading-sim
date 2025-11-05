# 推奨コマンド

## 開発コマンド
```bash
# 開発サーバー起動
npm run dev

# TypeScript型チェック（出力なし）
npm run type-check
```

## コード品質
```bash
# Biomeリンターとフォーマッターチェック実行
npm run check

# Biome問題の自動修正
npm run check:fix
```

## テスト
```bash
# ウォッチモードでテスト実行
npm run test

# 一度だけテスト実行して終了
npm run test:run

# UIインターフェースでテスト実行
npm run test:ui
```

## 本番
```bash
# 本番用ビルド
npm run build

# 本番ビルドのプレビュー
npm run preview

# GitHub Pagesにデプロイ
npm run deploy
```

## Windows固有のユーティリティコマンド
```cmd
# ファイル一覧
dir

# ファイル削除
del filename.txt

# ディレクトリ削除
rmdir /s /q dirname

# ファイルコピー
copy source.txt destination.txt

# ディレクトリ作成
mkdir dirname

# ファイル内容表示
type filename.txt

# ファイル内検索
findstr "pattern" *.txt
```

## Git操作
```bash
# 状態確認
git status

# 変更をステージング
git add .

# コミット
git commit -m "message"

# プッシュ
git push
```

## タスク完了時の推奨フロー
1. `npm run check:fix` - コードフォーマットと基本的な問題修正
2. `npm run type-check` - TypeScript型エラーチェック
3. `npm run test:run` - 全テスト実行
4. `npm run build` - 本番ビルド確認（オプション）