import type {
	HandleIds,
	Position,
	SafeEdge,
	SafeNode,
} from "../types/agentFlow";

/**
 * 親子ノードの位置関係から適切なハンドルIDを決定
 */
export function pickHandleIds(
	parentPos?: Position,
	childPos?: Position,
): HandleIds {
	if (!parentPos || !childPos) return {};

	const dx = (childPos.x ?? 0) - (parentPos.x ?? 0);
	const dy = (childPos.y ?? 0) - (parentPos.y ?? 0);
	const ax = Math.abs(dx);
	const ay = Math.abs(dy);

	if (ax >= ay) {
		// 横優先
		return dx >= 0
			? { sourceHandle: "s-right", targetHandle: "t-left" }
			: { sourceHandle: "s-left", targetHandle: "t-right" };
	}
	// 縦
	return dy >= 0
		? { sourceHandle: "s-bottom", targetHandle: "t-top" }
		: { sourceHandle: "s-top", targetHandle: "t-bottom" };
}

/**
 * ノードIDとハンドル名から完全なハンドルIDを生成
 */
export function createHandleId(nodeId: string, handleName: string): string {
	return `${nodeId}-${handleName}`;
}

/**
 * 親子関係に基づいてエッジを作成
 */
export function createParentChildEdge(
	parentNode: SafeNode | undefined,
	childNode: SafeNode,
	parentId: string,
): SafeEdge | null {
	const sourceId = parentNode ? parentNode.id : `placeholder-${parentId}`;

	const { sourceHandle, targetHandle } = pickHandleIds(
		parentNode?.position as Position | undefined,
		childNode?.position as Position | undefined,
	);

	const computedSourceHandle = sourceHandle
		? createHandleId(sourceId, sourceHandle)
		: undefined;
	const computedTargetHandle = targetHandle
		? createHandleId(childNode.id, targetHandle)
		: undefined;

	return {
		id: `e-${sourceId}-${childNode.id}`,
		source: sourceId,
		target: childNode.id,
		sourceHandle: computedSourceHandle,
		targetHandle: computedTargetHandle,
		animated: true,
		style: { stroke: "#9CA3AF" },
	} as SafeEdge;
}

/**
 * ノードの配列からすべての親子エッジを構築
 */
export function buildEdgesFromNodes(nodes: SafeNode[]): SafeEdge[] {
	const newEdges: SafeEdge[] = [];
	const idMap = new Map<string, SafeNode>();

	// ノードのIDマップを作成
	for (const n of nodes) {
		idMap.set(n.id, n);
	}

	// 各ノードの親子関係をチェックしてエッジを作成
	nodes.forEach((n) => {
		const pid = n.data.parentId != null ? String(n.data.parentId) : null;
		if (pid != null) {
			// 実際の親ノードまたはプレースホルダーノードを探す
			const sourceNode =
				idMap.has(pid) && (idMap.get(pid) as SafeNode).type === "agentNode"
					? (idMap.get(pid) as SafeNode)
					: (idMap.get(`placeholder-${pid}`) as SafeNode | undefined);

			const edge = createParentChildEdge(sourceNode, n, pid);
			if (edge) {
				newEdges.push(edge);
			}
		}
	});

	return newEdges;
}

/**
 * エッジの更新 - 特定のノードに関連するエッジのみを再構築
 */
export function updateEdgesForNode(
	existingEdges: SafeEdge[],
	updatedNode: SafeNode,
	_allNodes: SafeNode[],
): SafeEdge[] {
	// 更新対象ノードに関連する既存エッジを除去
	const filteredEdges = existingEdges.filter(
		(edge) => edge.source !== updatedNode.id && edge.target !== updatedNode.id,
	);

	// 新しいエッジを追加（親子関係が変わった可能性があるため）
	const newEdges = buildEdgesFromNodes([updatedNode]);

	return [...filteredEdges, ...newEdges];
}
