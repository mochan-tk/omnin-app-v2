export function toSnake(obj: unknown): unknown {
	if (Array.isArray(obj)) {
		return obj.map(toSnake);
	}
	if (isPlainObject(obj)) {
		const res: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
			res[toSnakeKey(k)] = toSnake(v);
		}
		return res;
	}
	return obj;
}

export function toCamel(obj: unknown): unknown {
	if (Array.isArray(obj)) {
		return obj.map(toCamel);
	}
	if (isPlainObject(obj)) {
		const res: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
			res[toCamelKey(k)] = toCamel(v);
		}
		return res;
	}
	return obj;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return (
		value !== null &&
		typeof value === "object" &&
		!Array.isArray(value) &&
		!(value instanceof Date)
	);
}

function toSnakeKey(key: string): string {
	return key.replace(/([A-Z])/g, "_$1").toLowerCase();
}

function toCamelKey(key: string): string {
	return key.replace(/_([a-z0-9])/g, (_m, p1) => p1.toUpperCase());
}
