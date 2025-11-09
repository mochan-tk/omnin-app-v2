import type { HealthResponse } from "@/lib/api/types/health";
import { Health } from "@/lib/api/types/health";

// biome-ignore lint/complexity/noStaticOnlyClass: false
export class HealthEndpoint {
	private static mapHealthResponseToHealth(response: HealthResponse): Health {
		return new Health(response.status);
	}

	public static async checkHealth(): Promise<{
		statusCode: number;
		body: Health | null;
	}> {
		const res = await fetch("/api/health");
		if (!res.ok) {
			throw new Error("Failed to fetch health status");
		}
		const data = await res.json();
		return {
			statusCode: res.status,
			body: HealthEndpoint.mapHealthResponseToHealth(data),
		};
	}
}
