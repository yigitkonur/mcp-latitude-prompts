import {
	McpServer,
	ResourceTemplate,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import {
	DOCS_TOPIC_METADATA,
	DocsTopicEnum,
	type DocsTopic,
} from '../types/docs.types.js';
import { HELP_CONTENT, DOCS_MAP } from '../docs/promptl.docs.js';

const logger = Logger.forContext('resources/docs.resource.ts');

/**
 * Register documentation resources with the MCP server
 * Resources provide read-only access to PromptL documentation
 *
 * @param server The MCP server instance
 */
function registerResources(server: McpServer) {
	const registerLogger = logger.forMethod('registerResources');
	registerLogger.debug('Registering documentation resources...');

	// Help resource - server overview
	server.registerResource(
		'docs-help',
		new ResourceTemplate('docs://latitude/help', { list: undefined }),
		{
			title: 'Latitude Server Help',
			description:
				'Complete server overview with all tools, documentation topics, and quick start guide',
		},
		async (uri) => {
			const methodLogger = logger.forMethod('helpResource');
			methodLogger.debug('Help resource requested', { uri: uri.href });

			return {
				contents: [
					{
						uri: uri.href,
						text: HELP_CONTENT,
						mimeType: 'text/markdown',
					},
				],
			};
		},
	);

	// Documentation topic resource template
	server.registerResource(
		'docs-topic',
		new ResourceTemplate('docs://latitude/{topic}', { list: undefined }),
		{
			title: 'PromptL Documentation',
			description:
				'Documentation for a specific PromptL topic (overview, structure, variables, conditionals, loops, references, tools, chains, agents, techniques)',
		},
		async (uri, variables) => {
			const methodLogger = logger.forMethod('docsResource');
			const topic = variables.topic as string;

			methodLogger.debug('Documentation resource requested', {
				uri: uri.href,
				topic,
			});

			// Validate topic
			const validTopics = DocsTopicEnum.options;
			if (!validTopics.includes(topic as DocsTopic)) {
				return {
					contents: [
						{
							uri: uri.href,
							text: `# Error: Unknown Topic

The topic "${topic}" is not recognized.

## Available Topics

${validTopics.map((t) => `- \`${t}\`: ${DOCS_TOPIC_METADATA[t].description}`).join('\n')}

## Usage

Access documentation via:
- \`docs://latitude/overview\`
- \`docs://latitude/structure\`
- \`docs://latitude/variables\`
- etc.
`,
							mimeType: 'text/markdown',
						},
					],
				};
			}

			const content = DOCS_MAP[topic as DocsTopic];
			const metadata = DOCS_TOPIC_METADATA[topic as DocsTopic];

			return {
				contents: [
					{
						uri: uri.href,
						text: `${content}

---

## Resource Metadata

- **Topic**: ${topic}
- **Title**: ${metadata.title}
- **Related Topics**: ${metadata.relatedTopics.map((t) => `\`${t}\``).join(', ')}
- **Suggested Tools**: ${metadata.suggestedTools.map((t) => `\`${t}\``).join(', ')}
`,
						mimeType: 'text/markdown',
					},
				],
			};
		},
	);

	registerLogger.debug('Documentation resources registered successfully');
}

export default { registerResources };
