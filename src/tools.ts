/**
 * MCP Tools for Latitude
 *
 * 8 Tools:
 * - list_prompts   : List all prompt names in LIVE
 * - get_prompt     : Get full prompt content by name
 * - run_prompt     : Execute a prompt with parameters
 * - push_prompts   : Replace ALL LIVE prompts (creates branch → merge)
 * - append_prompts : Add prompts to LIVE (creates branch → merge)
 * - pull_prompts   : Download LIVE prompts to local ./prompts/*.promptl
 * - replace_prompt : Replace/create a single prompt (supports file path)
 * - docs           : Documentation (help, get topic, find query)
 */

import { z } from 'zod';
import {
	existsSync,
	mkdirSync,
	writeFileSync,
	readdirSync,
	unlinkSync,
	readFileSync,
} from 'fs';
import { join, resolve, basename } from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from './utils/logger.util.js';
import {
	LatitudeApiError,
	getProjectId,
	listDocuments,
	getDocument,
	runDocument,
	deployToLive,
	computeDiff,
} from './api.js';
import { getHelp, getDocs, findDocs } from './docs.js';
import type { DocumentChange } from './types.js';

// ============================================================================
// Types & Helpers
// ============================================================================

type ToolResult = {
	content: Array<{ type: 'text'; text: string }>;
	isError?: boolean;
};

const logger = Logger.forContext('tools.ts');

// Prompt cache with auto-refresh
let cachedPromptNames: string[] = [];
let cacheLastUpdated: Date | null = null;
const CACHE_TTL_MS = 30000; // 30 seconds

async function refreshPromptCache(): Promise<string[]> {
	try {
		const docs = await listDocuments('live');
		cachedPromptNames = docs.map((d: { path: string }) => d.path);
		cacheLastUpdated = new Date();
		logger.debug(`Cache updated: ${cachedPromptNames.length} prompts`);
		return cachedPromptNames;
	} catch (error) {
		logger.warn('Cache refresh failed', error);
		return cachedPromptNames;
	}
}

async function getCachedPromptNames(): Promise<string[]> {
	const now = new Date();
	if (!cacheLastUpdated || now.getTime() - cacheLastUpdated.getTime() > CACHE_TTL_MS) {
		await refreshPromptCache();
	}
	return cachedPromptNames;
}

// Force refresh and return names (used after mutations)
async function forceRefreshAndGetNames(): Promise<string[]> {
	cacheLastUpdated = null; // Force refresh
	return await refreshPromptCache();
}

function formatSuccess(title: string, content: string): ToolResult {
	return {
		content: [
			{
				type: 'text' as const,
				text: `## ${title}\n\n${content}`,
			},
		],
	};
}

function formatError(error: unknown): ToolResult {
	if (error instanceof LatitudeApiError) {
		return {
			content: [
				{
					type: 'text' as const,
					text: error.toMarkdown(),
				},
			],
			isError: true,
		};
	}

	const message = error instanceof Error ? error.message : String(error);
	return {
		content: [
			{
				type: 'text' as const,
				text: `## Error\n\n${message}`,
			},
		],
		isError: true,
	};
}

function getPromptsDir(): string {
	return resolve(process.cwd(), 'prompts');
}

// Read content from file path
function readPromptFile(filePath: string): { name: string; content: string } {
	const resolvedPath = resolve(filePath);
	if (!existsSync(resolvedPath)) {
		throw new Error(`File not found: ${resolvedPath}`);
	}
	const content = readFileSync(resolvedPath, 'utf-8');
	// Extract name from filename (remove .promptl extension)
	const filename = basename(resolvedPath);
	const name = filename.replace(/\.promptl$/, '').replace(/_/g, '/');
	return { name, content };
}

// Format available prompts for description
function formatAvailablePrompts(names: string[]): string {
	if (names.length === 0) {
		return '\n\n**No prompts in LIVE yet.** Use this tool to create the first one.';
	}
	
	const formatted = names.map(n => `\`${n}\``).join(', ');
	return `\n\n**Available prompts (${names.length}):** ${formatted}`;
}

// ============================================================================
// Tool Handlers
// ============================================================================

const ListPromptsSchema = z.object({});

async function handleListPrompts(): Promise<ToolResult> {
	try {
		const names = await forceRefreshAndGetNames();

		if (names.length === 0) {
			return formatSuccess('No Prompts Found', 'The project has no prompts yet.');
		}

		const list = names.map((n: string) => `- \`${n}\``).join('\n');
		return formatSuccess(
			`Found ${names.length} Prompt(s)`,
			`**Project ID:** \`${getProjectId()}\`\n\n${list}`
		);
	} catch (error) {
		return formatError(error);
	}
}

