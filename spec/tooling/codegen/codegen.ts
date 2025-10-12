/**
 * Generate Zod schemas from JSON Schema specification
 *
 * This module provides the core codegen functionality for transforming JSON Schema
 * into TypeScript Zod schemas and types.
 */

import {mkdirSync, writeFileSync, existsSync} from 'fs';
import {resolve} from 'path';

import {generateZodSchemas, assembleGeneratedFile, generateIndexFile} from './utils';
import {loadSchema, loadConfig} from '../lib/utils/fileSystem';

/**
 * Ensures the output directory exists
 */
export const ensureOutputDirectory = (outputDir: string): void => {
	if (!existsSync(outputDir)) {
		mkdirSync(outputDir, {recursive: true});
		console.log(`📁 Created output directory: ${outputDir}`);
	}
};

/**
 * Generate Zod schemas and write them to the output directory
 */
export const runCodegen = (specDir: string, projectRoot: string): void => {
	const outputDir = resolve(projectRoot, 'lib/generated/schemas');

	console.log('🔧 Generating Zod schemas from JSON Schema...\n');

	// Load config and bundled schema
	const configPath = resolve(specDir, 'config.json');
	const schemaPath = resolve(specDir, 'schema/specification.schema.json');

	console.log(`📖 Loading config from ${configPath}`);
	const config = loadConfig(configPath);

	console.log(`📖 Loading bundled schema from ${schemaPath}`);
	const bundledSchema = loadSchema(schemaPath);

	console.log(`\n✨ Generating Zod schemas for ${Object.keys(bundledSchema.definitions || {}).length} definitions...`);

	// Generate Zod schemas
	const generated = generateZodSchemas({config, bundledSchema});

	console.log(`   Generated ${generated.schemas.length} Zod schema definitions`);
	console.log(`   Preserved ${config.discriminatedUnions.length} discriminated unions`);

	// Assemble generated file
	const fileContent = assembleGeneratedFile(generated);

	// Ensure output directory exists
	ensureOutputDirectory(outputDir);

	// Write specification.ts
	const specificationPath = resolve(outputDir, 'specification.ts');
	writeFileSync(specificationPath, fileContent, 'utf-8');
	console.log(`\n✓ Generated ${specificationPath}`);

	// Write index.ts
	const indexPath = resolve(outputDir, 'index.ts');
	const indexContent = generateIndexFile();
	writeFileSync(indexPath, indexContent, 'utf-8');
	console.log(`✓ Generated ${indexPath}`);

	console.log('\n✓ Zod schema generation complete!');
	console.log('\n📝 Usage:');
	console.log('   • Import schemas: import {ComponentSpecSchema} from "@sigil/lib/generated/schemas"');
	console.log('   • Validate data: ComponentSpecSchema.parse(data)');
	console.log('   • Import types: import type {ComponentSpec} from "@sigil/lib/generated/types"');
};
