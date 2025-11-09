import type { ReactFlowInstance } from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";

const OWNER_CENTER = { x: 0, y: 0 };

interface UseReactFlowInstanceProps {
	viewport: {
		x: number;
		y: number;
		zoom: number;
	};
}

interface UseReactFlowInstanceReturn {
	rfInstance: ReactFlowInstance | null;
	didCenter: boolean;
	handleInit: (instance: ReactFlowInstance) => void;
	handleNodeDragStart: () => void;
	handleNodeDragStop: () => void;
	centerToOwner: () => void;
}

export function useReactFlowInstance({
	viewport,
}: UseReactFlowInstanceProps): UseReactFlowInstanceReturn {
	const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
	const rfInstanceRef = useRef<ReactFlowInstance | null>(null);
	const [didCenter, setDidCenter] = useState(false);
	const isDraggingRef = useRef(false);
	const pendingCenterOwnerRef = useRef(false);
	const ownerCenteredRef = useRef(false);
	const viewportRef = useRef(viewport);

	useEffect(() => {
		viewportRef.current = viewport;
	}, [viewport]);

	useEffect(() => {
		if (!rfInstance || didCenter) return;
		rfInstanceRef.current = rfInstance;
		try {
			rfInstance.setCenter(OWNER_CENTER.x, OWNER_CENTER.y, {
				zoom: viewportRef.current?.zoom ?? 0.6,
				duration: 250,
			});
		} catch {}

		if (pendingCenterOwnerRef.current) {
			try {
				rfInstance.setCenter(OWNER_CENTER.x, OWNER_CENTER.y, {
					zoom: viewportRef.current?.zoom ?? 0.6,
					duration: 200,
				});
			} catch {}
			pendingCenterOwnerRef.current = false;
			ownerCenteredRef.current = true;
		}
		ownerCenteredRef.current = true;
		setDidCenter(true);
	}, [rfInstance, didCenter]);

	const handleInit = useCallback((instance: ReactFlowInstance) => {
		setRfInstance(instance);
		rfInstanceRef.current = instance;
		if (pendingCenterOwnerRef.current && !isDraggingRef.current) {
			try {
				instance.setCenter(OWNER_CENTER.x, OWNER_CENTER.y, {
					zoom: viewportRef.current?.zoom ?? 0.6,
					duration: 200,
				});
			} catch {}
			pendingCenterOwnerRef.current = false;
			ownerCenteredRef.current = true;
		}
	}, []);

	const handleNodeDragStart = useCallback(() => {
		isDraggingRef.current = true;
	}, []);

	const handleNodeDragStop = useCallback(() => {
		isDraggingRef.current = false;
	}, []);

	const centerToOwner = useCallback(() => {
		const inst = rfInstanceRef.current;
		if (inst && !isDraggingRef.current) {
			try {
				inst.setCenter(OWNER_CENTER.x, OWNER_CENTER.y, {
					zoom: viewportRef.current?.zoom ?? 0.6,
					duration: 200,
				});
			} catch {}
		} else {
			pendingCenterOwnerRef.current = true;
		}
	}, []);

	return {
		rfInstance,
		didCenter,
		handleInit,
		handleNodeDragStart,
		handleNodeDragStop,
		centerToOwner,
	};
}

export default useReactFlowInstance;