const GetPromptSchema = z.object({
	name: z.string().describe('Prompt name/path to retrieve'),
});

async function handleGetPrompt(args: { name: string }): Promise<ToolResult> {
	try {
		const doc = await getDocument(args.name, 'live');

		let content = `**Name:** \`${doc.path}\`\n\n`;
		content += `**Version:** \`${doc.versionUuid}\`\n\n`;
		content += `### Content\n\n\`\`\`promptl\n${doc.content}\n\`\`\``;

		return formatSuccess(`Prompt: ${doc.path}`, content);
	} catch (error) {
		return formatError(error);
	}
}

const RunPromptSchema = z.object({
	name: z.string().describe('Prompt name/path to execute'),
	parameters: z
		.record(z.string(), z.unknown())
		.optional()
		.describe('Parameters to pass to the prompt'),
});

async function handleRunPrompt(args: {
	name: string;
	parameters?: Record<string, unknown>;
}): Promise<ToolResult> {
	try {
		const result = await runDocument(args.name, args.parameters || {});

		let content = `**Prompt:** \`${args.name}\`\n\n`;

		if (args.parameters && Object.keys(args.parameters).length > 0) {
			content += `**Parameters:**\n\`\`\`json\n${JSON.stringify(args.parameters, null, 2)}\n\`\`\`\n\n`;
		}

		content += `### Response\n\n${result.response?.text || JSON.stringify(result, null, 2)}`;

		if (result.response?.usage) {
			content += `\n\n**Tokens:** ${result.response.usage.totalTokens} total`;
		}

		if (result.uuid) {
			content += `\n\n**Conversation ID:** \`${result.uuid}\``;
		}

		return formatSuccess('Prompt Executed', content);
	} catch (error) {
		return formatError(error);
	}
}

const PushPromptsSchema = z.object({
	prompts: z
		.array(
			z.object({
				name: z.string().describe('Prompt name (without .promptl extension)'),
				content: z.string().describe('Full prompt content'),
			})
		)
		.optional()
		.describe('Prompts to push (replaces ALL existing prompts in LIVE)'),
	filePaths: z
		.array(z.string())
		.optional()
		.describe('File paths to .promptl files (alternative to prompts array)'),
});

