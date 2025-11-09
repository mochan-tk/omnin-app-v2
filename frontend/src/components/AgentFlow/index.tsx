"use client";

import {
	addEdge,
	type Connection,
	type Node,
	useEdgesState,
	useNodesState,
} from "@xyflow/react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import "@xyflow/react/dist/style.css";
import { GeneratedAgentsEndpoint } from "@/lib/api/endpoints/generatedAgents";
import type { GeneratedAgent } from "@/lib/api/types/generatedAgent";
import { useAgentChatStore } from "@/lib/store/agent-chat-store";
import AgentDetailPopup from "./AgentDetailPopup";
import AgentFlowCanvas from "./components/AgentFlowCanvas";
import AgentFlowControls from "./components/AgentFlowControls";
import { useAgentFlowData } from "./hooks/useAgentFlowData";
import { useReactFlowInstance } from "./hooks/useReactFlowInstance";
import type { AgentFlowProps, SafeEdge, SafeNode } from "./types/agentFlow";

function AgentFlow({
	ownerId,
	isExpanded: _isExpanded,
	onToggleExpand: _onToggleExpand,
}: AgentFlowProps) {
	const [nodes, setNodes, onNodesChange] = useNodesState<SafeNode>([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState<SafeEdge>([]);
	const [selected, setSelected] = useState<GeneratedAgent | null>(null);
	const [_loadingDetail, setLoadingDetail] = useState(false);
	const [popupAnchor, setPopupAnchor] = useState<{
		x: number;
		y: number;
	} | null>(null);

	// ビューポート設定（スマホ対応）
	const [viewport, setViewport] = useState({
		x: 0,
		y: 0,
		zoom: 0.6,
	});

	// 選択中エージェントの取得
	const selectedAgentId = useAgentChatStore((s) => s.selectedAgentId);

	// スマホ判定により初期拡大率を調整
	useEffect(() => {
		const update = () => {
			const isMobile =
				typeof window !== "undefined" && window.innerWidth <= 640;
			setViewport({ x: 0, y: 0, zoom: isMobile ? 0.4 : 0.6 });
		};
		update();
		window.addEventListener("resize", update);
		return () => window.removeEventListener("resize", update);
	}, []);

	// ReactFlowインスタンス管理
	const { handleInit, handleNodeDragStart, handleNodeDragStop, centerToOwner } =
		useReactFlowInstance({
			viewport,
		});

	// SSE処理とデータ管理
	const { isRefreshing, handleRefresh } = useAgentFlowData({
		ownerId,
		onSetNodes: setNodes,
		onSetEdges: setEdges,
		onCenterToOwner: centerToOwner,
	});

	// 選択中エージェントの強調表示
	useEffect(() => {
		setNodes((prev: SafeNode[]) =>
			prev.map((n: SafeNode) => ({
				...n,
				data: {
					...n.data,
					highlighted: n.id === selectedAgentId,
				},
			})),
		);
	}, [selectedAgentId, setNodes]);

	// 接続処理
	const onConnect = useCallback(
		(params: Connection) => setEdges((eds) => addEdge(params, eds)),
		[setEdges],
	);

	// ノードクリック処理
	const onNodeClick = useCallback(
		async (event: React.MouseEvent, node: Node) => {
			try {
				setLoadingDetail(true);
				const { body } = await GeneratedAgentsEndpoint.getById(node.id);
				setSelected(body);

				// nodeをanyとしてキャストして positionAbsolute にアクセス
				const nodeWithPos = node as Node & {
					positionAbsolute?: { x: number; y: number };
				};
				const anchor =
					nodeWithPos.positionAbsolute !== undefined
						? {
								x: nodeWithPos.positionAbsolute.x,
								y: nodeWithPos.positionAbsolute.y,
							}
						: {
								x: event.clientX ?? 0,
								y: event.clientY ?? 0,
							};
				setPopupAnchor(anchor);
			} catch (err) {
				console.error("[AgentFlow] getById error", err);
			} finally {
				setLoadingDetail(false);
			}
		},
		[],
	);

	// 背景クリック処理
	const onPaneClick = useCallback(() => {
		setSelected(null);
		setPopupAnchor(null);
	}, []);

	return (
		<div className="relative" style={{ width: "100%", height: "100%" }}>
			<AgentFlowCanvas
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
				onNodeClick={onNodeClick}
				onPaneClick={onPaneClick}
				onInit={handleInit}
				onNodeDragStart={handleNodeDragStart}
				onNodeDragStop={handleNodeDragStop}
				viewport={viewport}
			/>

			<AgentFlowControls
				isRefreshing={isRefreshing}
				onRefresh={handleRefresh}
			/>

			{selected && popupAnchor ? (
				<AgentDetailPopup
					agent={selected}
					anchor={popupAnchor}
					onClose={() => {
						setSelected(null);
						setPopupAnchor(null);
					}}
				/>
			) : null}
		</div>
	);
}

export default AgentFlow;
