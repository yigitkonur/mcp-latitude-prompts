/**
 * Latitude API Client
 * Based on OpenAPI spec v1.0.2 at https://gateway.latitude.so
 *
 * Endpoints used:
 * - GET  /projects/:id/versions - list versions
 * - POST /projects/:id/versions - create version (draft)
 * - POST /projects/:id/versions/:uuid/publish - publish to LIVE
 * - GET  /projects/:id/versions/:uuid/documents - list documents
 * - GET  /projects/:id/versions/:uuid/documents/:path - get document
 * - POST /projects/:id/versions/:uuid/documents/create-or-update - create/update document
 * - POST /projects/:id/versions/:uuid/documents/run - run document
 */

import { Logger } from './utils/logger.util.js';
import { config } from './utils/config.util.js';
import type {
	LatitudeConfig,
	LatitudeError,
	Version,
	Document,
	DocumentChange,
	DeployResult,
	RunResult,
} from './types.js';

const logger = Logger.forContext('api.ts');

const DEFAULT_BASE_URL = 'https://gateway.latitude.so';
const API_VERSION = 'v3';
const API_TIMEOUT_MS = 60000;

/**
 * Get configuration from environment
 */
function getConfig(): LatitudeConfig {
	const apiKey = config.get('LATITUDE_API_KEY');
	const projectId = config.get('LATITUDE_PROJECT_ID');
	const baseUrl = config.get('LATITUDE_BASE_URL') || DEFAULT_BASE_URL;

	if (!apiKey) {
		throw new Error(
			'❌ **LATITUDE_API_KEY is required**\n\nSet it in your environment:\n```\nexport LATITUDE_API_KEY=your-api-key\n```'
		);
	}

	if (!projectId) {
		throw new Error(
			'❌ **LATITUDE_PROJECT_ID is required**\n\nSet it in your environment:\n```\nexport LATITUDE_PROJECT_ID=your-project-id\n```'
		);
	}

	return { apiKey, projectId, baseUrl };
}

interface RequestOptions {
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
	body?: unknown;
	timeout?: number;
}

/**
 * Make HTTP request to Latitude API
 */
async function request<T>(
	endpoint: string,
	options: RequestOptions = {}
): Promise<T> {
	const { apiKey, baseUrl } = getConfig();
	const url = `${baseUrl}/api/${API_VERSION}${endpoint}`;
	const method = options.method || 'GET';

	const controller = new AbortController();
	const timeoutId = setTimeout(
		() => controller.abort(),
		options.timeout || API_TIMEOUT_MS
	);

	logger.debug(`API ${method} ${endpoint}`);

	try {
		const response = await fetch(url, {
			method,
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				Authorization: `Bearer ${apiKey}`,
			},
			body: options.body ? JSON.stringify(options.body) : undefined,
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			const errorText = await response.text();
			let errorData: LatitudeError;

			try {
				errorData = JSON.parse(errorText);
			} catch {
				errorData = {
					name: 'HTTPError',
					errorCode: `HTTP_${response.status}`,
					message: errorText || `HTTP ${response.status}`,
				};
			}

			throw new LatitudeApiError(errorData, response.status);
		}

		// Handle empty responses
		const contentLength = response.headers.get('content-length');
		if (contentLength === '0' || response.status === 204) {
			return {} as T;
		}

		return (await response.json()) as T;
	} catch (error) {
		clearTimeout(timeoutId);

		if (error instanceof LatitudeApiError) {
			throw error;
		}

		if (error instanceof Error && error.name === 'AbortError') {
			throw new LatitudeApiError(
				{
					name: 'TimeoutError',
					errorCode: 'TIMEOUT',
					message: `Request timed out after ${(options.timeout || API_TIMEOUT_MS) / 1000}s`,
				},
				408
			);
		}

		throw new LatitudeApiError(
			{
				name: 'NetworkError',
				errorCode: 'NETWORK_ERROR',
				message: error instanceof Error ? error.message : 'Network error',
			},
			0
		);
	}
}

// ============================================================================
// Error Class
// ============================================================================

export class LatitudeApiError extends Error {
	public readonly errorCode: string;
	public readonly statusCode: number;
	public readonly details?: Record<string, unknown>;

	constructor(error: LatitudeError, statusCode: number) {
		super(error.message);
		this.name = error.name;
		this.errorCode = error.errorCode;
		this.statusCode = statusCode;
		this.details = error.details;
	}

