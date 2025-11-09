"use client";

import { create } from "zustand";

type AgentChatStore = {
	selectedAgentId: string | null;
	selectedAgentName: string | null;
	openChatAt: number | null;
	noticeMessage: string | null;
	setSelectedAgent: (id: string | null, name?: string | null) => void;
	clearSelectedAgent: () => void;
	openChatWithAgent: (id: string, name?: string | null) => void;
	setNoticeMessage: (msg: string | null) => void;
};

export const useAgentChatStore = create<AgentChatStore>((set) => ({
	selectedAgentId: null,
	selectedAgentName: null,
	openChatAt: null,
	noticeMessage: null,
	setSelectedAgent: (id, name = null) =>
		set({ selectedAgentId: id, selectedAgentName: name ?? null }),
	clearSelectedAgent: () =>
		set({
			selectedAgentId: null,
			selectedAgentName: null,
			openChatAt: null,
			noticeMessage: null,
		}),
	openChatWithAgent: (id, name = null) =>
		set((_state) => {
			const newState = {
				selectedAgentId: id,
				selectedAgentName: name ?? null,
				openChatAt: Date.now(),
				noticeMessage: name
					? `${name}のエージェントを設定しました！`
					: "エージェントを設定しました！",
			};
			// 自動で通知をクリア（4秒後）
			if (typeof window !== "undefined") {
				window.setTimeout(() => {
					set({ noticeMessage: null });
				}, 4000);
			}
			return newState;
		}),
	setNoticeMessage: (msg: string | null) => set({ noticeMessage: msg }),
}));
