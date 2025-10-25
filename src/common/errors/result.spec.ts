/**
 * Tests for Result type utilities
 */

import {describe, it, expect} from 'vitest';

import {
	type Result,
	ok,
	err,
	mapResult,
	mapError,
	chain,
	unwrapOr,
	unwrapOrElse,
	all,
	isOk,
	isErr,
} from './result';

describe('Result', () => {
	describe('ok', () => {
		it('should create a successful Result', () => {
			const result = ok(42);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBe(42);
			}
		});

		it('should work with different types', () => {
			expect(ok('string').success).toBe(true);
			expect(ok({key: 'value'}).success).toBe(true);
			expect(ok([1, 2, 3]).success).toBe(true);
			expect(ok(null).success).toBe(true);
		});
	});

	describe('err', () => {
		it('should create a failed Result', () => {
			const result = err('error message');
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe('error message');
			}
		});

		it('should work with Error objects', () => {
			const error = new Error('Something went wrong');
			const result = err(error);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(error);
			}
		});

		it('should work with custom error types', () => {
      interface CustomError {code: number; message: string}
      const result: Result<never, CustomError> = err({code: 404, message: 'Not found'});
      expect(result.success).toBe(false);
      if (!result.success) {
      	expect(result.error.code).toBe(404);
      }
		});
	});

	describe('mapResult', () => {
		it('should transform successful value', () => {
			const result = ok(5);
			const doubled = mapResult(result, (x) => x * 2);

			expect(doubled.success).toBe(true);
			if (doubled.success) {
				expect(doubled.data).toBe(10);
			}
		});

		it('should not transform error', () => {
			const result: Result<number, string> = err('error');
			const doubled = mapResult(result, (x) => x * 2);

			expect(doubled.success).toBe(false);
			if (!doubled.success) {
				expect(doubled.error).toBe('error');
			}
		});

		it('should preserve error type', () => {
			const result: Result<number, string> = err('error');
			const mapped = mapResult(result, (x) => x.toString());

			expect(mapped.success).toBe(false);
			if (!mapped.success) {
				expect(mapped.error).toBe('error');
			}
		});
	});

	describe('mapError', () => {
		it('should transform error value', () => {
			const result: Result<number, string> = err('error');
			const mapped = mapError(result, (e) => new Error(e));

			expect(mapped.success).toBe(false);
			if (!mapped.success) {
				expect(mapped.error).toBeInstanceOf(Error);
				expect(mapped.error.message).toBe('error');
			}
		});

		it('should not transform success', () => {
			const result = ok(42);
			const mapped = mapError(result, (e) => new Error(String(e)));

			expect(mapped.success).toBe(true);
			if (mapped.success) {
				expect(mapped.data).toBe(42);
			}
		});
	});

	describe('chain', () => {
		const divide = (a: number, b: number): Result<number, string> => {
			if (b === 0) {
				return err('Division by zero');
			}
			return ok(a / b);
		};

		it('should chain successful operations', () => {
			const result = chain(ok(10), (x) => divide(x, 2));

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBe(5);
			}
		});

		it('should short-circuit on first error', () => {
			const result = chain(err<number, string>('initial error'), (x) => divide(x, 2));

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe('initial error');
			}
		});

		it('should propagate errors from chained operation', () => {
			const result = chain(ok(10), (x) => divide(x, 0));

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe('Division by zero');
			}
		});

		it('should work with multiple chains', () => {
			const result = chain(
				chain(ok(20), (x) => divide(x, 2)),
				(x) => divide(x, 5)
			);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBe(2);
			}
		});
	});

	describe('unwrapOr', () => {
		it('should return data for successful Result', () => {
			const result = ok(42);
			expect(unwrapOr(result, 0)).toBe(42);
		});

		it('should return default for failed Result', () => {
			const result: Result<number, string> = err('error');
			expect(unwrapOr(result, 0)).toBe(0);
		});

		it('should work with different types', () => {
			const result: Result<string, Error> = err(new Error('fail'));
			expect(unwrapOr(result, 'default')).toBe('default');
		});
	});

	describe('unwrapOrElse', () => {
		it('should return data for successful Result', () => {
			const result = ok(42);
			const value = unwrapOrElse(result, () => 0);
			expect(value).toBe(42);
		});

		it('should compute default from error', () => {
			const result: Result<number, string> = err('error');
			const value = unwrapOrElse(result, (e) => e.length);
			expect(value).toBe(5);
		});

		it('should not call function for successful Result', () => {
			const result = ok(42);
			let called = false;
			unwrapOrElse(result, () => {
				called = true;
				return 0;
			});
			expect(called).toBe(false);
		});
	});

	describe('all', () => {
		it('should combine all successful Results', () => {
			const results = [ok(1), ok(2), ok(3)];
			const combined = all(results);

			expect(combined.success).toBe(true);
			if (combined.success) {
				expect(combined.data).toEqual([1, 2, 3]);
			}
		});

		it('should return first error if any Result fails', () => {
			const results: Result<number, string>[] = [ok(1), err('error'), ok(3)];
			const combined = all(results);

			expect(combined.success).toBe(false);
			if (!combined.success) {
				expect(combined.error).toBe('error');
			}
		});

		it('should handle empty array', () => {
			const results: Result<number, string>[] = [];
			const combined = all(results);

			expect(combined.success).toBe(true);
			if (combined.success) {
				expect(combined.data).toEqual([]);
			}
		});

		it('should preserve order', () => {
			const results = [ok(3), ok(1), ok(2)];
			const combined = all(results);

			expect(combined.success).toBe(true);
			if (combined.success) {
				expect(combined.data).toEqual([3, 1, 2]);
			}
		});

		it('should stop at first error', () => {
			const results: Result<number, string>[] = [
				ok(1),
				err('first error'),
				err('second error'),
			];
			const combined = all(results);

			expect(combined.success).toBe(false);
			if (!combined.success) {
				expect(combined.error).toBe('first error');
			}
		});
	});

	describe('isOk', () => {
		it('should return true for successful Result', () => {
			const result = ok(42);
			expect(isOk(result)).toBe(true);
		});

		it('should return false for failed Result', () => {
			const result: Result<number, string> = err('error');
			expect(isOk(result)).toBe(false);
		});

		it('should narrow type correctly', () => {
			const result: Result<number, string> = ok(42);
			if (isOk(result)) {
				// TypeScript should know result.data is number
				const value: number = result.data;
				expect(value).toBe(42);
			}
		});
	});

	describe('isErr', () => {
		it('should return true for failed Result', () => {
			const result: Result<number, string> = err('error');
			expect(isErr(result)).toBe(true);
		});

		it('should return false for successful Result', () => {
			const result = ok(42);
			expect(isErr(result)).toBe(false);
		});

		it('should narrow type correctly', () => {
			const result: Result<number, string> = err('error');
			if (isErr(result)) {
				// TypeScript should know result.error is string
				const error: string = result.error;
				expect(error).toBe('error');
			}
		});
	});

	describe('real-world scenarios', () => {
		it('should handle parsing with validation', () => {
			const parseNumber = (str: string): Result<number, string> => {
				const num = parseInt(str, 10);
				return isNaN(num) ? err('Invalid number') : ok(num);
			};

			const validatePositive = (num: number): Result<number, string> => num > 0 ? ok(num) : err('Number must be positive');

			const result = chain(parseNumber('42'), validatePositive);
			expect(isOk(result)).toBe(true);

			const errorResult = chain(parseNumber('-5'), validatePositive);
			expect(isErr(errorResult)).toBe(true);

			const parseErrorResult = chain(parseNumber('not a number'), validatePositive);
			expect(isErr(parseErrorResult)).toBe(true);
		});

		it('should handle multiple validation steps', () => {
      interface User {
        name: string;
        age: number;
      }

      const validateName = (name: string): Result<string, string> => name.length > 0 ? ok(name) : err('Name cannot be empty');

      const validateAge = (age: number): Result<number, string> => age >= 18 ? ok(age) : err('Must be 18 or older');

      const createUser = (name: string, age: number): Result<User, string> => {
      	const nameResult = validateName(name);
      	if (isErr(nameResult)) {
      		return nameResult;
      	}

      	const ageResult = validateAge(age);
      	if (isErr(ageResult)) {
      		return ageResult;
      	}

      	return ok({name: nameResult.data, age: ageResult.data});
      };

      const validUser = createUser('Alice', 25);
      expect(isOk(validUser)).toBe(true);

      const invalidAge = createUser('Bob', 15);
      expect(isErr(invalidAge)).toBe(true);

      const invalidName = createUser('', 25);
      expect(isErr(invalidName)).toBe(true);
		});
	});
});
