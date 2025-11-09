export interface ToolExecution {
	toolId: string;
	toolName: string;
	agentName: string;
	status:
		| "creating"
		| "created"
		| "executing"
		| "thinking"
		| "completed"
		| "error";
	startTime: Date;
	endTime?: Date;
	parameters?: Record<string, unknown>;
	result?: string;
	error?: string;
	progress?: string;
}

export interface ChatMessage {
	id: string;
	userInput: string;
	isUser: boolean;
	timestamp: Date;
	isThinking?: boolean;
	thinkingMessage?: string;
	toolExecutions?: ToolExecution[];
}
