/**
 * MCP Tools for Latitude
 *
 * 7 Tools:
 * - list_prompts : List all prompt names in LIVE
 * - get_prompt   : Get full prompt content by name
 * - run_prompt   : Execute a prompt with parameters (dynamic prompt list + variables)
 * - push_prompts : FULL SYNC to remote (adds, modifies, DELETES remote prompts not in local)
 * - pull_prompts : FULL SYNC from remote (deletes ALL local, downloads ALL from LIVE)
 * - add_prompt   : ADDITIVE - add/overwrite prompts without deleting others (dynamic prompt list)
 * - docs         : Documentation (help, get topic, find query)
 */

import { z } from 'zod';
import {
	existsSync,
	mkdirSync,
	writeFileSync,
	readdirSync,
	unlinkSync,
	readFileSync,
	rmSync,
} from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
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
	validatePromptLContent,
	type ValidationIssue,
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
		cachedPromptNames = docs.map((d) => d.path);
		// Also cache full documents for variable extraction (avoids extra API calls)
		cachedDocuments = docs.map((d) => ({
			path: d.path,
			content: d.content,
		}));
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
	if (
		!cacheLastUpdated ||
		now.getTime() - cacheLastUpdated.getTime() > CACHE_TTL_MS
	) {
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

/**
 * Read all .promptl files from a folder.
 * Returns array of { name, content } where name is derived from filename.
 */
function readPromptsFromFolder(
	folderPath: string,
): Array<{ name: string; content: string }> {
	const resolvedPath = resolve(folderPath);
	if (!existsSync(resolvedPath)) {
		throw new Error(`Folder not found: ${resolvedPath}`);
	}

	const files = readdirSync(resolvedPath).filter((f) =>
		f.endsWith('.promptl'),
	);
	if (files.length === 0) {
		throw new Error(`No .promptl files found in: ${resolvedPath}`);
	}

	const prompts: Array<{ name: string; content: string }> = [];
	for (const file of files) {
		const filePath = join(resolvedPath, file);
		const content = readFileSync(filePath, 'utf-8');
		const name = file.replace(/\.promptl$/, '').replace(/_/g, '/');
		prompts.push({ name, content });
	}

	return prompts;
}

// Format available prompts for description
function formatAvailablePrompts(names: string[]): string {
	if (names.length === 0) {
		return '\n\n**No prompts in LIVE yet.** Use this tool to create the first one.';
	}

	const formatted = names.map((n) => `\`${n}\``).join(', ');
	return `\n\n**Available prompts (${names.length}):** ${formatted}`;
}

/**
 * Extract variable names from prompt content
 * Looks for {{ variable }} and { variable } patterns
 */
function extractVariables(content: string): string[] {
	const variables = new Set<string>();

	// Match {{ variable }} and { variable } patterns (PromptL syntax)
	const patterns = [
		/\{\{\s*(\w+)\s*\}\}/g, // {{ variable }}
		/\{\s*(\w+)\s*\}/g, // { variable }
	];

	for (const pattern of patterns) {
		let match;
		while ((match = pattern.exec(content)) !== null) {
			// Exclude control flow keywords
			const varName = match[1];
			if (
				!['if', 'else', 'each', 'let', 'end', 'for', 'unless'].includes(
					varName,
				)
			) {
				variables.add(varName);
			}
		}
	}

	return Array.from(variables);
}

// Cache for full documents (path + content) to avoid repeated API calls
let cachedDocuments: Array<{ path: string; content: string }> = [];

/**
 * Build dynamic description for run_prompt with prompt names and their variables
 * Uses cached documents to avoid individual API calls per prompt
 */
async function buildRunPromptDescription(): Promise<string> {
	// Use cached documents if available, otherwise just show names
	const names = await getCachedPromptNames();

	let desc = 'Execute a prompt with parameters.';

	if (names.length === 0) {
		desc += '\n\n**No prompts in LIVE yet.**';
		return desc;
	}

	desc += `\n\n**Available prompts (${names.length}):**`;

	// Use cached documents for variable extraction (no extra API calls)
	const maxToShow = Math.min(names.length, 10);
	const docMap = new Map(cachedDocuments.map((d) => [d.path, d.content]));

	for (let i = 0; i < maxToShow; i++) {
		const content = docMap.get(names[i]);
		if (content) {
			const vars = extractVariables(content);
			if (vars.length > 0) {
				desc += `\n- \`${names[i]}\` (params: ${vars.map((v) => `\`${v}\``).join(', ')})`;
			} else {
				desc += `\n- \`${names[i]}\` (no params)`;
			}
		} else {
			desc += `\n- \`${names[i]}\``;
		}
	}

	if (names.length > maxToShow) {
		desc += `\n- ... and ${names.length - maxToShow} more`;
	}

	return desc;
}

