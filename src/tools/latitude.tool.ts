import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
// Zod schemas imported from types
import latitudeController from '../controllers/latitude.controller.js';
import {
	ListProjectsInputSchema,
	CreateProjectInputSchema,
	ChatInputSchema,
	GetConversationInputSchema,
	StopConversationInputSchema,
	// Dynamic schema factories (use env var for optional projectId)
	getListVersionsInputSchema,
	getGetVersionInputSchema,
	getCreateVersionInputSchema,
	getPublishVersionInputSchema,
	getListPromptsInputSchema,
	getGetPromptInputSchema,
	getPushPromptInputSchema,
	getPushPromptFromFileInputSchema,
	getRunPromptInputSchema,
	getPushChangesInputSchema,
	getCreateLogInputSchema,
	resolveProjectId,
} from '../types/latitude.types.js';

const toolLogger = Logger.forContext('tools/latitude.tool.ts');

// ============================================================================
// Tool Descriptions
// ============================================================================

const LIST_PROJECTS_DESC = `List all projects in your Latitude workspace.

**Use when:** You need to see available projects or find a project ID.

**Returns:** Array of projects with id, name, createdAt, updatedAt.

**Example:** Call without parameters to get all projects.`;

const CREATE_PROJECT_DESC = `Create a new project in Latitude.

**Use when:** Starting a new prompt collection or AI workflow.

**Parameters:**
- \`name\` (required) - Project name

**Returns:** Created project with id and details.`;

const LIST_VERSIONS_DESC = `List all versions (commits) for a Latitude project.

**Use when:** You need to see version history or find a version UUID.

**Parameters:**
- \`projectId\` (required) - Project ID

**Returns:** Array of versions with uuid, title, status, mergedAt.`;

const GET_VERSION_DESC = `Get details for a specific version.

**Use when:** You need version metadata before operations.

**Parameters:**
- \`projectId\` (required) - Project ID
- \`versionUuid\` (required) - Version UUID

**Returns:** Version details including status and metadata.`;

const CREATE_VERSION_DESC = `Create a new draft version (branch) for a project.

**Use when:** You want to make changes without affecting the live version.

**Parameters:**
- \`projectId\` (required) - Project ID
- \`name\` (required) - Version/commit name

**Returns:** Created draft version with UUID.`;

const PUBLISH_VERSION_DESC = `Publish a draft version to make it live.

**Use when:** Your draft changes are ready for production.

**Parameters:**
- \`projectId\` (required) - Project ID
- \`versionUuid\` (required) - Draft version UUID to publish
- \`title\` (optional) - Publication title
- \`description\` (optional) - Publication description

**Returns:** Published version details.`;

const LIST_PROMPTS_DESC = `List all prompts/documents in a project version.

**Use when:** You need to see available prompts or find a prompt path.

**Parameters:**
- \`projectId\` (required) - Project ID
- \`versionUuid\` (optional, default: "live") - Version UUID or "live"

**Returns:** Array of documents with path, content, config, parameters.`;

const GET_PROMPT_DESC = `Get a specific prompt by path.

**Use when:** You need prompt content, config, or parameters.

**Parameters:**
- \`projectId\` (required) - Project ID
- \`versionUuid\` (optional, default: "live") - Version UUID or "live"
- \`path\` (required) - Prompt path (e.g., "/my-prompt" or "folder/prompt")

**Returns:** Document with content, config, and parameters.`;

const PUSH_PROMPT_DESC = `Create or update a prompt in a draft version.

**Use when:** You want to save a new or modified prompt.

**Important:** Can only push to draft versions, not "live".

**Parameters:**
- \`projectId\` (required) - Project ID
- \`versionUuid\` (required) - Draft version UUID
- \`path\` (required) - Prompt path
- \`content\` (required) - Prompt content in PromptL format
- \`force\` (optional) - Force overwrite if exists

**Example content:**
\`\`\`
---
model: gpt-4
temperature: 0.7
---
<system>You are a helpful assistant.</system>
<user>{{user_input}}</user>
\`\`\``;

