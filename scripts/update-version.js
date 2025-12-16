#!/usr/bin/env node

/**
 * Update version in package.json
 * This script is used by semantic-release to update the version before publishing
 */

const fs = require('fs');
const path = require('path');

// Get version from command line argument
const version = process.argv[2];

if (!version) {
  console.error('Error: Version argument is required');
  process.exit(1);
}

// Read package.json
const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

// Update version
packageJson.version = version;

// Write back to package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`Updated version to ${version}`);
