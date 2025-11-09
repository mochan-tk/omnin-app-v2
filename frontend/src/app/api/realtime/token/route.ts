import { proxyWithCase } from "@/lib/api/middleware/caseMiddleware";

export async function GET(request: Request) {
	return proxyWithCase(request, "/realtime/token");
}
