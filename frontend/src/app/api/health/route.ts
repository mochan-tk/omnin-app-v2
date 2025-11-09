import { NextResponse } from "next/server";

export async function GET() {
	try {
		const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";
		const res = await fetch(`${backendUrl}/health`);
		const data = await res.json();
		return NextResponse.json(data, { status: res.status });
	} catch (_err) {
		return NextResponse.json(
			{ error: "failed to fetch backend /health" },
			{ status: 502 },
		);
	}
}
