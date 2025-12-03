import { z } from 'zod';

/**
 * Latitude API Types and Zod Schemas
 *
 * Based on OpenAPI spec from openapi.json
 * API Version: 1.0.2
 * Base URL: https://gateway.latitude.so
 */

// ============================================================================
// Project Types
// ============================================================================

export const ProjectSchema = z.object({
	id: z.number(),
	name: z.string(),
	workspaceId: z.number(),
	createdAt: z.string(),
	updatedAt: z.string(),
	lastEditedAt: z.string().optional(),
	deletedAt: z.string().nullable().optional(),
});

export type Project = z.infer<typeof ProjectSchema>;

export const ProjectListSchema = z.array(ProjectSchema);
export type ProjectList = z.infer<typeof ProjectListSchema>;

// ============================================================================
// Version Types
// ============================================================================

export const VersionSchema = z.object({
	id: z.number(),
	uuid: z.string(),
	title: z.string(),
	description: z.string().nullable(),
	projectId: z.number(),
	version: z.number().nullable(),
	userId: z.string(),
	mergedAt: z.string().nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
	deletedAt: z.string().nullable(),
	status: z.string().optional(),
	message: z.string().optional(),
	authorName: z.string().nullable().optional(),
	authorEmail: z.string().nullable().optional(),
	authorId: z.number().nullable().optional(),
	parentCommitUuid: z.string().nullable().optional(),
});

export type Version = z.infer<typeof VersionSchema>;

export const VersionListSchema = z.array(VersionSchema);
export type VersionList = z.infer<typeof VersionListSchema>;

// ============================================================================
// Document/Prompt Types
// ============================================================================

export const ProviderEnum = z.enum([
	'openai',
	'anthropic',
	'groq',
	'mistral',
	'azure',
	'google',
	'google_vertex',
	'anthropic_vertex',
	'custom',
	'xai',
	'amazon_bedrock',
	'deepseek',
	'perplexity',
]);

export type Provider = z.infer<typeof ProviderEnum>;

export const ParameterTypeSchema = z.object({
	type: z.enum(['text', 'image', 'file']),
});

export const DocumentSchema = z.object({
	versionUuid: z.string(),
	uuid: z.string(),
	path: z.string(),
	content: z.string(),
	contentHash: z.string().optional(),
	config: z.record(z.string(), z.unknown()).optional(),
	parameters: z.record(z.string(), ParameterTypeSchema).optional(),
	provider: ProviderEnum.optional(),
});

export type Document = z.infer<typeof DocumentSchema>;

export const DocumentListSchema = z.array(DocumentSchema);
export type DocumentList = z.infer<typeof DocumentListSchema>;

// ============================================================================
// Document Change Types (for Push)
// ============================================================================

export const ChangeStatusEnum = z.enum(['added', 'modified', 'deleted', 'unchanged']);

export const DocumentChangeSchema = z.object({
	path: z.string(),
	content: z.string(),
	status: ChangeStatusEnum.default('modified'),
	contentHash: z.string().optional(),
});

export type DocumentChange = z.infer<typeof DocumentChangeSchema>;

export const PushChangesSchema = z.object({
	changes: z.array(DocumentChangeSchema),
});

export type PushChanges = z.infer<typeof PushChangesSchema>;

// ============================================================================
// Run/Execute Types
// ============================================================================

export const RunSourceEnum = z.enum([
	'api',
	'agent_as_tool',
	'copilot',
	'email_trigger',
	'evaluation',
	'experiment',
	'integration_trigger',
	'playground',
	'scheduled_trigger',
	'shared_prompt',
	'user',
]);

export const RunRequestSchema = z.object({
	path: z.string(),
	stream: z.boolean().default(false),
	customIdentifier: z.string().optional(),
	parameters: z.record(z.string(), z.unknown()).optional(),
	tools: z.array(z.string()).optional(),
	userMessage: z.string().optional(),
	background: z.boolean().optional(),
	__internal: z
		.object({
			source: RunSourceEnum.optional(),
		})
		.optional(),
});

