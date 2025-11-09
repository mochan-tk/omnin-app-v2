// typescript
export interface GeneratedAgent {
	id: string;
	ownerId: string;
	name: string;
	instruction: string;
	tool?: string | null;
	// optional metadata for UI (may be absent if backend doesn't provide)
	parentId?: string | null;
	status?: "idle" | "running" | "done" | "error";
	lastUpdated?: string | null;
	createdAt: string; // ISO string from backend
	updatedAt: string; // ISO string from backend
	// realtime fields populated by SSE / client-side updates
	realtime?: {
		status?: "idle" | "running" | "completed" | "failed" | string;
		progress?: number; // 0..1
		step?: string;
		decisionLogs?: unknown[];
		lastUpdated?: string | null;
	};
}
