import { create } from "zustand";
import { HealthEndpoint } from "@/lib/api/endpoints/health";
import type { Health } from "@/lib/api/types/health";

type HealthStore = {
	health: Health | null | undefined;
	statusCode: number | null | undefined;
	loading: boolean;
	error: string | null | undefined;
	checkHealth: () => Promise<void>;
};

export const useHealthStore = create<HealthStore>((set) => ({
	health: undefined,
	statusCode: undefined,
	loading: false,
	error: null,
	checkHealth: async () => {
		set({ loading: true, error: null });
		try {
			const health = await HealthEndpoint.checkHealth();
			set({ health: health.body, statusCode: health.statusCode });
		} catch (error) {
			set({
				error:
					error instanceof Error
						? error.message
						: "Failed to fetch health status",
			});
		} finally {
			set({ loading: false });
		}
	},
}));
