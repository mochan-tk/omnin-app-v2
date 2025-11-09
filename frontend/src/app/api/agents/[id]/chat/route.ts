// typescript
import { proxyWithCase } from "@/lib/api/middleware/caseMiddleware";

// POST /api/agent/[id]/chat
// id === "owner" の場合は /agents/owner_agent へ、それ以外は /agents/generated_agents/{id}/chat へプロキシ
//
// Route の 2 番目引数の型チェックでエラーになることがあるため、
// Request の URL から id を抽出して扱う実装に変更します（他の route と整合）。
function extractIdFromRequest(request: Request) {
	const pathname = new URL(request.url).pathname;
	const parts = pathname.split("/").filter(Boolean);
	// .../api/agents/{id}/chat の {id} は末尾から 2 番目 (api, agents, {id}, chat)
	// 安全のため末尾から 2 番目を取得し、存在しなければ空文字を返す
	return parts.length >= 2 ? parts[parts.length - 2] : "";
}

export async function POST(request: Request) {
	// Request の URL から id を抽出して扱う（Next の型チェックと整合）
	const id = extractIdFromRequest(request);
	return proxyWithCase(
		request,
		`/agents/generated_agents/${encodeURIComponent(id)}/chat`,
	);
}