async function handlePushPrompts(args: {
	prompts?: Array<{ name: string; content: string }>;
	filePaths?: string[];
}): Promise<ToolResult> {
	try {
		// Build prompts from either direct input or file paths
		let prompts: Array<{ name: string; content: string }> = [];
		
		if (args.filePaths && args.filePaths.length > 0) {
			for (const fp of args.filePaths) {
				const { name, content } = readPromptFile(fp);
				prompts.push({ name, content });
			}
		} else if (args.prompts) {
			prompts = args.prompts;
		}

		if (prompts.length === 0) {
			return formatError(new Error('No prompts provided. Use either prompts array or filePaths.'));
		}

		// Get existing prompts for diff computation
		const existingDocs = await listDocuments('live');
		
		// Compute diff - this determines what needs to be added, modified, or deleted
		const incoming = prompts.map(p => ({ path: p.name, content: p.content }));
		const changes = computeDiff(incoming, existingDocs);

		// Summarize changes
		const added = changes.filter((c: DocumentChange) => c.status === 'added');
		const modified = changes.filter((c: DocumentChange) => c.status === 'modified');
		const deleted = changes.filter((c: DocumentChange) => c.status === 'deleted');

		if (changes.length === 0) {
			const newNames = await forceRefreshAndGetNames();
			return formatSuccess('No Changes Needed', 
				`All ${prompts.length} prompt(s) are already up to date.\n\n` +
				`**Current LIVE prompts (${newNames.length}):** ${newNames.map(n => `\`${n}\``).join(', ')}`
			);
		}

		// Push all changes in one batch
		try {
			const result = await deployToLive(changes, 'push');
			
			// Force refresh cache after mutations
			const newNames = await forceRefreshAndGetNames();

			let content = `**Summary:**\n`;
			content += `- Added: ${added.length}\n`;
			content += `- Modified: ${modified.length}\n`;
			content += `- Deleted: ${deleted.length}\n`;
			content += `- Documents processed: ${result.documentsProcessed}\n\n`;
			
			if (added.length > 0) {
				content += `### Added\n${added.map((c: DocumentChange) => `- \`${c.path}\``).join('\n')}\n\n`;
			}
			if (modified.length > 0) {
				content += `### Modified\n${modified.map((c: DocumentChange) => `- \`${c.path}\``).join('\n')}\n\n`;
			}
			if (deleted.length > 0) {
				content += `### Deleted\n${deleted.map((c: DocumentChange) => `- \`${c.path}\``).join('\n')}\n\n`;
			}
			
			content += `---\n**Current LIVE prompts (${newNames.length}):** ${newNames.map(n => `\`${n}\``).join(', ')}`;

			return formatSuccess('Prompts Pushed to LIVE', content);
		} catch (error) {
			// Detailed error from API
			if (error instanceof LatitudeApiError) {
				return {
					content: [{ type: 'text' as const, text: error.toMarkdown() }],
					isError: true,
				};
			}
			throw error;
		}
	} catch (error) {
		return formatError(error);
	}
}

const AppendPromptsSchema = z.object({
	prompts: z
		.array(
			z.object({
				name: z.string().describe('Prompt name'),
				content: z.string().describe('Prompt content'),
			})
		)
		.optional()
		.describe('Prompts to append'),
	filePaths: z
		.array(z.string())
		.optional()
		.describe('File paths to .promptl files (alternative to prompts array)'),
	overwrite: z
		.boolean()
		.optional()
		.default(false)
		.describe('If true, overwrite existing prompts with same name'),
});

async function handleAppendPrompts(args: {
	prompts?: Array<{ name: string; content: string }>;
	filePaths?: string[];
	overwrite?: boolean;
}): Promise<ToolResult> {
	try {
		// Build prompts from either direct input or file paths
		let prompts: Array<{ name: string; content: string }> = [];
		
		if (args.filePaths && args.filePaths.length > 0) {
			for (const fp of args.filePaths) {
				const { name, content } = readPromptFile(fp);
				prompts.push({ name, content });
			}
		} else if (args.prompts) {
			prompts = args.prompts;
		}

		if (prompts.length === 0) {
			return formatError(new Error('No prompts provided. Use either prompts array or filePaths.'));
		}

		// Get existing prompts
		const existingDocs = await listDocuments('live');
		const existingMap = new Map(existingDocs.map((d) => [d.path, d]));

		// Build changes - append does NOT delete existing prompts
		const changes: DocumentChange[] = [];
		const skipped: string[] = [];

		for (const prompt of prompts) {
			const existingDoc = existingMap.get(prompt.name);

			if (existingDoc) {
				if (args.overwrite) {
					// Only include if content is different
					if (existingDoc.content !== prompt.content) {
						changes.push({
							path: prompt.name,
							content: prompt.content,
							status: 'modified',
						});
					}
					// If same content, skip silently (unchanged)
				} else {
					skipped.push(prompt.name);
				}
			} else {
				// New prompt
				changes.push({
					path: prompt.name,
					content: prompt.content,
					status: 'added',
				});
			}
		}

		// Summarize
		const added = changes.filter((c: DocumentChange) => c.status === 'added');
		const modified = changes.filter((c: DocumentChange) => c.status === 'modified');

		if (changes.length === 0 && skipped.length === 0) {
			const newNames = await forceRefreshAndGetNames();
			return formatSuccess('No Changes Needed', 
				`All ${prompts.length} prompt(s) are already up to date.\n\n` +
				`**Current LIVE prompts (${newNames.length}):** ${newNames.map(n => `\`${n}\``).join(', ')}`
			);
		}

		if (changes.length === 0) {
			const newNames = await forceRefreshAndGetNames();
			let content = `**Skipped:** ${skipped.length} (already exist, use overwrite=true to update)\n`;
			content += `\n---\n**Current LIVE prompts (${newNames.length}):** ${newNames.map(n => `\`${n}\``).join(', ')}`;
			return formatSuccess('No Changes Made', content);
		}

		// Push all changes in one batch
		try {
			const result = await deployToLive(changes, 'append');
			
			// Force refresh cache after mutations
			const newNames = await forceRefreshAndGetNames();

			let content = `**Summary:**\n`;
			content += `- Added: ${added.length}\n`;
			content += `- Updated: ${modified.length}\n`;
			if (skipped.length > 0) {
				content += `- Skipped: ${skipped.length} (use overwrite=true)\n`;
			}
			content += `- Documents processed: ${result.documentsProcessed}\n\n`;
			
			if (added.length > 0) {
				content += `### Added\n${added.map((c: DocumentChange) => `- \`${c.path}\``).join('\n')}\n\n`;
			}
			if (modified.length > 0) {
				content += `### Updated\n${modified.map((c: DocumentChange) => `- \`${c.path}\``).join('\n')}\n\n`;
			}
			if (skipped.length > 0) {
				content += `### Skipped (already exist)\n${skipped.map(n => `- \`${n}\``).join('\n')}\n\n`;
			}
			
			content += `---\n**Current LIVE prompts (${newNames.length}):** ${newNames.map(n => `\`${n}\``).join(', ')}`;

			return formatSuccess('Prompts Appended to LIVE', content);
		} catch (error) {
			// Detailed error from API
			if (error instanceof LatitudeApiError) {
				return {
					content: [{ type: 'text' as const, text: error.toMarkdown() }],
					isError: true,
				};
			}
			throw error;
		}
	} catch (error) {
		return formatError(error);
	}
}

const PullPromptsSchema = z.object({
	outputDir: z
		.string()
		.optional()
		.describe('Output directory (default: ./prompts)'),
});

async function handlePullPrompts(args: {
	outputDir?: string;
}): Promise<ToolResult> {
	try {
		const outputDir = args.outputDir ? resolve(args.outputDir) : getPromptsDir();

		// Create directory if it doesn't exist
		if (!existsSync(outputDir)) {
			mkdirSync(outputDir, { recursive: true });
		}

		// Delete existing .promptl files
		const existingFiles = readdirSync(outputDir).filter((f) => f.endsWith('.promptl'));
		for (const file of existingFiles) {
			unlinkSync(join(outputDir, file));
		}

		// Get all prompts from LIVE
		const docs = await listDocuments('live');

		if (docs.length === 0) {
			return formatSuccess('No Prompts to Pull', 'The project has no prompts.');
		}

		// Fetch full content and write files
		const written: string[] = [];
		for (const doc of docs) {
			const fullDoc = await getDocument(doc.path, 'live');
			const filename = `${doc.path.replace(/\//g, '_')}.promptl`;
			const filepath = join(outputDir, filename);

			writeFileSync(filepath, fullDoc.content, 'utf-8');
			written.push(filename);
		}

		// Update cache
		cachedPromptNames = docs.map((d: { path: string }) => d.path);
		cacheLastUpdated = new Date();

		let content = `**Directory:** \`${outputDir}\`\n`;
		content += `**Deleted:** ${existingFiles.length} existing file(s)\n`;
		content += `**Written:** ${written.length} file(s)\n\n`;
		content += `### Files\n\n`;
		content += written.map((f) => `- \`${f}\``).join('\n');
		content += `\n\n**Tip:** Edit files locally, then use \`replace_prompt\` with \`filePath\` to push changes.`;

		return formatSuccess('Prompts Pulled from LIVE', content);
	} catch (error) {
		return formatError(error);
	}
}

