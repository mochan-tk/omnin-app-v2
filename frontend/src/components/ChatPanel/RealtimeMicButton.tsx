"use client";

import { Loader2, Mic, MicOff } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";

interface SessionState {
	isActive: boolean;
	isConnecting: boolean;
	error: string | null;
	status: string | null;
}

// マイクセッションの開始/停止 UI を制御するための初期状態。
const INITIAL_STATE: SessionState = {
	isActive: false,
	isConnecting: false,
	error: null,
	status: null,
};

// OpenAI Realtime API へ接続する際に使用する固定パラメータ。
const REALTIME_MODEL = "gpt-realtime";
const REALTIME_BASE_URL = "https://api.openai.com/v1/realtime/calls";

export function RealtimeMicButton(): React.ReactElement {
	// WebRTC セッションとボタンの表示状態をまとめて管理する。
	const [state, setState] = useState<SessionState>(INITIAL_STATE);
	// WebRTC 関連の各種ハンドルを保持し、コンポーネントの再レンダーでも再取得しないようにする。
	const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
	const dataChannelRef = useRef<RTCDataChannel | null>(null);
	const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
	const localStreamRef = useRef<MediaStream | null>(null);

	// ボタンの状態だけ初期値に戻したい場合用のヘルパー。
	const resetState = useCallback(() => {
		setState(INITIAL_STATE);
	}, []);

	// WebRTC セッションを完全に破棄し、関連リソースを解放する。
	const releaseSession = useCallback(() => {
		dataChannelRef.current?.close();
		dataChannelRef.current = null;

		if (peerConnectionRef.current) {
			peerConnectionRef.current.getSenders().forEach((sender) => {
				sender.track?.stop();
			});
			peerConnectionRef.current.close();
			peerConnectionRef.current = null;
		}

		if (localStreamRef.current) {
			localStreamRef.current.getTracks().forEach((track) => {
				track.stop();
			});
			localStreamRef.current = null;
		}

		if (remoteAudioRef.current) {
			remoteAudioRef.current.srcObject = null;
			remoteAudioRef.current.remove();
			remoteAudioRef.current = null;
		}
	}, []);

	// ボタンから停止操作が入った際にセッションと UI 状態を同時にリセットする。
	const stopSession = useCallback(() => {
		releaseSession();
		resetState();
	}, [releaseSession, resetState]);

	const startSession = useCallback(async () => {
		if (state.isConnecting || state.isActive) return;

		// ボタンを接続中表示に切り替え、過去エラーの表示を消す。
		setState((prev) => ({
			...prev,
			isConnecting: true,
			error: null,
			status: "connecting...",
		}));

		try {
			// バックエンドを経由して Realtime API 用のクライアントシークレットを取得する。
			const tokenResponse = await fetch("/api/realtime/token", {
				method: "GET",
			});
			if (!tokenResponse.ok) {
				throw new Error("トークンの取得に失敗しました");
			}

			const tokenPayload = await tokenResponse.json();
			const secretValue: string | undefined =
				tokenPayload?.clientSecret?.value ?? tokenPayload?.value;

			if (!secretValue) {
				throw new Error(
					"リアルタイムセッションのトークンが取得できませんでした",
				);
			}

			// 新しい WebRTC 接続を確立し、各種コールバックを設定する。
			const pc = new RTCPeerConnection();
			peerConnectionRef.current = pc;

			// 受信した音声を再生するための非表示 audio 要素を作成し、着信ストリームを束縛。
			const audioEl = document.createElement("audio");
			audioEl.autoplay = true;
			remoteAudioRef.current = audioEl;
			pc.ontrack = (event) => {
				const [remoteStream] = event.streams;
				if (remoteStream) {
					audioEl.srcObject = remoteStream;
				}
			};

			// マイク入力を取得し、WebRTC へ送出するためにトラックを追加する。
			const localStream = await navigator.mediaDevices.getUserMedia({
				audio: true,
			});
			localStreamRef.current = localStream;
			localStream.getAudioTracks().forEach((track) => {
				pc.addTrack(track, localStream);
			});

			// AI モデルとメッセージをやり取りするためのデータチャネルを作成。
			const dataChannel = pc.createDataChannel("oai-events");
			dataChannelRef.current = dataChannel;

			// 接続完了後、Realtime API へ最初のレスポンス生成を要求し UI を更新する。
			dataChannel.addEventListener("open", () => {
				dataChannel.send(
					JSON.stringify({
						type: "response.create",
					}),
				);
				setState({
					isActive: true,
					isConnecting: false,
					error: null,
					status: "listening...",
				});
			});

			// データチャネルが閉じられた場合はセッションを完全に破棄する。
			dataChannel.addEventListener("close", () => {
				releaseSession();
				resetState();
			});

			// データチャネルでエラーが発生したらログに残し、ユーザーへエラー表示。
			dataChannel.addEventListener("error", (event) => {
				console.error("Realtime data channel error", event);
				setState((prev) => ({
					...prev,
					error: "リアルタイム接続中にエラーが発生しました",
				}));
				releaseSession();
				resetState();
			});

			// デバッグ用にサーバーからのイベントをそのまま出力。
			dataChannel.addEventListener("message", (event) => {
				console.debug("Realtime event", event.data);

				const payload = JSON.parse(event.data);
				if (payload.type === "response.output_audio_transcript.done") {
					console.debug("Answer transcript", payload.transcript);
				}

				if (
					payload.type ===
					"conversation.item.input_audio_transcription.completed"
				) {
					console.debug("User transcript:", payload.transcript);
				}
			});

			// SDP オファーを生成してサーバーへ送信し、WebRTC 接続を確立する。
			const offer = await pc.createOffer();
			await pc.setLocalDescription(offer);

			const response = await fetch(
				`${REALTIME_BASE_URL}?model=${REALTIME_MODEL}`,
				{
					method: "POST",
					body: offer.sdp ?? "",
					headers: {
						Authorization: `Bearer ${secretValue}`,
						"Content-Type": "application/sdp",
					},
				},
			);

			if (!response.ok) {
				throw new Error(`リアルタイム接続に失敗しました (${response.status})`);
			}

			const answerSdp = await response.text();
			await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

			// 接続が完了したので UI を「接続済み」表示に切り替える。
			setState({
				isActive: true,
				isConnecting: false,
				error: null,
				status: "connected",
			});
		} catch (error) {
			console.error("Failed to start realtime session", error);
			releaseSession();
			setState({
				isActive: false,
				isConnecting: false,
				error:
					error instanceof Error ? error.message : "未知のエラーが発生しました",
				status: null,
			});
		}
	}, [releaseSession, resetState, state.isActive, state.isConnecting]);

	// コンポーネントがアンマウントされたときも WebRTC のリソースを漏らさないようにする。
	useEffect(() => {
		return () => {
			releaseSession();
		};
	}, [releaseSession]);

	const { isActive, isConnecting, error } = state;
	// const { isActive, isConnecting, error, status } = state;

	return (
		<div className="flex flex-col items-center gap-1">
			<Button
				type="button"
				variant={isActive ? "secondary" : "outline"}
				size="md"
				disabled={isConnecting}
				onClick={isActive ? stopSession : startSession}
				className="flex items-center gap-2"
			>
				{isConnecting ? (
					<Loader2 className="h-4 w-4 animate-spin" />
				) : isActive ? (
					<MicOff className="h-4 w-4" />
				) : (
					<Mic className="h-4 w-4" />
				)}
				{isConnecting ? "接続中" : isActive ? "停止" : "開始"}
			</Button>
			{/* {status && <span className="text-[0.65rem] text-gray-500">{status}</span>} */}
			{error && <span className="text-[0.65rem] text-red-500">{error}</span>}
		</div>
	);
}

export default RealtimeMicButton;
