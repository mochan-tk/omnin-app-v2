import { useCallback, useEffect, useState } from "react";
import { GeneratedAgentsEndpoint } from "@/lib/api/endpoints/generatedAgents";
import type { GeneratedAgent } from "@/lib/api/types/generatedAgent";
import type { SafeEdge, SafeNode, SSEHandlers } from "../types/agentFlow";
import { buildEdgesFromNodes } from "../utils/edgeBuilding";
import {
	applyParentLayoutWithCenters,
	computeGroupCenters,
	enforceOwnerAtCenter,
} from "../utils/layout";
import {
	createAgentNode,
	createMissingPlaceholders,
	createMyChildNodes,
	createOtherUserNodes,
	createOwnerNode,
	removeUnusedPlaceholders,
} from "../utils/nodeCreation";

interface UseAgentFlowDataProps {
	ownerId: string;
	onSetNodes: (
		updater: SafeNode[] | ((prev: SafeNode[]) => SafeNode[]),
	) => void;
	onSetEdges: (
		updater: SafeEdge[] | ((prev: SafeEdge[]) => SafeEdge[]),
	) => void;
	onCenterToOwner?: () => void;
}

interface UseAgentFlowDataReturn {
	isRefreshing: boolean;
	handleRefresh: () => Promise<void>;
}

