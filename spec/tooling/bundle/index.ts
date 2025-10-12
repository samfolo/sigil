#!/usr/bin/env tsx

/**
 * Bundle JSON Schema fragments into a single specification file
 *
 * This script reads all schema fragments from spec/schema/fragments/ and combines them
 * into a single bundled schema at spec/schema/specification.schema.json, resolving all
 * cross-file $ref references.
 */

import {resolve, dirname} from 'path';
import {fileURLToPath} from 'url';

import {writeJson} from '../lib/utils/fileSystem';

import {bundleSchemas} from './bundle';

// Get the spec directory (parent of tooling/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const specDir = resolve(__dirname, '../..');
const fragmentsDir = resolve(specDir, 'schema/fragments');

/**
 * Main execution
 */
const main = () => {
	console.log('🔄 Bundling schema fragments...\n');

	try {
		const bundled = bundleSchemas(fragmentsDir);

		const outputPath = resolve(specDir, 'schema/specification.schema.json');
		writeJson(outputPath, bundled);

		console.log('\n✓ Schema bundled successfully!');
		console.log(`   Output: ${outputPath}`);
		console.log(`   Total definitions: ${Object.keys(bundled.definitions || {}).length}`);
	} catch (error) {
		console.error('× Error bundling schema:', error);
		process.exit(1);
	}
};

main();
