import type { LayoutConfig, Position, SafeNode } from "../types/agentFlow";

// デフォルトのレイアウト設定
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
	ownerCenter: { x: 0, y: 0 },
	baseRadius: 600,
	deltaRadius: 320,
	slotsPerRing: 12,
	childRadius: 140,
	gridSpacing: { x: 220, y: 180 },
};

/**
 * グリッド配置の座標計算（簡易グリッド）
 */
export function gridPosition(
	idx: number,
	config = DEFAULT_LAYOUT_CONFIG,
): Position {
	const col = idx % 4;
	const row = Math.floor(idx / 4);
	return {
		x: 100 + col * config.gridSpacing.x,
		y: 100 + row * config.gridSpacing.y,
	};
}

/**
 * 環状配置の座標計算
 */
export function ringPosition(
	index: number,
	config = DEFAULT_LAYOUT_CONFIG,
): Position {
	const ring = Math.floor(index / config.slotsPerRing);
	const posInRing = index % config.slotsPerRing;
	const angle = (-2 * Math.PI * posInRing) / config.slotsPerRing; // 時計回り
	const radius = config.baseRadius + ring * config.deltaRadius;
	return {
		x: config.ownerCenter.x + radius * Math.cos(angle),
		y: config.ownerCenter.y + radius * Math.sin(angle),
	};
}

/**
 * 複数ノードの重心を計算
 */
export function computeCentroid(nodes: SafeNode[]): Position {
	if (!nodes || nodes.length === 0) return { x: 0, y: 0 };
	let sx = 0;
	let sy = 0;
	nodes.forEach((n) => {
		sx += (n.position?.x ?? 0) as number;
		sy += (n.position?.y ?? 0) as number;
	});
	return { x: sx / nodes.length, y: sy / nodes.length };
}

/**
 * 親位置の周囲へ子ノードを放射状に配置する座標を生成
 */
export function arrangeChildrenAround(
	parentPos: Position,
	childrenCount: number,
	radius = DEFAULT_LAYOUT_CONFIG.childRadius,
): Position[] {
	const positions: Position[] = [];
	if (childrenCount <= 0) return positions;

	for (let i = 0; i < childrenCount; i++) {
		const angle = (2 * Math.PI * i) / childrenCount;
		const x = Math.round(parentPos.x + radius * Math.cos(angle));
		const y = Math.round(parentPos.y + radius * Math.sin(angle));
		positions.push({ x, y });
	}
	return positions;
}

/**
 * ノードを parentId でグループ化
 */
export function groupByParent(nodes: SafeNode[]): Map<string, SafeNode[]> {
	const map = new Map<string, SafeNode[]>();
	nodes.forEach((n) => {
		const rawPid = n.data.parentId;
		if (rawPid != null) {
			const key = String(rawPid);
			const arr = map.get(key) ?? [];
			arr.push(n);
			map.set(key, arr);
		}
	});
	return map;
}

/**
 * 現在のノードから「親ID -> 中心座標」のマップを構築
 * 自分の親IDは画面中心、他ユーザーの親IDは環状に配置
 */
export function computeGroupCenters(
	nodes: SafeNode[],
	ownerId: string,
	config = DEFAULT_LAYOUT_CONFIG,
): Map<string, Position> {
	const centers = new Map<string, Position>();
	// 自分のエージェントの親ID（= ownerId）を常に中心へ
	centers.set(ownerId, config.ownerCenter);

	// 他ユーザーの親IDを収集（null除外、自分の親ID除外）
	const pidSet = new Set<string>();
	for (const n of nodes) {
		const pid = n.data.parentId != null ? String(n.data.parentId) : null;
		if (pid && pid !== ownerId) pidSet.add(pid);
	}

	const sorted = Array.from(pidSet).sort();
	sorted.forEach((pid, idx) => {
		centers.set(pid, ringPosition(idx, config));
	});

	return centers;
}

/**
 * 自分のエージェントノードを必ず画面中心へ固定
 */
export function enforceOwnerAtCenter(
	nodes: SafeNode[],
	ownerId: string,
	config = DEFAULT_LAYOUT_CONFIG,
): SafeNode[] {
	return nodes.map((n) =>
		n.id === ownerId
			? ({
					...n,
					position: { x: config.ownerCenter.x, y: config.ownerCenter.y },
				} as SafeNode)
			: n,
	);
}

/**
 * 親IDごとに、親を指定中心へ、子はその周囲へ等角度配置する
 */
export function applyParentLayoutWithCenters(
	nodes: SafeNode[],
	centers: Map<string, Position>,
	config = DEFAULT_LAYOUT_CONFIG,
): SafeNode[] {
	const map = new Map<string, SafeNode>();
	nodes.forEach((n) => {
		const sn = n as SafeNode;
		map.set(sn.id, { ...sn, position: { ...(sn.position ?? { x: 0, y: 0 }) } });
	});

	const groups = groupByParent(nodes);
	groups.forEach((children, pid) => {
		const center = centers.get(pid) ?? computeCentroid(children);
		// 親ノード（実体 or プレースホルダ）を探す
		const parentNode = map.get(pid) ?? map.get(`placeholder-${pid}`);

		if (parentNode) {
			map.set(parentNode.id, {
				...parentNode,
				position: { x: center.x, y: center.y },
			} as SafeNode);
		}

		const childPositions = arrangeChildrenAround(
			center,
			children.length,
			config.childRadius,
		);
		children.forEach((child, idx) => {
			const existing = map.get(child.id);
			const pos = childPositions[idx] ?? gridPosition(idx, config);
			if (existing) {
				map.set(child.id, { ...existing, position: pos });
			} else {
				map.set(child.id, { ...(child as SafeNode), position: pos });
			}
		});
	});

	return Array.from(map.values()) as SafeNode[];
}
