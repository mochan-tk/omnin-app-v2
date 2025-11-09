---
title: "ワークフロースキーマ設計"
category: "schema"
status: "implemented"
author: "Tatsuki Sato"
created: "2025-10-07"
updated: "2025-10-26"
related_issue: "#91"
tags: ["workflow", "database", "postgresql", "schema"]
---

# 🗂️ OmniCore Registry Service – ワークフロースキーマ設計

**自然言語から生成されたワークフローを永続化し、再利用・検索・適用可能な形で管理するためのデータベーススキーマ設計**

---

## 📋 メタ情報

| 項目       | 内容                                   |
| ---------- | -------------------------------------- |
| ステータス | implemented                            |
| 作成者     | Tatsuki Sato                           |
| 作成日     | 2025-10-07                             |
| 最終更新   | 2025-10-26                             |
| 関連 Issue | #91 – DB: ワークフロースキーマ設計     |
| タグ       | workflow, database, postgresql, schema |

---

## 🎯 1. 目的

本ドキュメントは、自然言語から生成された「ワークフロー」を永続化し、  
再利用・検索・適用可能な形で管理するためのデータベーススキーマ設計をまとめたものです。

本設計は MVP フェーズにおける最小実装を目的としており、  
以下の要件を満たすことを目指します。

- 生成されたワークフローを構造的に保存できる
- 既存のバックエンドから簡易に保存／取得できる
- 将来的な拡張（メタ情報・バージョニング）に対応可能

---

## 📐 2. 概要

ワークフローは「全体構造」「ノード（ステップ）」「エッジ（依存関係）」「パラメータ」から構成されます。

### 2.1 全体像

最小構成のデータモデルは以下の通りです:

```
workflow (1) ──< workflow_nodes (N)
workflow_nodes (N) ──< workflow_edges (N)
workflow ──< workflow_params (N)
```

### 2.2 主要コンポーネント

- **workflow**: ワークフロー全体の情報を管理
- **workflow_nodes**: ワークフロー内の各ステップ（ノード）を管理
- **workflow_edges**: ノード間の依存関係を管理
- **workflow_params**: ワークフロー全体のパラメータ仕様を管理

---

## 🏗️ 3. 設計詳細

### 3.1 `workflow` – ワークフロー全体情報

| カラム名    | 型            | 説明                       | 備考                 |
| ----------- | ------------- | -------------------------- | -------------------- |
| id          | SERIAL / UUID | ワークフロー ID（PK）      | 主キー               |
| name        | VARCHAR(255)  | ワークフロー名             | 任意名または自動生成 |
| version     | INTEGER       | バージョン番号             | 更新管理用           |
| description | TEXT          | 概要説明                   |                      |
| created_at  | TIMESTAMP     | 作成日時                   | `NOW()` デフォルト   |
| updated_at  | TIMESTAMP     | 更新日時                   | トリガー管理         |
| metadata    | JSONB         | メタ情報（出典、用途など） | 柔軟な拡張用         |

---

### 3.2 `workflow_nodes` – ワークフロー内の各ステップ

| カラム名    | 型            | 説明                             | 備考              |
| ----------- | ------------- | -------------------------------- | ----------------- |
| id          | SERIAL / UUID | ノード ID（PK）                  | 主キー            |
| workflow_id | UUID          | 所属ワークフロー                 | FK: `workflow.id` |
| node_type   | VARCHAR(100)  | ノードの種類（agent, tool など） |                   |
| name        | VARCHAR(255)  | ノード名                         |                   |
| parameters  | JSONB         | ノード固有のパラメータ           | 任意構造          |
| order_index | INTEGER       | 実行順序                         | 並び順管理        |

---

### 3.3 `workflow_edges` – ノード間の依存関係

| カラム名       | 型            | 説明               | 備考                    |
| -------------- | ------------- | ------------------ | ----------------------- |
| id             | SERIAL / UUID | エッジ ID（PK）    | 主キー                  |
| workflow_id    | UUID          | 所属ワークフロー   | FK: `workflow.id`       |
| parent_node_id | UUID          | 親ノード           | FK: `workflow_nodes.id` |
| child_node_id  | UUID          | 子ノード           | FK: `workflow_nodes.id` |
| handoff_data   | JSONB         | データ引き渡し設定 | optional                |

---

### 3.4 `workflow_params` – パラメータ仕様

| カラム名      | 型            | 説明                         | 備考              |
| ------------- | ------------- | ---------------------------- | ----------------- |
| id            | SERIAL / UUID | パラメータ ID                | 主キー            |
| workflow_id   | UUID          | 所属ワークフロー             | FK: `workflow.id` |
| key           | VARCHAR(100)  | パラメータ名                 |                   |
| value_type    | VARCHAR(50)   | 型（string, int, bool など） |                   |
| required      | BOOLEAN       | 必須フラグ                   |                   |
| default_value | TEXT          | デフォルト値                 |                   |
| metadata      | JSONB         | その他仕様                   | 柔軟拡張          |

### 3.5 ER 図

```
[workflow]
   ├─< [workflow_nodes]
   │      └─< [workflow_edges]
   └─< [workflow_params]
```

> [!NOTE]
> 詳細な ER 図は後日 `docs/db/er_diagram.png` に追記予定

---

## 💻 4. 実装

### 実装状況

- ✅ SQLAlchemy モデル定義
- ✅ Alembic マイグレーション設定
- ✅ PostgreSQL テーブル作成
- ✅ 基本的な CRUD 操作
- ⬜ pgvector による類似検索
- ⬜ バージョニング履歴テーブル

### 主要ファイル

**モデル定義:**

- `api/models.py` - SQLAlchemy モデル定義

**マイグレーション:**

