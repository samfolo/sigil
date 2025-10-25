#!/usr/bin/env tsx

/**
 * Validate JSON Schema fragments
 *
 * This script validates:
 * 1. All fragments are valid JSON
 * 2. All $ref references can be resolved
 * 3. Schema structure matches config.json
 * 4. All discriminated unions are properly defined
 */

import {resolve, dirname} from 'path';
import {fileURLToPath} from 'url';

import {createLogger} from './lib/logger';
import {loadConfig} from './lib/utils/fileSystem';
import {validateFragmentsExist, validateReferences, validateDiscriminatedUnions} from './lib/utils/validation';

// Get the spec directory (parent of tooling/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const specDir = resolve(__dirname, '..');
const configPath = resolve(specDir, 'config.json');

/**
 * Main validation
 */
const main = () => {
	console.log('🔍 Validating Sigil specification...\n');

	const logger = createLogger();

	try {
		// Load and validate config
		const config = loadConfig(configPath);
		logger.success('config.json is valid JSON\n');

		// Run validations
		validateFragmentsExist(config, specDir, logger);
		console.log('');

		validateReferences(config, specDir, logger);
		console.log('');

		validateDiscriminatedUnions(config, specDir, logger);
		console.log('');

		// Summary
		if (!logger.hasErrors()) {
			console.log('✓ All validations passed!');
			process.exit(0);
		} else {
			console.log(`× Validation failed with ${logger.getErrorCount()} error(s)`);
			process.exit(1);
		}
	} catch (error) {
		logger.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
};

main();
