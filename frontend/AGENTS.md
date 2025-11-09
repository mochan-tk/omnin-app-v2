# Next.js フロント実装ルール (nextjs-basic-rule.md)

以下はこのリポジトリの `frontend` 実装から抽出した実装方針とコーディングルールです。Next.js (App Router / route handlers) + TypeScript 環境を前提にしています。

## ディレクトリ構成と役割

- `src/app`
  - ページ・レイアウト・API route を配置。`app/api/<name>/route.ts` でバックエンド側へプロキシする route handler を実装する。
- `src/components`
  - UI コンポーネント（プレゼンテーション）を配置。例: `ChatPanel`, `AgentFlow`。
- `src/lib`
  - API クライアント、middleware、ユーティリティ、store などドメインライブラリを配置。
  - `lib/api/endpoints`：フロント専用のエンドポイントクラスを配置（静的メソッドで fetch をラップ）。
  - `lib/api/middleware`：リクエスト/レスポンス共通処理（例：camel/snake 変換、SSE ハンドリング）。
  - `lib/store`：zustand などの state store。
- `src/types` / `src/lib/api/types`
  - 型定義・レスポンスモデルを配置し、バックエンド型とフロントドメインモデルを分離する。

## API プロキシ (route handler) のパターン

- `app/api/<path>/route.ts` は Next の route handler をエクスポートする（例 `export async function POST(request: Request)`）。
- route では共通ミドルウェアを呼び出してバックエンドへ転送する実装を推奨：

  - 例:

    ```ts
    // typescript
    import { proxyWithCase } from "@/lib/api/middleware/caseMiddleware";

    export async function POST(request: Request) {
      return proxyWithCase(request, "/agents/owner_agent");
    }
    ```

- `BACKEND_URL` は環境変数で指定。未設定時は `http://localhost:8000` をフォールバックとして使用する。

## リクエスト/レスポンスのケース変換ルール

- フロントは `camelCase` を使う。バックエンドが `snake_case` を期待する場合はミドルウェアで変換する。
- 変換ユーティリティ (`toSnake`, `toCamel`) の要件：
  - 配列は再帰的に処理。
  - 日付 (`Date`) は変換対象外。
  - 平坦でないプレーンオブジェクトのみキー変換。
  - 実装例（要点）:
    ```ts
    // typescript
    export function toSnake(obj: any) {
      /* array -> map, plain object -> key変換 */
    }
    export function toCamel(obj: any) {
      /* 同上 */
    }
    ```
- ミドルウェアの振る舞い（`proxyWithCase`）:
  - リクエストボディを安全に JSON 読み取り（非 JSON の場合はそのまま転送）。
  - 読めた JSON は `toSnake` してバックエンドへ POST（JSON.stringify）。
  - レスポンスの Content-Type を確認。`text/event-stream`（SSE）の場合はストリームをそのまま返す（SSE 内 JSON は変換しない）。
  - それ以外の JSON レスポンスは `toCamel` してクライアントへ返却。
  - エラー時は 502 など適切なステータスで NextResponse.json を返す。

## エンドポイントクラスのパターン

- `lib/api/endpoints/*.ts` ではエンドポイントごとにクラスを作り、レスポンスをフロントのドメインモデルにマップする静的メソッドを提供する。

  - 例:

    ```ts
    // typescript
    export class HealthEndpoint {
      private static mapHealthResponseToHealth(response: HealthResponse): Health { ... }

      public static async checkHealth(): Promise<{ statusCode:number; body: Health | null}> {
        const res = await fetch("/api/health");
        if (!res.ok) throw new Error("Failed to fetch health status");
        const data = await res.json();
        return { statusCode: res.status, body: HealthEndpoint.mapHealthResponseToHealth(data) };
      }
    }
    ```

- fetch の結果は常に `res.ok` を確認し、エラーハンドリングを行うこと。

## クライアント側のストリーミング処理（SSE もしくは chunked）

- fetch の `res.body.getReader()` と `TextDecoder` を用いてチャンクごとに UI を更新するパターンが使われている。
- SSE 形式を受け取る場合の簡易クリーン処理例（フロント側）:
  ```ts
  // typescript
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  while (!done) {
    const { value, done: readerDone } = await reader.read();
    if (value) {
      const chunk = decoder.decode(value, { stream: !readerDone });
      const cleaned = chunk
        .split("\n")
        .map((line) =>
          line.startsWith("data:") ? line.replace(/^data:\s*/, "") : line
        )
        .join("\n")
        .replace(/\n\n/g, "\n");
      accumulated += cleaned;
      // state に反映して段階的に表示
    }
  }
  ```
- クライアントは `res.ok` と `res.body` の存在をチェックし、エラー文言や空レスポンスに対するフォールバックを必ず用意する。

## React / Next.js 実装ルール

- stateful なコンポーネントはファイル先頭に `"use client";` を付与すること。
- `useEffect` の依存配列は ESLint の警告に従うが、意図的に無視する場合は biome/ESLint 指示コメントを付ける（既存コードでは `// biome-ignore lint/correctness/useExhaustiveDependencies: false`）。
- UI コンポーネントは props で受け取り、プレゼンテーションに責務を限定する（例: `ChatPanel` が messages, onSendMessage, isProcessing を受け取る）。

## 型設計ルール

- バックエンドから受け取る JSON の形は `lib/api/types` に interface で定義し、フロント内部で扱う型（クラス or interface）へマッピングする。
- 日付や振る舞いを伴うデータはクラスとしてラップして扱うとメソッド追加が容易（Health の例）。

## エラーハンドリングとユーザー表示

- API 呼び出しは try/catch でラップし、ユーザーに表示するエラーメッセージは明確にする。
- 非同期操作中は `loading` フラグを立て、ボタンや入力を disabled にして多重送信を防止する。

## Scripts / Lint / Testing

- `biome` を導入済み。主なコマンド：

  - チェック: `npm run check`
  - 自動修正: `npm run check:fix`
  - （必要に応じて）Lint/Build: `npm run lint && npm run build`

- 作業後は最低限 `npm run check:fix` を実行して整形・修正を反映すること。

<!-- BACKEND_URL は上記 API プロキシの節に記載済み（重複削除） -->

## 推奨ベストプラクティス（要守）

1. API route を作るときは直接バックエンド URL を叩かず、`proxyWithCase` のような共通ミドルウェアを通す（ケース変換と SSE の扱いを統一）。
2. ミドルウェアは JSON と SSE を識別して適切に処理すること。
3. エンドポイントクラスで fetch をラップし、レスポンスをフロントのドメインクラスにマップする。
4. streaming を扱う UI は段階的に state を反映させ、ユーザーが中間結果を見られるようにする。
5. 型は `lib/api/types` に集中させ、バックエンド変更時はここを更新する。
6. `use client` と server コンポーネントを明確に分離する。