export function useAgentFlowData({
	ownerId,
	onSetNodes,
	onSetEdges,
	onCenterToOwner,
}: UseAgentFlowDataProps): UseAgentFlowDataReturn {
	const [isRefreshing, setIsRefreshing] = useState(false);

	// 初期データ処理の共通ロジック
	const processAgentList = useCallback(
		(agents: GeneratedAgent[]) => {
			const { nodes: myChildNodes, existingIds } = createMyChildNodes(
				agents,
				ownerId,
			);

			// 自分のマネージャーエージェントを追加
			const ownerNode = createOwnerNode(ownerId);
			const nodesWithOwner = [ownerNode, ...myChildNodes];
			const updatedExistingIds = new Set([...existingIds, ownerNode.id]);

			// 他ユーザーのエージェントを処理
			const { placeholders, children } = createOtherUserNodes(
				agents,
				updatedExistingIds,
				ownerId,
			);

			// 全体ノードを合成
			const allNodes: SafeNode[] = [
				...nodesWithOwner,
				...placeholders,
				...children,
			];

			// レイアウト計算とオーナー中心配置
			const centers = computeGroupCenters(allNodes, ownerId);
			const arrangedNodes = applyParentLayoutWithCenters(allNodes, centers);
			const finalNodes = enforceOwnerAtCenter(arrangedNodes, ownerId);

			// ノードとエッジを更新
			onSetNodes(finalNodes);
			onSetEdges(buildEdgesFromNodes(finalNodes));
		},
		[ownerId, onSetNodes, onSetEdges],
	);

	// SSEハンドラの実装
	const createSSEHandlers = useCallback(
		(): SSEHandlers => ({
			onAdd: (agent) => {
				console.log("[AgentFlow] onAdd", agent);

				onSetNodes((prev: SafeNode[]) => {
					if (prev.some((n: SafeNode) => n.id === agent.id)) return prev;

					const newNode = createAgentNode(agent, ownerId, prev.length);
					let updated = [...prev, newNode];

					// プレースホルダーが必要な場合は追加
					const placeholders = createMissingPlaceholders(
						updated,
						agent.parentId ? String(agent.parentId) : null,
					);
					if (placeholders.length > 0) {
						updated = [...updated, ...placeholders];
					}

					// レイアウト再計算
					const centers = computeGroupCenters(updated, ownerId);
					const arranged = applyParentLayoutWithCenters(updated, centers);
					const finalNodes = enforceOwnerAtCenter(arranged, ownerId);

					// エッジ更新
					onSetEdges(buildEdgesFromNodes(finalNodes));

					return finalNodes;
				});

				// 自分のエージェントが追加された場合は画面中心へ
				if (agent.ownerId === ownerId || agent.id === ownerId) {
					onCenterToOwner?.();
				}
			},

			onRemove: (id) => {
				console.log("[AgentFlow] onRemove", id);

				onSetNodes((prev: SafeNode[]) => {
					let updated = prev.filter((n: SafeNode) => n.id !== id);
					updated = removeUnusedPlaceholders(updated);

					// レイアウト再計算
					const centers = computeGroupCenters(updated, ownerId);
					const arranged = applyParentLayoutWithCenters(updated, centers);
					const finalNodes = enforceOwnerAtCenter(arranged, ownerId);

					// エッジ更新
					onSetEdges(buildEdgesFromNodes(finalNodes));

					return finalNodes;
				});
			},

			onUpdate: (agent) => {
				console.log("[AgentFlow] onUpdate", agent);

				onSetNodes((prev: SafeNode[]) => {
					// ノードデータ更新
					let updated: SafeNode[] = prev.map((n: SafeNode) =>
						n.id === agent.id
							? ({
									...n,
									data: {
										...n.data,
										label: agent.name,
										name: agent.name,
										status: agent.status ?? "idle",
										lastUpdated: agent.lastUpdated ?? null,
										parentId:
											agent.parentId != null ? String(agent.parentId) : null,
										isForeign: !agent.ownerId
											? true
											: agent.ownerId !== ownerId,
									},
								} as SafeNode)
							: n,
					);

					// 不足しているプレースホルダーを追加
					const placeholders = createMissingPlaceholders(
						updated,
						agent.parentId ? String(agent.parentId) : null,
					);
					if (placeholders.length > 0) {
						updated = [...updated, ...placeholders];
					}

					// 未使用プレースホルダーを除去
					updated = removeUnusedPlaceholders(updated);

					// レイアウト再計算
					const centers = computeGroupCenters(updated, ownerId);
					const arranged = applyParentLayoutWithCenters(updated, centers);
					const finalNodes = enforceOwnerAtCenter(arranged, ownerId);

					// エッジ更新
					onSetEdges(buildEdgesFromNodes(finalNodes));

					return finalNodes;
				});
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

					const status = String(payload.status ?? "idle");
					const timestamp = payload.timestamp
						? String(payload.timestamp)
						: null;

					onSetNodes((prev: SafeNode[]) =>
						prev.map((n: SafeNode) =>
							n.id === agentId
								? {
										...n,
										data: {
											...n.data,
											status,
											lastUpdated: timestamp ?? n.data.lastUpdated ?? null,
										},
									}
								: n,
						),
					);
				} catch (err) {
					console.error("[AgentFlow] onStatus handler error", err);
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

					onSetNodes((prev: SafeNode[]) =>
						prev.map((n: SafeNode) =>
							n.id === agentId
								? {
										...n,
										data: {
											...n.data,
											progress,
											step,
											lastUpdated: timestamp ?? n.data.lastUpdated ?? null,
										},
									}
								: n,
						),
					);
				} catch (err) {
					console.error("[AgentFlow] onProgress handler error", err);
				}
			},

			onDecision: (entry: unknown) => {
				try {
					const e = entry as Record<string, unknown>;
					const agentId = String(e.agentId ?? "");
					if (!agentId) return;

					onSetNodes((prev: SafeNode[]) =>
						prev.map((n: SafeNode) => {
							if (n.id !== agentId) return n;

							const logs = Array.isArray(n.data.decisionLogs)
								? [...n.data.decisionLogs]
								: [];
							logs.push(e);

							return {
								...n,
								data: {
									...n.data,
									decisionLogs: logs,
									lastUpdated: String(e.timestamp ?? n.data.lastUpdated ?? ""),
								},
							};
						}),
					);
				} catch (err) {
					console.error("[AgentFlow] onDecision handler error", err);
				}
			},

			onError: (err) => {
				console.error("[AgentFlow] stream error", err);
			},
		}),
		[ownerId, onSetNodes, onSetEdges, onCenterToOwner],
	);

	// 初期データ取得とSSE接続
	useEffect(() => {
		const controller = new AbortController();
		let subscription: { close: () => void } | null = null;

		// 初期データ取得
		void GeneratedAgentsEndpoint.list()
			.then(({ body }) => {
				processAgentList(body);
			})
			.catch((err) => {
				console.error("[AgentFlow] initial list error", err);
			});

		// SSE接続
		void GeneratedAgentsEndpoint.stream({
			ownerId,
			...createSSEHandlers(),
			signal: controller.signal,
		})
			.then((sub) => {
				subscription = sub;
			})
			.catch((err) => {
				console.error("[AgentFlow] stream connect failed", err);
			});

		return () => {
			try {
				if (subscription) {
					subscription.close();
				}
			} catch {
				// noop
			}
			controller.abort();
		};
	}, [ownerId, processAgentList, createSSEHandlers]);

	// リフレッシュ処理
	const handleRefresh = useCallback(async () => {
		if (isRefreshing) return;
		setIsRefreshing(true);

		try {
			const { body } = await GeneratedAgentsEndpoint.list();
			processAgentList(body);
		} catch (err) {
			console.error("[AgentFlow] refresh error", err);
		} finally {
			setIsRefreshing(false);
		}
	}, [isRefreshing, processAgentList]);

	return {
		isRefreshing,
		handleRefresh,
	};
}