- `api/alembic.ini` - Alembic 設定ファイル
- `api/migrations/versions/` - マイグレーションスクリプト

**リポジトリ:**

- `api/src/infra/repositories/workflow/` - ワークフロー永続化リポジトリ

### 技術スタック

- データベース: PostgreSQL
- ORM: SQLAlchemy
- マイグレーション: Alembic
- 将来的拡張: pgvector（ベクトル検索）

### 4.4 マイグレーション運用

**配置ルール:**

- SQLAlchemy モデル: `api/models.py`
- Alembic スクリプト: `api/migrations/versions/`
- 設定ファイル: `api/alembic.ini`

**基本ワークフロー:**

1. モデル変更（`api/models.py` を編集）
2. モデルの import 確認: `python -c "import models"`
3. マイグレーション生成: `alembic revision --autogenerate -m "YYYYMMDDHHMMSS: short description"`
4. 生成ファイルのレビュー（upgrade/downgrade 確認、データ移行処理追加）
5. CI で SQL 確認: `alembic upgrade --sql head`
6. マイグレーション適用: `alembic upgrade head`

**Alembic 設定例:**

```ini
[alembic]
script_location = migrations
sqlalchemy.url = postgresql+psycopg2://postgres:postgres@localhost:5432/workflow_db
```

---

## 🔧 5. セットアップ・利用方法

### 前提条件

- Docker Desktop
- Python 3.11+
- PostgreSQL クライアント（psql）
- Alembic

### セットアップ手順

**1. Docker 起動確認（macOS）:**

```bash
open -a Docker
# Dockerが起動し、ステータスが安定するまで待つ
docker info
```

**2. データベース起動:**

```bash
# コンテナ起動
docker compose up -d
```

**3. マイグレーション適用:**

```bash
cd api
alembic upgrade head
```

**4. 接続確認:**

```bash
psql -h localhost -U postgres -d workflow_db
```

### 利用方法

データベースへの接続とテーブル確認:

```bash
# PostgreSQL接続
psql -h localhost -U postgres -d workflow_db

# テーブル一覧表示
\dt

# スキーマ確認
\d workflow
\d workflow_nodes
```

---

## 🧪 6. テスト・検証

### テスト方法

マイグレーションのテスト手順:

```bash
# マイグレーション適用
cd api
alembic upgrade head

# ロールバックテスト
alembic downgrade -1

# 再適用
alembic upgrade head
```

### サンプルデータ

```sql
-- ワークフロー作成
INSERT INTO workflow (name, description, metadata)
VALUES ('Sample Workflow', 'テスト用ワークフロー', '{"category": "demo"}'::jsonb);

-- ノード追加
INSERT INTO workflow_nodes (workflow_id, node_type, name, parameters, order_index)
VALUES ('<workflow_id>', 'agent', '初期ステップ', '{"prompt": "Hello"}'::jsonb, 1);
```

---

## 💬 7. 設計判断・検討履歴

| トピック                 | 決定内容                             | 代替案               | 判断理由                               |
| ------------------------ | ------------------------------------ | -------------------- | -------------------------------------- |
| ノード間の関係管理       | `workflow_edges` テーブルで正規化    | JSONB 内にネスト     | SQL での結合・検索・トラバースが効率的 |
| パラメータ定義の格納方法 | `workflow_params` テーブルで汎用管理 | ノードに直接埋め込み | 共通パラメータや検索性を考慮           |
| メタ情報の格納           | `JSONB` カラム使用                   | 全て正規化テーブル   | スキーマ変更コストと柔軟性のバランス   |
| バージョニング戦略       | `version` カラム保持                 | 履歴テーブル即導入   | MVP 段階ではシンプルさを優先           |
| 埋め込み検索             | 将来的に pgvector 導入               | 外部ベクトル DB      | PostgreSQL 統合で運用コスト削減        |

---

## 🚀 8. 今後の拡張・改善案

**短期（1-3 ヶ月）:**

- ワークフローのバージョニング管理強化
- タグ／カテゴリ付与機能の追加

**中期（3-6 ヶ月）:**

- アクセスログテーブル追加による利用分析
- ユーザー／組織スコープ対応

**長期（6 ヶ月以降）:**

- pgvector 導入によるワークフロー類似検索
- マルチテナント化対応
- 履歴テーブル化による監査ログ機能

---

## 📚 9. 参考資料

**内部ドキュメント:**

- [ワークフロー永続化 API 仕様](workflow-persistence-api-spec.md)
- [API 実装ガイド](../../api/AGENTS.md)

**外部リソース:**

- [PostgreSQL 公式ドキュメント](https://www.postgresql.org/docs/)
- [Alembic 公式ドキュメント](https://alembic.sqlalchemy.org/)
- [SQLAlchemy 公式ドキュメント](https://www.sqlalchemy.org/)

---

## ✅ 10. まとめ

本スキーマにより、生成ワークフローを構造化して保存・再利用する基盤が整う。

- **要点 1**: ワークフロー、ノード、エッジ、パラメータの 4 テーブル構成で柔軟な管理を実現
- **要点 2**: JSONB カラムにより拡張性を確保しつつ、構造化データは正規化テーブルで管理
- **要点 3**: Alembic マイグレーションによりスキーマ変更を安全に管理
- **次のステップ**: ORM モデル定義、バックエンド API 連携、ベクトル検索機能の追加

---

## 📝 変更履歴

| 日付       | 変更者       | 変更内容                                                        |
| ---------- | ------------ | --------------------------------------------------------------- |
| 2025-10-07 | Tatsuki Sato | 初版作成                                                        |
| 2025-10-26 | Claude Code  | YAML frontmatter 追加、メタ情報セクション追加、フォーマット統一 |
