"use client";

import Link from "next/link";
import type React from "react";
import { Button } from "@/components/ui";
import { useHealthStore } from "@/lib/store/health-store";

export default function Page(): React.ReactElement {
	const { health, statusCode, loading, error, checkHealth } = useHealthStore();
	return (
		<main
			style={{
				fontFamily: "var(--font-geist-sans, system-ui, sans-serif)",
				padding: 32,
			}}
		>
			<h1 style={{ marginBottom: 8 }}>API 接続確認</h1>
			<p style={{ marginTop: 0, marginBottom: 20, color: "var(--muted)" }}>
				Next.js の API 経由でバックエンドの <code>/health</code>{" "}
				を呼び出します。
			</p>

			<Button
				type="button"
				onClick={checkHealth}
				disabled={loading}
				variant="primary"
				size="md"
				style={{ marginBottom: 20 }}
			>
				{loading ? "確認中..." : "接続を確認する"}
			</Button>

			<section style={{ marginTop: 8 }}>
				{health === undefined ? (
					<div style={{ color: "var(--muted)" }}>まだ実行されていません。</div>
				) : error ? (
					<div style={{ color: "var(--error)" }}>エラー: {error}</div>
				) : (
					<div>
						<div>
							ステータスコード: <strong>{statusCode}</strong>
						</div>
						<pre
							style={{
								background: "var(--muted-bg)",
								padding: 12,
								borderRadius: 6,
								marginTop: 8,
								whiteSpace: "pre-wrap",
								wordBreak: "break-word",
								color: "var(--foreground)",
							}}
						>
							{JSON.stringify(health, null, 2)}
						</pre>
					</div>
				)}
			</section>

			<div style={{ marginTop: 20 }}>
				<Link
					href="/"
					style={{
						display: "inline-block",
						padding: "10px 16px",
						borderRadius: 6,
						border: "1px solid var(--border)",
						background: "var(--button-bg)",
						color: "var(--button-text)",
						textDecoration: "none",
						fontSize: "14px",
						fontWeight: "500",
						transition: "all 0.2s ease",
						cursor: "pointer",
					}}
				>
					チャットページへ移動
				</Link>
			</div>
		</main>
	);
}