	toMarkdown(): string {
		let md = `## ❌ Error: ${this.name}\n\n`;
		md += `**Code:** \`${this.errorCode}\`\n\n`;
		md += `**Message:** ${this.message}\n`;

		if (this.statusCode) {
			md += `\n**HTTP Status:** ${this.statusCode}\n`;
		}

		if (this.details && Object.keys(this.details).length > 0) {
			md += `\n**Details:**\n\`\`\`json\n${JSON.stringify(this.details, null, 2)}\n\`\`\`\n`;
		}

		return md;
	}
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get project ID from config
 */
export function getProjectId(): string {
	return getConfig().projectId;
}

export async function listVersions(): Promise<Version[]> {
	const projectId = getProjectId();
	return request<Version[]>(`/projects/${projectId}/versions`);
}

export async function createVersion(name: string): Promise<Version> {
	const projectId = getProjectId();
	return request<Version>(`/projects/${projectId}/versions`, {
		method: 'POST',
		body: { name },
	});
}

export async function publishVersion(versionUuid: string, title?: string): Promise<Version> {
	const projectId = getProjectId();
	logger.debug(`Publishing version ${versionUuid} with title: ${title || '(none)'}`);
	return request<Version>(
		`/projects/${projectId}/versions/${versionUuid}/publish`,
		{
			method: 'POST',
			body: title ? { title } : {},
		}
	);
}

export async function listDocuments(
	versionUuid: string = 'live'
): Promise<Document[]> {
	const projectId = getProjectId();
	return request<Document[]>(
		`/projects/${projectId}/versions/${versionUuid}/documents`
	);
}

export async function getDocument(
	path: string,
	versionUuid: string = 'live'
): Promise<Document> {
	const projectId = getProjectId();
	const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
	return request<Document>(
		`/projects/${projectId}/versions/${versionUuid}/documents/${normalizedPath}`
	);
}

export async function createOrUpdateDocument(
	versionUuid: string,
	path: string,
	content: string
): Promise<Document> {
	const projectId = getProjectId();
	logger.debug(`Creating/updating document: ${path} (${content.length} chars)`);
	return request<Document>(
		`/projects/${projectId}/versions/${versionUuid}/documents/create-or-update`,
		{
			method: 'POST',
			body: { path, prompt: content },
		}
	);
}

export async function deleteDocument(
	versionUuid: string,
	path: string
): Promise<void> {
	const projectId = getProjectId();
	const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
	await request<void>(
		`/projects/${projectId}/versions/${versionUuid}/documents/${normalizedPath}`,
		{ method: 'DELETE' }
	);
}

export async function runDocument(
	path: string,
	parameters?: Record<string, unknown>,
	versionUuid: string = 'live'
): Promise<RunResult> {
	const projectId = getProjectId();
	return request<RunResult>(
		`/projects/${projectId}/versions/${versionUuid}/documents/run`,
		{
			method: 'POST',
			body: {
				path,
				parameters: parameters || {},
				stream: false,
			},
			timeout: API_TIMEOUT_MS,
		}
	);
}

/**
 * Format timestamp in San Francisco time: "14 Jan 2025 - 13:11"
 * Optionally prepend action prefix like "append research-validate"
 */
function formatSFTimestamp(prefix?: string): string {
	const now = new Date();
	const options: Intl.DateTimeFormatOptions = {
		timeZone: 'America/Los_Angeles',
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	};
	const formatted = now.toLocaleString('en-US', options);
	// "Jan 14, 2025, 13:11" → "14 Jan 2025 - 13:11"
	const match = formatted.match(/(\w+)\s+(\d+),\s+(\d+),\s+(\d+:\d+)/);
	let timestamp = match 
		? `${match[2]} ${match[1]} ${match[3]} - ${match[4]}`
		: now.toISOString().replace(/[:.]/g, '-');
	
	if (prefix) {
		return `${prefix} (${timestamp})`;
	}
	return timestamp;
}

/**
 * Push changes to a version using the push endpoint
 */
async function pushChangesToVersion(
	versionUuid: string,
	changes: DocumentChange[]
): Promise<void> {
	const projectId = getProjectId();
	const apiChanges = changes.map((c) => ({
		path: c.path,
		content: c.content,
		status: c.status,
	}));
	
	logger.debug(`Pushing ${changes.length} change(s) to version ${versionUuid}`);
	await request<void>(
		`/projects/${projectId}/versions/${versionUuid}/push`,
		{
			method: 'POST',
			body: { changes: apiChanges },
		}
	);
}

/**
 * Deploy changes to LIVE version
 * Creates a draft → pushes changes → publishes to LIVE
 */
export async function deployToLive(
	changes: DocumentChange[],
	versionName?: string
): Promise<DeployResult> {
	const name = versionName || formatSFTimestamp();

	// Step 1: Create a new draft version
	logger.info(`Creating draft: ${name}`);
	const version = await createVersion(name);

	// Step 2: Push all changes to the draft using the push endpoint
	logger.info(`Pushing ${changes.length} change(s) to draft...`);
	await pushChangesToVersion(version.uuid, changes);

	// Step 3: Publish the draft to LIVE
	logger.info(`Publishing version ${version.uuid} to LIVE with title: ${name}`);
	const published = await publishVersion(version.uuid, name);
	logger.info(`Published! Version is now LIVE: ${published.uuid}`);

	// Categorize changes for return value
	const added = changes.filter((c) => c.status === 'added').map((c) => c.path);
	const modified = changes.filter((c) => c.status === 'modified').map((c) => c.path);
	const deleted = changes.filter((c) => c.status === 'deleted').map((c) => c.path);

	return {
		version: published,
		documentsProcessed: changes.length,
		added,
		modified,
		deleted,
	};
}

export async function getPromptNames(): Promise<string[]> {
	try {
		const docs = await listDocuments('live');
		return docs.map((doc) => doc.path);
	} catch (error) {
		logger.warn('Failed to fetch prompt names', error);
		return [];
	}
}
