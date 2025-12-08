import { readFileSync, existsSync } from 'fs';
import { resolve, basename, extname } from 'path';
import { Logger } from '../utils/logger.util.js';
import latitudeService from '../services/vendor.latitude.service.js';
import {
	handleControllerError,
	buildErrorContext,
} from '../utils/error-handler.util.js';
import { applyJqFilter, toOutputString } from '../utils/jq.util.js';
import { DocumentChange } from '../types/latitude.types.js';

/**
 * Derive prompt path from filename
 * e.g., "/path/to/my-prompt.md" → "my-prompt"
 */
function derivePromptPath(filePath: string): string {
	const base = basename(filePath);
	const ext = extname(base);
	// Remove .md, .promptl, .txt extensions
	if (['.md', '.promptl', '.txt'].includes(ext)) {
		return base.slice(0, -ext.length);
	}
	return base;
}

/**
 * Scan directory recursively for prompt files
 * Returns array of absolute paths to .md, .promptl, .txt files
 */
function scanDirectoryForPrompts(directory: string): string[] {
	const { readdirSync } = require('fs');
	const { join } = require('path');
	
	const absoluteDir = resolve(directory);
	if (!existsSync(absoluteDir)) {
		throw new Error(`Directory not found: ${absoluteDir}`);
	}

	const promptExtensions = ['.md', '.promptl', '.txt'];
	const files: string[] = [];

	function scan(dir: string) {
		const entries = readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = join(dir, entry.name);
			if (entry.isDirectory()) {
				scan(fullPath);
			} else if (entry.isFile()) {
				const ext = extname(entry.name);
				if (promptExtensions.includes(ext)) {
					files.push(fullPath);
				}
			}
		}
	}

	scan(absoluteDir);
	return files;
}

/**
 * Output format type
 */
type OutputFormat = 'toon' | 'json';

/**
 * Controller response type
 */
interface ControllerResponse {
	content: string;
}

/**
 * Common controller options
 */
interface ControllerOptions {
	jq?: string;
	outputFormat?: OutputFormat;
}

/**
 * Format output data consistently
 */
async function formatOutput(
	data: unknown,
	options: ControllerOptions = {},
): Promise<ControllerResponse> {
	const filteredData = applyJqFilter(data, options.jq);
	const useToon = options.outputFormat !== 'json';
	const content = await toOutputString(filteredData, useToon);
	return { content };
}

// ============================================================================
// Projects Controller
// ============================================================================

async function listProjects(
	options: ControllerOptions = {},
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/latitude.controller.ts',
		'listProjects',
	);
	methodLogger.debug('Listing all projects');

	try {
		const projects = await latitudeService.listProjects();
		return formatOutput(projects, options);
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Latitude',
				'listProjects',
				'controllers/latitude.controller.ts@listProjects',
				'projects',
				{},
			),
		);
	}
}

async function createProject(
	args: { name: string } & ControllerOptions,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/latitude.controller.ts',
		'createProject',
	);
	methodLogger.debug(`Creating project: ${args.name}`);

	try {
		const project = await latitudeService.createProject(args.name);
		return formatOutput(project, args);
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Latitude',
				'createProject',
				'controllers/latitude.controller.ts@createProject',
				args.name,
				{ args },
			),
		);
	}
}

// ============================================================================
// Versions Controller
// ============================================================================

async function listVersions(
	args: { projectId: string } & ControllerOptions,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/latitude.controller.ts',
		'listVersions',
	);
	methodLogger.debug(`Listing versions for project: ${args.projectId}`);

	try {
		const versions = await latitudeService.listVersions(args.projectId);
		return formatOutput(versions, args);
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Latitude',
				'listVersions',
				'controllers/latitude.controller.ts@listVersions',
				args.projectId,
				{ args },
			),
		);
	}
}

async function getVersion(
	args: { projectId: string; versionUuid: string } & ControllerOptions,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/latitude.controller.ts',
		'getVersion',
	);
	methodLogger.debug(`Getting version: ${args.versionUuid}`);

	try {
		const version = await latitudeService.getVersion(
			args.projectId,
			args.versionUuid,
		);
		return formatOutput(version, args);
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Latitude',
				'getVersion',
				'controllers/latitude.controller.ts@getVersion',
				args.versionUuid,
				{ args },
			),
		);
	}
}

