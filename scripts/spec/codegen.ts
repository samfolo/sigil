#!/usr/bin/env tsx

/**
 * Generate Zod schemas from JSON Schema specification
 *
 * This script reads the bundled JSON Schema and config.json, then generates
 * TypeScript code with Zod schemas and inferred types. Discriminated unions
 * are handled specially using the metadata from config.json.
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { loadSchema, loadConfig } from './lib/fileSystem';
import { generateZodSchemas, assembleGeneratedFile, generateIndexFile } from './lib/codegenUtils';

// Get the project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');
const specDir = resolve(projectRoot, 'spec');
const outputDir = resolve(projectRoot, 'lib/generated/schemas');

/**
 * Ensures the output directory exists
 */
const ensureOutputDirectory = () => {
	if (!existsSync(outputDir)) {
		mkdirSync(outputDir, { recursive: true });
		console.log(`📁 Created output directory: ${outputDir}`);
	}
};

/**
 * Main codegen execution
 */
const main = () => {
	console.log('🔧 Generating Zod schemas from JSON Schema...\n');

	try {
		// Load config and bundled schema
		const configPath = resolve(specDir, 'config.json');
		const schemaPath = resolve(specDir, 'specification.schema.json');

		console.log(`📖 Loading config from ${configPath}`);
		const config = loadConfig(configPath);

		console.log(`📖 Loading bundled schema from ${schemaPath}`);
		const bundledSchema = loadSchema(schemaPath);

		console.log(`\n✨ Generating Zod schemas for ${Object.keys(bundledSchema.definitions || {}).length} definitions...`);

		// Generate Zod schemas
		const generated = generateZodSchemas({ config, bundledSchema });

		console.log(`   Generated ${generated.schemas.length} Zod schema definitions`);
		console.log(`   Preserved ${config.discriminatedUnions.length} discriminated unions`);

		// Assemble generated file
		const fileContent = assembleGeneratedFile(generated);

		// Ensure output directory exists
		ensureOutputDirectory();

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
		console.log('   • Import schemas: import { ComponentSpecSchema } from "@/lib/generated/schemas"');
		console.log('   • Validate data: ComponentSpecSchema.parse(data)');
		console.log('   • Import types: import type { ComponentSpec } from "@/lib/generated/types"');
	} catch (error) {
		console.error('\n× Error generating Zod schemas:', error);
		if (error instanceof Error) {
			console.error(error.stack);
		}
		process.exit(1);
	}
};

main();
