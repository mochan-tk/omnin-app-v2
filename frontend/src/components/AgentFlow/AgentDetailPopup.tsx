"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { GeneratedAgentsEndpoint } from "@/lib/api/endpoints/generatedAgents";
import type { GeneratedAgent } from "@/lib/api/types/generatedAgent";
import { useAgentChatStore } from "@/lib/store/agent-chat-store";

interface Anchor {
	x: number;
	y: number;
}

interface Props {
	agent: GeneratedAgent;
	anchor: Anchor; // 互換性維持のため残す（オーバーレイでは未使用）
	onClose: () => void;
	onStartChat?: () => void;
	onNavigate?: (dir: -1 | 1) => void;
	disablePrev?: boolean;
	disableNext?: boolean;
}

/**
 * AgentDetailPopup
 * - 画面全体を覆う fixed オーバーレイ modal に変更
 * - 親コンポーネントでの横ノード移動を onNavigate(-1|1) で要求する
 */
export default function AgentDetailPopup({
	agent,
	anchor: _anchor,
	onClose,
	onStartChat,
	onNavigate,
	disablePrev = false,
	disableNext = false,
}: Props) {
	const [expanded, setExpanded] = useState(false);
	const [loadingMessages, setLoadingMessages] = useState(false);
	const [messages, setMessages] = useState<
		{
			id: string;
			agentId: string;
			sessionId: string;
			role: "user" | "assistant";
			content: string;
			createdAt: string;
		}[]
	>([]);

	const openChatWithAgent = useAgentChatStore((s) => s.openChatWithAgent);

	// biome-ignore lint/correctness/useExhaustiveDependencies: false
	useEffect(() => {
		// agent が変わったら state をリセット
		setExpanded(false);
		setMessages([]);
	}, [agent.id]);

	const loadMessages = async () => {
		setLoadingMessages(true);
		try {
			const { body } = await GeneratedAgentsEndpoint.listMessages({
				id: agent.id,
			});
			setMessages(body);
			setExpanded(true);
		} catch (e) {
			console.error("AgentDetailPopup: failed to load messages", e);
		} finally {
			setLoadingMessages(false);
		}
	};

	// キーボードショートカット: Esc で閉じる、←/→ で prev/next 要求
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			} else if (e.key === "ArrowLeft") {
				if (onNavigate && !disablePrev) onNavigate(-1);
			} else if (e.key === "ArrowRight") {
				if (onNavigate && !disableNext) onNavigate(1);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onClose, onNavigate, disablePrev, disableNext]);

	return (
		<div className="fixed inset-0 z-50 h-max-[calc(40vh-1rem)] flex items-center justify-center">
			{/* backdrop */}
			<div
				className="absolute inset-0 bg-black/40"
				onClick={onClose}
				aria-hidden="true"
			/>

			{/* modal card */}
			<div
				role="dialog"
				aria-modal="true"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e: React.KeyboardEvent) => e.stopPropagation()}
				className="relative bg-white border rounded-lg shadow-lg p-3 text-sm w-full max-w-[80vw] max-h-[80vh] mx-4 overflow-hidden"
			>
				<div className="flex items-start justify-between gap-2">
					<div>
						<div className="text-xl font-bold text-gray-800">
							{agent.name} エージェント
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 ml-2"
						aria-label="close"
					>
						×
					</button>
				</div>

				{/* ツール（チップ） */}
				{agent.tool ? (
					<div className="mt-2">
						<div className="inline-flex gap-2 flex-wrap">
							<span className="px-2 py-1 rounded-full bg-gray-100 text-xs text-gray-700 border">
								{agent.tool}
							</span>
						</div>
					</div>
				) : null}

				{/* インストラクション（ラベル名変更） */}
				<div className="mt-3">
					<div className="text-xs text-gray-500 font-medium">
						インストラクション
					</div>
					<div className="mt-1 whitespace-pre-wrap text-sm text-gray-700 max-h-28 overflow-auto border rounded p-2 bg-gray-50">
						{agent.instruction}
					</div>
				</div>

				{/* チャット起動ボタン */}
				<div className="mt-3 flex justify-end">
					<button
						type="button"
						onClick={() => {
							if (typeof onStartChat === "function") {
								try {
									onStartChat();
								} catch (_e) {
									// noop - protect caller
								}
							}
							openChatWithAgent(agent.id, agent.name);
							onClose();
						}}
						className="px-3 py-2 text-sm font-medium text-blue-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-100"
					>
						このエージェントでチャットする
					</button>
				</div>

				{/* 会話履歴折りたたみ */}
				<div className="mt-3">
					<button
						type="button"
						onClick={() => {
							if (!expanded) void loadMessages();
							else setExpanded(false);
						}}
						className="text-xs text-blue-600 hover:underline"
					>
						{expanded
							? "会話履歴を閉じる"
							: loadingMessages
								? "読み込み中..."
								: "会話履歴を表示"}
					</button>

					{expanded ? (
						<div className="mt-2 overflow-auto space-y-2 max-h-[60vh]">
							{messages.length === 0 ? (
								<div className="text-xs text-gray-500">
									会話履歴がありません
								</div>
							) : (
								messages.map((m) => (
									<div
										key={m.id}
										className={`p-2 rounded ${
											m.role === "user"
												? "bg-blue-50 self-end text-right"
												: "bg-gray-100"
										}`}
									>
										<div className="text-xs text-gray-600">
											{new Date(m.createdAt).toLocaleString()}
										</div>
										<div className="text-sm text-gray-800 whitespace-pre-wrap">
											{m.content}
										</div>
									</div>
								))
							)}
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}
