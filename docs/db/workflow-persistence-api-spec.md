---
title: "ワークフロー永続化データベース仕様書"
category: "api-spec"
status: "implemented"
author: "Tatsuki Sato"
created: "2025-10-07"
updated: "2025-10-26"
related_issue: "#91"
tags: ["workflow", "api", "persistence", "mongodb", "inmemory"]
---

# 🔌 ワークフロー永続化 API 仕様書（実装に合わせた簡潔版）

**実装済みのワークフロー永続化 API の要点をエンジニア向けにまとめた仕様書**

この文書は、現在リポジトリに実装されているワークフロー永続化 API の要点をエンジニア向けにまとめたものです。
実装済みの振る舞い・重要なファイル・ローカル検証手順と、未実装の機能（今後の優先タスク）を明確に示します。

---

## 📋 メタ情報

| 項目       | 内容                                          |
| ---------- | --------------------------------------------- |
| ステータス | implemented                                   |
| 作成者     | Tatsuki Sato                                  |
| 作成日     | 2025-10-07                                    |
| 最終更新   | 2025-10-26                                    |
| 関連 Issue | #91                                           |
| タグ       | workflow, api, persistence, mongodb, inmemory |

---

## 🎯 1. 目的

- クライアントが送信するワークフロー定義（JSON）を保存し、保存したワークフローを取得できるシンプルな API を提供する。
- 初期段階では InMemory と Mongo の両方で動作確認済み。今後の拡張で Postgres なども想定。

## 📐 2. 概要

ワークフロー永続化 API は、n8n で生成されたワークフロー定義 JSON を保存・取得する機能を提供します。

### 2.1 システム構成

```
[Client] ──> [POST /workflows/persist] ──> [Repository (InMemory/Mongo)] ──> [Database]
                                                       │
[Client] <── [GET /workflows/persist/{id}] <──────────┘
```

---

## 🏗️ 3. 設計詳細

### 3.1 API 仕様

#### エンドポイント 1: ワークフロー保存

**エンドポイント:** `POST /workflows/persist`

**リクエスト:**

- `user_id` (string, required): ワークフローのオーナー ID
- `task_name` (string, required): タスク名
- `description` (string, optional): 説明
- `workflow_json` (object, required): n8n ワークフロー定義 JSON
- `meta` (object, optional): メタデータ
- `request_id` (string, optional): 冪等性用リクエスト ID（未実装）

**レスポンス:**

```json
{
  "id": "uuid",
  "user_id": "string",
  "n8n_workflow_id": "string",
  "status": "active",
  "created_at": "2025-10-07T00:00:00Z",
  "updated_at": "2025-10-07T00:00:00Z"
}
```

#### エンドポイント 2: ワークフロー取得

**エンドポイント:** `GET /workflows/persist/{id}`

**レスポンス:**

```json
{
  "id": "uuid",
  "user_id": "string",
  "task_name": "string",
  "description": "string",
  "workflow_json": {},
  "n8n_workflow_id": "string",
  "status": "active",
  "meta": {},
  "created_at": "2025-10-07T00:00:00Z",
  "updated_at": "2025-10-07T00:00:00Z"
}
```

---

## 💻 4. 実装

### 実装状況

- ✅ POST /workflows/persist エンドポイント
- ✅ GET /workflows/persist/{id} エンドポイント
- ✅ InMemory リポジトリ実装（timezone-aware 対応済み）
- ✅ MongoDB リポジトリ実装（motor 使用）
- ✅ DI 切り替え機構（USE_IN_MEMORY / MONGO_URI / DATABASE_URL）
- ✅ マッパー実装（エンティティ ↔ レスポンス変換）
- ✅ Pydantic API モデル定義
- ✅ ルート単体テスト
- ✅ InMemory E2E テスト
- ⬜ request_id による冪等性
- ⬜ Content-Length によるサイズチェック
- ⬜ 認証/認可（current_user 検証）
- ⬜ PATCH /workflows/{id} 更新 API
- ⬜ GET /workflows 一覧 API（ページネーション対応）
- ⬜ DB ユニーク制約/upsert ロジック

### 主要ファイル

**ルート層:**

- `api/src/routes/workflows/workflow_route.py` - API エンドポイント定義
- `api/src/routes/workflows/models/workflow_models.py` - Pydantic API モデル
- `api/src/routes/workflows/mappers.py` - エンティティ → レスポンス マッパー

**リポジトリ層:**

- `api/src/infra/repositories/workflow/in_memory_repository.py` - InMemory 実装
- `api/src/infra/repositories/workflow/mongo_repository.py` - MongoDB 実装
- `api/src/infra/repositories/workflow/di.py` - DI 切り替えロジック

**テスト:**

- `api/tests/test_workflow_persist_e2e.py` - E2E テスト
- `api/tests/test_workflow_route_unit.py` - ルート単体テスト

### 技術スタック

