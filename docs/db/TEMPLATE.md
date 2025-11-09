---
title: "ドキュメントタイトル"
category: "schema | api-spec | migration | design"
status: "draft | review | approved | implemented"
author: "担当者名"
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
related_issue: "#123"
tags: ["workflow", "database", "api"]
---

# 🗂️ ドキュメントタイトル

**ドキュメント概要を 1-2 文で記載**

---

## 📋 メタ情報

| 項目       | 内容                                    |
| ---------- | --------------------------------------- |
| ステータス | draft / review / approved / implemented |
| 作成者     | 担当者名                                |
| 作成日     | YYYY-MM-DD                              |
| 最終更新   | YYYY-MM-DD                              |
| 関連 Issue | #123                                    |
| タグ       | workflow, database, api                 |

---

## 🎯 1. 目的

このドキュメントの目的と背景を記載します。

**記載内容:**

- なぜこのドキュメントが必要なのか
- 解決したい課題は何か
- 達成したい目標は何か

---

## 📐 2. 概要

システム/機能の全体像を記載します。

**記載内容:**

- システム/機能の概要
- 主要コンポーネントの説明
- 全体アーキテクチャ図（あれば）

### 2.1 全体像（任意）

```
[コンポーネントA] ──> [コンポーネントB]
       │                    │
       └────> [コンポーネントC]
```

---

## 🏗️ 3. 設計詳細

詳細な設計内容を記載します。

### 3.1 データモデル（データベース設計の場合）

テーブル定義、カラム定義、リレーションシップなど

| カラム名 | 型           | 説明   | 備考     |
| -------- | ------------ | ------ | -------- |
| id       | UUID         | 主キー | PK       |
| name     | VARCHAR(255) | 名前   | NOT NULL |

### 3.2 API 仕様（API 設計の場合）

エンドポイント、リクエスト/レスポンス形式など

**エンドポイント:** `POST /api/endpoint`

**リクエスト:**

```json
{
  "param1": "value1",
  "param2": "value2"
}
```

**レスポンス:**

```json
{
  "result": "success",
  "data": {}
}
```

### 3.3 その他の設計要素

必要に応じて追加

---

## 💻 4. 実装

### 実装状況

- ✅ 完了項目 1
- ✅ 完了項目 2
- 🚧 進行中項目 1
- ⬜ 未実装項目 1
- ⬜ 未実装項目 2

### 主要ファイル

実装に関連する主要なファイルをリストアップします。

- `api/src/path/to/file.py` - ファイルの説明
- `api/src/path/to/another.py` - ファイルの説明
- `frontend/src/path/to/component.tsx` - ファイルの説明

### 技術スタック（任意）

- データベース: PostgreSQL + pgvector
- ORM: SQLAlchemy
- マイグレーション: Alembic

---

## 🔧 5. セットアップ・利用方法

### 前提条件

必要な環境・ツールをリストアップします。

- Docker Desktop
- Python 3.11+
- Node.js 20+
- その他必要なツール

### セットアップ手順

ステップバイステップの手順を記載します。

```bash
# 1. 環境構築
docker compose up -d

# 2. マイグレーション実行
cd api
alembic upgrade head

# 3. サーバー起動
uv run uvicorn src.main:app --reload
```

### 利用方法

実際の利用方法や操作手順を記載します。

```bash
# API呼び出し例
curl -X POST http://localhost:8000/api/endpoint \
  -H "Content-Type: application/json" \
  -d '{"param1": "value1"}'
```

---

## 🧪 6. テスト・検証

### テスト方法

テスト手順を記載します。

```bash
# ユニットテスト実行
cd api
uv run pytest tests/

# E2Eテスト実行
cd frontend
npm run test:e2e
```

### サンプルデータ

テストや検証に使用するサンプルデータを記載します。

```sql
-- サンプルSQL
INSERT INTO table_name (column1, column2)
VALUES ('value1', 'value2');
```

```json
// サンプルJSON
{
  "sample": "data"
}
```

---

## 💬 7. 設計判断・検討履歴

設計時の重要な判断とその理由を記録します。

| トピック         | 決定内容              | 代替案             | 判断理由                                   |
| ---------------- | --------------------- | ------------------ | ------------------------------------------ |
| データベース選定 | PostgreSQL + pgvector | MongoDB / Pinecone | ベクトル検索と構造化データを統合管理できる |
| 認証方式         | JWT                   | Session            | ステートレスでスケーラブル                 |
| API 設計         | RESTful               | GraphQL            | シンプルで理解しやすい                     |

---

## 🚀 8. 今後の拡張・改善案

将来的な拡張や改善の方向性を記載します。

**短期（1-3 ヶ月）:**

- 拡張案 1
- 改善案 1

**中期（3-6 ヶ月）:**

- 拡張案 2
- 改善案 2

**長期（6 ヶ月以降）:**

- 拡張案 3
- 改善案 3

---

## 📚 9. 参考資料

関連するドキュメントや外部リソースへのリンクを記載します。

**内部ドキュメント:**

- [関連ドキュメント 1](../path/to/doc1.md)
- [関連ドキュメント 2](../path/to/doc2.md)

**外部リソース:**

- [公式ドキュメント](https://example.com/docs)
- [技術記事](https://example.com/article)

---

## ✅ 10. まとめ

このドキュメントの要点を 3-5 行で要約します。

- 要点 1: このドキュメントは〇〇を定義している
- 要点 2: 主要な設計判断は △△ である
- 要点 3: 次のステップは □□ である

---

## 📝 変更履歴

| 日付       | 変更者   | 変更内容            |
| ---------- | -------- | ------------------- |
| YYYY-MM-DD | 担当者名 | 初版作成            |
| YYYY-MM-DD | 担当者名 | セクション 3 を更新 |
| YYYY-MM-DD | 担当者名 | 実装状況を更新      |
