# Python バックエンド実装ルール (python-basic-rule.md)

このファイルは本リポジトリの `api` 実装から抽出した実装方針とコーディングルールをまとめたものです。FastAPI + Pydantic ベースの Web サービスを前提としています。

## ディレクトリ構成と役割（概観）

- `api/src`（パッケージルート）
  - `routes/`：FastAPI のルータを配置（各ルータは APIRouter を使う）。
  - `core/`：ドメインロジック（agents, tools, instructions, models 等）。
    - `core/v1/agents`：Agent クラス定義（Agent のサブクラス化による実装）。
    - `core/v1/instructions`：エージェントの振る舞いを定義する命令（instruction）。
    - `core/v1/tools`：Agent が利用するツール群（外部呼び出しや副作用）。
    - `core/v1/models`：Pydantic モデル（リクエスト/レスポンス型）。
  - `infra/`：インフラ実装（リポジトリ、セッションストア、DI 的な組み立て）。
  - `config.py`, `main.py` 等：アプリ設定・起動スクリプト。
  - `examples/`：ローカル実行やサンプル呼び出しスクリプト。`core/v1/agents`の動作確認の際に便利

### Future

- `services`レイヤーは設けていないが、将来的に処理が複雑になった時は`core/services`にビジネスロジックを切り出すことを検討する。
- その場合`v1/`系の処理は`core/agent/v1`のように変更する？
  - 要検討(サービスと Agent は実装を分けたい気持ちあり。)

## FastAPI ルート実装ポリシー

- 各機能は `APIRouter` でグループ化し、`routes/` に配置する。
- 可能な限り `response_model` に Pydantic モデルを指定して入力/出力型を明確にする。
- ルートは薄く保ち、ビジネスロジックは `core` 以下のサービス/クラスへ委譲する。
- 非同期実装（async/await）を採用し、I/O は非同期インターフェースを使う。

## Streaming / SSE の扱い

- SSE（Server-Sent Events）を返す場合は必ず `StreamingResponse` を使用し、`media_type="text/event-stream"` を指定する。
- SSE の送出は必ず SSE 形式に従う（チャンクは "data: <text>\n\n" の形式）。例：
  - yield f"data: {chunk}\n\n"
- ストリーム側はエラーで即停止させず、可能なら最終出力（final）を送るか適切な終了イベントを送信する。
- ストリーム内で送るデータは最小単位のテキストにしておく（クライアント側での段階的結合を前提）。
- フロントエンドは SSE を受け取る可能性があるため、JSON による再パースが必要な場合はフォーマットを明示する（ただし SSE 内 JSON のケース変換はフロント側で対応することが多い）。

## Pydantic モデルとバリデーション

- リクエスト/レスポンスは `core/v1/models` に Pydantic `BaseModel` として定義する。
- レスポンスの `response_model` を指定して自動ドキュメントと型チェックを有効にする。
- 入力検証は Pydantic に委ね、追加のビジネス検証はサービス層で行う。

## Agent / Instruction / Tools パターン

- Agent は `Agent` ベースクラスを継承して名前・instructions・tools を設定する（例: OwnerAgent）。
- 命令（instructions）は独立モジュールに定義して、Agent の初期化時に注入する。
- ツールは純粋関数または呼び出し可能オブジェクトとして実装し、Agent の実行時に明示的に呼ぶ（副作用は tools 層で扱う）。
- ストリーム実行のインターフェース（例: Runner.run_streamed）を用いて逐次イベントを取得し、イベントタイプ（raw_response_event, agent_updated_stream_event 等）に応じて処理する。

## セッション・DI・リポジトリ

### session

- セッション管理は `infra/session` 配下に実装する（例: `infra/session/sqlite_session.py`）。
- LLM とユーザの回答の履歴を管理する
- 現時点では PoC のため永続化しないが、将来的に DB 等に置き換え可能にする。

### リポジトリ

- DB などを利用し永続化が必要な場合、このフォルダのリポジトリを経由して DB にアクセスする。
- 現時点では in-memory(`infra/repositories/*/in_memory_repository.py`)を実装していて、将来的に別の DB に置き替え可能にする。
  - Repository の interface を定義して実装を分離する（例: `interface.py`）。

## エラーハンドリングとログ

- 期待されるエラーは適切な HTTP ステータスで返す（HTTPException 等）。内部例外はキャッチしてログ出力してからクリーンなエラーレスポンスを返す。
- ストリーミング中に内部エラーが発生した場合は、終了前にクライアントにエラーメッセージを送るか、適切にストリームを閉じる。
- ログは実行時に分かるように詳細に出す（例: エージェント実行の開始/終了/例外）。

## 型ヒントと読みやすさ

- すべての公開関数/メソッドに型注釈を付ける。非同期関数も戻り値の型を明示する。
- モジュール名・クラス名・関数名は意味のある短い英語名を使う（既存コードに合わせた命名規則を尊重）。

## テストと実行

- `api/examples/main.py` のようなサンプルでローカル実行を容易にする。
- ユニット/統合テストは `tests/` を用意して、インメモリ実装やモックで依存を差し替えて実行する。

## スタイル / リンター / テスト

- 本リポジトリでは `ruff` を利用した自動整形を推奨。
- バックエンドコード作成・修正後は以下で静的解析・自動修正：
  - チェック: `uv run ruff check .`
  - 自動修正: `uv run ruff check . --fix`
- その他の静的解析・型チェック（mypy 等）はプロジェクト要件に応じて追加する。

## ベストプラクティス（要点）

1. FastAPI のルートは薄く保ち、ビジネスロジックは `core` のサービスへ委譲する。
2. SSE は `StreamingResponse` を使い正しい SSE フォーマット（"data: ...\n\n"）で送る。
3. 入出力は Pydantic で明確に定義し、`response_model` を活用する。
4. セッションやリポジトリは `infra` 配下で抽象化し、DI で差し替え可能にする。
5. ストリーム実行では中間イベントと最終出力を区別して扱う（クライアント側の逐次更新を想定する）。

以上をこのプロジェクトの Python 実装ルールとして `.clinerules/python-basic-rule.md` に記載する。  
作成後は上記の ruff 自動修正コマンドを必ず実行してフォーマットを合わせてください。
