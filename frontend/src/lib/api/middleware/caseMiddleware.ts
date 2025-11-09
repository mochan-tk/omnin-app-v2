import { NextResponse } from "next/server";
import { toCamel, toSnake } from "./case";

/**
 * 共通プロキシミドルウェア
 * - リクエスト JSON を camelCase -> snake_case に変換してバックエンドへ転送
 * - バックエンドの JSON レスポンスを snake_case -> camelCase に変換してクライアントへ返す
 * - Content-Type が text/event-stream の場合はストリームをそのままプロキシ（SSE 内の JSON は変換しない）
 *
 * @param request Next.js の Request
 * @param backendPath バックエンドのパス（例: '/agents/owner_agent'）
 */
export async function proxyWithCase(request: Request, backendPath: string) {
	try {
		// リクエストボディを可能なら読み取り
		let body: unknown = null;
		try {
			body = await request.json();
		} catch (_e) {
			// JSON でない場合は無視してそのままプロキシ
			body = null;
		}

		const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";
		const url = `${backendUrl}${backendPath}`;

		// camelCase -> snake_case
		const backendPayload = body ? toSnake(body) : undefined;

		const headers: Record<string, string> = {
			// 必要に応じて元のヘッダを引き継ぐ場合はここを拡張
			"Content-Type": "application/json",
		};

		const fetchOptions: RequestInit = {
			method: request.method,
			headers,
			body: backendPayload ? JSON.stringify(backendPayload) : undefined,
		};

		const backendRes = await fetch(url, fetchOptions);

		const contentType = backendRes.headers.get("content-type") ?? "";

		// SSE はストリームのまま返す
		if (contentType.includes("text/event-stream")) {
			return new Response(backendRes.body, {
				status: backendRes.status,
				headers: {
					"Content-Type": "text/event-stream",
					"Cache-Control": "no-cache, no-transform",
				},
			});
		}

		// JSON レスポンスをパースして camelCase に変換して返す
		const data = await backendRes.json();
		const camel = toCamel(data);
		return NextResponse.json(camel, { status: backendRes.status });
	} catch (err) {
		console.error("proxyWithCase error:", err);
		return NextResponse.json(
			{ error: "failed to proxy request" },
			{ status: 502 },
		);
	}
}
