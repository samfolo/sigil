import {describe, expect, it} from 'vitest';

import {ERROR_CODES} from '@sigil/src/common/errors';
import {isErr, isOk} from '@sigil/src/common/errors/result';
import type {TextConfig} from '@sigil/src/lib/generated/types/specification';

import {TextBuilder} from './text';

describe('TextBuilder', () => {
	const builder = new TextBuilder();

	describe('accessor resolution', () => {
		it('resolves simple accessor path', () => {
			const config: TextConfig = {
				type: 'text',
				accessor: '$.name',
			};
			const data = {name: 'Alice'};

			const result = builder.build(config, data);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.formattedValue).toBe('Alice');
			}
		});

		it('resolves nested accessor path', () => {
			const config: TextConfig = {
				type: 'text',
				accessor: '$.user.profile.email',
			};
			const data = {user: {profile: {email: 'alice@example.com'}}};

			const result = builder.build(config, data);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.formattedValue).toBe('alice@example.com');
			}
		});

		it('resolves array index accessor', () => {
			const config: TextConfig = {
				type: 'text',
				accessor: '$.items[0]',
			};
			const data = {items: ['first', 'second', 'third']};

			const result = builder.build(config, data);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.formattedValue).toBe('first');
			}
		});

		it('returns error for invalid accessor format', () => {
			const config: TextConfig = {
				type: 'text',
				accessor: 'name', // Missing $ prefix
			};
			const data = {name: 'Alice'};

			const result = builder.build(config, data);

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error[0].code).toBe(ERROR_CODES.INVALID_ACCESSOR);
			}
		});

		it('returns error for wildcard accessor', () => {
			const config: TextConfig = {
				type: 'text',
				accessor: '$.items[*]',
			};
			const data = {items: ['a', 'b', 'c']};

			const result = builder.build(config, data);

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error[0].code).toBe(ERROR_CODES.EXPECTED_SINGLE_VALUE);
			}
		});
	});

	describe('formatting', () => {
		it('applies decimal format', () => {
			const config: TextConfig = {
				type: 'text',
				accessor: '$.price',
				format: {type: 'decimal', options: {minimum_fraction_digits: 2}},
			};
			const data = {price: 42};

			const result = builder.build(config, data);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.formattedValue).toBe('42.00');
			}
		});

		it('applies currency format', () => {
			const config: TextConfig = {
				type: 'text',
				accessor: '$.amount',
				format: {type: 'currency', currency: 'GBP'},
			};
			const data = {amount: 1234.56};

			const result = builder.build(config, data);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.formattedValue).toBe('£1,234.56');
			}
		});

		it('applies percent format', () => {
			const config: TextConfig = {
				type: 'text',
				accessor: '$.rate',
				format: {type: 'percent'},
			};
			const data = {rate: 0.25};

			const result = builder.build(config, data);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.formattedValue).toBe('25%');
			}
		});

		it('returns raw string when no format specified', () => {
			const config: TextConfig = {
				type: 'text',
				accessor: '$.message',
			};
			const data = {message: 'Hello, World!'};

			const result = builder.build(config, data);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.formattedValue).toBe('Hello, World!');
			}
		});

		it('stringifies numbers without format', () => {
			const config: TextConfig = {
				type: 'text',
				accessor: '$.count',
			};
			const data = {count: 42};

			const result = builder.build(config, data);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.formattedValue).toBe('42');
			}
		});
	});

	describe('config pass-through', () => {
		it('passes config without type discriminator', () => {
			const config: TextConfig = {
				type: 'text',
				accessor: '$.title',
				scale: 'heading',
				traits: ['emphasis'],
				title: 'Section Title',
				description: 'A descriptive title',
			};
			const data = {title: 'Welcome'};

			const result = builder.build(config, data);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.config).toEqual({
					accessor: '$.title',
					scale: 'heading',
					traits: ['emphasis'],
					title: 'Section Title',
					description: 'A descriptive title',
				});
				expect(result.data.config).not.toHaveProperty('type');
			}
		});

		it('passes affordances in config', () => {
			const config: TextConfig = {
				type: 'text',
				accessor: '$.link',
				affordances: [
					{type: 'hyperlink', href: 'https://example.com'},
					{type: 'truncation', maximum_lines: 2},
				],
			};
			const data = {link: 'Click here'};

			const result = builder.build(config, data);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.config.affordances).toHaveLength(2);
				expect(result.data.config.affordances?.[0]).toEqual({type: 'hyperlink', href: 'https://example.com'});
				expect(result.data.config.affordances?.[1]).toEqual({type: 'truncation', maximum_lines: 2});
			}
		});
	});

	describe('edge cases', () => {
		it('handles undefined value', () => {
			const config: TextConfig = {
				type: 'text',
				accessor: '$.missing',
			};
			const data = {name: 'Alice'};

			const result = builder.build(config, data);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.formattedValue).toBe('undefined');
			}
		});

		it('handles null value', () => {
			const config: TextConfig = {
				type: 'text',
				accessor: '$.value',
			};
			const data = {value: null};

			const result = builder.build(config, data);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.formattedValue).toBe('null');
			}
		});

		it('handles boolean value', () => {
			const config: TextConfig = {
				type: 'text',
				accessor: '$.active',
			};
			const data = {active: true};

			const result = builder.build(config, data);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.formattedValue).toBe('true');
			}
		});

		it('handles object value by JSON stringifying', () => {
			const config: TextConfig = {
				type: 'text',
				accessor: '$.metadata',
			};
			const data = {metadata: {key: 'value'}};

			const result = builder.build(config, data);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.formattedValue).toBe('{"key":"value"}');
			}
		});
	});
});
