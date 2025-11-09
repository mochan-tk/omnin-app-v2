import { proxyWithCase } from "@/lib/api/middleware/caseMiddleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * Route の 2 番目引数の型チェックでエラーになることがあるため、
 * Request の URL から id を抽出して扱う実装に変更します。
 */
function extractIdFromRequest(request: Request) {
	const pathname = new URL(request.url).pathname;
	const parts = pathname.split("/").filter(Boolean);
	// .../agents/generated_agents/{id} の {id} は末尾
	return parts[parts.length - 1] ?? "";
}

export async function GET(request: Request) {
	const id = extractIdFromRequest(request);
	return proxyWithCase(request, `/agents/generated_agents/${id}`);
}
