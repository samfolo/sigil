/**
 * Tests for discriminatedUnions.ts
 */

import {describe, it, expect} from 'vitest';

import {isOk, isErr} from '../../../../lib/errors';

import {
	isDiscriminatedUnion,
	generateDiscriminatedUnion,
	getDiscriminatedUnions,
	validateDiscriminatedUnionVariants,
} from '../discriminatedUnions';
import type {Config, DiscriminatedUnion} from '../types';

import * as fixtures from './fixtures';


describe('discriminatedUnions', () => {
	describe('isDiscriminatedUnion', () => {
		it('should return union metadata when definition is a discriminated union', () => {
			const result = isDiscriminatedUnion('TestUnion', fixtures.configWithUnions);
			expect(result).not.toBeNull();
			expect(result?.discriminator).toBe('type');
			expect(result?.variants.length).toBe(3);
			expect(result?.variants[0].type).toBe('Variant1');
			expect(result?.variants[1].type).toBe('Variant2');
			expect(result?.variants[2].type).toBe('Variant3');
		});

		it('should return null when definition is not a discriminated union', () => {
			const result = isDiscriminatedUnion('NotAUnion', fixtures.configWithUnions);
			expect(result).toBeNull();
		});

		it('should return null with empty config', () => {
			const result = isDiscriminatedUnion('TestUnion', fixtures.emptyConfig);
			expect(result).toBeNull();
		});

		it('should handle config with multiple unions', () => {
			const testResult = isDiscriminatedUnion('TestUnion', fixtures.configWithUnions);
			const directionResult = isDiscriminatedUnion('DirectionUnion', fixtures.configWithUnions);

			expect(testResult?.discriminator).toBe('type');
			expect(directionResult?.discriminator).toBe('direction');
		});
	});

	describe('generateDiscriminatedUnion', () => {
		it('should generate basic discriminated union code', () => {
			const union: DiscriminatedUnion = {
				name: 'TestUnion',
				location: 'test.schema.json',
				discriminator: 'type',
				variants: [
					{value: 'variant1', type: 'Variant1'},
					{value: 'variant2', type: 'Variant2'},
				],
			};
			const result = generateDiscriminatedUnion(union);
			expect(result).toContain('z.discriminatedUnion("type"');
			expect(result).toContain('Variant1Schema');
			expect(result).toContain('Variant2Schema');
		});

		it('should generate union with single variant', () => {
			const union: DiscriminatedUnion = {
				name: 'OnlyUnion',
				location: 'test.schema.json',
				discriminator: 'kind',
				variants: [{value: 'only', type: 'OnlyVariant'}],
			};
			const result = generateDiscriminatedUnion(union);
			expect(result).toContain('"kind"');
			expect(result).toContain('OnlyVariantSchema');
		});

		it('should generate union with many variants', () => {
			const union: DiscriminatedUnion = {
				name: 'ManyUnion',
				location: 'test.schema.json',
				discriminator: 'type',
				variants: [
					{value: 'a', type: 'A'},
					{value: 'b', type: 'B'},
					{value: 'c', type: 'C'},
					{value: 'd', type: 'D'},
					{value: 'e', type: 'E'},
				],
			};
			const result = generateDiscriminatedUnion(union);
			expect(result).toContain('ASchema');
			expect(result).toContain('BSchema');
			expect(result).toContain('CSchema');
			expect(result).toContain('DSchema');
			expect(result).toContain('ESchema');
		});

		it('should handle different discriminator names', () => {
			const typeUnion: DiscriminatedUnion = {
				name: 'TypeUnion',
				location: 'test.schema.json',
				discriminator: 'type',
				variants: [{value: 'a', type: 'A'}],
			};
			const kindUnion: DiscriminatedUnion = {
				name: 'KindUnion',
				location: 'test.schema.json',
				discriminator: 'kind',
				variants: [{value: 'a', type: 'A'}],
			};
			const directionUnion: DiscriminatedUnion = {
				name: 'DirectionUnion',
				location: 'test.schema.json',
				discriminator: 'direction',
				variants: [{value: 'a', type: 'A'}],
			};

			expect(generateDiscriminatedUnion(typeUnion)).toContain('"type"');
			expect(generateDiscriminatedUnion(kindUnion)).toContain('"kind"');
			expect(generateDiscriminatedUnion(directionUnion)).toContain('"direction"');
		});

		it('should handle variants with special characters in type names', () => {
			const union: DiscriminatedUnion = {
				name: 'TestUnion',
				location: 'test.schema.json',
				discriminator: 'type',
				variants: [{value: 'special', type: 'Type_With_Numbers123'}],
			};
			const result = generateDiscriminatedUnion(union);
			// Should append Schema to variant name and convert to valid identifier
			// Special chars like hyphens should be removed, underscores may be preserved
			expect(result).toContain('Type_With_Numbers123Schema');
		});
	});

	describe('getDiscriminatedUnions', () => {
		it('should return map of all discriminated unions from config', () => {
			const result = getDiscriminatedUnions(fixtures.configWithUnions);
			expect(result.size).toBe(2);
			expect(result.has('TestUnion')).toBe(true);
			expect(result.has('DirectionUnion')).toBe(true);
		});

		it('should return correct metadata for each union', () => {
			const result = getDiscriminatedUnions(fixtures.configWithUnions);
			const testUnion = result.get('TestUnion');
			const directionUnion = result.get('DirectionUnion');

			expect(testUnion?.discriminator).toBe('type');
			expect(testUnion?.variants.length).toBe(3);
			expect(testUnion?.variants.map((v) => v.type)).toEqual(['Variant1', 'Variant2', 'Variant3']);

			expect(directionUnion?.discriminator).toBe('direction');
			expect(directionUnion?.variants.length).toBe(2);
			expect(directionUnion?.variants.map((v) => v.type)).toEqual(['Horizontal', 'Vertical']);
		});

		it('should return empty map for empty config', () => {
			const result = getDiscriminatedUnions(fixtures.emptyConfig);
			expect(result.size).toBe(0);
		});

		it('should return empty map when discriminatedUnions is undefined', () => {
			const config: Config = {
				version: '1.0.0',
				entryPoint: 'test.json',
				fragments: {},
				discriminatedUnions: [],
			};
			const result = getDiscriminatedUnions(config);
			expect(result.size).toBe(0);
		});
	});

	describe('validateDiscriminatedUnionVariants', () => {
		it('should validate that all variants exist in definitions', () => {
			const union: DiscriminatedUnion = {
				name: 'TestUnion',
				location: 'test.schema.json',
				discriminator: 'type',
				variants: [
					{value: 'variant1', type: 'Variant1'},
					{value: 'variant2', type: 'Variant2'},
					{value: 'variant3', type: 'Variant3'},
				],
			};
			const definitions = {
				Variant1: fixtures.discriminatedUnionVariant1,
				Variant2: fixtures.discriminatedUnionVariant2,
				Variant3: fixtures.discriminatedUnionVariant3,
			};

			const result = validateDiscriminatedUnionVariants(union, definitions);
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toEqual(union);
			}
		});

		it('should detect missing variants', () => {
			const union: DiscriminatedUnion = {
				name: 'TestUnion',
				location: 'test.schema.json',
				discriminator: 'type',
				variants: [
					{value: 'variant1', type: 'Variant1'},
					{value: 'variant2', type: 'Variant2'},
					{value: 'variant3', type: 'Variant3'},
				],
			};

			const result = validateDiscriminatedUnionVariants(union, fixtures.definitionsWithMissingVariants);
			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toContain('Variant2');
				expect(result.error).toContain('Variant3');
				expect(result.error).not.toContain('Variant1');
			}
		});

		it('should validate union with single variant', () => {
			const union: DiscriminatedUnion = {
				name: 'TestUnion',
				location: 'test.schema.json',
				discriminator: 'type',
				variants: [{value: 'variant1', type: 'Variant1'}],
			};
			const definitions = {
				Variant1: fixtures.discriminatedUnionVariant1,
			};

			const result = validateDiscriminatedUnionVariants(union, definitions);
			expect(isOk(result)).toBe(true);
		});

		it('should handle empty definitions', () => {
			const union: DiscriminatedUnion = {
				name: 'TestUnion',
				location: 'test.schema.json',
				discriminator: 'type',
				variants: [
					{value: 'variant1', type: 'Variant1'},
					{value: 'variant2', type: 'Variant2'},
				],
			};

			const result = validateDiscriminatedUnionVariants(union, {});
			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toEqual(['Variant1', 'Variant2']);
			}
		});

		it('should handle union with no variants', () => {
			const union: DiscriminatedUnion = {
				name: 'TestUnion',
				location: 'test.schema.json',
				discriminator: 'type',
				variants: [],
			};

			const result = validateDiscriminatedUnionVariants(union, {});
			expect(isOk(result)).toBe(true);
		});

		it('should detect partially missing variants', () => {
			const union: DiscriminatedUnion = {
				name: 'TestUnion',
				location: 'test.schema.json',
				discriminator: 'type',
				variants: [
					{value: 'variant1', type: 'Variant1'},
					{value: 'variant2', type: 'Variant2'},
					{value: 'nonexistent', type: 'NonExistent'},
				],
			};
			const definitions = {
				Variant1: fixtures.discriminatedUnionVariant1,
				Variant2: fixtures.discriminatedUnionVariant2,
			};

			const result = validateDiscriminatedUnionVariants(union, definitions);
			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toEqual(['NonExistent']);
			}
		});
	});

	describe('integration', () => {
		it('should work end-to-end for a valid discriminated union', () => {
			// Check if union exists
			const union = isDiscriminatedUnion('TestUnion', fixtures.configWithUnions);
			expect(union).not.toBeNull();

			// Validate variants
			const definitions = {
				Variant1: fixtures.discriminatedUnionVariant1,
				Variant2: fixtures.discriminatedUnionVariant2,
				Variant3: fixtures.discriminatedUnionVariant3,
			};
			const validation = validateDiscriminatedUnionVariants(union!, definitions);
			expect(isOk(validation)).toBe(true);

			// Generate code
			const code = generateDiscriminatedUnion(union!);
			expect(code).toContain('z.discriminatedUnion');
			expect(code).toContain('"type"');
			expect(code).toContain('Variant1Schema');
			expect(code).toContain('Variant2Schema');
			expect(code).toContain('Variant3Schema');
		});

		it('should detect configuration errors in union setup', () => {
			const union = isDiscriminatedUnion('TestUnion', fixtures.configWithUnions);
			expect(union).not.toBeNull();

			// Missing variants should be caught
			const validation = validateDiscriminatedUnionVariants(union!, fixtures.definitionsWithMissingVariants);
			expect(isErr(validation)).toBe(true);
			if (isErr(validation)) {
				expect(validation.error.length).toBeGreaterThan(0);
			}
		});
	});
});
