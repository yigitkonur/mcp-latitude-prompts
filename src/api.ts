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
		// Add __internal: { source: 'api' } to all POST requests (required by Latitude API)
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
				// Capture the ENTIRE parsed response as details
				// This ensures we never lose any error information from the API
				const { name, errorCode, code, message, ...rest } = parsed;
				errorData = {
					name: name || 'APIError',
					errorCode: errorCode || code || `HTTP_${response.status}`,
					message: message || `HTTP ${response.status}`,
					// Store ALL remaining fields as details
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
	public readonly rawResponse?: string;

	constructor(error: LatitudeError, statusCode: number, rawResponse?: string) {
		super(error.message);
		this.name = error.name;
		this.errorCode = error.errorCode;
		this.statusCode = statusCode;
		this.details = error.details;
		this.rawResponse = rawResponse;
	}

	/**
	 * Extract detailed error messages from nested error structures
	 */
	getDetailedErrors(): string[] {
		const errors: string[] = [];
		
		if (!this.details) return errors;

		// Handle errors array in details
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

		// Handle documents with errors
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

		// Handle validation errors object
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

		// Handle cause field
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

		// Try to extract detailed errors first
		const detailedErrors = this.getDetailedErrors();
		if (detailedErrors.length > 0) {
			md += `\n**Detailed Errors (${detailedErrors.length}):**\n`;
			for (const err of detailedErrors) {
				md += `- ${err}\n`;
			}
		}

		// Always show details if present (structured data from API)
		if (this.details && Object.keys(this.details).length > 0) {
			md += `\n**API Response Details:**\n\`\`\`json\n${JSON.stringify(this.details, null, 2)}\n\`\`\`\n`;
		}

		// Always show raw response if available (for debugging)
		if (this.rawResponse && this.rawResponse !== JSON.stringify(this.details)) {
			md += `\n**Raw API Response:**\n\`\`\`json\n${this.rawResponse}\n\`\`\`\n`;
		}

		return md;
	}

	/**
	 * Get a concise error message suitable for per-prompt error tracking
	 */
	getConciseMessage(): string {
		const detailed = this.getDetailedErrors();
		if (detailed.length > 0) {
			return detailed.join('; ');
		}
		// If no detailed errors, include details summary if available
		if (this.details && Object.keys(this.details).length > 0) {
			return `${this.message} | Details: ${JSON.stringify(this.details)}`;
		}
		// Last resort: include raw response snippet
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

export async function getVersion(versionUuid: string): Promise<Version> {
	const projectId = getProjectId();
	return request<Version>(`/projects/${projectId}/versions/${versionUuid}`);
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
	content: string,
	force: boolean = false
): Promise<Document> {
	const projectId = getProjectId();
	logger.debug(`Creating/updating document: ${path} (${content.length} chars, force=${force})`);
	return request<Document>(
		`/projects/${projectId}/versions/${versionUuid}/documents/create-or-update`,
		{
			method: 'POST',
			body: { path, prompt: content, force },
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

/**
 * Push response from the API
 */
interface PushResponse {
	versionUuid: string;
	documentsProcessed: number;
}

/**
 * Push changes to a version in a single batch
 * This is the CLI-style push that sends all changes at once
 */
export async function pushChanges(
	versionUuid: string,
	changes: DocumentChange[]
): Promise<PushResponse> {
	const projectId = getProjectId();
	
	// Format changes for the API
	const apiChanges = changes.map((c) => ({
		path: c.path,
		content: c.content || '',
		status: c.status,
	}));
	
	logger.info(`Pushing ${changes.length} change(s) to version ${versionUuid}`);
	
	return request<PushResponse>(
		`/projects/${projectId}/versions/${versionUuid}/push`,
		{
			method: 'POST',
			body: { changes: apiChanges },
		}
	);
}

/**
 * Compute diff between incoming prompts and existing prompts
 * Returns only the changes that need to be made
 */
export function computeDiff(
	incoming: Array<{ path: string; content: string }>,
	existing: Document[]
): DocumentChange[] {
	const changes: DocumentChange[] = [];
	const existingMap = new Map(existing.map((d) => [d.path, d]));
	const incomingPaths = new Set(incoming.map((p) => p.path));

	// Check each incoming prompt
	for (const prompt of incoming) {
		const existingDoc = existingMap.get(prompt.path);
		
		if (!existingDoc) {
			// New prompt
			changes.push({
				path: prompt.path,
				content: prompt.content,
				status: 'added',
			});
		} else if (existingDoc.content !== prompt.content) {
			// Modified prompt
			changes.push({
				path: prompt.path,
				content: prompt.content,
				status: 'modified',
			});
		}
		// If content is same, no change needed (don't include in changes)
	}

	// Check for deleted prompts (exist remotely but not in incoming)
	for (const path of existingMap.keys()) {
		if (!incomingPaths.has(path)) {
			changes.push({
				path,
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

interface FailedDocument {
	path: string;
	error: string;
	code: string;           // Error code like 'message-tag-inside-message'
	rootCause: string;
	suggestion: string;
	location?: {
		line: number;
		column: number;
	};
	codeFrame?: string;     // Formatted code context with ^ indicator
}

export interface ValidationIssue {
	type: 'error' | 'warning';
	code: string;           // Error code
	message: string;
	rootCause: string;
	suggestion: string;
	location?: {
		line: number;
		column: number;
	};
	codeFrame?: string;     // Formatted code context
}

/**
 * Error code to human-readable fix suggestion mapping
 */
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

/**
 * Pre-validate PromptL content using the official promptl-ai library.
 * Returns detailed, actionable error messages with code frames.
 * EXPORTED for use by tools.ts to pre-validate before pushing.
 */
export async function validatePromptLContent(content: string, path: string): Promise<ValidationIssue[]> {
	const issues: ValidationIssue[] = [];
	
	try {
		// Use official promptl-ai scan function for validation
		const result = await scan({
			prompt: content,
			fullPath: path,
			requireConfig: false, // Don't require config for flexibility
		});
		
		// Convert CompileErrors to our ValidationIssue format
		for (const compileError of result.errors) {
			// Get human-readable suggestion based on error code
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
				codeFrame: compileError.frame, // The beautiful formatted code frame!
			});
		}
	} catch (err) {
		// Handle parse errors (thrown, not accumulated)
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
			// Unknown error - still report it
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

/**
 * Identify failing documents using binary search for efficiency.
 * For N documents, worst case is O(N log N) API calls instead of O(N).
 */
async function identifyFailingDocuments(
	changes: DocumentChange[]
): Promise<FailedDocument[]> {
	const failed: FailedDocument[] = [];
	const nonDeleteChanges = changes.filter(c => c.status !== 'deleted');
	
	if (nonDeleteChanges.length === 0) return failed;
	
	// First, run local validation to catch obvious issues without API calls
	for (const change of nonDeleteChanges) {
		if (!change.content) continue;
		
		const localIssues = await validatePromptLContent(change.content, change.path);
		const errors = localIssues.filter((i: ValidationIssue) => i.type === 'error');
		
		if (errors.length > 0) {
			const mainError = errors[0];
			failed.push({
				path: change.path,
				error: mainError.message,
				code: mainError.code,
				rootCause: mainError.rootCause,
				suggestion: mainError.suggestion,
				location: mainError.location,
				codeFrame: mainError.codeFrame,
			});
		}
	}
	
	// If we found local validation errors, return those first
	if (failed.length > 0) {
		logger.info(`Found ${failed.length} document(s) with local validation errors`);
		return failed;
	}
	
	// If local validation passed, use binary search to find API-level failures
	logger.info(`Local validation passed, testing ${nonDeleteChanges.length} document(s) against API...`);
	
	// For small batches (<=5), test individually
	if (nonDeleteChanges.length <= 5) {
		return await testDocumentsIndividually(nonDeleteChanges);
	}
	
	// For larger batches, use binary search
	return await binarySearchFailures(nonDeleteChanges);
}

/**
 * Test documents individually (for small batches)
 */
async function testDocumentsIndividually(
	changes: DocumentChange[]
): Promise<FailedDocument[]> {
	const failed: FailedDocument[] = [];
	
	for (const change of changes) {
		const result = await testSingleDocument(change);
		if (result) {
			failed.push(result);
		}
	}
	
	return failed;
}

/**
 * Test a single document and return failure details if it fails
 */
async function testSingleDocument(
	change: DocumentChange
): Promise<FailedDocument | null> {
	try {
		const testDraft = await createVersion(`val-${Date.now()}-${change.path.slice(0, 20)}`);
		await pushChanges(testDraft.uuid, [change]);
		await publishVersion(testDraft.uuid);
		return null; // Success
	} catch (error) {
		const errorMsg = error instanceof LatitudeApiError 
			? error.message 
			: (error instanceof Error ? error.message : 'Unknown error');
		
		// Try to provide better root cause based on error patterns
		let rootCause = 'The Latitude API rejected this document during publish validation.';
		let suggestion = 'Review the document content for syntax errors or invalid configuration.';
		
		if (errorMsg.includes('errors in the updated documents')) {
			rootCause = 'The document has PromptL syntax or configuration errors that passed local validation but failed server-side validation.';
			suggestion = 'Check for: 1) Invalid model/provider combination, 2) Malformed schema definition, 3) Invalid template syntax ({{ }}).';
		}
		
		// Run local validation to give more context
		if (change.content) {
			const localIssues = await validatePromptLContent(change.content, change.path);
			if (localIssues.length > 0) {
				const warnings = localIssues.filter((i: ValidationIssue) => i.type === 'warning');
				if (warnings.length > 0) {
					suggestion += `\n\nAdditional observations:\n${warnings.map((w: ValidationIssue) => `- ${w.message}: ${w.suggestion}`).join('\n')}`;
				}
			}
		}
		
		return {
			path: change.path,
			error: errorMsg,
			code: 'api-validation-error',
			rootCause,
			suggestion,
		};
	}
}

/**
 * Use binary search to efficiently find failures in large batches.
 * Splits the batch in half, tests each half, and recurses on failing halves.
 */
async function binarySearchFailures(
	changes: DocumentChange[]
): Promise<FailedDocument[]> {
	// Base case: single document
	if (changes.length === 1) {
		const result = await testSingleDocument(changes[0]);
		return result ? [result] : [];
	}
	
	// Test the entire batch first
	const batchValid = await testBatch(changes);
	if (batchValid) {
		return []; // All documents in this batch are valid
	}
	
	// Batch has failures - split and recurse
	const mid = Math.floor(changes.length / 2);
	const left = changes.slice(0, mid);
	const right = changes.slice(mid);
	
	// Test both halves in parallel
	const [leftFailures, rightFailures] = await Promise.all([
		binarySearchFailures(left),
		binarySearchFailures(right),
	]);
	
	return [...leftFailures, ...rightFailures];
}

/**
 * Test if a batch of documents can be published successfully
 */
async function testBatch(changes: DocumentChange[]): Promise<boolean> {
	try {
		const testDraft = await createVersion(`batch-val-${Date.now()}`);
		await pushChanges(testDraft.uuid, changes);
		await publishVersion(testDraft.uuid);
		return true;
	} catch {
		return false;
	}
}

/**
 * Create a synthetic Version object for no-op deploys.
 * Returns a fully populated Version with all required fields.
 */
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
 * Deploy changes to LIVE version using the proper workflow:
 * 1. Create a draft version
 * 2. Push all changes to the draft (batch)
 * 3. Publish the draft to make it LIVE
 * 
 * This is the same workflow the CLI uses, ensuring proper validation.
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

	// Filter out unchanged items (they shouldn't be sent to API)
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

	// Categorize changes for logging and return value
	const added = actualChanges.filter((c) => c.status === 'added').map((c) => c.path);
	const modified = actualChanges.filter((c) => c.status === 'modified').map((c) => c.path);
	const deleted = actualChanges.filter((c) => c.status === 'deleted').map((c) => c.path);
	
	logger.info(`Deploying to LIVE: ${added.length} added, ${modified.length} modified, ${deleted.length} deleted`);

	// Step 1: Create a new draft version
	const draftName = `MCP deploy ${new Date().toISOString()}`;
	logger.info(`Creating draft version: ${draftName}`);
	const draft = await createVersion(draftName);
	logger.info(`Draft created: ${draft.uuid}`);

	// Step 2: Push all changes to the draft in ONE batch
	logger.info(`Pushing ${actualChanges.length} change(s) to draft...`);
	const pushResult = await pushChanges(draft.uuid, actualChanges);
	logger.info(`Push complete: ${pushResult.documentsProcessed} documents processed`);

	// Step 3: Publish the draft to make it LIVE
	logger.info(`Publishing draft ${draft.uuid} to LIVE...`);
	try {
		const published = await publishVersion(draft.uuid, draftName);
		logger.info(`Published successfully! Version is now LIVE: ${published.uuid}`);

		return {
			version: published,
			documentsProcessed: pushResult.documentsProcessed,
			added,
			modified,
			deleted,
		};
	} catch (publishError) {
		// Publish failed - identify which document(s) have validation errors
		logger.warn('Batch publish failed, identifying problematic documents...');
		const failedDocs = await identifyFailingDocuments(actualChanges);
		
		if (failedDocs.length > 0) {
			// Build detailed, actionable error message for LLM consumption
			const errorLines: string[] = [];
			for (const doc of failedDocs) {
				errorLines.push(`\n## ❌ ${doc.path}`);
				errorLines.push(`**Error Code:** \`${doc.code}\``);
				errorLines.push(`**Error:** ${doc.error}`);
				errorLines.push(`**Root Cause:** ${doc.rootCause}`);
				if (doc.location) {
					errorLines.push(`**Location:** Line ${doc.location.line}, Column ${doc.location.column}`);
				}
				if (doc.codeFrame) {
					errorLines.push(`**Code Context:**\n\`\`\`\n${doc.codeFrame}\n\`\`\``);
				}
				errorLines.push(`**Fix:** ${doc.suggestion}`);
			}
			
			const message = `${failedDocs.length} document(s) failed validation:${errorLines.join('\n')}`;
			
			throw new LatitudeApiError(
				{
					name: 'DocumentValidationError',
					errorCode: 'DOCUMENT_VALIDATION_FAILED',
					message,
					details: { 
						failedDocuments: failedDocs,
						totalFailed: failedDocs.length,
						failedPaths: failedDocs.map(d => d.path),
					},
				},
				422
			);
		}
		
		// Re-throw original error if we couldn't identify specific failures
		throw publishError;
	}
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
