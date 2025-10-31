import {resolve} from 'node:path';

import {describe, it, expect} from 'vitest';

import {isOk, isErr} from '@sigil/src/common/errors/result';

import {loadTemplate, compileTemplate} from './templateLoader';
import {
	FIRST_ATTEMPT_CONTEXT,
	SECOND_ATTEMPT_CONTEXT,
	SIMPLE_DATA,
	QUERY_DATA,
	LIST_DATA,
	SIMPLE_TEMPLATE,
	SIMPLE_TEMPLATE_FILE,
	WITH_STATE_TEMPLATE,
	WITH_STATE_TEMPLATE_FILE,
	ERROR_TEMPLATE,
	CONDITIONAL_TEMPLATE,
	CONDITIONAL_TEMPLATE_FILE,
	LOOP_TEMPLATE,
	LOOP_TEMPLATE_FILE,
	INVALID_TEMPLATE,
} from './templateLoader.fixtures';

const FIXTURES_DIR = resolve(__dirname, '__fixtures__');

describe('compileTemplate', () => {
	it('should compile simple template with string data', async () => {
		const result = compileTemplate<string>(SIMPLE_TEMPLATE);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		const promptFunction = result.data;
		const output = await promptFunction('test input', FIRST_ATTEMPT_CONTEXT);

		expect(output).toBe('Process: test input');
	});

	it('should compile template with data and state', async () => {
		const result = compileTemplate<typeof SIMPLE_DATA>(WITH_STATE_TEMPLATE);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		const promptFunction = result.data;
		const output = await promptFunction(SIMPLE_DATA, SECOND_ATTEMPT_CONTEXT);

		expect(output).toBe('Attempt 2/3: Hello, world!');
	});

	it('should compile error template with formatted error string', async () => {
		const result = compileTemplate<string>(ERROR_TEMPLATE);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		const promptFunction = result.data;
		const output = await promptFunction(
			'Validation failed: missing field',
			SECOND_ATTEMPT_CONTEXT
		);

		expect(output).toContain('Attempt 2/3 failed:');
		expect(output).toContain('Validation failed: missing field');
		expect(output).toContain('Please fix these issues.');
	});

	it('should handle Liquid conditionals', async () => {
		const result = compileTemplate<typeof QUERY_DATA>(CONDITIONAL_TEMPLATE);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		const promptFunction = result.data;

		const firstAttempt = await promptFunction(QUERY_DATA, FIRST_ATTEMPT_CONTEXT);
		expect(firstAttempt.trim()).toBe('First attempt: Analyse sales data');

		const secondAttempt = await promptFunction(QUERY_DATA, SECOND_ATTEMPT_CONTEXT);
		expect(secondAttempt.trim()).toBe('Attempt 2/3: Analyse sales data');
	});

	it('should handle Liquid loops', async () => {
		const result = compileTemplate<typeof LIST_DATA>(LOOP_TEMPLATE);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		const promptFunction = result.data;
		const output = await promptFunction(LIST_DATA, FIRST_ATTEMPT_CONTEXT);

		expect(output).toContain('Items to process:');
		expect(output).toContain('- first');
		expect(output).toContain('- second');
		expect(output).toContain('- third');
	});

	it('should return error for invalid template syntax', () => {
		const result = compileTemplate<string>(INVALID_TEMPLATE);

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {
			return;
		}

		expect(result.error).toBeInstanceOf(Error);
	});
});

describe('loadTemplate', () => {
	it('should load and compile simple template from file', async () => {
		const result = await loadTemplate<string>(
			resolve(FIXTURES_DIR, SIMPLE_TEMPLATE_FILE)
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		const promptFunction = result.data;
		const output = await promptFunction('test input', FIRST_ATTEMPT_CONTEXT);

		expect(output).toBe('Process: test input');
	});

	it('should load template with state variables', async () => {
		const result = await loadTemplate<typeof SIMPLE_DATA>(
			resolve(FIXTURES_DIR, WITH_STATE_TEMPLATE_FILE)
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		const promptFunction = result.data;
		const output = await promptFunction(SIMPLE_DATA, SECOND_ATTEMPT_CONTEXT);

		expect(output).toBe('Attempt 2/3: Hello, world!');
	});

	it('should load template with conditionals', async () => {
		const result = await loadTemplate<typeof QUERY_DATA>(
			resolve(FIXTURES_DIR, CONDITIONAL_TEMPLATE_FILE)
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		const promptFunction = result.data;

		const firstAttempt = await promptFunction(QUERY_DATA, FIRST_ATTEMPT_CONTEXT);
		expect(firstAttempt.trim()).toBe('First attempt: Analyse sales data');

		const secondAttempt = await promptFunction(QUERY_DATA, SECOND_ATTEMPT_CONTEXT);
		expect(secondAttempt.trim()).toBe('Attempt 2/3: Analyse sales data');
	});

	it('should load template with loops', async () => {
		const result = await loadTemplate<typeof LIST_DATA>(
			resolve(FIXTURES_DIR, LOOP_TEMPLATE_FILE)
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		const promptFunction = result.data;
		const output = await promptFunction(LIST_DATA, FIRST_ATTEMPT_CONTEXT);

		expect(output).toContain('Items to process:');
		expect(output).toContain('- first');
		expect(output).toContain('- second');
		expect(output).toContain('- third');
	});

	it('should return error for non-existent file', async () => {
		const result = await loadTemplate<string>(
			resolve(FIXTURES_DIR, 'nonexistent.liquid')
		);

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {
			return;
		}

		expect(result.error).toBeInstanceOf(Error);
	});

	it('should produce same output as compileTemplate for identical templates', async () => {
		const loadedResult = await loadTemplate<string>(
			resolve(FIXTURES_DIR, SIMPLE_TEMPLATE_FILE)
		);
		const compiledResult = compileTemplate<string>(SIMPLE_TEMPLATE);

		expect(isOk(loadedResult)).toBe(true);
		expect(isOk(compiledResult)).toBe(true);

		if (!isOk(loadedResult) || !isOk(compiledResult)) {
			return;
		}

		const loadedOutput = await loadedResult.data(
			'test input',
			FIRST_ATTEMPT_CONTEXT
		);
		const compiledOutput = await compiledResult.data(
			'test input',
			FIRST_ATTEMPT_CONTEXT
		);

		expect(loadedOutput).toBe(compiledOutput);
	});
});