async function createVersion(
	args: { projectId: string; name: string } & ControllerOptions,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/latitude.controller.ts',
		'createVersion',
	);
	methodLogger.debug(`Creating version: ${args.name}`);

	try {
		const version = await latitudeService.createVersion(
			args.projectId,
			args.name,
		);
		return formatOutput(version, args);
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Latitude',
				'createVersion',
				'controllers/latitude.controller.ts@createVersion',
				args.name,
				{ args },
			),
		);
	}
}

async function publishVersion(
	args: {
		projectId: string;
		versionUuid: string;
		title?: string;
		description?: string;
	} & ControllerOptions,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/latitude.controller.ts',
		'publishVersion',
	);
	methodLogger.debug(`Publishing version: ${args.versionUuid}`);

	try {
		const version = await latitudeService.publishVersion(
			args.projectId,
			args.versionUuid,
			{ title: args.title, description: args.description },
		);
		return formatOutput(version, args);
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Latitude',
				'publishVersion',
				'controllers/latitude.controller.ts@publishVersion',
				args.versionUuid,
				{ args },
			),
		);
	}
}

async function pushChanges(
	args: {
		projectId: string;
		versionUuid: string;
		changes: DocumentChange[];
	} & ControllerOptions,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/latitude.controller.ts',
		'pushChanges',
	);
	methodLogger.debug(`Pushing ${args.changes.length} changes`);

	try {
		const result = await latitudeService.pushChanges(
			args.projectId,
			args.versionUuid,
			{ changes: args.changes },
		);
		return formatOutput(result, args);
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Latitude',
				'pushChanges',
				'controllers/latitude.controller.ts@pushChanges',
				args.versionUuid,
				{ args },
			),
		);
	}
}

// ============================================================================
// Documents/Prompts Controller
// ============================================================================

async function listPrompts(
	args: { projectId: string; versionUuid: string } & ControllerOptions,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/latitude.controller.ts',
		'listPrompts',
	);
	methodLogger.debug(`Listing prompts for version: ${args.versionUuid}`);

	try {
		const documents = await latitudeService.listDocuments(
			args.projectId,
			args.versionUuid,
		);
		return formatOutput(documents, args);
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Latitude',
				'listPrompts',
				'controllers/latitude.controller.ts@listPrompts',
				args.versionUuid,
				{ args },
			),
		);
	}
}

async function getPrompt(
	args: {
		projectId: string;
		versionUuid: string;
		path: string;
	} & ControllerOptions,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/latitude.controller.ts',
		'getPrompt',
	);
	methodLogger.debug(`Getting prompt: ${args.path}`);

	try {
		const document = await latitudeService.getDocument(
			args.projectId,
			args.versionUuid,
			args.path,
		);
		return formatOutput(document, args);
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Latitude',
				'getPrompt',
				'controllers/latitude.controller.ts@getPrompt',
				args.path,
				{ args },
			),
		);
	}
}

async function pushPrompt(
	args: {
		projectId: string;
		versionUuid: string;
		path: string;
		content: string;
		force?: boolean;
	} & ControllerOptions,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/latitude.controller.ts',
		'pushPrompt',
	);
	methodLogger.debug(`Pushing prompt: ${args.path}`);

	try {
		const document = await latitudeService.createOrUpdateDocument(
			args.projectId,
			args.versionUuid,
			args.path,
			args.content,
			args.force,
		);
		return formatOutput(document, args);
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Latitude',
				'pushPrompt',
				'controllers/latitude.controller.ts@pushPrompt',
				args.path,
				{ args },
			),
		);
	}
}

