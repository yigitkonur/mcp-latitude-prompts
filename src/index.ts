#!/usr/bin/env node
/**
 * Latitude MCP Server - Simplified Entry Point
 * 
 * Environment Variables:
 * - LATITUDE_API_KEY (required): Your Latitude API key
 * - LATITUDE_PROJECT_ID (required): Target project ID
 * - LATITUDE_BASE_URL (optional): API base URL (default: https://gateway.latitude.so)
 */

import { startServer, setupGracefulShutdown } from './server.js';
import { config } from './utils/config.util.js';
import { Logger } from './utils/logger.util.js';

const logger = Logger.forContext('index.ts');

async function main(): Promise<void> {
	// Load configuration
	config.load();

	// Setup graceful shutdown handlers
	setupGracefulShutdown();

	// Log startup info
	logger.info('='.repeat(50));
	logger.info('Latitude MCP Server v3.1.0');
	logger.info('='.repeat(50));

	// Validate required environment variables
	const apiKey = config.get('LATITUDE_API_KEY');
	const projectId = config.get('LATITUDE_PROJECT_ID');

	if (!apiKey) {
		console.error('❌ LATITUDE_API_KEY is required');
		console.error('\nSet it in your environment:');
		console.error('  export LATITUDE_API_KEY=your-api-key');
		process.exit(1);
	}

	if (!projectId) {
		console.error('❌ LATITUDE_PROJECT_ID is required');
		console.error('\nSet it in your environment:');
		console.error('  export LATITUDE_PROJECT_ID=your-project-id');
		process.exit(1);
	}

	logger.info(`Project ID: ${projectId}`);
	logger.info('Starting MCP server...');

	// Start the server
	await startServer();
}

// Run
main().catch((error) => {
	logger.error('Fatal error', error);
	console.error('Fatal error:', error);
	process.exit(1);
});
