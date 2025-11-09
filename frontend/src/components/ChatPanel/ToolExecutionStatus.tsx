"use client";

import type React from "react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { ChatMessage, ToolExecution } from "@/types";

function getStatusText(status: ToolExecution["status"]): string {
	switch (status) {
		case "creating":
			return "作成中";
		case "created":
			return "作成完了";
		case "executing":
			return "実行中";
		case "thinking":
			return "処理中";
		case "completed":
			return "完了";
		case "error":
			return "エラー";
		default:
			return "不明";
	}
}

interface ToolExecutionStatusProps {
	message: ChatMessage;
}

export default function ToolExecutionStatus({
	message,
}: ToolExecutionStatusProps) {
	const [expandedThinking, setExpandedThinking] = useState<boolean>(false);

	const toggleThinking = () => {
		setExpandedThinking((prev) => !prev);
	};

	if (!message.thinkingMessage && !message.toolExecutions?.length) {
		return null;
	}

	return (
		<div
			className={`text-xs text-gray-500 italic mb-2 rounded ${
				message.isThinking
					? "bg-blue-50 border-l-2 border-blue-300"
					: "bg-gray-50"
			}`}
		>
			{/* 折りたたみ可能なヘッダー */}
			<button
				type="button"
				className="w-full p-2 cursor-pointer hover:bg-gray-100 rounded flex items-center justify-between"
				onClick={toggleThinking}
				aria-expanded={expandedThinking}
				aria-label={`ツール実行詳細を${
					expandedThinking ? "折りたたむ" : "展開する"
				}`}
			>
				<div className="flex items-center gap-2">
					{message.isThinking && (
						<div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
					)}
					<span
						className={
							message.isThinking ? "text-blue-600 font-medium" : "text-gray-600"
						}
					>
						{message.isThinking ? "実行中" : "実行詳細"}
					</span>
				</div>
				<div className="flex items-center gap-1">
					<span className="text-xs text-gray-400">
						{expandedThinking ? "折りたたむ" : "詳細を表示"}
					</span>
					<svg
						className={`w-3 h-3 transition-transform duration-200 ${
							expandedThinking ? "rotate-90" : ""
						}`}
						fill="currentColor"
						viewBox="0 0 20 20"
						aria-hidden="true"
					>
						<title>展開/折りたたみアイコン</title>
						<path
							fillRule="evenodd"
							d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
							clipRule="evenodd"
						/>
					</svg>
				</div>
			</button>

			{/* 折りたたみ可能なコンテンツ */}
			{expandedThinking && (
				<div className="px-2 pb-2 border-t border-gray-200">
					{message.thinkingMessage && (
						<div className="mt-2 text-gray-700">{message.thinkingMessage}</div>
					)}

					{/* 新フォーマット（複数ツール実行）の表示 */}
					{message.toolExecutions?.map((toolExec) => (
						<div key={toolExec.toolId} className="mt-3 first:mt-2">
							<div
								className={`p-2 rounded text-xs ${
									toolExec.status === "executing" ||
									toolExec.status === "thinking"
										? "bg-blue-50 border border-blue-200"
										: toolExec.status === "completed"
											? "bg-green-50 border border-green-200"
											: toolExec.status === "error"
												? "bg-red-50 border border-red-200"
												: "bg-gray-50 border border-gray-200"
								}`}
							>
								<div className="flex items-center gap-2 mb-1">
									{(toolExec.status === "executing" ||
										toolExec.status === "thinking") && (
										<div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
									)}
									{toolExec.status === "completed" && (
										<div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
									)}
									{toolExec.status === "error" && (
										<div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
									)}
									<strong>
										{toolExec.agentName} - {toolExec.toolName}
									</strong>
									<span className="text-gray-500">
										({getStatusText(toolExec.status)})
									</span>
								</div>
								<div className="text-gray-600 mb-1">{toolExec.progress}</div>

								{toolExec.parameters && (
									<div className="mb-1">
										<strong>パラメータ:</strong>
										<pre className="mt-1 text-xs bg-white p-1 rounded overflow-x-auto">
											{JSON.stringify(toolExec.parameters, null, 2)}
										</pre>
									</div>
								)}

								{toolExec.result && (
									<div className="mb-1">
										<strong>結果:</strong>
										<div className="mt-1 prose prose-sm max-w-none text-gray-700">
											<ReactMarkdown
												components={{
													a: (props: React.ComponentProps<"a">) => (
														<a
															{...props}
															target="_blank"
															rel="noopener noreferrer"
														/>
													),
												}}
											>
												{toolExec.result}
											</ReactMarkdown>
										</div>
									</div>
								)}

								{toolExec.error && (
									<div className="mb-1 text-red-600">
										<strong>エラー:</strong>
										<div className="mt-1">{toolExec.error}</div>
									</div>
								)}

								<div className="text-xs text-gray-400 flex justify-between">
									<span>開始: {toolExec.startTime.toLocaleTimeString()}</span>
									{toolExec.endTime && (
										<span>
											実行時間:{" "}
											{Math.round(
												(toolExec.endTime.getTime() -
													toolExec.startTime.getTime()) /
													1000,
											)}
											秒
										</span>
									)}
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
