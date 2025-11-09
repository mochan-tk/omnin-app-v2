// typescript
import { toCamel } from "@/lib/api/middleware/case";
import type { GeneratedAgent } from "@/lib/api/types/generatedAgent";

function mapToGeneratedAgent(obj: unknown): GeneratedAgent {
	const c = toCamel(obj) as Record<string, unknown>;
	const cc = c as Record<string, unknown> & {
		id?: unknown;
		ownerId?: unknown;
		name?: unknown;
		instruction?: unknown;
		tool?: unknown;
		parentId?: unknown;
		lastUpdated?: unknown;
		createdAt?: unknown;
		updatedAt?: unknown;
	};
	const toStr = (v: unknown) => String(v ?? "");
	const toOptStr = (v: unknown): string | null => {
		if (v === null || v === undefined) return null;
		const s = String(v);
		return s === "" ? null : s;
	};
	return {
		id: toStr(cc.id),
		ownerId: toStr(cc.ownerId),
		name: toStr(cc.name),
		instruction: toStr(cc.instruction),
		parentId: toOptStr(cc.parentId),
		tool: toOptStr(cc.tool),
		lastUpdated: toOptStr(cc.lastUpdated),
		createdAt: toStr(cc.createdAt),
		updatedAt: toStr(cc.updatedAt),
	};
}

// typescript
export interface AgentMessage {
	id: string;
	agentId: string;
	sessionId: string;
	role: "user" | "assistant";
	content: string;
	createdAt: string;
}

function mapToAgentMessage(obj: unknown): AgentMessage {
	const c = toCamel(obj) as Record<string, unknown>;
	const cc = c as Record<string, unknown> & {
		id?: unknown;
		agentId?: unknown;
		sessionId?: unknown;
		role?: unknown;
		content?: unknown;
		createdAt?: unknown;
	};
	const toStr = (v: unknown) => String(v ?? "");
	const roleVal = (cc.role as string | undefined) ?? "user";
	return {
		id: toStr(cc.id),
		agentId: toStr(cc.agentId),
		sessionId: toStr(cc.sessionId),
		role: roleVal === "assistant" ? "assistant" : "user",
		content: toStr(cc.content),
		createdAt: toStr(cc.createdAt),
	};
}

// biome-ignore lint/complexity/noStaticOnlyClass: endpoint container
export class GeneratedAgentsEndpoint {
	public static async list(params?: {
		ownerId?: string;
		limit?: number;
		offset?: number;
	}): Promise<{ statusCode: number; body: GeneratedAgent[] }> {
		const query = new URLSearchParams();
		if (params?.ownerId) query.set("owner_id", params.ownerId);
		if (typeof params?.limit === "number")
			query.set("limit", String(params.limit));
		if (typeof params?.offset === "number")
			query.set("offset", String(params.offset));

		const res = await fetch(
			`/api/agents/generated_agents${query.toString() ? `?${query}` : ""}`,
		);
		if (!res.ok) {
			throw new Error(`Failed to fetch generated agents (${res.status})`);
		}
		const data = await res.json();
		const items = Array.isArray(data) ? data.map(mapToGeneratedAgent) : [];
		return { statusCode: res.status, body: items };
	}

	public static async getById(
		id: string,
	): Promise<{ statusCode: number; body: GeneratedAgent }> {
		const res = await fetch(`/api/agents/generated_agents/${id}`);
		if (!res.ok) {
			throw new Error(`Failed to fetch generated agent (${res.status})`);
		}
		const data = await res.json();
		return { statusCode: res.status, body: mapToGeneratedAgent(data) };
	}

	public static async listMessages(params: {
		id: string;
		sessionId?: string;
		limit?: number;
		offset?: number;
	}): Promise<{ statusCode: number; body: AgentMessage[] }> {
		const query = new URLSearchParams();
		if (params.sessionId) query.set("session_id", params.sessionId);
		if (typeof params.limit === "number")
			query.set("limit", String(params.limit));
		if (typeof params.offset === "number")
			query.set("offset", String(params.offset));

		const res = await fetch(
			`/api/agents/generated_agents/${params.id}/messages${
				query.toString() ? `?${query}` : ""
			}`,
		);
		if (!res.ok) {
			throw new Error(`Failed to fetch messages (${res.status})`);
		}
		const data = await res.json();
		const items = Array.isArray(data) ? data.map(mapToAgentMessage) : [];
		return { statusCode: res.status, body: items };
	}

