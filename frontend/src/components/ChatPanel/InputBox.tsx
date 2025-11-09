"use client";

import type React from "react";
import { useState } from "react";
import { Button, Textarea } from "@/components/ui";
import RealtimeMicButton from "./RealtimeMicButton";

export default function InputBox({
	onSendMessage,
	isProcessing,
}: {
	onSendMessage: (message: string) => void;
	isProcessing: boolean;
}) {
	const [inputValue, setInputValue] = useState("");

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (inputValue.trim() && !isProcessing) {
			onSendMessage(inputValue.trim());
			setInputValue("");
		}
	};

	return (
		<div className="p-4 border-t bg-gray-50 flex-shrink-0 rounded-b-lg">
			<form onSubmit={handleSubmit} className="flex gap-2 items-end">
				<Textarea
					autoResize
					value={inputValue}
					onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
						setInputValue(e.target.value)
					}
					placeholder="依頼したい内容を入力してください"
					disabled={isProcessing}
					className="flex-1 min-h-[2.5rem]"
					rows={1}
				/>
				<Button
					type="submit"
					disabled={!inputValue.trim() || isProcessing}
					variant="primary"
					size="md"
				>
					送信
				</Button>
				<div className="flex-shrink-0">
					<RealtimeMicButton />
				</div>
			</form>

			<div className="mt-2 text-xs text-gray-500">
				例：XXXの会社の2025年の経営状況を分析しメールで報告してください
			</div>
		</div>
	);
}