async function pushPromptFromFile(
	args: {
		projectId: string;
		versionUuid: string;
		filePath: string;
		promptPath?: string;
		force?: boolean;
	} & ControllerOptions,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/latitude.controller.ts',
		'pushPromptFromFile',
	);

	// Resolve and validate file path
	const absolutePath = resolve(args.filePath);
	if (!existsSync(absolutePath)) {
		throw new Error(`File not found: ${absolutePath}`);
	}

	// Read file content
	const content = readFileSync(absolutePath, 'utf-8');

	// Derive prompt path from filename if not provided
	const promptPath = args.promptPath || derivePromptPath(args.filePath);

	methodLogger.debug(
		`Pushing prompt from file: ${absolutePath} → ${promptPath}`,
	);

	try {
		const document = await latitudeService.createOrUpdateDocument(
			args.projectId,
			args.versionUuid,
			promptPath,
			content,
			args.force,
		);

		// Include file info in response
		const result = {
			...document,
			_meta: {
				sourceFile: absolutePath,
				promptPath,
				contentLength: content.length,
			},
		};

		return formatOutput(result, args);
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Latitude',
				'pushPromptFromFile',
				'controllers/latitude.controller.ts@pushPromptFromFile',
				absolutePath,
				{ args },
			),
		);
	}
}

async function runPrompt(
	args: {
		projectId: string;
		versionUuid: string;
		path: string;
		parameters?: Record<string, unknown>;
		stream?: boolean;
		tools?: string[];
		userMessage?: string;
	} & ControllerOptions,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/latitude.controller.ts',
		'runPrompt',
	);
	methodLogger.debug(`Running prompt: ${args.path}`);

	try {
		const result = await latitudeService.runDocument(
			args.projectId,
			args.versionUuid,
			{
				path: args.path,
				parameters: args.parameters,
				stream: args.stream,
				tools: args.tools,
				userMessage: args.userMessage,
			},
		);

		// Handle streaming response
		if (
			args.stream &&
			result &&
			typeof result === 'object' &&
			Symbol.asyncIterator in result
		) {
			const chunks: string[] = [];
			for await (const chunk of result as AsyncIterable<string>) {
				chunks.push(chunk);
			}
			return { content: chunks.join('') };
		}

		return formatOutput(result, args);
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Latitude',
				'runPrompt',
				'controllers/latitude.controller.ts@runPrompt',
				args.path,
				{ args },
			),
		);
	}
}

async function pushPromptsFromFiles(
	args: {
		projectId: string;
		versionUuid: string;
		filePaths?: string[];
		directory?: string;
		promptPathPrefix?: string;
		force?: boolean;
	} & ControllerOptions,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/latitude.controller.ts',
		'pushPromptsFromFiles',
	);

	// Resolve file paths from directory or use provided filePaths
	let resolvedFilePaths: string[];
	if (args.directory) {
		methodLogger.debug(`Scanning directory: ${args.directory}`);
		resolvedFilePaths = scanDirectoryForPrompts(args.directory);
		methodLogger.debug(`Found ${resolvedFilePaths.length} prompt files`);
	} else if (args.filePaths) {
		resolvedFilePaths = args.filePaths;
	} else {
		throw new Error('Either filePaths or directory must be provided');
	}

	methodLogger.debug(
		`Pushing ${resolvedFilePaths.length} files to version: ${args.versionUuid}`,
	);

	try {
		const results: Array<{
			filePath: string;
			promptPath: string;
			status: 'success' | 'error';
			error?: string;
		}> = [];

		// Build changes array for batch push
		const changes: Array<{
			path: string;
			content: string;
			status: 'added' | 'modified' | 'deleted' | 'unchanged';
		}> = [];

		for (const filePath of resolvedFilePaths) {
			const absolutePath = resolve(filePath);

			if (!existsSync(absolutePath)) {
				results.push({
					filePath: absolutePath,
					promptPath: '',
					status: 'error',
					error: `File not found: ${absolutePath}`,
				});
				continue;
			}

			try {
				const content = readFileSync(absolutePath, 'utf-8');
				let promptPath = derivePromptPath(filePath);

				// Add prefix if provided
				if (args.promptPathPrefix) {
					const prefix = args.promptPathPrefix.endsWith('/')
						? args.promptPathPrefix
						: args.promptPathPrefix + '/';
					promptPath = prefix + promptPath;
				}

				changes.push({
					path: promptPath,
					content,
					status: 'modified',
				});

				results.push({
					filePath: absolutePath,
					promptPath,
					status: 'success',
				});
			} catch (fileError) {
				results.push({
					filePath: absolutePath,
					promptPath: '',
					status: 'error',
					error:
						fileError instanceof Error
							? fileError.message
							: String(fileError),
				});
			}
		}

		// Push all changes in batch
		if (changes.length > 0) {
			await latitudeService.pushChanges(args.projectId, args.versionUuid, {
				changes,
			});
		}

		const successCount = results.filter((r) => r.status === 'success').length;
		const errorCount = results.filter((r) => r.status === 'error').length;

		return formatOutput(
			{
				summary: {
					total: resolvedFilePaths.length,
					success: successCount,
					errors: errorCount,
				},
				results,
				versionUuid: args.versionUuid,
			},
			args,
		);
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Latitude',
				'pushPromptsFromFiles',
				'controllers/latitude.controller.ts@pushPromptsFromFiles',
				args.versionUuid,
				{ args },
			),
		);
	}
}

