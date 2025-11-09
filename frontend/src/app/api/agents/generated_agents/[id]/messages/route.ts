import { proxyWithCase } from "@/lib/api/middleware/caseMiddleware";

/**
 * Next の型チェックで 2 番目の引数の型が厳密に合わない場合があるため、
 * 第二引数を明示的に受け取らず、Request の URL から id を抽出して扱います。
 */
function extractIdFromRequest(request: Request) {
	const pathname = new URL(request.url).pathname;
	const parts = pathname.split("/").filter(Boolean);
	// .../agents/generated_agents/{id}/messages の {id} は末尾から 2 番目
	return parts[parts.length - 2] ?? "";
}

export async function GET(request: Request) {
	const id = extractIdFromRequest(request);
	const { search } = new URL(request.url);
	return proxyWithCase(
		request,
		`/agents/generated_agents/${id}/messages${search}`,
	);
}

export async function POST(request: Request) {
	const id = extractIdFromRequest(request);
	return proxyWithCase(request, `/agents/generated_agents/${id}/messages`);
}
