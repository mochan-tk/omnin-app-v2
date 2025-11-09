"use client";

import type React from "react";
import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import type { ChatMessage } from "@/types";
import ToolExecutionStatus from "./ToolExecutionStatus";

export default function Messages({
	messages,
	// biome-ignore lint/correctness/noUnusedFunctionParameters: interface compatibility
	isProcessing,
}: {
	messages: ChatMessage[];
	isProcessing: boolean;
}) {
	const scrollRef = useRef<HTMLDivElement | null>(null);

	/* 自動スクロール */
	/* biome-ignore lint/correctness/useExhaustiveDependencies: false */
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [messages]);

	return (
		<div className="flex-1 overflow-y-auto min-h-0">
			<div className="p-4">
				{(messages || []).map((message) => (
					<div
						key={message.id}
						className={`mb-4 ${message.isUser ? "text-right" : "text-left"}`}
					>
						<div
							className={`
                inline-block max-w-[80%] p-3 rounded-lg text-sm
                ${
									message.isUser
										? "bg-blue-500 text-white"
										: "bg-gray-100 text-gray-800"
								}
              `}
						>
							<ToolExecutionStatus message={message} />
							<ReactMarkdown
								components={{
									a: (props: React.ComponentProps<"a">) => (
										<a {...props} target="_blank" rel="noopener noreferrer" />
									),
								}}
							>
								{String(message.userInput)}
							</ReactMarkdown>
						</div>
						<div className="text-xs text-gray-500 mt-1">
							{message.timestamp.toLocaleTimeString("ja-JP", {
								hour: "2-digit",
								minute: "2-digit",
							})}
						</div>
					</div>
				))}

				<div ref={scrollRef} />
			</div>
		</div>
	);
}
