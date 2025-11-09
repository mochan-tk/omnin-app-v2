import type { GeneratedAgent } from "@/lib/api/types/generatedAgent";
import type { SafeNode } from "../types/agentFlow";
import { gridPosition } from "./layout";

/**
 * GeneratedAgentからSafeNodeを作成する共通関数
 */
export function createAgentNode(
	agent: GeneratedAgent,
	ownerId: string,
	positionIndex: number = 0,
	customPosition?: { x: number; y: number },
): SafeNode {
	const isMyChild = agent.parentId && agent.ownerId === ownerId;
	const position =
		customPosition ??
		(isMyChild ? { x: 400, y: 200 } : gridPosition(positionIndex));

	return {
		id: agent.id,
		type: "agentNode",
		data: {
			label: agent.name,
			name: agent.name,
			status: agent.status ?? "idle",
			lastUpdated: agent.lastUpdated ?? null,
			parentId: agent.parentId,
			isForeign: agent.ownerId !== ownerId,
			// SSE用の初期値
			progress: undefined,
			step: undefined,
			decisionLogs: [],
		},
		position,
	};
}

/**
 * 自分のマネージャーエージェントノードを作成
 */
export function createOwnerNode(
	ownerId: string,
	customPosition?: { x: number; y: number },
): SafeNode {
	const position = customPosition ?? { x: 400, y: 200 };

	return {
		id: ownerId,
		type: "agentNode",
		data: {
			label: "自分のマネージャーエージェント",
			name: "自分のマネージャーエージェント",
			status: "idle",
			lastUpdated: null,
			parentId: null,
			isForeign: false,
		},
		position,
	};
}

/**
 * プレースホルダーノードを作成（他ユーザーの親エージェント）
 */
export function createPlaceholderNode(
	parentId: string,
	customPosition?: { x: number; y: number },
): SafeNode {
	const position = customPosition ?? { x: 0, y: 0 };

	return {
		id: `placeholder-${parentId}`,
		type: "agentNode",
		data: {
			label: "他の人のエージェント",
			name: "他の人のエージェント",
			isForeign: true,
		},
		position,
	};
}

/**
 * エージェントリストから自分の子エージェントのノードを作成
 */
export function createMyChildNodes(
	agents: GeneratedAgent[],
	ownerId: string,
): { nodes: SafeNode[]; existingIds: Set<string> } {
	const nodes: SafeNode[] = [];
	const existingIds = new Set<string>();

	const isMyChildAgent = (agent: GeneratedAgent) =>
		agent.parentId && agent.ownerId === ownerId;

	agents.forEach((agent, idx) => {
		const isMyChild = isMyChildAgent(agent);
		if (!isMyChild) return; // 他人のエージェントはスキップ

		const node = createAgentNode(agent, ownerId, idx);
		nodes.push(node);
		existingIds.add(node.id);
	});

	return { nodes, existingIds };
}

/**
 * 他ユーザーのエージェントから必要なプレースホルダーと子ノードを作成
 */
export function createOtherUserNodes(
	agents: GeneratedAgent[],
	existingIds: Set<string>,
	ownerId: string,
): { placeholders: SafeNode[]; children: SafeNode[] } {
	const anotherUserAgents = agents.filter(
		(agent) => !existingIds.has(agent.id),
	);

	// 親IDを収集
	const parentIds = new Set<string>();
	anotherUserAgents.forEach((agent) => {
		if (agent.parentId) parentIds.add(String(agent.parentId));
	});

	// プレースホルダーノード作成
	const placeholders: SafeNode[] = Array.from(parentIds)
		.sort()
		.map((pid) => createPlaceholderNode(pid));

	// 他ユーザー子ノード作成
	const children: SafeNode[] = anotherUserAgents.map((agent) =>
		createAgentNode(agent, ownerId, 0, { x: 0, y: 0 }),
	);

	return { placeholders, children };
}

/**
 * プレースホルダーが必要かチェックして作成
 */
export function createMissingPlaceholders(
	nodes: SafeNode[],
	targetParentId: string | null,
): SafeNode[] {
	if (!targetParentId) return [];

	const existingIds = new Set(nodes.map((n) => n.id));
	const pidStr = String(targetParentId);
	const phId = `placeholder-${pidStr}`;

	if (!existingIds.has(pidStr) && !existingIds.has(phId)) {
		return [createPlaceholderNode(pidStr, gridPosition(nodes.length))];
	}

	return [];
}

/**
 * 使用されていないプレースホルダーを除去
 */
export function removeUnusedPlaceholders(nodes: SafeNode[]): SafeNode[] {
	const activePids = new Set<string>();

	// アクティブな親IDを収集
	for (const n of nodes) {
		const pid = n.data.parentId != null ? String(n.data.parentId) : null;
		if (pid) activePids.add(pid);
	}

	// 子が存在しないプレースホルダノードを削除
	return nodes.filter((n) => {
		if (!n.id.startsWith("placeholder-")) return true;
		const pid = n.id.replace(/^placeholder-/, "");
		return activePids.has(pid);
	});
}
