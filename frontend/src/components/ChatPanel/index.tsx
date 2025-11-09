"use client";

import type { ChatMessage } from "@/types";
import Header from "./Header";
import InputBox from "./InputBox";
import Messages from "./Messages";

interface ChatPanelProps {
	messages: ChatMessage[];
	onSendMessage: (message: string) => void;
	isProcessing: boolean;
	title?: string;
	subtitle?: string;
	isExpanded?: boolean;
	onToggleExpand?: () => void;
}

export function ChatPanel({
	messages,
	onSendMessage,
	isProcessing,
	title,
}: ChatPanelProps) {
	return (
		<div className="flex flex-col h-full border rounded-lg bg-white">
			<Header title={title} />
			<Messages messages={messages} isProcessing={isProcessing} />
			<InputBox onSendMessage={onSendMessage} isProcessing={isProcessing} />
		</div>
	);
}

export default ChatPanel;