- API フレームワーク: FastAPI
- データモデル: Pydantic
- リポジトリパターン: インターフェース分離
- データベース: MongoDB (motor) / InMemory
- DI: 環境変数ベース切り替え

---

## 🔧 5. セットアップ・利用方法

### 前提条件

- Docker Desktop（Mongo モード使用時）
- Python 3.11+
- uv パッケージマネージャー

### セットアップ手順（InMemory モード）

```bash
# 1. 環境変数設定
export USE_IN_MEMORY=1

# 2. APIサーバー起動
cd api
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### セットアップ手順（Mongo モード）

```bash
# 1. MongoDB起動
docker compose -f compose.local.yml up -d mongo

# 2. 環境変数設定
export MONGO_URI="mongodb://localhost:27017"
export MONGO_DB="omnicore"
unset USE_IN_MEMORY

# 3. APIサーバー起動
cd api
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### 利用方法

```bash
# ワークフロー保存
python3 - <<'PY'
import json,urllib.request
wf = json.load(open("api/tmp/wf_hello-world.json"))
payload = {
  "user_id": "11111111-2222-3333-4444-555555555555",
  "task_name": "wf-hello-world",
  "description": "sample",
  "workflow_json": wf,
  "meta": {}
}
data = json.dumps(payload).encode()
req = urllib.request.Request(
  "http://localhost:8000/workflows/persist",
  data=data,
  headers={"Content-Type":"application/json"}
)
print(urllib.request.urlopen(req).read().decode())
PY

# ワークフロー取得
curl http://localhost:8000/workflows/persist/{id}
```

---

## 🧪 6. テスト・検証

### テスト方法

```bash
# ルート単体テスト
cd api
uv run pytest tests/test_workflow_route_unit.py

# E2Eテスト
uv run pytest tests/test_workflow_persist_e2e.py
```

### サンプルデータ

```json
{
  "user_id": "11111111-2222-3333-4444-555555555555",
  "task_name": "wf-hello-world",
  "description": "サンプルワークフロー",
  "workflow_json": {
    "nodes": [],
    "connections": {}
  },
  "meta": {
    "category": "demo"
  }
}
```

---

## 💬 7. 設計判断・検討履歴

| トピック           | 決定内容                | 代替案          | 判断理由                                                |
| ------------------ | ----------------------- | --------------- | ------------------------------------------------------- |
| リポジトリパターン | InMemory / Mongo 両対応 | PostgreSQL のみ | 開発初期は InMemory で素早く開発、本番では Mongo を想定 |
| DI 方式            | 環境変数ベース          | 設定ファイル    | シンプルで環境切り替えが容易                            |
| 冪等性             | request_id（未実装）    | なし            | 将来の拡張性を考慮してモデルに含める                    |
| 認証               | 未実装                  | JWT / OAuth     | MVP 段階では優先度低                                    |

---

## 🚀 8. 今後の拡張・改善案

**短期（1-3 ヶ月）:**

- request_id による厳密な冪等性実装
- Content-Length によるサイズチェック（413 応答）
- 認証/認可（current_user による owner 検証）
- PATCH /workflows/{id} 更新 API 実装

**中期（3-6 ヶ月）:**

- 一覧 API（owner フィルタ + pagination）のルータ実装（リポジトリはサポート済み）
- DB ユニーク制約 / upsert ロジック（Mongo 側での変更は可能だが未適用）

**長期（6 ヶ月以降）:**

- CI に Mongo を含める、またはストレージ別のテスト方法をドキュメント化
- PostgreSQL 対応（pgvector によるワークフロー類似検索）

---

## 📚 9. 参考資料

**内部ドキュメント:**

- [ワークフロースキーマ設計](schema.md)
- [API 実装ガイド](../../api/AGENTS.md)

**外部リソース:**

- [FastAPI 公式ドキュメント](https://fastapi.tiangolo.com/)
- [Pydantic 公式ドキュメント](https://docs.pydantic.dev/)
- [MongoDB 公式ドキュメント](https://www.mongodb.com/docs/)
- [motor (MongoDB 非同期ドライバ)](https://motor.readthedocs.io/)

---

## ✅ 10. まとめ

この文書は実装済みワークフロー永続化 API の現在地を簡潔に伝えるためのものです。

- **要点 1**: POST/GET エンドポイントが実装済み、InMemory/Mongo 両対応
- **要点 2**: リポジトリパターン＋ DI により環境切り替えが容易
- **要点 3**: 冪等性、認証、一覧 API、更新 API は今後の拡張項目
- **次のステップ**: 冪等性実装、認証/認可追加、一覧・更新 API 実装

---

## 📝 変更履歴

| 日付       | 変更者       | 変更内容                                                      |
| ---------- | ------------ | ------------------------------------------------------------- |
| 2025-10-07 | Tatsuki Sato | 初版作成                                                      |
| 2025-10-26 | Claude Code  | YAML frontmatter 追加、絵文字セクション追加、フォーマット統一 |
