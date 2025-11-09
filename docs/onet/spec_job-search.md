# 職種選定ロジック

## 概要

ユーザーの依頼内容（自然言語）から最適な職種を自動選定する機能です。O*NETの1016職種を埋め込みベクトル化してPostgreSQLに格納し、ユーザーリクエストとの類似度検索により適切な職種を提案します。

---

## システム構成

### データソース
- **O*NET Database**: 米国労働省が提供する職業情報データベース（英語）
  - Occupation Data: 職種一覧（Title, Description）
  - Task Statements: 職種ごとのタスク情報
  - データ保存場所: [Google Drive 社内共有フォルダ](https://drive.google.com/drive/folders/10MVSYIif2aAYPl14kUbVgYQa0qJkwj2k)

### 技術スタック
- **データベース**: PostgreSQL + pgvector（Docker環境）
- **埋め込みモデル**: all-MiniLM-L6-v2（384次元）
  - 軽量で高速、ローカル開発に最適
  - L2正規化を適用してコサイン類似度検索を最適化
- **検索方式**: pgvectorのL2距離演算子（`<->`）による近傍検索

---

## データベース設計

### occupationsテーブル

| カラム名 | データ型 | 説明 |
|---------|---------|------|
| id | TEXT (PK) | O*NET-SOC Code（例: "11-1011.00"） |
| name | TEXT | 職種名 |
| embedding | vector(384) | 埋め込みベクトル（Title + Description + Task 5件から生成） |
| metadata_json | JSONB | メタデータ（モデル名、生成日時、次元数など） |
| created_at | TIMESTAMP | レコード作成日時 |
| updated_at | TIMESTAMP | レコード更新日時 |

**特記事項:**
- 埋め込み生成に使用した結合テキストはDBには保存せず、npzファイルに保存（デバッグ・参照用）
- 将来的にIVFFlat/HNSWインデックスを追加して検索高速化を検討

---

## 実装フロー

### 1. データ準備（完了）
- O*NETデータをJupyter Notebookで前処理
- 職種ごとに Title + Description + 代表的なTask 5件 を結合
- Sentence Transformersで埋め込みベクトル生成（L2正規化適用）
- 統一npzフォーマットで保存（embeddings, ids, names, texts, model, embed_date, dim）

### 2. データベース投入（完了）
- Docker起動時に自動マイグレーション＆データ挿入
- 1016件の職種データをoccupationsテーブルに格納
- 冪等性確保（空テーブルの場合のみ挿入）

### 3. 職種検索（完了）
1. ユーザーリクエストを埋め込みベクトル化
2. pgvectorのL2距離で類似度検索
3. 上位K件の職種と類似度スコアを返却

---

## 運用ガイド

### 埋め込みデータの更新手順

1. **新しい埋め込みを生成**
   ```bash
   cd api/examples/onet/notebooks
   jupyter notebook embed_and_search.ipynb
   # 新しい .npz ファイルが api/examples/onet/data/output/ に生成
   ```

2. **migrate.shのパスを更新**
   ```bash
   # api/scripts/migrate.sh の EMBED_NPZ 変数を編集
   EMBED_NPZ="/workspace/api/examples/onet/data/output/occupations_新しいファイル名.npz"
   ```

3. **データを再投入**
   ```bash
   docker-compose run -e FORCE_SEED_DATA=1 db-migrate
   ```

### トラブルシューティング

- **検索精度が低い**: 日本語の短いクエリは精度が低下しやすい（英語最適化モデルのため）
- **データが挿入されない**: `FORCE_SEED_DATA=1` 環境変数で強制再挿入
- **型エラー**: マイグレーションはraw SQLでvector型を作成（SQLAlchemyのUDTでは正しく生成されないため）

---

## 実装状況

- ✅ pgvector環境構築（Docker）
- ✅ occupationsテーブル作成
- ✅ 埋め込み生成パイプライン
- ✅ データ自動投入（Docker起動時）
- ✅ 職種検索機能（ベクトル類似度検索）

---

## 今後の改善案

- 多言語対応モデルへの切り替え（日本語精度向上）
- ベクトルインデックス追加（検索高速化）
- タスク情報の返却機能追加
- 検索結果の説明性向上（なぜこの職種が選ばれたか）
