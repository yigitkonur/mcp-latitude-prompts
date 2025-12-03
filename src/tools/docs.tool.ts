import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import {
	HelpInputSchema,
	GetDocsInputSchema,
	DOCS_TOPIC_METADATA,
	type DocsTopic,
} from '../types/docs.types.js';
import { HELP_CONTENT, DOCS_MAP } from '../docs/promptl.docs.js';

const toolLogger = Logger.forContext('tools/docs.tool.ts');

// ============================================================================
// Tool Descriptions
// ============================================================================

const HELP_DESC = `Get comprehensive help for the Latitude MCP Server.

**Returns:** Complete server overview including:
- All 18 available tools with descriptions
- All 10 documentation topics
- Quick start workflow
- Available resources

**Use this first** to understand what the server can do.`;

const GET_DOCS_DESC = `Get PromptL documentation for a specific topic.

**Available Topics:**
- \`overview\` - Introduction to PromptL, getting started
- \`structure\` - Config section (YAML) + Messages (system, user, assistant)
- \`variables\` - {{ }} syntax, expressions, defaults, assignments
- \`conditionals\` - if/else/endif logic for dynamic content
- \`loops\` - for/each iteration for few-shot examples
- \`references\` - Include other prompts with <prompt> tag
- \`tools\` - Function calling with JSON Schema parameters
- \`chains\` - Multi-step prompts with <step> tags
- \`agents\` - Multi-agent orchestration and collaboration
- \`techniques\` - Few-shot, Chain-of-Thought, Tree-of-Thoughts, Role prompting

**Returns:** Comprehensive documentation with syntax, examples, and tips.

**Example:** \`latitude_get_docs({ topic: "variables" })\``;

// ============================================================================
// Tool Handlers
// ============================================================================

/**
 * Handle latitude_help tool call
 * Returns comprehensive server overview
 */
async function handleHelp() {
	const methodLogger = toolLogger.forMethod('handleHelp');
	methodLogger.debug('Help requested');

	return {
		content: [
			{
				type: 'text' as const,
				text: JSON.stringify(
					{
						server: 'Latitude MCP Server',
						totalTools: 18,
						docTools: 2,
						latitudeTools: 16,
						documentationTopics: Object.keys(DOCS_TOPIC_METADATA),
						suggestedNextActions: [
							'latitude_get_docs({ topic: "overview" })',
							'latitude_list_projects',
						],
					},
					null,
					2,
				),
				mimeType: 'application/json',
			},
			{
				type: 'text' as const,
				text: HELP_CONTENT,
			},
		],
	};
}

/**
 * Handle latitude_get_docs tool call
 * Returns documentation for the specified topic
 */
async function handleGetDocs(args: Record<string, unknown>) {
	const methodLogger = toolLogger.forMethod('handleGetDocs');
	const topic = args.topic as DocsTopic;

	methodLogger.debug('Documentation requested', { topic });

	const content = DOCS_MAP[topic];
	const metadata = DOCS_TOPIC_METADATA[topic];

	if (!content) {
		return {
			content: [
				{
					type: 'text' as const,
					text: `Error: Unknown topic "${topic}". Available topics: ${Object.keys(DOCS_MAP).join(', ')}`,
				},
			],
		};
	}

	return {
		content: [
			{
				type: 'text' as const,
				text: JSON.stringify(
					{
						topic,
						title: metadata.title,
						description: metadata.description,
						relatedTopics: metadata.relatedTopics,
						suggestedTools: metadata.suggestedTools,
						nextActions: [
							...metadata.relatedTopics.map(
								(t) => `latitude_get_docs({ topic: "${t}" })`,
							),
							...metadata.suggestedTools.map((t) => t),
						],
					},
					null,
					2,
				),
				mimeType: 'application/json',
			},
			{
				type: 'text' as const,
				text: content,
			},
		],
	};
}

// ============================================================================
// Tool Registration
// ============================================================================

/**
 * Register documentation tools with the MCP server
 *
 * @param server The MCP server instance
 */
function registerTools(server: McpServer) {
	const registerLogger = toolLogger.forMethod('registerTools');
	registerLogger.debug('Registering documentation tools...');

	// Help tool
	server.registerTool(
		'latitude_help',
		{
			title: 'Latitude Server Help',
			description: HELP_DESC,
			inputSchema: HelpInputSchema,
		},
		handleHelp,
	);

	// Get documentation tool
	server.registerTool(
		'latitude_get_docs',
		{
			title: 'Get PromptL Documentation',
			description: GET_DOCS_DESC,
			inputSchema: GetDocsInputSchema,
		},
		handleGetDocs,
	);

	registerLogger.debug('Successfully registered 2 documentation tools');
}

export default { registerTools };
