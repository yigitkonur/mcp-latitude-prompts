/**
 * Latitude API Client
 * Based on OpenAPI spec v1.0.2 at https://gateway.latitude.so
 *
 * Endpoints used:
 * - GET  /projects/:id/versions/:uuid/documents - list documents
 * - GET  /projects/:id/versions/:uuid/documents/:path - get document
 * - POST /projects/:id/versions/:uuid/push - push changes (atomic create+publish)
 * - POST /projects/:id/versions/:uuid/documents/run - run document
 */

import { createHash } from 'crypto';
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
import { scan, CompileError } from 'promptl-ai';

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
		const body = options.body && method === 'POST'
			? { ...options.body, __internal: { source: 'api' } }
			: options.body;
		
		const response = await fetch(url, {
			method,
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				Authorization: `Bearer ${apiKey}`,
			},
			body: body ? JSON.stringify(body) : undefined,
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			const errorText = await response.text();
			let errorData: LatitudeError;

			try {
				const parsed = JSON.parse(errorText);
				const { name, errorCode, code, message, ...rest } = parsed;
				errorData = {
					name: name || 'APIError',
					errorCode: errorCode || code || `HTTP_${response.status}`,
					message: message || `HTTP ${response.status}`,
					details: Object.keys(rest).length > 0 ? rest : undefined,
				};
			} catch {
				errorData = {
					name: 'HTTPError',
					errorCode: `HTTP_${response.status}`,
					message: errorText || `HTTP ${response.status}`,
				};
			}

			logger.debug(`API error response: ${errorText}`);
			throw new LatitudeApiError(errorData, response.status, errorText);
		}

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
	public readonly rawResponse?: string;

	constructor(error: LatitudeError, statusCode: number, rawResponse?: string) {
		super(error.message);
		this.name = error.name;
		this.errorCode = error.errorCode;
		this.statusCode = statusCode;
		this.details = error.details;
		this.rawResponse = rawResponse;
	}

	getDetailedErrors(): string[] {
		const errors: string[] = [];
		
		if (!this.details) return errors;

		if (Array.isArray(this.details.errors)) {
			for (const err of this.details.errors) {
				if (typeof err === 'string') {
					errors.push(err);
				} else if (err && typeof err === 'object') {
					const errObj = err as Record<string, unknown>;
					const msg = errObj.message || errObj.error || errObj.detail || JSON.stringify(err);
					const path = errObj.path || errObj.document || errObj.name || '';
					errors.push(path ? `${path}: ${msg}` : String(msg));
				}
			}
		}

		if (this.details.documents && typeof this.details.documents === 'object') {
			const docs = this.details.documents as Record<string, unknown>;
			for (const [docPath, docInfo] of Object.entries(docs)) {
				if (docInfo && typeof docInfo === 'object') {
					const info = docInfo as Record<string, unknown>;
					if (info.error || info.errors) {
						const docErrors = info.errors || [info.error];
						for (const e of Array.isArray(docErrors) ? docErrors : [docErrors]) {
							errors.push(`${docPath}: ${typeof e === 'string' ? e : JSON.stringify(e)}`);
						}
					}
				}
			}
		}

		if (this.details.validationErrors && typeof this.details.validationErrors === 'object') {
			const valErrors = this.details.validationErrors as Record<string, unknown>;
			for (const [field, fieldErrors] of Object.entries(valErrors)) {
				if (Array.isArray(fieldErrors)) {
					for (const fe of fieldErrors) {
						errors.push(`${field}: ${typeof fe === 'string' ? fe : JSON.stringify(fe)}`);
					}
				} else {
					errors.push(`${field}: ${typeof fieldErrors === 'string' ? fieldErrors : JSON.stringify(fieldErrors)}`);
				}
			}
		}

		if (this.details.cause) {
			const cause = this.details.cause;
			if (typeof cause === 'string') {
				errors.push(cause);
			} else if (typeof cause === 'object') {
				const causeObj = cause as Record<string, unknown>;
				if (causeObj.message) {
					errors.push(String(causeObj.message));
				} else {
					errors.push(JSON.stringify(cause));
				}
			}
		}

		return errors;
	}

	toMarkdown(): string {
		let md = `## ❌ Error: ${this.name}\n\n`;
		md += `**Code:** \`${this.errorCode}\`\n\n`;
		md += `**Message:** ${this.message}\n`;

		if (this.statusCode) {
			md += `\n**HTTP Status:** ${this.statusCode}\n`;
		}

		const detailedErrors = this.getDetailedErrors();
		if (detailedErrors.length > 0) {
			md += `\n**Detailed Errors (${detailedErrors.length}):**\n`;
			for (const err of detailedErrors) {
				md += `- ${err}\n`;
			}
		}

		if (this.details && Object.keys(this.details).length > 0) {
			md += `\n**API Response Details:**\n\`\`\`json\n${JSON.stringify(this.details, null, 2)}\n\`\`\`\n`;
		}

		if (this.rawResponse && this.rawResponse !== JSON.stringify(this.details)) {
			md += `\n**Raw API Response:**\n\`\`\`json\n${this.rawResponse}\n\`\`\`\n`;
		}

		return md;
	}

	getConciseMessage(): string {
		const detailed = this.getDetailedErrors();
		if (detailed.length > 0) {
			return detailed.join('; ');
		}
		if (this.details && Object.keys(this.details).length > 0) {
			return `${this.message} | Details: ${JSON.stringify(this.details)}`;
		}
		if (this.rawResponse) {
			const snippet = this.rawResponse.length > 200 
				? this.rawResponse.substring(0, 200) + '...' 
				: this.rawResponse;
			return `${this.message} | Raw: ${snippet}`;
		}
		return this.message;
	}
}