// Dynamic description builder for replace_prompt
async function buildReplacePromptDescription(): Promise<string> {
	const names = await getCachedPromptNames();
	
	let desc = 'Replace or create a single prompt in LIVE. ';
	desc += 'Provide either `content` directly or `filePath` to read from local file.';
	desc += formatAvailablePrompts(names);
	
	return desc;
}

const ReplacePromptSchema = z.object({
	name: z
		.string()
		.optional()
		.describe('Prompt name to replace (auto-detected from filePath if not provided)'),
	content: z
		.string()
		.optional()
		.describe('New prompt content (alternative to filePath)'),
	filePath: z
		.string()
		.optional()
		.describe('Path to .promptl file to read content from (alternative to content)'),
});

async function handleReplacePrompt(args: {
	name?: string;
	content?: string;
	filePath?: string;
}): Promise<ToolResult> {
	try {
		let name = args.name;
		let content = args.content;

		// If filePath provided, read from file
		if (args.filePath) {
			const fileData = readPromptFile(args.filePath);
			content = fileData.content;
			// Use filename as name if not explicitly provided
			if (!name) {
				name = fileData.name;
			}
		}

		// Validate we have both name and content
		if (!name) {
			return formatError(new Error('Prompt name is required. Provide `name` or use `filePath` (name derived from filename).'));
		}
		if (!content) {
			return formatError(new Error('Prompt content is required. Provide either `content` or `filePath`.'));
		}

		// Check if prompt exists
		const existingDocs = await listDocuments('live');
		const exists = existingDocs.some((d: { path: string }) => d.path === name);

		const changes: DocumentChange[] = [
			{
				path: name,
				content: content,
				status: exists ? 'modified' : 'added',
			},
		];

		// Deploy to LIVE (creates branch → pushes → publishes)
		const { version } = await deployToLive(changes, `replace ${name}`);

		// Force refresh cache after mutation
		const newNames = await forceRefreshAndGetNames();

		const action = exists ? 'Replaced' : 'Created';
		let result = `**Prompt:** \`${name}\`\n`;
		result += `**Action:** ${action}\n`;
		result += `**Version:** \`${version.uuid}\`\n`;
		if (args.filePath) {
			result += `**Source:** \`${args.filePath}\`\n`;
		}
		result += `\n### Content Preview\n\n\`\`\`promptl\n${content.substring(0, 500)}${content.length > 500 ? '...' : ''}\n\`\`\``;
		result += `\n\n---\n**Current LIVE prompts (${newNames.length}):** ${newNames.map(n => `\`${n}\``).join(', ')}`;

		return formatSuccess(`Prompt ${action}`, result);
	} catch (error) {
		return formatError(error);
	}
}

const DocsSchema = z.object({
	action: z
		.enum(['help', 'get', 'find'])
		.describe('Action: help (overview), get (specific topic), find (search)'),
	topic: z
		.string()
		.optional()
		.describe('Topic name (for action: get)'),
	query: z
		.string()
		.optional()
		.describe('Search query (for action: find)'),
});

async function handleDocs(args: {
	action: 'help' | 'get' | 'find';
	topic?: string;
	query?: string;
}): Promise<ToolResult> {
	let content: string;

	switch (args.action) {
		case 'help':
			content = getHelp();
			break;

		case 'get':
			if (!args.topic) {
				return formatError(new Error('Topic is required for action: get'));
			}
			content = getDocs(args.topic);
			break;

		case 'find':
			if (!args.query) {
				return formatError(new Error('Query is required for action: find'));
			}
			content = findDocs(args.query);
			break;

		default:
			content = getHelp();
	}

	return {
		content: [{ type: 'text', text: content }],
	};
}

// ============================================================================
// Tool Registration
// ============================================================================

export async function registerTools(server: McpServer): Promise<void> {
	logger.info('Registering MCP tools...');

	// Initial cache refresh to populate available prompts
	await refreshPromptCache();

	server.registerTool(
		'list_prompts',
		{
			title: 'List Prompts',
			description: 'List all prompt names in LIVE version',
			inputSchema: ListPromptsSchema,
		},
		handleListPrompts
	);

	server.registerTool(
		'get_prompt',
		{
			title: 'Get Prompt',
			description: 'Get full prompt content by name',
			inputSchema: GetPromptSchema,
		},
		handleGetPrompt as (args: Record<string, unknown>) => Promise<ToolResult>
	);

	server.registerTool(
		'run_prompt',
		{
			title: 'Run Prompt',
			description: 'Execute a prompt with parameters',
			inputSchema: RunPromptSchema,
		},
		handleRunPrompt as (args: Record<string, unknown>) => Promise<ToolResult>
	);

	server.registerTool(
		'push_prompts',
		{
			title: 'Push Prompts',
			description:
				'Replace ALL prompts in LIVE. Provide `prompts` array OR `filePaths` to .promptl files. Creates branch → pushes → publishes automatically.',
			inputSchema: PushPromptsSchema,
		},
		handlePushPrompts as (args: Record<string, unknown>) => Promise<ToolResult>
	);

	server.registerTool(
		'append_prompts',
		{
			title: 'Append Prompts',
			description:
				'Add prompts to LIVE without removing existing. Provide `prompts` array OR `filePaths`. Use overwrite=true to replace existing.',
			inputSchema: AppendPromptsSchema,
		},
		handleAppendPrompts as (args: Record<string, unknown>) => Promise<ToolResult>
	);

	server.registerTool(
		'pull_prompts',
		{
			title: 'Pull Prompts',
			description:
				'Download all prompts from LIVE to local ./prompts/*.promptl files',
			inputSchema: PullPromptsSchema,
		},
		handlePullPrompts as (args: Record<string, unknown>) => Promise<ToolResult>
	);

	// Build dynamic description with available prompts
	const replaceDesc = await buildReplacePromptDescription();
	server.registerTool(
		'replace_prompt',
		{
			title: 'Replace Prompt',
			description: replaceDesc,
			inputSchema: ReplacePromptSchema,
		},
		handleReplacePrompt as (args: Record<string, unknown>) => Promise<ToolResult>
	);

	server.registerTool(
		'docs',
		{
			title: 'Documentation',
			description:
				'Get documentation. Actions: help (overview), get (topic), find (search)',
			inputSchema: DocsSchema,
		},
		handleDocs as (args: Record<string, unknown>) => Promise<ToolResult>
	);

	logger.info(`Registered 8 MCP tools (${cachedPromptNames.length} prompts cached)`);
}
