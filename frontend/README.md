# Frontend サービス (Next.js)

このディレクトリはフロントエンド（Next.js）です

## Quick Start

Node.js 環境を用意（Node.js >= 20）  
npm を使って依存関係をインストールします

```bash
cd frontend
npm install
```

> [!TIP]
> Node.js のインストール方法は環境に合わせて実行してください
>
> - [Node.js の公式ダウンロード](https://nodejs.org/)
> - [nvm を使った管理方法](https://github.com/nvm-sh/nvm)

`.env.local` ファイルを作成し、必要な環境変数を設定します。

```bash
BACKEND_URL=http://localhost:8000
```

> [!TIP]
> `.env.example` ファイルを `.env.local` にコピーして編集することも可能です
> `.env.local` はコミットしないでください

開発サーバーを起動する。ホットリロードで起動するため、ファイルを変更するたびに自動更新します。

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開いて確認します。

> [!TIP]
>
> vscode のタスクで実行する場合(こちらの方が楽)
>
> `Ctrl+Shift+P` でタスクを起動し、`Run All (FastAPI + Frontend)` を選択
>
> バックエンドの詳細に関しては [api/README.md](../api/README.md) を参照してください

## フロントエンドの開発、動作確認のみをしたい場合

バックエンド API との接続確認や UI コンポーネントのみ開発をしたい場合は、まずバックエンドを起動してから以下を実行します。

実行例は以下の通りです。

```bash
# バックエンドを起動（別ターミナル）
cd api
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# フロントエンドを起動
cd frontend
npm run dev
```

ブラウザで http://localhost:3000/health を開き、「接続を確認する」ボタンを押してバックエンドとの疎通を確認できます。

## 静的解析・フォーマット

コード品質を保つための各種チェックツール：

```bash
# 型チェック・Lint・ビルドチェック
npm run check

# 自動修正
npm run check:fix

# 個別実行
npm run lint        # ESLint
npm run type-check  # TypeScript
npm run build       # Next.js ビルド
```
