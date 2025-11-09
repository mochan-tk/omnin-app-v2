interface AgentFlowControlsProps {
	isRefreshing: boolean;
	onRefresh: () => Promise<void>;
}

export function AgentFlowControls({
	isRefreshing,
	onRefresh,
}: AgentFlowControlsProps) {
	return (
		<div className="absolute top-1 right-1 z-10 flex items-center space-x-2">
			<button
				type="button"
				onClick={onRefresh}
				disabled={isRefreshing}
				title="エージェントマップの更新"
				className="bg-white text-sm px-2 py-1 rounded shadow"
			>
				{isRefreshing ? "更新中..." : "エージェントマップの更新"}
			</button>
		</div>
	);
}

export default AgentFlowControls;