const PUSH_PROMPT_FROM_FILE_DESC = `Push a prompt from a local file to a draft version.

**Use when:** You have a prompt file (e.g., .md, .promptl) and want to push it to Latitude.

**Important:** 
- Can only push to draft versions, not "live"
- Reads file content automatically
- Derives prompt path from filename if not specified

**Parameters:**
- \`projectId\` (required) - Project ID
- \`versionUuid\` (required) - Draft version UUID
- \`filePath\` (required) - Absolute path to the prompt file
- \`promptPath\` (optional) - Latitude prompt path. If omitted, derived from filename:
  - "/path/to/my-prompt.md" → "my-prompt"
  - "/path/to/folder/assistant.promptl" → "assistant"
- \`force\` (optional) - Force overwrite if exists

**Example:**
\`\`\`
filePath: "/Users/dev/prompts/customer-support.md"
promptPath: "support/customer" (optional, defaults to "customer-support")
\`\`\`

**Returns:** Pushed document info with source file metadata.`;

const RUN_PROMPT_DESC = `Execute a prompt with parameters and get AI response.

**Use when:** You want to run a prompt and get results.

**Parameters:**
- \`projectId\` (required) - Project ID
- \`versionUuid\` (optional, default: "live") - Version UUID or "live"
- \`path\` (required) - Prompt path to run
- \`parameters\` (optional) - Key-value pairs for prompt variables
- \`stream\` (optional) - Enable streaming response
- \`tools\` (optional) - Tool names to enable
- \`userMessage\` (optional) - Additional user message

**Returns:** AI response with conversation UUID for follow-up.`;

const PUSH_CHANGES_DESC = `Push multiple document changes to a version at once.

**Use when:** You have multiple prompts to update in a single operation.

**Parameters:**
- \`projectId\` (required) - Project ID
- \`versionUuid\` (required) - Target version UUID
- \`changes\` (required) - Array of {path, content, status}
  - status: "added" | "modified" | "deleted"

**Returns:** Push result with applied changes.`;

const CHAT_DESC = `Continue a conversation with additional messages.

**Use when:** You have a conversation UUID from a previous run and want to continue.

**Parameters:**
- \`conversationUuid\` (required) - Conversation UUID from previous run
- \`message\` (required) - User message to send
- \`stream\` (optional) - Enable streaming response

**Returns:** AI response continuing the conversation.`;

const GET_CONVERSATION_DESC = `Get details and history of a conversation.

**Use when:** You need to review conversation messages or metadata.

**Parameters:**
- \`conversationUuid\` (required) - Conversation UUID

**Returns:** Conversation with message history.`;

const STOP_CONVERSATION_DESC = `Stop an ongoing conversation/generation.

**Use when:** You need to cancel a running AI generation.

**Parameters:**
- \`conversationUuid\` (required) - Conversation UUID to stop

**Returns:** Stop confirmation.`;

const CREATE_LOG_DESC = `Create a prompt execution log for analytics.

**Use when:** You want to log a conversation for evaluation or monitoring.

**Parameters:**
- \`projectId\` (required) - Project ID
- \`versionUuid\` (required) - Version UUID
- \`path\` (required) - Prompt path
- \`messages\` (required) - Array of {role, content} messages

**Returns:** Created log confirmation.`;

// ============================================================================
// Tool Handlers
// ============================================================================

async function handleListProjects(args: Record<string, unknown>) {
	const methodLogger = toolLogger.forMethod('handleListProjects');
	methodLogger.debug('Listing projects');

	try {
		const result = await latitudeController.listProjects(args);
		return { content: [{ type: 'text' as const, text: result.content }] };
	} catch (error) {
		methodLogger.error('Error listing projects', error);
		return formatErrorForMcpTool(error);
	}
}

async function handleCreateProject(args: Record<string, unknown>) {
	const methodLogger = toolLogger.forMethod('handleCreateProject');
	methodLogger.debug('Creating project', args);

	try {
		const result = await latitudeController.createProject(args as { name: string });
		return { content: [{ type: 'text' as const, text: result.content }] };
	} catch (error) {
		methodLogger.error('Error creating project', error);
		return formatErrorForMcpTool(error);
	}
}

