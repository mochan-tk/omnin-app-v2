"use client";

import {
	Background,
	type Connection,
	Controls,
	type EdgeChange,
	type Node,
	type NodeChange,
	ReactFlow,
	type ReactFlowInstance,
} from "@xyflow/react";
import type React from "react";
import "@xyflow/react/dist/style.css";
import AgentNode from "../nodes/AgentNode";
import type { SafeEdge, SafeNode } from "../types/agentFlow";

const nodeTypes = {
	agentNode: AgentNode,
};

interface AgentFlowCanvasProps {
	nodes: SafeNode[];
	edges: SafeEdge[];
	onNodesChange: (changes: NodeChange[]) => void;
	onEdgesChange: (changes: EdgeChange[]) => void;
	onConnect: (connection: Connection) => void;
	onNodeClick: (event: React.MouseEvent, node: Node) => Promise<void>;
	onPaneClick: () => void;
	onInit: (instance: ReactFlowInstance) => void;
	onNodeDragStart: () => void;
	onNodeDragStop: () => void;
	viewport: {
		x: number;
		y: number;
		zoom: number;
	};
}

export function AgentFlowCanvas({
	nodes,
	edges,
	onNodesChange,
	onEdgesChange,
	onConnect,
	onNodeClick,
	onPaneClick,
	onInit,
	onNodeDragStart,
	onNodeDragStop,
	viewport,
}: AgentFlowCanvasProps) {
	return (
		<ReactFlow
			nodes={nodes}
			edges={edges}
			nodeTypes={nodeTypes}
			onNodesChange={onNodesChange}
			onEdgesChange={onEdgesChange}
			onConnect={onConnect}
			onNodeClick={onNodeClick}
			onPaneClick={onPaneClick}
			key={`rf-${viewport.zoom}`}
			defaultViewport={viewport}
			minZoom={0.35}
			maxZoom={1.5}
			onInit={onInit}
			onNodeDragStart={onNodeDragStart}
			onNodeDragStop={onNodeDragStop}
		>
			<Controls />
			<Background />
		</ReactFlow>
	);
}

export default AgentFlowCanvas;
