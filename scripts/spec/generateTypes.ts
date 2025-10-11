#!/usr/bin/env tsx

/**
 * Generate TypeScript interfaces from JSON Schema specification
 *
 * This script reads the bundled JSON Schema and generates clean TypeScript
 * interface definitions that serve as the canonical types for the application.
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { compile } from 'json-schema-to-typescript';
import $RefParser from '@apidevtools/json-schema-ref-parser';
import { loadSchema } from './lib/fileSystem';

// Get the project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');
const specDir = resolve(projectRoot, 'spec');
const outputDir = resolve(projectRoot, 'lib/generated/types');

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
 * Main type generation execution
 */
const main = async () => {
	console.log('🔧 Generating TypeScript interfaces from JSON Schema...\n');

	try {
		// Load bundled schema
		const schemaPath = resolve(specDir, 'specification.schema.json');
		console.log(`📖 Loading bundled schema from ${schemaPath}`);
		const bundledSchema = loadSchema(schemaPath);

		console.log(`\n✨ Resolving $ref references...`);
		// Dereference all $ref entries to get a fully resolved schema
		const dereferencedSchema = await $RefParser.dereference(schemaPath) as any;

		console.log(`✨ Generating TypeScript interfaces for ${Object.keys(bundledSchema.definitions || {}).length} definitions...`);

		// Generate TypeScript interfaces
		const typescript = await compile(dereferencedSchema, 'ComponentSpec', {
			bannerComment: `/**
 * Generated TypeScript interfaces from JSON Schema specification
 * DO NOT EDIT MANUALLY - This file is auto-generated
 * Run \`npm run spec:types\` to regenerate
 */`,
			style: {
				tabWidth: 2,
				useTabs: true,
			},
			// Don't validate the schema, we already do this in spec:validate
			unknownAny: false,
			// Use string literals for enums
			unreachableDefinitions: true,
		});

		// Ensure output directory exists
		ensureOutputDirectory();

		// Write specification.d.ts
		const typesPath = resolve(outputDir, 'specification.d.ts');
		writeFileSync(typesPath, typescript, 'utf-8');
		console.log(`\n✓ Generated ${typesPath}`);

		// Write index.d.ts that re-exports everything
		const indexPath = resolve(outputDir, 'index.d.ts');
		const indexContent = `/**
 * Generated TypeScript types
 * DO NOT EDIT MANUALLY
 */

export * from './specification';
`;
		writeFileSync(indexPath, indexContent, 'utf-8');
		console.log(`✓ Generated ${indexPath}`);

		console.log('\n🎉 TypeScript interface generation complete!');
		console.log('\n📝 Next steps:');
		console.log('   1. Import types: import type { ComponentSpec } from "@/lib/generated/types"');
		console.log('   2. Use for type annotations and IntelliSense');
	} catch (error) {
		console.error('\n× Error generating TypeScript interfaces:', error);
		if (error instanceof Error) {
			console.error(error.stack);
		}
		process.exit(1);
	}
};

main();