async function deployPrompts(
	args: {
		projectId: string;
		filePaths?: string[];
		directory?: string;
		promptPathPrefix?: string;
		versionName?: string;
		publishTitle?: string;
		publishDescription?: string;
	} & ControllerOptions,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/latitude.controller.ts',
		'deployPrompts',
	);

	// Resolve file paths from directory or use provided filePaths
	let resolvedFilePaths: string[];
	if (args.directory) {
		methodLogger.debug(`Scanning directory: ${args.directory}`);
		resolvedFilePaths = scanDirectoryForPrompts(args.directory);
		methodLogger.debug(`Found ${resolvedFilePaths.length} prompt files`);
	} else if (args.filePaths) {
		resolvedFilePaths = args.filePaths;
	} else {
		throw new Error('Either filePaths or directory must be provided');
	}

	methodLogger.debug(
		`Deploying ${resolvedFilePaths.length} prompts to production`,
	);

	try {
		// Step 1: Create draft version
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const versionName = args.versionName || `Deploy ${timestamp}`;

		methodLogger.debug(`Creating draft version: ${versionName}`);
		const draftVersion = await latitudeService.createVersion(
			args.projectId,
			versionName,
		);

		// Step 2: Read files and build changes
		const changes: Array<{
			path: string;
			content: string;
			status: 'added' | 'modified' | 'deleted' | 'unchanged';
		}> = [];
		const fileResults: Array<{
			filePath: string;
			promptPath: string;
			status: 'success' | 'error';
			error?: string;
		}> = [];

		for (const filePath of resolvedFilePaths) {
			const absolutePath = resolve(filePath);

			if (!existsSync(absolutePath)) {
				fileResults.push({
					filePath: absolutePath,
					promptPath: '',
					status: 'error',
					error: `File not found: ${absolutePath}`,
				});
				continue;
			}

			try {
				const content = readFileSync(absolutePath, 'utf-8');
				let promptPath = derivePromptPath(filePath);

				if (args.promptPathPrefix) {
					const prefix = args.promptPathPrefix.endsWith('/')
						? args.promptPathPrefix
						: args.promptPathPrefix + '/';
					promptPath = prefix + promptPath;
				}

				changes.push({
					path: promptPath,
					content,
					status: 'modified',
				});

				fileResults.push({
					filePath: absolutePath,
					promptPath,
					status: 'success',
				});
			} catch (fileError) {
				fileResults.push({
					filePath: absolutePath,
					promptPath: '',
					status: 'error',
					error:
						fileError instanceof Error
							? fileError.message
							: String(fileError),
				});
			}
		}

		// Check if we have any files to push
		if (changes.length === 0) {
			throw new Error(
				'No valid files to deploy. All files either not found or failed to read.',
			);
		}

		// Step 3: Push all changes in batch
		methodLogger.debug(`Pushing ${changes.length} prompts to draft`);
		await latitudeService.pushChanges(args.projectId, draftVersion.uuid, {
			changes,
		});

		// Step 4: Publish to production
		methodLogger.debug('Publishing draft to production');
		const publishedVersion = await latitudeService.publishVersion(
			args.projectId,
			draftVersion.uuid,
			{
				title: args.publishTitle || `Deploy ${changes.length} prompts`,
				description:
					args.publishDescription ||
					`Deployed prompts: ${changes.map((c) => c.path).join(', ')}`,
			},
		);

		return formatOutput(
			{
				status: 'deployed',
				version: {
					uuid: publishedVersion.uuid,
					title: publishedVersion.title,
					mergedAt: publishedVersion.mergedAt,
				},
				summary: {
					total: resolvedFilePaths.length,
					deployed: changes.length,
					errors: fileResults.filter((r) => r.status === 'error').length,
				},
				files: fileResults,
			},
			args,
		);
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Latitude',
				'deployPrompts',
				'controllers/latitude.controller.ts@deployPrompts',
				'production deployment',
				{ args },
			),
		);
	}
}

