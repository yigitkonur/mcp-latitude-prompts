import { z } from 'zod';

/**
 * Documentation Types and Zod Schemas
 *
 * Defines schemas for the documentation tools:
 * - latitude_help: Server overview and capabilities
 * - latitude_get_docs: PromptL documentation by topic
 */

// ============================================================================
// Documentation Topic Enum
// ============================================================================

/**
 * Available documentation topics for PromptL
 */
export const DocsTopicEnum = z.enum([
	'overview',
	'structure',
	'variables',
	'conditionals',
	'loops',
	'references',
	'tools',
	'chains',
	'agents',
	'techniques',
]);

export type DocsTopic = z.infer<typeof DocsTopicEnum>;

// ============================================================================
// Tool Input Schemas
// ============================================================================

/**
 * Input schema for latitude_help tool
 * No parameters required - returns full server overview
 */
export const HelpInputSchema = z.object({});

/**
 * Input schema for latitude_get_docs tool
 * Takes a topic enum to return specific documentation
 */
export const GetDocsInputSchema = z.object({
	topic: DocsTopicEnum.describe(`PromptL documentation topic. Available topics:
  - overview: Introduction to PromptL, what it is, getting started
  - structure: Prompt structure with config section and messages
  - variables: Dynamic content with {{ }} interpolation and expressions
  - conditionals: if/else/endif logic for dynamic prompts
  - loops: for/each iteration over arrays and collections
  - references: Include other prompts with <prompt> tag
  - tools: Function calling with JSON Schema parameters
  - chains: Multi-step prompts with <step> tags
  - agents: Multi-agent orchestration and collaboration
  - techniques: Few-shot, Chain-of-Thought, Tree-of-Thoughts, Role prompting`),
});

export type GetDocsInput = z.infer<typeof GetDocsInputSchema>;

// ============================================================================
// Response Types
// ============================================================================

/**
 * Metadata returned with documentation
 */
export interface DocsMetadata {
	topic: DocsTopic;
	title: string;
	description: string;
	relatedTopics: DocsTopic[];
	suggestedTools: string[];
}

/**
 * All available documentation topics with metadata
 */
export const DOCS_TOPIC_METADATA: Record<DocsTopic, Omit<DocsMetadata, 'topic'>> = {
	overview: {
		title: 'PromptL Overview',
		description: 'Introduction to PromptL and Latitude prompt management',
		relatedTopics: ['structure', 'variables'],
		suggestedTools: ['latitude_list_projects', 'latitude_create_project'],
	},
	structure: {
		title: 'Prompt Structure',
		description: 'Config section (YAML) and Messages (system, user, assistant)',
		relatedTopics: ['overview', 'variables', 'conditionals'],
		suggestedTools: ['latitude_push_prompt', 'latitude_get_prompt'],
	},
	variables: {
		title: 'Variables & Expressions',
		description: 'Dynamic content with {{ }} syntax, assignments, and defaults',
		relatedTopics: ['conditionals', 'loops'],
		suggestedTools: ['latitude_push_prompt', 'latitude_run_prompt'],
	},
	conditionals: {
		title: 'Conditional Statements',
		description: 'if/else/endif logic for dynamic prompt content',
		relatedTopics: ['variables', 'loops'],
		suggestedTools: ['latitude_push_prompt', 'latitude_run_prompt'],
	},
	loops: {
		title: 'Loops & Iteration',
		description: 'for/each iteration over arrays for few-shot examples',
		relatedTopics: ['variables', 'conditionals', 'techniques'],
		suggestedTools: ['latitude_push_prompt', 'latitude_run_prompt'],
	},
	references: {
		title: 'Prompt References',
		description: 'Include and chain prompts with <prompt> tag',
		relatedTopics: ['chains', 'agents'],
		suggestedTools: ['latitude_list_prompts', 'latitude_push_prompt'],
	},
	tools: {
		title: 'Tool Use & Function Calling',
		description: 'Enable AI to call external functions with JSON Schema',
		relatedTopics: ['structure', 'agents'],
		suggestedTools: ['latitude_push_prompt', 'latitude_run_prompt'],
	},
	chains: {
		title: 'Chains & Multi-Step',
		description: 'Sequential reasoning with <step> tags',
		relatedTopics: ['references', 'agents', 'techniques'],
		suggestedTools: ['latitude_push_prompt', 'latitude_run_prompt'],
	},
	agents: {
		title: 'Multi-Agent Systems',
		description: 'Orchestrate multiple AI agents for complex tasks',
		relatedTopics: ['chains', 'tools', 'references'],
		suggestedTools: ['latitude_push_prompt', 'latitude_run_prompt'],
	},
	techniques: {
		title: 'Prompting Techniques',
		description: 'Few-shot, Chain-of-Thought, Tree-of-Thoughts, Role prompting',
		relatedTopics: ['loops', 'chains', 'agents'],
		suggestedTools: ['latitude_push_prompt', 'latitude_run_prompt'],
	},
};
