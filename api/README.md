# API サービス (FastAPI)

このディレクトリはバックエンド（FastAPI）です

## Quick Start

Python 環境を用意（Python >= 3.10）  
uv をインストールする例

```bash
pip install uv
```

> [!TIP]
> uv のインストール方法はいろいろ流派があるので、個人の環境に合わせて実行してください
>
> - [uv の公式ドキュメント](https://docs.astral.sh/uv/)

`.env` ファイルを作成し、必要な環境変数を設定します。

```bash
OPENAI_API_KEY=${Open AI API Key}
GMAIL_USER=${Gmail User}
GMAIL_APP_PASSWORD=${Gmail App Password}
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>
# Optional: USE_IN_MEMORY=1
```

[GMAIL APP PASSWORD 作成方法](https://toukei-lab.com/python-gmail)  
DATABASE_URL は外部の Postgres インスタンスを指す接続文字列です。開発中にインメモリ実装へ戻したい場合のみ USE_IN_MEMORY=1 を設定してください。
devcontainerで開発する場合、`DATABASE_URL=postgresql://postgres:postgres@localhost:5432/omnappdb`でローカルに立ち上がるpostgresに接続できます。

依存をインストール

```bash
uv sync
```


サーバーを起動する。ホットリロードで起動するため、ファイルを変更するたびに再起動します。

```bash
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

> [!TIP]
>
> vscode のタスクで実行する場合(こちらの方が楽)
>
> `Ctrl+Shift+P` でタスクを起動し、`Start FastAPI (uv)` を選択

## AI Agent の開発、動作確認のみをしたい場合

検証の最中で API ではなく AI Agent のみ開発のみをしたい場合は、`examples`フォルダにスクリプトを作成します。`api/src/core/v1/agents/owner_agent.py`をテスト実行するためのスクリプトは`examples/owner_agent_run.py`にあります。

実行例は以下の通りです。

````bash
$ uv run python examples/owner_agent_run.py
> こんにちわ
こんにちは！今日はどのようにお手伝いできますか？

RunResultStreaming:
- Current agent: Agent(name="OwnerAgent", ...)
- Current turn: 1
- Max turns: 10
- Is complete: True
```bash
$ uv run python examples/owner_agent_run.py
> こんにちわ
こんにちは！今日はどのようにお手伝いできますか？

RunResultStreaming:
- Current agent: Agent(name="OwnerAgent", ...)
- Current turn: 1
- Max turns: 10
- Is complete: True
- Final output (str):
    こんにちは！今日はどのようにお手伝いできますか？
- 1 new item(s)
- 1 raw response(s)
- 0 input guardrail result(s)
- 0 output guardrail result(s)

~~省略~~
````