async function handleListVersions(args: Record<string, unknown>) {
	const methodLogger = toolLogger.forMethod('handleListVersions');
	methodLogger.debug('Listing versions', args);

	try {
		const projectId = resolveProjectId(args);
		const result = await latitudeController.listVersions({ projectId });
		return { content: [{ type: 'text' as const, text: result.content }] };
	} catch (error) {
		methodLogger.error('Error listing versions', error);
		return formatErrorForMcpTool(error);
	}
}

async function handleGetVersion(args: Record<string, unknown>) {
	const methodLogger = toolLogger.forMethod('handleGetVersion');
	methodLogger.debug('Getting version', args);

	try {
		const projectId = resolveProjectId(args);
		const result = await latitudeController.getVersion({
			projectId,
			versionUuid: args.versionUuid as string,
		});
		return { content: [{ type: 'text' as const, text: result.content }] };
	} catch (error) {
		methodLogger.error('Error getting version', error);
		return formatErrorForMcpTool(error);
	}
}

async function handleCreateVersion(args: Record<string, unknown>) {
	const methodLogger = toolLogger.forMethod('handleCreateVersion');
	methodLogger.debug('Creating version', args);

	try {
		const projectId = resolveProjectId(args);
		const result = await latitudeController.createVersion({
			projectId,
			name: args.name as string,
		});
		return { content: [{ type: 'text' as const, text: result.content }] };
	} catch (error) {
		methodLogger.error('Error creating version', error);
		return formatErrorForMcpTool(error);
	}
}

async function handlePublishVersion(args: Record<string, unknown>) {
	const methodLogger = toolLogger.forMethod('handlePublishVersion');
	methodLogger.debug('Publishing version', args);

	try {
		const projectId = resolveProjectId(args);
		const result = await latitudeController.publishVersion({
			projectId,
			versionUuid: args.versionUuid as string,
			title: args.title as string | undefined,
			description: args.description as string | undefined,
		});
		return { content: [{ type: 'text' as const, text: result.content }] };
	} catch (error) {
		methodLogger.error('Error publishing version', error);
		return formatErrorForMcpTool(error);
	}
}

async function handleListPrompts(args: Record<string, unknown>) {
	const methodLogger = toolLogger.forMethod('handleListPrompts');
	methodLogger.debug('Listing prompts', args);

	try {
		const projectId = resolveProjectId(args);
		const typedArgs = {
			projectId,
			versionUuid: (args.versionUuid as string) || 'live',
		};
		const result = await latitudeController.listPrompts(typedArgs);
		return { content: [{ type: 'text' as const, text: result.content }] };
	} catch (error) {
		methodLogger.error('Error listing prompts', error);
		return formatErrorForMcpTool(error);
	}
}

async function handleGetPrompt(args: Record<string, unknown>) {
	const methodLogger = toolLogger.forMethod('handleGetPrompt');
	methodLogger.debug('Getting prompt', args);

	try {
		const projectId = resolveProjectId(args);
		const typedArgs = {
			projectId,
			versionUuid: (args.versionUuid as string) || 'live',
			path: args.path as string,
		};
		const result = await latitudeController.getPrompt(typedArgs);
		return { content: [{ type: 'text' as const, text: result.content }] };
	} catch (error) {
		methodLogger.error('Error getting prompt', error);
		return formatErrorForMcpTool(error);
	}
}

async function handlePushPrompt(args: Record<string, unknown>) {
	const methodLogger = toolLogger.forMethod('handlePushPrompt');
	methodLogger.debug('Pushing prompt', args);

	try {
		const projectId = resolveProjectId(args);
		const result = await latitudeController.pushPrompt({
			projectId,
			versionUuid: args.versionUuid as string,
			path: args.path as string,
			content: args.content as string,
			force: args.force as boolean | undefined,
		});
		return { content: [{ type: 'text' as const, text: result.content }] };
	} catch (error) {
		methodLogger.error('Error pushing prompt', error);
		return formatErrorForMcpTool(error);
	}
}

