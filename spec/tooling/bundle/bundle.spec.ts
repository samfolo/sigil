import {resolve} from 'path';

import {describe, it, expect} from 'vitest';

import {bundleSchemas} from './bundle';

const FIXTURES_DIR = resolve(__dirname, '../__tests__/fixtures');

describe('bundleSchemas', () => {
	it('should bundle schema fragments successfully', () => {
		const bundled = bundleSchemas(FIXTURES_DIR);

		expect(bundled).toHaveProperty('$schema', 'http://json-schema.org/draft-07/schema#');
		expect(bundled).toHaveProperty('$ref', '#/definitions/ComponentSpec');
		expect(bundled).toHaveProperty('definitions');

		const definitions = bundled.definitions as Record<string, unknown>;
		expect(definitions).toHaveProperty('SimpleType');
		expect(definitions).toHaveProperty('ComplexType');
		expect(definitions).toHaveProperty('TypeWithRef');
	});

	it('should resolve cross-file references to local references', () => {
		const bundled = bundleSchemas(FIXTURES_DIR);
		const definitions = bundled.definitions as Record<string, unknown>;

		const typeWithRef = definitions.TypeWithRef as {
      type: string;
      properties: {
        field: {$ref: string};
      };
    };

		expect(typeWithRef.properties.field.$ref).toBe('#/definitions/SimpleType');
	});

	it('should merge all definitions from multiple fragments', () => {
		const bundled = bundleSchemas(FIXTURES_DIR);
		const definitions = bundled.definitions as Record<string, unknown>;

		// Should have definitions from both testSchema.json and crossFileRef.json
		expect(Object.keys(definitions).length).toBeGreaterThanOrEqual(3);
	});
});
