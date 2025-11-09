# AGENTS.md

このリポジトリのエージェント開発・フロント/バックエンド実装の運用ガイドです。詳細なコーディングルールは `frontend/AGENTS.md` と `api/AGENTS.md` を参照してください。

## Dev environment tips

- 前提ツール: Node.js 20+ / npm、Python 3.11+、`uv`、`ruff`。フロントは Next.js 15 + TypeScript、バックエンドは FastAPI + Pydantic を使用。
- フロント起動: `cd frontend && npm i && npm run dev`。バックエンド URL は `BACKEND_URL` で指定（未設定時は `http://localhost:8000` を使用）。
- バックエンド起動: `cd api && pip install uv && uv sync && uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000`。
- フロント実装の要点: route handler により API プロキシ（ケース変換/SSE は共通ミドルウェアで処理）、エンドポイントクラスで fetch をラップしてドメイン型にマッピング。詳細は `frontend/AGENTS.md`。
- バックエンド設計: ルートは薄く、ビジネスロジックは `api/src/core` 配下（agents/instructions/tools/models）へ委譲。詳細は `api/AGENTS.md`。

## Testing instructions

- フロントチェック: `cd frontend && npm run check && npm run lint && npm run build`（Biome / ESLint / TypeScript チェック）。
- フロント自動整形: `cd frontend && npm run check:fix`。
- バックエンド静的解析: `cd api && uv run ruff check .`。自動修正は `uv run ruff check . --fix`。
- 動作確認: バックエンドを起動後、フロントから `/api/*` 経由で疎通。SSE/ストリーミングは段階描画とエラーフォールバックを確認（`frontend/AGENTS.md`）。
- 追加テスト: Python のユニット/統合テストは `api/tests/` を作成して追加（必要に応じて pytest などを採用）。フロントはコンポーネント/型のリグレッションを意識したテストを追加。
- 型・契約: バックエンドの Pydantic モデル変更時は、フロントの `src/lib/api/types` とマッピングを同期すること。
- インストラクションを更新するときは、AGENTS.md を更新してください。`CLAUDE.md`や`.clinerules/`はシンボリックリンクで同期されています。

## PR instructions

- タイトル形式: `[frontend] <Title>` / `[api] <Title>`（両方に跨る場合は `[frontend][api] <Title>`）。
- 事前チェック: 下記「Testing instructions」のコマンド（frontend / api）を通してからコミット。
- 変更方針: ルータは薄く、共通ミドルウェア・エンドポイントクラス・型定義を更新し整合性を保つ。SSE/ストリーミングは中間イベントと最終出力を区別して扱うこと。
- ドキュメント: 仕様や型を更新した場合は `.clinerules/*` の該当箇所や `README.md`、`src/lib/api/types` の対応を確認・更新。

参考:

- Next.js 実装ルール: `frontend/AGENTS.md`
- Python 実装ルール: `api/AGENTS.md`