async function handlePushPromptFromFile(args: Record<string, unknown>) {
	const methodLogger = toolLogger.forMethod('handlePushPromptFromFile');
	methodLogger.debug('Pushing prompt from file', args);

	try {
		const projectId = resolveProjectId(args);
		const result = await latitudeController.pushPromptFromFile({
			projectId,
			versionUuid: args.versionUuid as string,
			filePath: args.filePath as string,
			promptPath: args.promptPath as string | undefined,
			force: args.force as boolean | undefined,
		});
		return { content: [{ type: 'text' as const, text: result.content }] };
	} catch (error) {
		methodLogger.error('Error pushing prompt from file', error);
		return formatErrorForMcpTool(error);
	}
}

async function handleRunPrompt(args: Record<string, unknown>) {
	const methodLogger = toolLogger.forMethod('handleRunPrompt');
	methodLogger.debug('Running prompt', args);

	try {
		const projectId = resolveProjectId(args);
		const typedArgs = {
			projectId,
			versionUuid: (args.versionUuid as string) || 'live',
			path: args.path as string,
			parameters: args.parameters as Record<string, unknown> | undefined,
			stream: args.stream as boolean | undefined,
			tools: args.tools as string[] | undefined,
			userMessage: args.userMessage as string | undefined,
		};
		const result = await latitudeController.runPrompt(typedArgs);
		return { content: [{ type: 'text' as const, text: result.content }] };
	} catch (error) {
		methodLogger.error('Error running prompt', error);
		return formatErrorForMcpTool(error);
	}
}

async function handlePushChanges(args: Record<string, unknown>) {
	const methodLogger = toolLogger.forMethod('handlePushChanges');
	methodLogger.debug('Pushing changes', args);

	try {
		const projectId = resolveProjectId(args);
		const rawChanges = args.changes as Array<{ path: string; content: string; status?: string }>;
		const changes = rawChanges.map((c) => ({
			path: c.path,
			content: c.content,
			status: (c.status || 'modified') as 'added' | 'modified' | 'deleted' | 'unchanged',
		}));
		
		const result = await latitudeController.pushChanges({
			projectId,
			versionUuid: args.versionUuid as string,
			changes,
		});
		return { content: [{ type: 'text' as const, text: result.content }] };
	} catch (error) {
		methodLogger.error('Error pushing changes', error);
		return formatErrorForMcpTool(error);
	}
}

async function handleChat(args: Record<string, unknown>) {
	const methodLogger = toolLogger.forMethod('handleChat');
	methodLogger.debug('Chatting', args);

	try {
		const result = await latitudeController.chat(
			args as { conversationUuid: string; message: string; stream?: boolean },
		);
		return { content: [{ type: 'text' as const, text: result.content }] };
	} catch (error) {
		methodLogger.error('Error in chat', error);
		return formatErrorForMcpTool(error);
	}
}

async function handleGetConversation(args: Record<string, unknown>) {
	const methodLogger = toolLogger.forMethod('handleGetConversation');
	methodLogger.debug('Getting conversation', args);

	try {
		const result = await latitudeController.getConversation(
			args as { conversationUuid: string },
		);
		return { content: [{ type: 'text' as const, text: result.content }] };
	} catch (error) {
		methodLogger.error('Error getting conversation', error);
		return formatErrorForMcpTool(error);
	}
}

async function handleStopConversation(args: Record<string, unknown>) {
	const methodLogger = toolLogger.forMethod('handleStopConversation');
	methodLogger.debug('Stopping conversation', args);

	try {
		const result = await latitudeController.stopConversation(
			args as { conversationUuid: string },
		);
		return { content: [{ type: 'text' as const, text: result.content }] };
	} catch (error) {
		methodLogger.error('Error stopping conversation', error);
		return formatErrorForMcpTool(error);
	}
}

async function handleCreateLog(args: Record<string, unknown>) {
	const methodLogger = toolLogger.forMethod('handleCreateLog');
	methodLogger.debug('Creating log', args);

	try {
		const projectId = resolveProjectId(args);
		const result = await latitudeController.createLog({
			projectId,
			versionUuid: args.versionUuid as string,
			path: args.path as string,
			messages: args.messages as Array<{ role: string; content: string }>,
		});
		return { content: [{ type: 'text' as const, text: result.content }] };
	} catch (error) {
		methodLogger.error('Error creating log', error);
		return formatErrorForMcpTool(error);
	}
}

// ============================================================================
// Tool Registration
// ============================================================================

