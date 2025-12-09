/**
 * Types for Latitude MCP Server
 * Based on OpenAPI spec v1.0.2
 */

export interface LatitudeConfig {
	apiKey: string;
	projectId: string;
	baseUrl: string;
}

export interface LatitudeError {
	name: string;
	errorCode: string;
	message: string;
	details?: Record<string, unknown>;
}

export interface Version {
	id: number;
	uuid: string;
	projectId: number;
	message: string;
	createdAt: string;
	updatedAt: string;
	status: string;
}

export interface Document {
	versionUuid: string;
	uuid: string;
	path: string;
	content: string;
	config?: Record<string, unknown>;
	parameters?: Record<string, unknown>;
}

export interface DocumentChange {
	path: string;
	content: string;
	status: 'added' | 'modified' | 'deleted' | 'unchanged';
}

export interface DeployResult {
	version: Version;
	documentsProcessed: number;
	added: string[];
	modified: string[];
	deleted: string[];
}

export interface RunResult {
	uuid: string;
	conversation: Array<{
		role: string;
		content: string;
	}>;
	response: {
		text: string;
		usage?: {
			promptTokens: number;
			completionTokens: number;
			totalTokens: number;
		};
	};
}