	public static async postMessage(input: {
		id: string;
		sessionId: string;
		role: "user" | "assistant";
		content: string;
	}): Promise<{ statusCode: number; body: AgentMessage }> {
		const res = await fetch(
			`/api/agents/generated_agents/${input.id}/messages`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					sessionId: input.sessionId,
					role: input.role,
					content: input.content,
				}),
			},
		);
		if (!res.ok) {
			throw new Error(`Failed to post message (${res.status})`);
		}
		const data = await res.json();
		return { statusCode: res.status, body: mapToAgentMessage(data) };
	}

	/**
	 * SSE購読（/api/agents/generated_agents?stream=true）。
	 * サーバからは下記の op を受信する想定:
	 *  - { op: "add", agent: {...} }
	 *  - { op: "remove", id: "..." }
	 *  - { op: "update", agent: {...} }
	 *  - { op: "status_update", agentId: "...", status: "...", detail: {...}, timestamp: "..." }
	 *  - { op: "progress", agentId: "...", progress: 0.42, step: "...", detail: {...}, timestamp: "..." }
	 *  - { op: "decision_log", agentId: "...", entry: {...}, timestamp: "..." }
	 *
	 * 切断時は再接続を自動で試行（指数バックオフ）。
	 */
	public static async stream(params: {
		ownerId?: string;
		onAdd: (agent: GeneratedAgent) => void;
		onRemove: (id: string) => void;
		onUpdate?: (agent: GeneratedAgent) => void;
		onStatus?: (payload: Record<string, unknown>) => void;
		onProgress?: (payload: Record<string, unknown>) => void;
		onDecision?: (entry: unknown) => void;
		onError?: (err: unknown) => void;
		signal?: AbortSignal;
		retry?: {
			initialDelayMs?: number; // 初回待機
			factor?: number; // 乗数
			maxDelayMs?: number; // 上限
		};
	}): Promise<{ close: () => void }> {
		const query = new URLSearchParams();
		if (params.ownerId) query.set("owner_id", params.ownerId);
		// stream=true を必ず付与
		query.set("stream", "true");

		const retryInitial = params.retry?.initialDelayMs ?? 1000;
		const retryFactor = params.retry?.factor ?? 1.5;
		const retryMax = params.retry?.maxDelayMs ?? 30000;

		let stopped = false;
		let delay = retryInitial;
		let currentController: AbortController | null = null;

		const externalAbortHandler = () => {
			stopped = true;
			if (currentController && !currentController.signal.aborted) {
				currentController.abort();
			}
		};
		if (params.signal) {
			// 外部シグナルで購読停止
			params.signal.addEventListener("abort", externalAbortHandler);
		}

		const connect = async () => {
			if (stopped) return;
			currentController = new AbortController();

			try {
				const res = await fetch(
					`/api/agents/generated_agents${query.toString() ? `?${query}` : ""}`,
					{
						method: "GET",
						signal: currentController.signal,
						headers: { Accept: "text/event-stream" },
					},
				);

				if (!res.ok || !res.body) {
					const err = new Error(`Failed to connect SSE (${res.status})`);
					params.onError?.(err);
					throw err;
				}

				// 接続成功 → 遅延を初期化
				delay = retryInitial;

				const reader = res.body.getReader();
				const decoder = new TextDecoder();
				let buffer = "";

				while (!stopped) {
					const { value, done } = await reader.read();
					if (done) break;
					buffer += decoder.decode(value, { stream: true });

					// SSEは \n\n 区切りでイベントが区切られる
					const parts = buffer.split("\n\n");
					buffer = parts.pop() ?? "";

					for (const evt of parts) {
						// "data:" 行のみ抽出
						const dataLines = evt
							.split("\n")
							.map((l) => l.trim())
							.filter((l) => l.startsWith("data:"))
							.map((l) => l.replace(/^data:\s*/, ""));

						for (const line of dataLines) {
							if (!line) continue;
							try {
								const parsed = JSON.parse(line);
								console.log("[SSE] parsed:", parsed);
								const op = parsed?.op;
								try {
									if (op === "add" && parsed.agent) {
										const agent = mapToGeneratedAgent(parsed.agent);
										console.log("[SSE] onAdd agent:", agent);
										params.onAdd(agent);
									} else if (op === "remove" && typeof parsed.id === "string") {
										console.log("[SSE] onRemove id:", parsed.id);
										params.onRemove(parsed.id);
									} else if (op === "update" && parsed.agent) {
										const agent = mapToGeneratedAgent(parsed.agent);
										console.log("[SSE] onUpdate agent:", agent);
										params.onUpdate?.(agent);
									} else if (op === "status_update") {
										// ケース変換して生のペイロードを渡す
										const payload = toCamel(parsed) as Record<string, unknown>;
										console.log("[SSE] status_update:", payload);
										params.onStatus?.(payload);
									} else if (op === "progress") {
										const payload = toCamel(parsed) as Record<string, unknown>;
										console.log("[SSE] progress:", payload);
										params.onProgress?.(payload);
									} else if (op === "decision_log") {
										const payload = toCamel(parsed) as Record<string, unknown>;
										console.log("[SSE] decision_log:", payload);
										params.onDecision?.(payload.entry ?? payload);
									} else {
										console.warn("[SSE] unknown op:", op, parsed);
									}
								} catch (err) {
									console.error("[SSE] handler error:", err, parsed);
									params.onError?.(err);
								}
							} catch (err) {
								console.error("[SSE] invalid JSON:", err, line);
							}
						}
					}
				}

				try {
					await reader.cancel();
				} catch {
					// noop
				}
			} catch (e) {
				if (!stopped) {
					params.onError?.(e);
				}
			} finally {
				// 再接続
				if (!stopped) {
					await new Promise((r) => setTimeout(r, delay));
					delay = Math.min(Math.floor(delay * retryFactor), retryMax);
					void connect();
				}
			}
		};

		// 初回接続
		void connect();

		return {
			close: () => {
				stopped = true;
				if (params.signal) {
					params.signal.removeEventListener("abort", externalAbortHandler);
				}
				if (currentController && !currentController.signal.aborted) {
					currentController.abort();
				}
			},
		};
	}
}