function registerTools(server: McpServer) {
	const methodLogger = toolLogger.forMethod('registerTools');
	methodLogger.debug('Registering Latitude tools...');

	// Projects
	server.registerTool(
		'latitude_list_projects',
		{
			title: 'List Latitude Projects',
			description: LIST_PROJECTS_DESC,
			inputSchema: ListProjectsInputSchema,
		},
		handleListProjects,
	);

	server.registerTool(
		'latitude_create_project',
		{
			title: 'Create Latitude Project',
			description: CREATE_PROJECT_DESC,
			inputSchema: CreateProjectInputSchema,
		},
		handleCreateProject,
	);

	// Versions (use dynamic schemas for optional projectId)
	server.registerTool(
		'latitude_list_versions',
		{
			title: 'List Project Versions',
			description: LIST_VERSIONS_DESC,
			inputSchema: getListVersionsInputSchema(),
		},
		handleListVersions,
	);

	server.registerTool(
		'latitude_get_version',
		{
			title: 'Get Version Details',
			description: GET_VERSION_DESC,
			inputSchema: getGetVersionInputSchema(),
		},
		handleGetVersion,
	);

	server.registerTool(
		'latitude_create_version',
		{
			title: 'Create Draft Version',
			description: CREATE_VERSION_DESC,
			inputSchema: getCreateVersionInputSchema(),
		},
		handleCreateVersion,
	);

	server.registerTool(
		'latitude_publish_version',
		{
			title: 'Publish Version',
			description: PUBLISH_VERSION_DESC,
			inputSchema: getPublishVersionInputSchema(),
		},
		handlePublishVersion,
	);

	// Prompts/Documents (use dynamic schemas for optional projectId)
	server.registerTool(
		'latitude_list_prompts',
		{
			title: 'List Prompts',
			description: LIST_PROMPTS_DESC,
			inputSchema: getListPromptsInputSchema(),
		},
		handleListPrompts,
	);

	server.registerTool(
		'latitude_get_prompt',
		{
			title: 'Get Prompt',
			description: GET_PROMPT_DESC,
			inputSchema: getGetPromptInputSchema(),
		},
		handleGetPrompt,
	);

	server.registerTool(
		'latitude_push_prompt',
		{
			title: 'Push Prompt',
			description: PUSH_PROMPT_DESC,
			inputSchema: getPushPromptInputSchema(),
		},
		handlePushPrompt,
	);

	server.registerTool(
		'latitude_push_prompt_from_file',
		{
			title: 'Push Prompt from File',
			description: PUSH_PROMPT_FROM_FILE_DESC,
			inputSchema: getPushPromptFromFileInputSchema(),
		},
		handlePushPromptFromFile,
	);

	server.registerTool(
		'latitude_run_prompt',
		{
			title: 'Run Prompt',
			description: RUN_PROMPT_DESC,
			inputSchema: getRunPromptInputSchema(),
		},
		handleRunPrompt,
	);

	server.registerTool(
		'latitude_push_changes',
		{
			title: 'Push Multiple Changes',
			description: PUSH_CHANGES_DESC,
			inputSchema: getPushChangesInputSchema(),
		},
		handlePushChanges,
	);

	// Conversations
	server.registerTool(
		'latitude_chat',
		{
			title: 'Chat in Conversation',
			description: CHAT_DESC,
			inputSchema: ChatInputSchema,
		},
		handleChat,
	);

	server.registerTool(
		'latitude_get_conversation',
		{
			title: 'Get Conversation',
			description: GET_CONVERSATION_DESC,
			inputSchema: GetConversationInputSchema,
		},
		handleGetConversation,
	);

	server.registerTool(
		'latitude_stop_conversation',
		{
			title: 'Stop Conversation',
			description: STOP_CONVERSATION_DESC,
			inputSchema: StopConversationInputSchema,
		},
		handleStopConversation,
	);

	// Logs (use dynamic schema for optional projectId)
	server.registerTool(
		'latitude_create_log',
		{
			title: 'Create Prompt Log',
			description: CREATE_LOG_DESC,
			inputSchema: getCreateLogInputSchema(),
		},
		handleCreateLog,
	);

	methodLogger.debug('Successfully registered 16 Latitude tools');
}

export default { registerTools };