// ============================================================================
// API Functions
// ============================================================================

export function getProjectId(): string {
	return getConfig().projectId;
}

export async function listDocuments(
	versionUuid: string = 'live'
): Promise<Document[]> {
	const projectId = getProjectId();
	try {
		return await request<Document[]>(
			`/projects/${projectId}/versions/${versionUuid}/documents`
		);
	} catch (error) {
		if (
			error instanceof LatitudeApiError &&
			error.statusCode === 404 &&
			versionUuid === 'live'
		) {
			logger.info('No LIVE version exists yet (new project) - treating as empty');
			return [];
		}
		throw error;
	}
}

export function computeContentHash(content: string): string {
	return createHash('sha256').update(content).digest('hex');
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

export function normalizePath(path: string): string {
	return path
		.trim()
		.replace(/^\/+/, '')
		.replace(/\/+$/, '')
		.replace(/\/+/g, '/');
}

export function computeDiff(
	incoming: Array<{ path: string; content: string }>,
	existing: Document[]
): DocumentChange[] {
	const changes: DocumentChange[] = [];
	
	const existingMap = new Map(
		existing.map((d) => [normalizePath(d.path), { path: d.path, contentHash: d.contentHash }])
	);
	const incomingPaths = new Set(
		incoming.map((p) => normalizePath(p.path))
	);

	for (const prompt of incoming) {
		const normalizedPath = normalizePath(prompt.path);
		const existingDoc = existingMap.get(normalizedPath);
		
		if (!existingDoc) {
			changes.push({
				path: prompt.path,
				content: prompt.content,
				status: 'added',
			});
		} else {
			const localHash = computeContentHash(prompt.content);
			if (existingDoc.contentHash !== localHash) {
				changes.push({
					path: existingDoc.path,
					content: prompt.content,
					status: 'modified',
				});
			}
		}
	}

	for (const [normalizedExistingPath, doc] of existingMap.entries()) {
		if (!incomingPaths.has(normalizedExistingPath)) {
			changes.push({
				path: doc.path,
				content: '',
				status: 'deleted',
			});
		}
	}

	return changes;
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

// ============================================================================
// Validation
// ============================================================================

export interface ValidationIssue {
	type: 'error' | 'warning';
	code: string;
	message: string;
	rootCause: string;
	suggestion: string;
	location?: {
		line: number;
		column: number;
	};
	codeFrame?: string;
}

const ERROR_SUGGESTIONS: Record<string, { rootCause: string; suggestion: string }> = {
	'message-tag-inside-message': {
		rootCause: 'Message/role tags (<system>, <user>, <assistant>, <tool>) cannot be nested inside each other.',
		suggestion: 'Move the nested tag outside its parent. If showing an example, use a code block (```yaml) instead of actual role tags.',
	},
	'content-tag-inside-content': {
		rootCause: 'Content tags (<text>, <image>, <file>, <tool-call>) must be directly inside message tags.',
		suggestion: 'Restructure so content tags are direct children of message tags, not nested in other content.',
	},
	'step-tag-inside-step': {
		rootCause: 'Step/response tags cannot be nested inside each other.',
		suggestion: 'Move the <response> tag outside its parent <response> tag.',
	},
	'config-not-found': {
		rootCause: 'PromptL files require a YAML configuration section at the top.',
		suggestion: 'Add config at the beginning:\n---\nprovider: openai\nmodel: gpt-4\n---',
	},
	'config-already-declared': {
		rootCause: 'Only one configuration section is allowed per file.',
		suggestion: 'Remove the duplicate --- config --- section.',
	},
	'invalid-config': {
		rootCause: 'The YAML configuration has syntax or validation errors.',
		suggestion: 'Check YAML syntax. Required fields: model. Optional: provider, temperature, schema.',
	},
	'unclosed-block': {
		rootCause: 'A tag or block was opened but never closed.',
		suggestion: 'Add the missing closing tag. Check for typos in tag names.',
	},
	'unexpected-eof': {
		rootCause: 'The file ended unexpectedly, likely due to unclosed tags or blocks.',
		suggestion: 'Ensure all opened tags ({#if}, {#each}, <system>, etc.) are properly closed.',
	},
	'variable-not-defined': {
		rootCause: 'A variable is used but not provided in parameters.',
		suggestion: 'Either pass this variable when calling the prompt, or define it with {#let}.',
	},
	'invalid-tool-call-placement': {
		rootCause: 'Tool calls (<tool-call>) can only appear inside <assistant> messages.',
		suggestion: 'Move the <tool-call> tag inside an <assistant> block.',
	},
};

export async function validatePromptLContent(content: string, path: string): Promise<ValidationIssue[]> {
	const issues: ValidationIssue[] = [];
	
	try {
		const result = await scan({
			prompt: content,
			fullPath: path,
			requireConfig: false,
		});
		
		for (const compileError of result.errors) {
			const suggestionInfo = ERROR_SUGGESTIONS[compileError.code] || {
				rootCause: compileError.message,
				suggestion: 'Review the PromptL documentation for correct syntax.',
			};
			
			issues.push({
				type: 'error',
				code: compileError.code,
				message: compileError.message,
				rootCause: suggestionInfo.rootCause,
				suggestion: suggestionInfo.suggestion,
				location: compileError.start ? {
					line: compileError.start.line,
					column: compileError.start.column,
				} : undefined,
				codeFrame: compileError.frame,
			});
		}
	} catch (err) {
		if (err instanceof CompileError) {
			const suggestionInfo = ERROR_SUGGESTIONS[err.code] || {
				rootCause: err.message,
				suggestion: 'Fix the syntax error at the indicated location.',
			};
			
			issues.push({
				type: 'error',
				code: err.code,
				message: err.message,
				rootCause: suggestionInfo.rootCause,
				suggestion: suggestionInfo.suggestion,
				location: err.start ? {
					line: err.start.line,
					column: err.start.column,
				} : undefined,
				codeFrame: err.frame,
			});
		} else {
			issues.push({
				type: 'error',
				code: 'unknown-error',
				message: err instanceof Error ? err.message : 'Unknown validation error',
				rootCause: 'An unexpected error occurred during validation.',
				suggestion: 'Check the prompt content for syntax errors.',
			});
		}
	}
	
	return issues;
}

// ============================================================================
// Push API - Draft → Push → Merge workflow
// ============================================================================

interface PushResponse {
	commitUuid: string;
	documentsProcessed?: number;
}

interface CreateVersionResponse {
	uuid: string;
	id: number;
}

/**
 * Create a new draft version based on HEAD (live).
 */
async function createDraftVersion(name?: string): Promise<CreateVersionResponse> {
	const projectId = getProjectId();
	const timestamp = Date.now();
	const versionName = name || `mcp-draft-${timestamp}`;
	logger.info(`Creating draft version: ${versionName}`);
	
	return request<CreateVersionResponse>(
		`/projects/${projectId}/versions`,
		{
			method: 'POST',
			body: { name: versionName },
		}
	);
}

/**
 * Push changes to a draft version.
 */
async function pushToVersion(
	versionUuid: string,
	changes: DocumentChange[]
): Promise<PushResponse> {
	const projectId = getProjectId();
	
	const changesPayload = changes.map((c) => ({
		path: c.path,
		content: c.content || '',
		status: c.status,
		contentHash: c.status !== 'deleted' ? computeContentHash(c.content || '') : undefined,
	}));
	
	logger.info(`Pushing ${changes.length} change(s) to version ${versionUuid}`);
	
	return request<PushResponse>(
		`/projects/${projectId}/versions/${versionUuid}/push`,
		{
			method: 'POST',
			body: { changes: changesPayload },
		}
	);
}

interface PublishResponse {
	uuid: string;
	status: string;
}

/**
 * Publish a draft version to LIVE.
 * This is the final step that makes changes visible.
 */
async function publishVersion(versionUuid: string): Promise<PublishResponse> {
	const projectId = getProjectId();
	logger.info(`Publishing version ${versionUuid} to LIVE`);
	
	return request<PublishResponse>(
		`/projects/${projectId}/versions/${versionUuid}/publish`,
		{
			method: 'POST',
			body: {},
		}
	);
}

function createNoOpVersion(): Version {
	const now = new Date().toISOString();
	return {
		id: 0,
		uuid: 'live',
		projectId: 0,
		message: 'No changes to deploy',
		createdAt: now,
		updatedAt: now,
		status: 'live',
	};
}

/**
 * Deploy changes to LIVE version using draft→push→merge workflow.
 * 
 * Workflow:
 * 1. Create a new draft version
 * 2. Push all changes to the draft
 * 3. Merge the draft to live
 */
export async function deployToLive(
	changes: DocumentChange[],
	_versionName?: string
): Promise<DeployResult> {
	if (changes.length === 0) {
		logger.info('No changes to deploy');
		return {
			version: createNoOpVersion(),
			documentsProcessed: 0,
			added: [],
			modified: [],
			deleted: [],
		};
	}

	const actualChanges = changes.filter(c => c.status !== 'unchanged');
	
	if (actualChanges.length === 0) {
		logger.info('All prompts are unchanged, nothing to deploy');
		return {
			version: createNoOpVersion(),
			documentsProcessed: 0,
			added: [],
			modified: [],
			deleted: [],
		};
	}

	const added = actualChanges.filter((c) => c.status === 'added').map((c) => c.path);
	const modified = actualChanges.filter((c) => c.status === 'modified').map((c) => c.path);
	const deleted = actualChanges.filter((c) => c.status === 'deleted').map((c) => c.path);
	
	logger.info(`Deploying to LIVE: ${added.length} added, ${modified.length} modified, ${deleted.length} deleted`);

	try {
		// Step 1: Create a draft version
		const draft = await createDraftVersion(_versionName);
		logger.info(`Created draft version: ${draft.uuid}`);
		
		// Step 2: Push changes to the draft - this creates a new committed version
		const pushResult = await pushToVersion(draft.uuid, actualChanges);
		logger.info(`Pushed changes. New commit: ${pushResult.commitUuid}`);
		
		// Step 3: Publish the committed version to LIVE
		const publishResult = await publishVersion(pushResult.commitUuid);
		logger.info(`Published to LIVE: ${publishResult.uuid}, status: ${publishResult.status}`);
		
		const now = new Date().toISOString();
		return {
			version: {
				id: draft.id,
				uuid: publishResult.uuid,
				projectId: 0,
				message: _versionName || 'MCP push',
				createdAt: now,
				updatedAt: now,
				status: 'merged',
			},
			documentsProcessed: pushResult.documentsProcessed || actualChanges.length,
			added,
			modified,
			deleted,
		};
	} catch (error) {
		if (error instanceof LatitudeApiError) {
			logger.error(`Deploy failed: ${error.message}`);
			throw error;
		}
		throw error;
	}
}