async function createLog(
	args: {
		projectId: string;
		versionUuid: string;
		path: string;
		messages: Array<{ role: string; content: string }>;
	} & ControllerOptions,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/latitude.controller.ts',
		'createLog',
	);
	methodLogger.debug(`Creating log for: ${args.path}`);

	try {
		const result = await latitudeService.createDocumentLog(
			args.projectId,
			args.versionUuid,
			args.path,
			args.messages,
		);
		return formatOutput(result, args);
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Latitude',
				'createLog',
				'controllers/latitude.controller.ts@createLog',
				args.path,
				{ args },
			),
		);
	}
}

// ============================================================================
// Conversations Controller
// ============================================================================

async function getConversation(
	args: { conversationUuid: string } & ControllerOptions,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/latitude.controller.ts',
		'getConversation',
	);
	methodLogger.debug(`Getting conversation: ${args.conversationUuid}`);

	try {
		const conversation = await latitudeService.getConversation(
			args.conversationUuid,
		);
		return formatOutput(conversation, args);
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Latitude',
				'getConversation',
				'controllers/latitude.controller.ts@getConversation',
				args.conversationUuid,
				{ args },
			),
		);
	}
}

async function chat(
	args: {
		conversationUuid: string;
		message: string;
		stream?: boolean;
	} & ControllerOptions,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/latitude.controller.ts',
		'chat',
	);
	methodLogger.debug(`Chatting in conversation: ${args.conversationUuid}`);

	try {
		const messages = [{ role: 'user', content: args.message }];
		const result = await latitudeService.chatConversation(
			args.conversationUuid,
			messages,
			args.stream,
		);

		// Handle streaming response
		if (
			args.stream &&
			result &&
			typeof result === 'object' &&
			Symbol.asyncIterator in result
		) {
			const chunks: string[] = [];
			for await (const chunk of result as AsyncIterable<string>) {
				chunks.push(chunk);
			}
			return { content: chunks.join('') };
		}

		return formatOutput(result, args);
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Latitude',
				'chat',
				'controllers/latitude.controller.ts@chat',
				args.conversationUuid,
				{ args },
			),
		);
	}
}

async function stopConversation(
	args: { conversationUuid: string } & ControllerOptions,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/latitude.controller.ts',
		'stopConversation',
	);
	methodLogger.debug(`Stopping conversation: ${args.conversationUuid}`);

	try {
		const result = await latitudeService.stopConversation(
			args.conversationUuid,
		);
		return formatOutput(result, args);
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Latitude',
				'stopConversation',
				'controllers/latitude.controller.ts@stopConversation',
				args.conversationUuid,
				{ args },
			),
		);
	}
}

// ============================================================================
// Export Controller
// ============================================================================

export default {
	// Projects
	listProjects,
	createProject,

	// Versions
	listVersions,
	getVersion,
	createVersion,
	publishVersion,
	pushChanges,

	// Documents/Prompts
	listPrompts,
	getPrompt,
	pushPrompt,
	pushPromptFromFile,
	pushPromptsFromFiles,
	runPrompt,
	createLog,

	// Deployment
	deployPrompts,

	// Conversations
	getConversation,
	chat,
	stopConversation,
};
