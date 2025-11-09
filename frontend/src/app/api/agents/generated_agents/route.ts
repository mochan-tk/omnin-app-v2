import { proxyWithCase } from "@/lib/api/middleware/caseMiddleware";

export async function GET(request: Request) {
	const { search } = new URL(request.url);
	return proxyWithCase(request, `/agents/generated_agents${search}`);
}