/**
 * Build dynamic description for add_prompt with available prompts
 */
async function buildAddPromptDescription(): Promise<string> {
	const names = await getCachedPromptNames();

	let desc = 'Add or update prompt(s) in LIVE without deleting others. ';
	desc += 'If a prompt with the same name exists, it will be overwritten. ';
	desc += 'Provide `prompts` array OR `filePaths` to .promptl files.';
	desc += formatAvailablePrompts(names);

	return desc;
}

// ============================================================================
// Pre-Validation Helper
// ============================================================================

interface PromptValidationResult {
	valid: boolean;
	errors: Array<{
		name: string;
		issues: ValidationIssue[];
	}>;
}

/**
 * Validate all prompts BEFORE pushing.
 * If ANY prompt fails validation, returns all errors and NOTHING is pushed.
 */
async function validateAllPrompts(
	prompts: Array<{ name: string; content: string }>,
): Promise<PromptValidationResult> {
	const errors: Array<{ name: string; issues: ValidationIssue[] }> = [];

	for (const prompt of prompts) {
		const issues = await validatePromptLContent(
			prompt.content,
			prompt.name,
		);
		const errorIssues = issues.filter((i) => i.type === 'error');

		if (errorIssues.length > 0) {
			errors.push({ name: prompt.name, issues: errorIssues });
		}
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

/**
 * Format validation errors into a detailed MCP-friendly error message.
 */
function formatValidationErrors(
	errors: Array<{ name: string; issues: ValidationIssue[] }>,
): ToolResult {
	const lines: string[] = [
		`## ❌ Validation Failed - No Changes Made\n`,
		`**${errors.length} prompt(s) have errors.** Fix all errors before pushing.\n`,
	];

	for (const { name, issues } of errors) {
		for (const issue of issues) {
			lines.push(`### ${name}`);
			lines.push(`**Error Code:** \`${issue.code}\``);
			lines.push(`**Error:** ${issue.message}`);
			lines.push(`**Root Cause:** ${issue.rootCause}`);

			if (issue.location) {
				lines.push(
					`**Location:** Line ${issue.location.line}, Column ${issue.location.column}`,
				);
			}

			if (issue.codeFrame) {
				lines.push(
					`**Code Context:**\n\`\`\`\n${issue.codeFrame}\n\`\`\``,
				);
			}

			lines.push(`**Fix:** ${issue.suggestion}`);
			lines.push('');
		}
	}

	lines.push(`---`);
	lines.push(`**Action Required:** Fix the errors above, then retry.`);

	return {
		content: [{ type: 'text' as const, text: lines.join('\n') }],
		isError: true,
	};
}

// ============================================================================
// Tool Handlers
// ============================================================================

const ListPromptsSchema = z.object({});

async function handleListPrompts(): Promise<ToolResult> {
	try {
		const names = await forceRefreshAndGetNames();

		if (names.length === 0) {
			return formatSuccess(
				'No Prompts Found',
				'The project has no prompts yet.',
			);
		}

		const list = names.map((n: string) => `- \`${n}\``).join('\n');
		return formatSuccess(
			`Found ${names.length} Prompt(s)`,
			`**Project ID:** \`${getProjectId()}\`\n\n${list}`,
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
	folderPath: z
		.string()
		.describe(
			'Absolute path to folder containing .promptl files. FULL SYNC: replaces ALL remote prompts with contents of this folder.',
		),
	versionName: z
		.string()
		.optional()
		.describe(
			'Optional version name (like git commit message). If omitted, auto-generates timestamp.',
		),
});

async function handlePushPrompts(args: {
	folderPath: string;
	versionName?: string;
}): Promise<ToolResult> {
	try {
		if (!args.folderPath) {
			return formatError(
				new Error(
					'folderPath is required. Provide absolute path to folder containing .promptl files.',
				),
			);
		}

		const prompts = readPromptsFromFolder(args.folderPath);
		logger.info(`Read ${prompts.length} prompt(s) from ${args.folderPath}`);

		// PRE-VALIDATE ALL PROMPTS BEFORE PUSHING
		// If ANY prompt fails validation, return errors and push NOTHING
		logger.info(`Validating ${prompts.length} prompt(s) before push...`);
		const validation = await validateAllPrompts(prompts);

		if (!validation.valid) {
			logger.warn(
				`Validation failed for ${validation.errors.length} prompt(s)`,
			);
			return formatValidationErrors(validation.errors);
		}
		logger.info(`All ${prompts.length} prompt(s) passed validation`);

		// Get existing prompts for diff computation
		const existingDocs = await listDocuments('live');

		// Compute diff - this determines what needs to be added, modified, or deleted
		const incoming = prompts.map((p) => ({
			path: p.name,
			content: p.content,
		}));
		const changes = computeDiff(incoming, existingDocs);

		// Summarize changes
		const added = changes.filter(
			(c: DocumentChange) => c.status === 'added',
		);
		const modified = changes.filter(
			(c: DocumentChange) => c.status === 'modified',
		);
		const deleted = changes.filter(
			(c: DocumentChange) => c.status === 'deleted',
		);

		if (changes.length === 0) {
			// No changes - reuse existingDocs instead of another API call
			const currentNames = existingDocs.map((d) => d.path);
			return formatSuccess(
				'No Changes Needed',
				`All ${prompts.length} prompt(s) are already up to date.\n\n` +
					`**Current LIVE prompts (${currentNames.length}):** ${currentNames.map((n) => `\`${n}\``).join(', ')}`,
			);
		}

		// Push all changes in one batch
		try {
			const result = await deployToLive(
				changes,
				args.versionName || 'push',
			);

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

			content += `---\n**Current LIVE prompts (${newNames.length}):** ${newNames.map((n) => `\`${n}\``).join(', ')}`;

			return formatSuccess('Prompts Pushed to LIVE', content);
		} catch (error) {
			// Detailed error from API
			if (error instanceof LatitudeApiError) {
				return {
					content: [
						{ type: 'text' as const, text: error.toMarkdown() },
					],
					isError: true,
				};
			}
			throw error;
		}
	} catch (error) {
		return formatError(error);
	}
}

const AddPromptSchema = z.object({
	prompts: z
		.array(
			z.object({
				name: z
					.string()
					.describe(
						'Prompt name/path (e.g. "my-prompt" or "folder/prompt")',
					),
				content: z
					.string()
					.describe('Full prompt content in PromptL format'),
			}),
		)
		.describe(
			'Prompts to add/update. Gets remote state, merges these prompts, then pushes all.',
		),
	versionName: z
		.string()
		.optional()
		.describe('Optional version name (like git commit message).'),
});

/**
 * Add prompts using CLI-style approach:
 * 1. Get ALL remote prompts
 * 2. Merge new prompts into remote state (in /tmp)
 * 3. Push ALL back as full sync
 */
async function handleAddPrompt(args: {
	prompts: Array<{ name: string; content: string }>;
	versionName?: string;
}): Promise<ToolResult> {
	const tempDir = join(tmpdir(), `latitude-add-${Date.now()}`);

	try {
		if (!args.prompts || args.prompts.length === 0) {
			return formatError(new Error('prompts array is required.'));
		}

		logger.info(
			`Add prompt: merging ${args.prompts.length} prompt(s) with remote state`,
		);

		const existingDocs = await listDocuments('live');
		logger.info(
			`Fetched ${existingDocs.length} existing prompt(s) from remote`,
		);

		mkdirSync(tempDir, { recursive: true });

		for (const doc of existingDocs) {
			const filename = `${doc.path.replace(/\//g, '_')}.promptl`;
			writeFileSync(join(tempDir, filename), doc.content, 'utf-8');
		}

		for (const prompt of args.prompts) {
			const filename = `${prompt.name.replace(/\//g, '_')}.promptl`;
			writeFileSync(join(tempDir, filename), prompt.content, 'utf-8');
		}

		const mergedPrompts = readPromptsFromFolder(tempDir);
		logger.info(`Merged state: ${mergedPrompts.length} total prompt(s)`);

		logger.info(
			`Validating ${mergedPrompts.length} prompt(s) before push...`,
		);
		const validation = await validateAllPrompts(mergedPrompts);

		if (!validation.valid) {
			logger.warn(
				`Validation failed for ${validation.errors.length} prompt(s)`,
			);
			return formatValidationErrors(validation.errors);
		}

		const incoming = mergedPrompts.map((p) => ({
			path: p.name,
			content: p.content,
		}));
		const changes = computeDiff(incoming, existingDocs);

		const added = changes.filter(
			(c: DocumentChange) => c.status === 'added',
		);
		const modified = changes.filter(
			(c: DocumentChange) => c.status === 'modified',
		);

		if (changes.length === 0) {
			const currentNames = existingDocs.map((d) => d.path);
			return formatSuccess(
				'No Changes Needed',
				`All prompt(s) are already up to date.\n\n` +
					`**Current LIVE prompts (${currentNames.length}):** ${currentNames.map((n) => `\`${n}\``).join(', ')}`,
			);
		}

		const result = await deployToLive(changes, args.versionName || 'add');
		const newNames = await forceRefreshAndGetNames();

		let content = `**Summary:**\n`;
		content += `- Added: ${added.length}\n`;
		content += `- Updated: ${modified.length}\n`;
		content += `- Documents processed: ${result.documentsProcessed}\n\n`;

		if (added.length > 0) {
			content += `### Added\n${added.map((c: DocumentChange) => `- \`${c.path}\``).join('\n')}\n\n`;
		}
		if (modified.length > 0) {
			content += `### Updated\n${modified.map((c: DocumentChange) => `- \`${c.path}\``).join('\n')}\n\n`;
		}

		content += `---\n**Current LIVE prompts (${newNames.length}):** ${newNames.map((n) => `\`${n}\``).join(', ')}`;

		return formatSuccess('Prompts Added to LIVE', content);
	} catch (error) {
		if (error instanceof LatitudeApiError) {
			return {
				content: [{ type: 'text' as const, text: error.toMarkdown() }],
				isError: true,
			};
		}
		return formatError(error);
	} finally {
		if (existsSync(tempDir)) {
			try {
				rmSync(tempDir, { recursive: true, force: true });
			} catch {}
		}
	}
}

const PullPromptsSchema = z.object({
	outputDir: z
		.string()
		.optional()
		.describe(
			'Output directory (default: ./prompts) - FULL SYNC: deletes ALL local .promptl files first',
		),
});

async function handlePullPrompts(args: {
	outputDir?: string;
}): Promise<ToolResult> {
	try {
		const outputDir = args.outputDir
			? resolve(args.outputDir)
			: getPromptsDir();

		// Create directory if it doesn't exist
		if (!existsSync(outputDir)) {
			mkdirSync(outputDir, { recursive: true });
		}

		// Delete existing .promptl files
		const existingFiles = readdirSync(outputDir).filter((f) =>
			f.endsWith('.promptl'),
		);
		for (const file of existingFiles) {
			unlinkSync(join(outputDir, file));
		}

		// Get all prompts from LIVE (includes full content)
		const docs = await listDocuments('live');

		if (docs.length === 0) {
			return formatSuccess(
				'No Prompts to Pull',
				'The project has no prompts.',
			);
		}

		// Write files directly - listDocuments already returns full content
		const written: string[] = [];
		for (const doc of docs) {
			const filename = `${doc.path.replace(/\//g, '_')}.promptl`;
			const filepath = join(outputDir, filename);

			writeFileSync(filepath, doc.content, 'utf-8');
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
		content += `\n\n**Tip:** Edit files locally, then use \`add_prompt\` with \`filePaths\` to push changes.`;

		return formatSuccess('Prompts Pulled from LIVE', content);
	} catch (error) {
		return formatError(error);
	}
}

const DocsSchema = z.object({
	action: z
		.enum(['help', 'get', 'find'])
		.describe(
			'Action: help (overview), get (specific topic), find (search)',
		),
	topic: z.string().optional().describe('Topic name (for action: get)'),
	query: z.string().optional().describe('Search query (for action: find)'),
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
				return formatError(
					new Error('Topic is required for action: get'),
				);
			}
			content = getDocs(args.topic);
			break;

		case 'find':
			if (!args.query) {
				return formatError(
					new Error('Query is required for action: find'),
				);
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
		handleListPrompts,
	);

	server.registerTool(
		'get_prompt',
		{
			title: 'Get Prompt',
			description: 'Get full prompt content by name',
			inputSchema: GetPromptSchema,
		},
		handleGetPrompt as (
			args: Record<string, unknown>,
		) => Promise<ToolResult>,
	);

	// Build dynamic description with prompt names and their variables
	const runDesc = await buildRunPromptDescription();
	server.registerTool(
		'run_prompt',
		{
			title: 'Run Prompt',
			description: runDesc,
			inputSchema: RunPromptSchema,
		},
		handleRunPrompt as (
			args: Record<string, unknown>,
		) => Promise<ToolResult>,
	);

	server.registerTool(
		'push_prompts',
		{
			title: 'Push Prompts (FULL SYNC)',
			description:
				'FULL SYNC: Replace ALL prompts in LIVE. Deletes remote prompts not in your list. Use for initialization or complete sync.',
			inputSchema: PushPromptsSchema,
		},
		handlePushPrompts as (
			args: Record<string, unknown>,
		) => Promise<ToolResult>,
	);

	server.registerTool(
		'pull_prompts',
		{
			title: 'Pull Prompts (FULL SYNC)',
			description:
				'FULL SYNC: Download all prompts from LIVE to local ./prompts/*.promptl files. Deletes existing local files first.',
			inputSchema: PullPromptsSchema,
		},
		handlePullPrompts as (
			args: Record<string, unknown>,
		) => Promise<ToolResult>,
	);

	// Build dynamic description with available prompts
	const addDesc = await buildAddPromptDescription();
	server.registerTool(
		'add_prompt',
		{
			title: 'Add/Update Prompt',
			description: addDesc,
			inputSchema: AddPromptSchema,
		},
		handleAddPrompt as (
			args: Record<string, unknown>,
		) => Promise<ToolResult>,
	);

	server.registerTool(
		'docs',
		{
			title: 'Documentation',
			description:
				'Get documentation. Actions: help (overview), get (topic), find (search)',
			inputSchema: DocsSchema,
		},
		handleDocs as (args: Record<string, unknown>) => Promise<ToolResult>,
	);

	logger.info(
		`Registered 7 MCP tools (${cachedPromptNames.length} prompts cached)`,
	);
}