export type RunRequest = z.infer<typeof RunRequestSchema>;

// ============================================================================
// Conversation Types
// ============================================================================

export const MessageRoleEnum = z.enum(['system', 'user', 'assistant', 'tool']);

export const TextContentSchema = z.object({
	type: z.literal('text'),
	text: z.string(),
});

export const ImageContentSchema = z.object({
	type: z.literal('image'),
	image: z.string(),
	mimeType: z.string().optional(),
});

export const FileContentSchema = z.object({
	type: z.literal('file'),
	file: z.string(),
	mimeType: z.string(),
});

export const ContentPartSchema = z.union([
	TextContentSchema,
	ImageContentSchema,
	FileContentSchema,
]);

export const MessageSchema = z.object({
	role: MessageRoleEnum,
	content: z.union([z.string(), z.array(ContentPartSchema)]),
	name: z.string().optional(),
});

export type Message = z.infer<typeof MessageSchema>;

export const ConversationSchema = z.object({
	uuid: z.string(),
	messages: z.array(MessageSchema).optional(),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional(),
});

export type Conversation = z.infer<typeof ConversationSchema>;

// ============================================================================
// Chat Types
// ============================================================================

export const ChatRequestSchema = z.object({
	messages: z.array(MessageSchema),
	stream: z.boolean().default(false),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

// ============================================================================
// Log Types
// ============================================================================

export const CreateLogRequestSchema = z.object({
	path: z.string(),
	messages: z.array(MessageSchema),
});

export type CreateLogRequest = z.infer<typeof CreateLogRequestSchema>;

// ============================================================================
// Streaming Event Types
// ============================================================================

export const StreamEventTypeEnum = z.enum([
	'text-delta',
	'step-complete',
	'provider-event',
	'tool-call-started',
	'tool-call',
	'chain-complete',
	'chain-error',
]);

export const StreamEventSchema = z.object({
	event: StreamEventTypeEnum,
	data: z.any(),
});

export type StreamEvent = z.infer<typeof StreamEventSchema>;

// ============================================================================
// Error Types
// ============================================================================

export const LatitudeErrorSchema = z.object({
	name: z.string(),
	errorCode: z.string(),
	message: z.string(),
	details: z.record(z.string(), z.unknown()).optional(),
});

export type LatitudeError = z.infer<typeof LatitudeErrorSchema>;

// ============================================================================
// Tool Input Schemas (for MCP tools)
// ============================================================================

/**
 * Check if default project ID is configured via environment variable
 */
export function hasDefaultProjectId(): boolean {
	return !!process.env.LATITUDE_PROJECT_ID;
}

/**
 * Get the default project ID from environment variable
 */
export function getDefaultProjectId(): string | undefined {
	return process.env.LATITUDE_PROJECT_ID;
}

/**
 * Resolve project ID from args or environment variable
 * @throws Error if neither is available
 */
export function resolveProjectId(args: Record<string, unknown>): string {
	const projectId = (args.projectId as string) || getDefaultProjectId();
	if (!projectId) {
		throw new Error(
			'Project ID is required. Either provide projectId parameter or set LATITUDE_PROJECT_ID environment variable.',
		);
	}
	return projectId;
}

/**
 * Create projectId field schema based on whether env var is set
 * When LATITUDE_PROJECT_ID is set, projectId becomes optional and hidden
 */
function projectIdField() {
	const hasDefault = hasDefaultProjectId();
	if (hasDefault) {
		return z
			.string()
			.optional()
			.describe(
				`Project ID (optional - using LATITUDE_PROJECT_ID=${getDefaultProjectId()})`,
			);
	}
	return z.string().describe('Project ID');
}

// Project tools
export const ListProjectsInputSchema = z.object({});

export const CreateProjectInputSchema = z.object({
	name: z.string().describe('Project name'),
});

// Version tools - use factory functions for dynamic schemas
export function getListVersionsInputSchema() {
	return z.object({
		projectId: projectIdField(),
	});
}
export const ListVersionsInputSchema = z.object({
	projectId: z.string().optional().describe('Project ID'),
});

export function getGetVersionInputSchema() {
	return z.object({
		projectId: projectIdField(),
		versionUuid: z.string().describe('Version UUID'),
	});
}
export const GetVersionInputSchema = z.object({
	projectId: z.string().optional().describe('Project ID'),
	versionUuid: z.string().describe('Version UUID'),
});

export function getCreateVersionInputSchema() {
	return z.object({
		projectId: projectIdField(),
		name: z.string().describe('Version/commit name'),
	});
}
export const CreateVersionInputSchema = z.object({
	projectId: z.string().optional().describe('Project ID'),
	name: z.string().describe('Version/commit name'),
});

export function getPublishVersionInputSchema() {
	return z.object({
		projectId: projectIdField(),
		versionUuid: z.string().describe('Version UUID to publish'),
		title: z.string().optional().describe('Publication title'),
		description: z.string().optional().describe('Publication description'),
	});
}
export const PublishVersionInputSchema = z.object({
	projectId: z.string().optional().describe('Project ID'),
	versionUuid: z.string().describe('Version UUID to publish'),
	title: z.string().optional().describe('Publication title'),
	description: z.string().optional().describe('Publication description'),
});

// Document/Prompt tools
export function getListPromptsInputSchema() {
	return z.object({
		projectId: projectIdField(),
		versionUuid: z
			.string()
			.default('live')
			.describe("Version UUID or 'live' for published version"),
	});
}
export const ListPromptsInputSchema = z.object({
	projectId: z.string().optional().describe('Project ID'),
	versionUuid: z
		.string()
		.default('live')
		.describe("Version UUID or 'live' for published version"),
});

export function getGetPromptInputSchema() {
	return z.object({
		projectId: projectIdField(),
		versionUuid: z.string().default('live').describe("Version UUID or 'live'"),
		path: z
			.string()
			.describe("Prompt path (e.g., '/my-prompt' or 'folder/prompt')"),
	});
}
export const GetPromptInputSchema = z.object({
	projectId: z.string().optional().describe('Project ID'),
	versionUuid: z.string().default('live').describe("Version UUID or 'live'"),
	path: z
		.string()
		.describe("Prompt path (e.g., '/my-prompt' or 'folder/prompt')"),
});

export function getPushPromptInputSchema() {
	return z.object({
		projectId: projectIdField(),
		versionUuid: z
			.string()
			.describe("Target version UUID (must be draft, not 'live')"),
		path: z.string().describe('Prompt path'),
		content: z.string().describe('Prompt content in PromptL format'),
		force: z.boolean().default(false).describe('Force overwrite if exists'),
	});
}
export const PushPromptInputSchema = z.object({
	projectId: z.string().optional().describe('Project ID'),
	versionUuid: z
		.string()
		.describe("Target version UUID (must be draft, not 'live')"),
	path: z.string().describe('Prompt path'),
	content: z.string().describe('Prompt content in PromptL format'),
	force: z.boolean().default(false).describe('Force overwrite if exists'),
});

export function getPushPromptFromFileInputSchema() {
	return z.object({
		projectId: projectIdField(),
		versionUuid: z
			.string()
			.describe("Target version UUID (must be draft, not 'live')"),
		filePath: z
			.string()
			.describe('Absolute path to the prompt file (e.g., /path/to/my-prompt.md)'),
		promptPath: z
			.string()
			.optional()
			.describe(
				"Optional: Prompt path in Latitude. If omitted, derived from filename (e.g., 'my-prompt.md' → 'my-prompt')",
			),
		force: z.boolean().default(false).describe('Force overwrite if exists'),
	});
}
export const PushPromptFromFileInputSchema = z.object({
	projectId: z.string().optional().describe('Project ID'),
	versionUuid: z
		.string()
		.describe("Target version UUID (must be draft, not 'live')"),
	filePath: z
		.string()
		.describe('Absolute path to the prompt file (e.g., /path/to/my-prompt.md)'),
	promptPath: z
		.string()
		.optional()
		.describe(
			"Optional: Prompt path in Latitude. If omitted, derived from filename (e.g., 'my-prompt.md' → 'my-prompt')",
		),
	force: z.boolean().default(false).describe('Force overwrite if exists'),
});

export function getRunPromptInputSchema() {
	return z.object({
		projectId: projectIdField(),
		versionUuid: z.string().default('live').describe("Version UUID or 'live'"),
		path: z.string().describe('Prompt path to run'),
		parameters: z
			.record(z.string(), z.unknown())
			.optional()
			.describe('Prompt parameters as key-value pairs'),
		stream: z.boolean().default(false).describe('Enable streaming response'),
		tools: z.array(z.string()).optional().describe('Tool names to enable'),
		userMessage: z.string().optional().describe('Additional user message'),
	});
}
export const RunPromptInputSchema = z.object({
	projectId: z.string().optional().describe('Project ID'),
	versionUuid: z.string().default('live').describe("Version UUID or 'live'"),
	path: z.string().describe('Prompt path to run'),
	parameters: z
		.record(z.string(), z.unknown())
		.optional()
		.describe('Prompt parameters as key-value pairs'),
	stream: z.boolean().default(false).describe('Enable streaming response'),
	tools: z.array(z.string()).optional().describe('Tool names to enable'),
	userMessage: z.string().optional().describe('Additional user message'),
});

export function getPushChangesInputSchema() {
	return z.object({
		projectId: projectIdField(),
		versionUuid: z.string().describe('Target version UUID'),
		changes: z
			.array(
				z.object({
					path: z.string().describe('Document path'),
					content: z.string().describe('Document content'),
					status: z
						.enum(['added', 'modified', 'deleted'])
						.default('modified')
						.describe('Change status'),
				}),
			)
			.describe('Array of document changes'),
	});
}
export const PushChangesInputSchema = z.object({
	projectId: z.string().optional().describe('Project ID'),
	versionUuid: z.string().describe('Target version UUID'),
	changes: z
		.array(
			z.object({
				path: z.string().describe('Document path'),
				content: z.string().describe('Document content'),
				status: z
					.enum(['added', 'modified', 'deleted'])
					.default('modified')
					.describe('Change status'),
			}),
		)
		.describe('Array of document changes'),
});

// Conversation tools
export const ChatInputSchema = z.object({
	conversationUuid: z
		.string()
		.describe('Conversation UUID from previous run'),
	message: z.string().describe('User message to send'),
	stream: z.boolean().default(false).describe('Enable streaming response'),
});

export const GetConversationInputSchema = z.object({
	conversationUuid: z.string().describe('Conversation UUID'),
});

export const StopConversationInputSchema = z.object({
	conversationUuid: z.string().describe('Conversation UUID to stop'),
});

// Log tools
export function getCreateLogInputSchema() {
	return z.object({
		projectId: projectIdField(),
		versionUuid: z.string().describe('Version UUID'),
		path: z.string().describe('Prompt path'),
		messages: z
			.array(
				z.object({
					role: z.enum(['system', 'user', 'assistant']),
					content: z.string(),
				}),
			)
			.describe('Conversation messages to log'),
	});
}
export const CreateLogInputSchema = z.object({
	projectId: z.string().optional().describe('Project ID'),
	versionUuid: z.string().describe('Version UUID'),
	path: z.string().describe('Prompt path'),
	messages: z
		.array(
			z.object({
				role: z.enum(['system', 'user', 'assistant']),
				content: z.string(),
			}),
		)
		.describe('Conversation messages to log'),
});

// ============================================================================
// API Response wrapper
// ============================================================================

export interface ApiResponse<T> {
	data: T;
	status: number;
}

// ============================================================================
// Service Options
// ============================================================================

export interface LatitudeServiceOptions {
	apiKey?: string;
	baseUrl?: string;
}

export interface RequestOptions {
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
	body?: unknown;
	headers?: Record<string, string>;
	stream?: boolean;
}
