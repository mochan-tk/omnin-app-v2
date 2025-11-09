import { Handle, Position } from "@xyflow/react";
import { Bot } from "lucide-react";
import { memo } from "react";
import styles from "./agent-node.module.css";

type AgentStatus = "idle" | "running" | "done" | "error";

interface AgentNodeProps {
	id: string;
	data: {
		label: string;
		name?: string;
		highlighted?: boolean;
		status?: AgentStatus;
		lastUpdated?: string;
		isForeign?: boolean;
		// optional realtime info filled by SSE handlers
		progress?: number; // 0.0 - 1.0
		step?: string | undefined;
		decisionLogs?: unknown[];
	};
	selected: boolean;
}

const AgentNode = ({ id, data, selected }: AgentNodeProps) => {
	const isForeign = data.isForeign === true;
	const agentName = data.name || data.label || "Agent";
	const isHighlighted = !!data.highlighted;
	const isClicked = selected;

	// progress ring variables
	const rawProgress = data.progress;
	const progress =
		typeof rawProgress === "number"
			? Math.max(0, Math.min(1, rawProgress))
			: undefined;

	return (
		<div className="relative flex flex-col items-center">
			<Handle type="target" position={Position.Left} id={`${id}-t-left`} />
			<Handle type="source" position={Position.Left} id={`${id}-s-left`} />
			<Handle type="target" position={Position.Right} id={`${id}-t-right`} />
			<Handle type="source" position={Position.Right} id={`${id}-s-right`} />
			<Handle type="target" position={Position.Top} id={`${id}-t-top`} />
			<Handle type="source" position={Position.Top} id={`${id}-s-top`} />
			<Handle type="target" position={Position.Bottom} id={`${id}-t-bottom`} />
			<Handle type="source" position={Position.Bottom} id={`${id}-s-bottom`} />
			{/* ステータスバッジは一時的に非表示 */}
			{/* （要望により表示しないため空要素に置換） */}
			<div aria-hidden className="hidden" />

			{/* 円形のノード（プログレスリングを重ねる） */}
			<div
				className={`
          relative w-16 h-16 rounded-full flex items-center justify-center
          ${
						isHighlighted
							? "bg-gradient-to-br from-emerald-400 to-emerald-600"
							: isClicked
								? isForeign
									? "bg-gradient-to-br from-orange-400 to-orange-600"
									: "bg-gradient-to-br from-indigo-400 to-indigo-600"
								: isForeign
									? "bg-gradient-to-br from-orange-400 to-orange-600"
									: "bg-gradient-to-br from-blue-400 to-blue-600"
					}
          border-4 transition-all duration-200
          ${
						isHighlighted
							? "border-emerald-300 shadow-lg scale-110"
							: isClicked
								? isForeign
									? "border-orange-300 shadow-lg scale-110"
									: "border-indigo-300 shadow-lg scale-110"
								: isForeign
									? "border-orange-300 shadow-md hover:scale-105"
									: "border-white shadow-md hover:scale-105"
					}
          ${styles.animatePopIn} ${isHighlighted ? styles.animatePulseSlow : ""}
        `}
			>
				{/* progress ring (SVG) */}
				{progress !== undefined ? (
					<svg
						className="absolute inset-0 w-full h-full"
						viewBox="0 0 64 64"
						aria-hidden="true"
					>
						<title>Progress ring</title>
						<circle
							cx="32"
							cy="32"
							r="28"
							stroke="rgba(255,255,255,0.18)"
							strokeWidth="4"
							fill="none"
						/>
						<circle
							cx="32"
							cy="32"
							r="28"
							stroke="white"
							strokeWidth="4"
							fill="none"
							strokeLinecap="round"
							transform="rotate(-90 32 32)"
							strokeDasharray={String(2 * Math.PI * 28)}
							strokeDashoffset={String((1 - progress) * 2 * Math.PI * 28)}
							style={{ transition: "stroke-dashoffset 200ms linear" }}
						/>
					</svg>
				) : null}

				<Bot size={24} className="text-white" strokeWidth={2} />
			</div>

			{/* エージェント名（浮いているスタイル） */}
			<div className="absolute -bottom-12 px-3 py-1 bg-white rounded-full shadow-lg border border-gray-200">
				<span className="text-xs font-medium text-gray-700 whitespace-nowrap">
					{agentName}
				</span>
			</div>
		</div>
	);
};

export default memo(AgentNode);
