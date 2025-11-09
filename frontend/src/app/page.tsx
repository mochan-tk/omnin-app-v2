"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import AgentFlow from "@/components/AgentFlow";
import { ChatPanel } from "@/components/ChatPanel";
import { Button } from "@/components/ui";
import { GeneratedAgentsEndpoint } from "@/lib/api/endpoints/generatedAgents";
import { useAgentChatStore } from "@/lib/store/agent-chat-store";
import type { ChatMessage, ToolExecution } from "@/types";

export default function ChatPage(): React.ReactElement {
	const [ownerId] = useState<string>(crypto.randomUUID());
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [isProcessing, setIsProcessing] = useState(false);

	// Resizable pane state (desktop only)
	const [leftWidth, setLeftWidth] = useState<number>(35); // percent
	const containerRef = useRef<HTMLDivElement | null>(null);
	const draggingRef = useRef<boolean>(false);

	// Track mobile breakpoint to adjust widths/heights
	const [isMobile, setIsMobile] = useState<boolean>(false);

	// Expanded state: 'chat' | 'graph' | null
	const [expanded, setExpanded] = useState<"chat" | "graph" | null>(null);

	const selectedAgentId = useAgentChatStore((s) => s.selectedAgentId);
	const selectedAgentName = useAgentChatStore((s) => s.selectedAgentName);

	// チャット開始時にページ側でグラフを閉じる（チャットは自動で開かない）
	useEffect(() => {
		if (selectedAgentId) {
			setExpanded((prev) => (prev === "graph" ? null : prev));
		}
	}, [selectedAgentId]);

	useEffect(() => {
		function onMouseMove(e: MouseEvent) {
			if (!draggingRef.current || !containerRef.current) return;
			const rect = containerRef.current.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const pct = Math.min(95, Math.max(5, (x / rect.width) * 100));
			setLeftWidth(pct);
		}
		function onMouseUp() {
			draggingRef.current = false;
		}
		window.addEventListener("mousemove", onMouseMove);
		window.addEventListener("mouseup", onMouseUp);
		return () => {
			window.removeEventListener("mousemove", onMouseMove);
			window.removeEventListener("mouseup", onMouseUp);
		};
	}, []);

	// monitor window width for mobile/desktop layout decisions
	useEffect(() => {
		function onResize() {
			setIsMobile(window.innerWidth < 768); // md breakpoint
		}
		onResize();
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			if (!selectedAgentId) {
				setMessages([]);
				return;
			}
			try {
				const { body } = await GeneratedAgentsEndpoint.listMessages({
					id: selectedAgentId,
				});
				const mapped = body.map((m) => ({
					id: m.id,
					userInput: m.content,
					isUser: m.role === "user",
					timestamp: new Date(m.createdAt),
				})) as ChatMessage[];
				if (!cancelled) setMessages(mapped);
			} catch {
				if (!cancelled) setMessages([]);
			}
		};
		void load();
		return () => {
			cancelled = true;
		};
	}, [selectedAgentId]);

	const startDrag = (e: React.MouseEvent) => {
		e.preventDefault();
		draggingRef.current = true;
	};

	const handleSendMessage = async (userInput: string) => {
		// ユーザーメッセージを追加
		const userMessage: ChatMessage = {
			id: Date.now().toString(),
			userInput: userInput,
			isUser: true,
			timestamp: new Date(),
		};

		setMessages((prev) => [...prev, userMessage]);
		setIsProcessing(true);

		// ボット用プレースホルダを追加（ストリームで徐々に更新）
		const sessionId = (Date.now() + 1).toString();
		const botMessage: ChatMessage = {
			id: sessionId,
			userInput: "",
			isUser: false,
			timestamp: new Date(),
		};
		setMessages((prev) => [...prev, botMessage]);

		try {
			const idForChat = selectedAgentId ?? ownerId; // TODO: 暫定でオーナーIDと同じIDにする。
			const res = await fetch(`/api/agents/${idForChat}/chat`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "text/event-stream",
				},
				body: JSON.stringify({
					sessionId: sessionId,
					userInput: userInput,
					ownerId: ownerId,
					ownerAgentId: idForChat,
				}),
			});

			if (!res.ok) {
				const text = await res.text();
				setMessages((prev) =>
					prev.map((m) =>
						m.id === sessionId
							? { ...m, userInput: text || "エラーが発生しました" }
							: m,
					),
				);
				setIsProcessing(false);
				return;
			}

			if (!res.body) {
				setMessages((prev) =>
					prev.map((m) =>
						m.id === sessionId ? { ...m, userInput: "空のレスポンスです" } : m,
					),
				);
				setIsProcessing(false);
				return;
			}

			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let done = false;
			let accumulated = "";
			const toolExecutions: Record<string, ToolExecution> = {};
			let jsonBuffer = ""; // JSONデータのバッファリング用

			// 固定ID生成のヘルパー関数
			const generateToolId = (agentName: string, toolName?: string) => {
				const name = agentName || "Agent";
				const tool = toolName || "Tool";
				return `${name}-${tool}`.replace(/\s+/g, "-").toLowerCase();
			};

			while (!done) {
				const { value, done: readerDone } = await reader.read();
				done = readerDone;
				if (value) {
					const chunk = decoder.decode(value, { stream: !done });

					// SSE の場合 "data: " プレフィックスを処理
					const lines = chunk.split("\n");
					for (const line of lines) {
						if (line.startsWith("data:")) {
							const dataStr = line.replace(/^data:\s*/, "").trim();
							if (dataStr) {
								try {
									// JSON形式のイベントをパース
									const event = JSON.parse(dataStr);

									if (event.type === "text") {
										// テキストデルタを蓄積
										accumulated += event.data.delta || "";
										setMessages((prev) =>
											prev.map((m) =>
												m.id === sessionId
													? {
															...m,
															userInput: accumulated,
															toolExecutions: Object.values(toolExecutions),
														}
													: m,
											),
										);
									} else if (event.type === "agent_creating") {
										// エージェント作成中
										const toolId = generateToolId(
											event.data.name,
											event.data.tool || "Agent",
										);
										toolExecutions[toolId] = {
											toolId,
											toolName: event.data.tool || "Agent",
											agentName: event.data.name,
											status: "creating",
											startTime: new Date(),
											progress: `エージェント「${event.data.name}」を作成中...`,
										};
										setMessages((prev) =>
											prev.map((m) =>
												m.id === sessionId
													? {
															...m,
															isThinking: true,
															toolExecutions: Object.values(toolExecutions),
														}
													: m,
											),
										);
									} else if (event.type === "agent_created") {
										// エージェント作成完了
										const toolId = generateToolId(
											event.data.name,
											event.data.tool || "Agent",
										);
										if (toolExecutions[toolId]) {
											toolExecutions[toolId].status = "created";
											toolExecutions[toolId].progress =
												`エージェント「${event.data.name}」が作成されました`;
										}
										setMessages((prev) =>
											prev.map((m) =>
												m.id === sessionId
													? {
															...m,
															toolExecutions: Object.values(toolExecutions),
														}
													: m,
											),
										);
									} else if (event.type === "agent_executing") {
										// エージェント実行中
										const toolId = generateToolId(event.data.name, "Agent");
										if (toolExecutions[toolId]) {
											toolExecutions[toolId].status = "executing";
											toolExecutions[toolId].progress =
												`エージェント「${event.data.name}」が実行中...`;
										} else {
											toolExecutions[toolId] = {
												toolId,
												toolName: "Agent",
												agentName: event.data.name,
												status: "executing",
												startTime: new Date(),
												progress: `エージェント「${event.data.name}」が実行中...`,
											};
										}
										setMessages((prev) =>
											prev.map((m) =>
												m.id === sessionId
													? {
															...m,
															isThinking: true,
															toolExecutions: Object.values(toolExecutions),
														}
													: m,
											),
										);
									} else if (event.type === "agent_thinking") {
										// エージェントが考え中（中間応答）
										const toolId = generateToolId(event.data.name, "Agent");
										if (toolExecutions[toolId]) {
											toolExecutions[toolId].status = "thinking";
											toolExecutions[toolId].progress =
												`エージェント「${event.data.name}」が考え中...`;
											if (event.data.delta) {
												toolExecutions[toolId].result =
													(toolExecutions[toolId].result || "") +
													event.data.delta;
											}
										} else {
											toolExecutions[toolId] = {
												toolId,
												toolName: "Agent",
												agentName: event.data.name,
												status: "thinking",
												startTime: new Date(),
												progress: `エージェント「${event.data.name}」が考え中...`,
												result: event.data.delta || "",
											};
										}
										setMessages((prev) =>
											prev.map((m) =>
												m.id === sessionId
													? {
															...m,
															isThinking: true,
															toolExecutions: Object.values(toolExecutions),
														}
													: m,
											),
										);
									} else if (event.type === "agent_completed") {
										// エージェント実行完了
										const toolId = generateToolId(event.data.name, "Agent");
										if (toolExecutions[toolId]) {
											toolExecutions[toolId].status = "completed";
											toolExecutions[toolId].endTime = new Date();
											toolExecutions[toolId].progress =
												`エージェント「${event.data.name}」の実行が完了しました`;
											if (event.data.result) {
												toolExecutions[toolId].result = event.data.result;
											}
										}
										setMessages((prev) =>
											prev.map((m) =>
												m.id === sessionId
													? {
															...m,
															isThinking: false,
															toolExecutions: Object.values(toolExecutions),
														}
													: m,
											),
										);
									} else if (event.type === "agent_updated") {
										// エージェント更新
										const toolId = generateToolId(
											event.data.name || "Agent",
											"Agent",
										);
										if (toolExecutions[toolId]) {
											toolExecutions[toolId].progress =
												event.data.message || "処理中...";
										} else {
											toolExecutions[toolId] = {
												toolId,
												toolName: "Agent",
												agentName: event.data.name || "Agent",
												status: "executing",
												startTime: new Date(),
												progress: event.data.message || "処理中...",
											};
										}
										setMessages((prev) =>
											prev.map((m) =>
												m.id === sessionId
													? {
															...m,
															isThinking: true,
															toolExecutions: Object.values(toolExecutions),
														}
													: m,
											),
										);
									} else if (event.type === "tool_called") {
										// ツール呼び出し
										const toolId = generateToolId(
											event.data.agent_name || "Agent",
											event.data.tool_name || "Tool",
										);
										toolExecutions[toolId] = {
											toolId,
											toolName: event.data.tool_name || "Tool",
											agentName: event.data.agent_name || "Agent",
											status: "executing",
											startTime: new Date(),
											progress: event.data.message || "ツールを実行中...",
											parameters: event.data.parameters,
										};
										setMessages((prev) =>
											prev.map((m) =>
												m.id === sessionId
													? {
															...m,
															isThinking: true,
															toolExecutions: Object.values(toolExecutions),
														}
													: m,
											),
										);
									} else if (event.type === "tool_completed") {
										// ツール完了
										const toolId = generateToolId(
											event.data.agent_name || "Agent",
											event.data.tool_name || "Tool",
										);
										if (toolExecutions[toolId]) {
											toolExecutions[toolId].status = "completed";
											toolExecutions[toolId].endTime = new Date();
											toolExecutions[toolId].result = event.data.result;
											toolExecutions[toolId].progress =
												event.data.message || "ツール実行完了";
										}
										setMessages((prev) =>
											prev.map((m) =>
												m.id === sessionId
													? {
															...m,
															toolExecutions: Object.values(toolExecutions),
														}
													: m,
											),
										);
									}
								} catch (_e) {
									// JSONバッファを使用してJSONを結合（不完全なJSONの場合）
									jsonBuffer += dataStr;

									// 完全なJSONかどうか簡易チェック
									if (jsonBuffer.includes("{") && jsonBuffer.includes("}")) {
										try {
											const event = JSON.parse(jsonBuffer);
											jsonBuffer = ""; // パース成功したらバッファをクリア

											// 上記と同じイベント処理をここに追加する必要があるが、
											// 簡単のため、JSONが無効な場合はデバッグログのみ出力
											console.warn("Invalid JSON recovered:", event);
										} catch (_) {
											// 完全にJSONが無効な場合はバッファをクリアして無視
											console.warn(
												"Failed to parse buffered JSON:",
												jsonBuffer,
											);
											jsonBuffer = "";
										}
									}
									// JSONが不完全またはエラーの場合は、チャットメッセージに追加しない
								}
							}
						}
					}
				}
			}
		} catch (err) {
			console.error("handleSendMessage error:", err);
			let errorMessage = "エラーが発生しました";

			// より詳細なエラーメッセージを提供
			if (err instanceof TypeError && err.message.includes("fetch")) {
				errorMessage =
					"サーバーに接続できませんでした。ネットワーク接続を確認してください。";
			} else if (err instanceof Error && err.message.includes("abort")) {
				errorMessage = "リクエストがキャンセルされました。";
			}

			setMessages((prev) =>
				prev.map((m) =>
					m.id === sessionId
						? {
								...m,
								userInput: errorMessage,
								isThinking: false,
								thinkingMessage: undefined,
							}
						: m,
				),
			);
		} finally {
			setIsProcessing(false);
		}
	};

	// Helpers for expanded toggles
	const toggleExpand = (target: "chat" | "graph") => {
		setExpanded((prev) => (prev === target ? null : target));
	};

	// Responsive layout:
	// mobile (sm): column layout; desktop (md+) row layout.
	return (
		<div
			ref={containerRef}
			className={`h-[calc(100vh-5rem)] flex flex-col-reverse md:flex-row`}
			style={{ userSelect: draggingRef.current ? "none" : undefined }}
		>
			{/* Left/top pane: ChatPanel */}
			<div
				// If chat expanded -> full screen overlay
				className={
					expanded === "chat"
						? "fixed inset-0 z-50 bg-white dark:bg-neutral-900"
						: `p-4 ${expanded === "graph" ? "hidden md:block" : ""}`
				}
				style={
					expanded === "chat"
						? undefined
						: {
								width: isMobile ? "100%" : `${leftWidth}%`,
								minWidth: "5%",
								maxWidth: "100%",
								boxSizing: "border-box",
								height: isMobile ? "70vh" : "100%",
							}
				}
			>
				<div className="h-full">
					<ChatPanel
						messages={messages}
						onSendMessage={handleSendMessage}
						isProcessing={isProcessing}
						title={
							selectedAgentId
								? (selectedAgentName ?? "エージェント")
								: "マネージャーエージェント"
						}
						isExpanded={expanded === "chat"}
						onToggleExpand={() => toggleExpand("chat")}
					/>
				</div>
			</div>

			{/* Divider (draggable) - only show when not expanded and on desktop */}
			{expanded === null && !isMobile && (
				<div
					onMouseDown={startDrag}
					className="cursor-col-resize bg-transparent hover:bg-gray-200"
					style={{
						width: 8,
						display: "flex",
						alignItems: "stretch",
						justifyContent: "center",
					}}
					aria-hidden
				>
					<div
						style={{
							width: 2,
							background: "rgba(0,0,0,0.12)",
							borderRadius: 2,
							height: "40%",
						}}
					/>
				</div>
			)}

			{/* Divider (draggable) - only show when not expanded and on desktop */}
			{expanded === null && !isMobile && (
				<div
					onMouseDown={startDrag}
					className="cursor-col-resize bg-transparent hover:bg-gray-200"
					style={{
						width: 8,
						display: "flex",
						alignItems: "stretch",
						justifyContent: "center",
					}}
					aria-hidden
				>
					<div
						style={{
							width: 2,
							background: "rgba(0,0,0,0.12)",
							borderRadius: 2,
							height: "40%",
						}}
					/>
				</div>
			)}

			{/* Right/bottom pane: AgentFlow */}
			<div
				className={
					expanded === "graph"
						? "fixed inset-0 z-50 bg-white dark:bg-neutral-900"
						: isMobile
							? "w-full p-4"
							: "w-96 p-4"
				}
				style={
					expanded === "graph"
						? undefined
						: {
								flex: 1,
								minWidth: "5%",
								boxSizing: "border-box",
								// mobile: map occupies 70% height at bottom, desktop full height
								height: isMobile ? "70vh" : "100%",
							}
				}
			>
				<div className="h-full border rounded-lg bg-white">
					<div className="p-2 border-b bg-gray-50 rounded-t-lg flex items-center justify-between">
						<div>
							<h1 className="text-lg font-semibold">エージェントマップ</h1>
							<p className="text-sm text-gray-600 hidden md:block">
								生成されたエージェントがここに表示されます
							</p>
						</div>
						<div className="ml-2">
							<Button
								type="button"
								aria-label="Expand graph"
								onClick={() => toggleExpand("graph")}
								variant="secondary"
								size="sm"
							>
								{expanded === "graph" ? "閉じる" : "拡大"}
							</Button>
						</div>
					</div>
					<div
						className={
							expanded === "graph"
								? "h-[calc(100vh-48px)]"
								: "h-[calc(100%-56px)]"
						}
					>
						<AgentFlow
							ownerId={ownerId}
							isExpanded={expanded === "graph"}
							onToggleExpand={() => toggleExpand("graph")}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
