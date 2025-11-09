export interface HealthResponse {
	status: string;
}

export class Health {
	constructor(public status: string) {}
}
