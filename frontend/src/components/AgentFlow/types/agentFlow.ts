import type { Edge, Node as FlowNode } from "@xyflow/react";
import type { GeneratedAgent } from "@/lib/api/types/generatedAgent";

export interface AgentNodeData {
	label?: string;
	name?: string;
	highlighted?: boolean;
	status?: string;
	lastUpdated?: string | null;
	parentId?: string | null;
	progress?: number;
	step?: string;
	decisionLogs?: unknown[];
	isForeign?: boolean;
	[key: string]: unknown;
}

export type SafeNode = FlowNode<AgentNodeData> & { id: string };
export type SafeEdge = Edge & { id: string; source: string; target: string };

export interface Position {
	x: number;
	y: number;
}

export interface HandleIds {
	sourceHandle?: string;
	targetHandle?: string;
}

export interface SSEHandlers {
	onAdd: (agent: GeneratedAgent) => void;
	onRemove: (id: string) => void;
	onUpdate: (agent: GeneratedAgent) => void;
	onStatus: (payload: Record<string, unknown>) => void;
	onProgress: (payload: Record<string, unknown>) => void;
	onDecision: (entry: unknown) => void;
	onError: (error: unknown) => void;
}

export interface AgentFlowProps {
	ownerId: string;
	isExpanded?: boolean;
	onToggleExpand?: () => void;
}

export interface LayoutConfig {
	ownerCenter: Position;
	baseRadius: number;
	deltaRadius: number;
	slotsPerRing: number;
	childRadius: number;
	gridSpacing: { x: number; y: number };
}
