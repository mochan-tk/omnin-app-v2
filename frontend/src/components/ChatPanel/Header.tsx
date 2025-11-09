"use client";

import { useEffect, useState } from "react";
import AgentDetailPopup from "@/components/AgentFlow/AgentDetailPopup";
import { GeneratedAgentsEndpoint } from "@/lib/api/endpoints/generatedAgents";
import type { GeneratedAgent } from "@/lib/api/types/generatedAgent";
import { useAgentChatStore } from "@/lib/store/agent-chat-store";

export default function Header({ title }: { title?: string }) {
	const noticeMessage = useAgentChatStore((s) => s.noticeMessage);
	const selectedAgentId = useAgentChatStore((s) => s.selectedAgentId);
	const clearSelectedAgent = useAgentChatStore((s) => s.clearSelectedAgent);

	const [agentDetail, setAgentDetail] = useState<GeneratedAgent | null>(null);
	const [showDetailPopup, setShowDetailPopup] = useState(false);

	// sub agents 状態一覧（selectedAgentId の子）
	const [_subAgents, setSubAgents] = useState<GeneratedAgent[]>([]);

	// decision logs をエージェントごとに保持するマップ（SSE イベントの履歴用）
	const [_decisionLogsMap, setDecisionLogsMap] = useState<
		Record<string, unknown[]>
	>({});

	useEffect(() => {
		if (!selectedAgentId) {
			setAgentDetail(null);
			return;
		}
		let cancelled = false;
		void GeneratedAgentsEndpoint.getById(selectedAgentId)
			.then(({ body }) => {
				if (!cancelled) setAgentDetail(body);
			})
			.catch(() => {
				if (!cancelled) setAgentDetail(null);
			});

		// sub-agent の一覧取得 & SSE で同期
		const controller = new AbortController();
		void GeneratedAgentsEndpoint.list({ ownerId: selectedAgentId })
			.then(({ body }) => {
				if (!cancelled) setSubAgents(body);
			})
			.catch(() => {
				if (!cancelled) setSubAgents([]);
			});

		// SSE購読で追加/削除/更新を反映
		GeneratedAgentsEndpoint.stream({
			ownerId: selectedAgentId,
			onAdd: (agent) => {
				setSubAgents((prev) => {
					if (prev.some((a) => a.id === agent.id)) return prev;
					return [...prev, agent];
				});
			},
			onRemove: (id) => {
				setSubAgents((prev) => prev.filter((a) => a.id !== id));
			},
			onUpdate: (agent) => {
				setSubAgents((prev) =>
					prev.map((a) => (a.id === agent.id ? (agent as GeneratedAgent) : a)),
				);
			},
			onStatus: (payload) => {
				try {
					const base = payload as Record<string, unknown>;
					const agentId = String(
						base.agentId ??
							(base.agent as Record<string, unknown> | undefined)?.id ??
							"",
					);
					if (!agentId) return;
					const status = String(base.status ?? "idle");
					const timestamp = base.timestamp ? String(base.timestamp) : null;
					setSubAgents((prev) =>
						prev.map((a) =>
							a.id === agentId
								? (() => {
										const updated = {
											...a,
											status,
											// attach lastUpdated preferring payload timestamp, then existing top-level lastUpdated, then realtime.lastUpdated
											lastUpdated:
												timestamp ??
												(a as unknown as GeneratedAgent).lastUpdated ??
												(a as unknown as GeneratedAgent).realtime
													?.lastUpdated ??
												null,
										} as GeneratedAgent;
										return updated;
									})()
								: a,
						),
					);
					// also record status event in decision logs for traceability
					setDecisionLogsMap((prev) => {
						const entry = { type: "status_update", agentId, status, timestamp };
						const arr = Array.isArray(prev[agentId]) ? [...prev[agentId]] : [];
						arr.push(entry);
						return { ...prev, [agentId]: arr };
					});
				} catch (err) {
					console.error("[Header] onStatus handler error", err);
				}
			},
			onProgress: (payload) => {
				try {
					const agentId = String(payload.agentId ?? "");
					if (!agentId) return;
					const raw = payload.progress as unknown;
					const progress = typeof raw === "number" ? raw : Number(raw ?? NaN);
					const step = payload.step ? String(payload.step) : undefined;
					const timestamp = payload.timestamp
						? String(payload.timestamp)
						: null;
					if (!Number.isFinite(progress)) return;
					setSubAgents((prev) =>
						prev.map((a) =>
							a.id === agentId
								? (() => {
										const updated = {
											...a,
											progress,
											step,
											// attach lastUpdated preferring payload timestamp, then existing top-level lastUpdated, then realtime.lastUpdated
											lastUpdated:
												timestamp ??
												(a as unknown as GeneratedAgent).lastUpdated ??
												(a as unknown as GeneratedAgent).realtime
													?.lastUpdated ??
												null,
										} as GeneratedAgent;
										return updated;
									})()
								: a,
						),
					);
					setDecisionLogsMap((prev) => {
						const entry = {
							type: "progress",
							agentId,
							progress,
							step,
							timestamp,
						};
						const arr = Array.isArray(prev[agentId]) ? [...prev[agentId]] : [];
						arr.push(entry);
						return { ...prev, [agentId]: arr };
					});
				} catch (err) {
					console.error("[Header] onProgress handler error", err);
				}
			},
			onDecision: (entry) => {
				try {
					const e = entry as Record<string, unknown>;
					const agentId = String(e.agentId ?? "");
					if (!agentId) return;
					setDecisionLogsMap((prev) => {
						const arr = Array.isArray(prev[agentId]) ? [...prev[agentId]] : [];
						arr.push(e);
						return { ...prev, [agentId]: arr };
					});
				} catch (err) {
					console.error("[Header] onDecision handler error", err);
				}
			},
			onError: (err) => {
				console.error("[Header] stream error", err);
			},
			signal: controller.signal,
		}).catch((err) => {
			console.error("[Header] stream connect failed", err);
		});

		return () => {
			cancelled = true;
			controller.abort();
		};
	}, [selectedAgentId]);

	return (
		<div className="p-4 border-b bg-gray-50 flex-shrink-0 rounded-t-lg">
			<div className="flex items-center gap-2">
				<div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
					🤖
				</div>
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2">
						<h2 className="font-semibold text-sm truncate">
							{title ?? "チャットする"}
						</h2>
						{agentDetail?.tool ? (
							<span className="px-2 py-1 rounded-full bg-gray-100 text-xs text-gray-700 border">
								{agentDetail.tool}
							</span>
						) : null}
					</div>
					{agentDetail?.instruction ? (
						<div className="text-xs text-gray-500 truncate max-w-full">
							{agentDetail.instruction.length > 120
								? `${agentDetail.instruction.slice(0, 120)}…`
								: agentDetail.instruction}
						</div>
					) : null}
				</div>

				{agentDetail?.instruction ? (
					<div className="ml-2">
						<button
							type="button"
							onClick={() => setShowDetailPopup(true)}
							className="text-xs text-blue-600 hover:underline"
						>
							詳細
						</button>
					</div>
				) : null}

				{selectedAgentId ? (
					<div className="ml-auto">
						<button
							type="button"
							onClick={() => clearSelectedAgent()}
							className="text-xs text-gray-600 hover:text-gray-800"
						>
							選択を解除
						</button>
					</div>
				) : null}
			</div>

			{showDetailPopup && agentDetail ? (
				<AgentDetailPopup
					agent={agentDetail}
					anchor={{ x: 0, y: 0 }}
					onClose={() => setShowDetailPopup(false)}
				/>
			) : null}

			{noticeMessage ? (
				<div className="mt-3">
					<div className="inline-block px-3 py-1 text-xs rounded-md bg-blue-50 text-blue-700 border border-blue-100">
						{noticeMessage}
					</div>
				</div>
			) : null}
		</div>
	);
}
