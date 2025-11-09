# AGENTS.md

このリポジトリのエージェント開発・フロント/バックエンド実装の運用ガイドです。詳細なコーディングルールは `frontend/AGENTS.md` と `api/AGENTS.md` を参照してください。

## ドキュメント構成

このプロジェクトのドキュメントは以下の構成になっています:

### プロジェクト全体

- [README.md](README.md) - プロジェクト概要、アーキテクチャ、利用フロー、エージェント実装詳細
- [AGENTS.md](AGENTS.md) - 開発・運用ガイド、全体方針、ツール/環境設定

### コンポーネント別

- [frontend/README.md](frontend/README.md) - フロントエンド環境構築、セットアップ手順
- [frontend/AGENTS.md](frontend/AGENTS.md) - Next.js 実装ルール、コーディング規約
- [api/README.md](api/README.md) - バックエンド環境構築、セットアップ手順
- [api/AGENTS.md](api/AGENTS.md) - FastAPI 実装ルール、アーキテクチャ設計

### 技術仕様

- [docs/db/](docs/db/) - データベース設計、マイグレーション、API 仕様
- [docs/onet/](docs/onet/) - 職種選定ロジック、O\*NET 連携仕様

## Brand color

- #b66fff（紫）＝創造と感動
- #686dff（青）＝知性と信頼

この二色は「感動を生む体験・未来の創造」×「信頼される技術基盤」を象徴し
我々が目指す世界を作るのに必要な重要な要素を表現している。

## Dev environment tips

- 前提ツール: Node.js 20+ / npm、Python 3.11+、`uv`、`ruff`。フロントは Next.js 15 + TypeScript、バックエンドは FastAPI + Pydantic を使用。
- フロント起動: `cd frontend && npm i && npm run dev`。バックエンド URL は `BACKEND_URL` で指定（未設定時は `http://localhost:8000` を使用）。
- バックエンド起動: `cd api && pip install uv && uv sync && uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000`。
- フロント実装の要点: route handler により API プロキシ（ケース変換/SSE は共通ミドルウェアで処理）、エンドポイントクラスで fetch をラップしてドメイン型にマッピング。詳細は `frontend/AGENTS.md`。
- バックエンド設計: ルートは薄く、ビジネスロジックは `api/src/core` 配下（agents/instructions/tools/models）へ委譲。詳細は `api/AGENTS.md`。

## Task management with vibe_kanban

- **vibe_kanban MCP**: タスク管理には vibe_kanban MCP サーバーを使用する。MCP が利用可能な場合は、作業開始前にタスクを登録し、それを元に作業を進める。
- **タスク登録内容**:
  - `title`: タスクのタイトル
  - `description`: タスクの詳細説明（通常の記載内容）
  - ブランチが決まっている場合は、description 内に `Branch: <branch-name>` の形式でブランチ名を追記する
- **タスクステータス管理**: 作業開始時に `in-progress`、完了時に `done` にステータスを更新する。
- **プロジェクト ID**: タスク操作時は必ず `project_id` を指定すること（`list_projects` で確認可能）。

## Database Documentation Guidelines

データベース関連のドキュメントは `docs/db/` 配下に配置し、統一フォーマットに従って作成します。

### ドキュメントテンプレート

- **テンプレート**: [docs/db/TEMPLATE.md](docs/db/TEMPLATE.md)
- **既存ドキュメント例**:
  - [ワークフロースキーマ設計](docs/db/schema.md)
  - [ワークフロー永続化 API 仕様](docs/db/workflow-persistence-api-spec.md)

### フォーマット規約

詳細は [docs/db/TEMPLATE.md](docs/db/TEMPLATE.md) を参照してください:

1. **YAML frontmatter 必須**: title, category, status, author, dates, related_issue, tags
2. **絵文字による視覚的区分**: 各セクションの役割を明確化（🎯 目的、📐 概要、🏗️ 設計詳細、💻 実装、🔧 セットアップ、🧪 テスト、💬 設計判断、🚀 今後の展望、📚 参考資料、✅ まとめ）
3. **セクション番号**: 1-10 の階層構造
4. **ステータス管理**: draft / review / approved / implemented
5. **変更履歴**: ドキュメント末尾に記録

### 新規ドキュメント作成時

1. `docs/db/TEMPLATE.md` をコピー
2. YAML frontmatter を記入
3. 各セクションを埋める（不要なセクションは削除可）
4. `README.md` の技術仕様セクションにリンクを追加

---

## Testing instructions

- フロントチェック: `cd frontend && npm run check && npm run lint && npm run build`（Biome / ESLint / TypeScript チェック）。
- フロント自動整形: `cd frontend && npm run check:fix`。
- バックエンド静的解析: `cd api && uv run ruff check .`。自動修正は `uv run ruff check . --fix`。
- 動作確認: バックエンドを起動後、フロントから `/api/*` 経由で疎通。SSE/ストリーミングは段階描画とエラーフォールバックを確認（`frontend/AGENTS.md`）。
- 追加テスト: Python のユニット/統合テストは `api/tests/` を作成して追加（必要に応じて pytest などを採用）。
- 型・契約: バックエンドの Pydantic モデル変更時は、フロントの `src/lib/api/types` とマッピングを同期すること。
- インストラクションを更新するときは、AGENTS.md を更新してください。

## PR instructions

- タイトル形式: `[frontend] <Title>` / `[api] <Title>`（両方に跨る場合は `[frontend][api] <Title>`）。
- 事前チェック: 下記「Testing instructions」のコマンド（frontend / api）を通してからコミット。
- 変更方針: ルータは薄く、共通ミドルウェア・エンドポイントクラス・型定義を更新し整合性を保つ。SSE/ストリーミングは中間イベントと最終出力を区別して扱うこと。
- ドキュメント: 仕様や型を更新した場合は `.clinerules/*` の該当箇所や `README.md`、`src/lib/api/types` の対応を確認・更新。DB 関連ドキュメントは `docs/db/TEMPLATE.md` のフォーマットに従って作成。
- **Git 操作**: AI/エージェントは `git add`、`git commit`、`git push` などの Git 操作を実行しないこと。実装完了後、ユーザー側で Git 操作を行う。

参考:

- Next.js 実装ルール: `frontend/AGENTS.md`
- Python 実装ルール: `api/AGENTS.md`
- Database ドキュメント規約: `docs/db/TEMPLATE.md`
