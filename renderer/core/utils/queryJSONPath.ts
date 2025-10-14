/**
 * JSONPath query utility for data accessor resolution
 *
 * Provides a consistent interface for querying data using JSONPath expressions.
 * All accessors in the Sigil specification must use valid JSONPath syntax with
 * the `$` root prefix.
 *
 * Supports:
 * - Simple paths: `$.name`, `$.age`
 * - Nested paths: `$.user.profile.email`
 * - Array indexing: `$.items[0]`, `$.users[5].name`
 * - Wildcards: `$..book[*]` (all books recursively)
 * - Filters: `$..book[?(@.price < 10)]` (books under £10)
 * - Recursive descent: `$..author` (all author fields at any depth)
 *
 * Uses jsonpath-plus for full JSONPath specification support.
 */

import {JSONPath} from 'jsonpath-plus';

import type {Result} from '@sigil/src/common/errors/result';
import {err, isErr, ok} from '@sigil/src/common/errors/result';

type QueryError = 'invalid_accessor' | 'query_error' | 'expected_single_value' | 'expected_array_value';

/**
 * Query data using a JSONPath expression
 *
 * Returns a single value for simple queries, or an array for wildcard/filter queries.
 *
 * @param data - The data object to query
 * @param accessor - JSONPath expression (must start with `$`)
 * @returns Result containing the value(s) at the accessor path, or error
 *
 * @example
 * ```typescript
 * const data = {user: {name: 'Alice', age: 30}};
 *
 * queryJsonPath(data, '$.user.name');     // → ok('Alice')
 * queryJsonPath(data, '$.user.age');      // → ok(30)
 * queryJsonPath(data, '$.user.missing');  // → ok(undefined)
 * queryJsonPath(data, 'user.name');       // → err('invalid_accessor')
 * ```
 *
 * @example Advanced queries
 * ```typescript
 * const data = {
 *   store: {
 *     book: [
 *       {title: 'Book A', price: 10},
 *       {title: 'Book B', price: 20},
 *     ],
 *   },
 * };
 *
 * queryJsonPath(data, '$.store.book[*].title');           // → ok(['Book A', 'Book B'])
 * queryJsonPath(data, '$.store.book[?(@.price < 15)]');   // → ok([{title: 'Book A', price: 10}])
 * queryJsonPath(data, '$..title');                         // → ok(['Book A', 'Book B'])
 * ```
 */
export const queryJSONPath = (data: unknown, accessor: string): Result<unknown, QueryError> => {
	// Validate accessor format
	if (!accessor.startsWith('$')) {
		return err('invalid_accessor');
	}

	// Validate data is non-null object
	if (typeof data !== 'object' || data === null) {
		return err('query_error');
	}

	try {
		const results = JSONPath({
			path: accessor,
			json: data,
			wrap: false, // Don't wrap single results in array
		});

		// JSONPath returns undefined for missing paths when wrap: false
		return ok(results);
	} catch {
		// Query syntax errors or other JSONPath failures
		return err('query_error');
	}
};

/**
 * Query data using JSONPath and ensure result is a single value (not an array)
 *
 * Use this when you expect a single value per accessor. This will fail if the accessor
 * returns an array (e.g., from wildcards like `$.items[*]`, filters like `$..book[?(@.price < 10)]`,
 * or recursive descent like `$..author`).
 *
 * @param data - The data object to query
 * @param accessor - JSONPath expression (must start with `$`)
 * @returns Result containing single value, or error if result is an array
 *
 * @example
 * ```typescript
 * // ✓ Valid - returns single value
 * querySingleValue({user: {name: 'Alice'}}, '$.user.name');  // → ok('Alice')
 * querySingleValue({items: [1,2,3]}, '$.items[0]');          // → ok(1)
 *
 * // × Invalid - returns array
 * querySingleValue({items: [1,2,3]}, '$.items[*]');          // → err('expected_single_value')
 * querySingleValue({books: [...]}, '$..title');              // → err('expected_single_value')
 * ```
 */
export const querySingleValue = (data: unknown, accessor: string): Result<unknown, QueryError> => {
	const result = queryJSONPath(data, accessor);
	if (isErr(result)) {
		return result;
	}

	// Fail if result is an array (from wildcards/filters/recursive-descent)
	if (Array.isArray(result.data)) {
		return err('expected_single_value');
	}

	return result;
};

/**
 * Query data using JSONPath and ensure result is an array
 *
 * Use this when you expect multiple values from an accessor. This gracefully handles
 * single values by wrapping them in an array, and treats undefined as empty array.
 *
 * @param data - The data object to query
 * @param accessor - JSONPath expression (must start with `$`)
 * @returns Result containing array of values
 *
 * @example
 * ```typescript
 * // Wildcards return arrays
 * queryMultipleValues({items: [1,2,3]}, '$.items[*]');       // → ok([1, 2, 3])
 *
 * // Filters return arrays
 * queryMultipleValues({books: [...]}, '$..book[?(@.price < 10)]');  // → ok([...])
 *
 * // Single values wrapped (lenient)
 * queryMultipleValues({name: 'Alice'}, '$.name');            // → ok(['Alice'])
 *
 * // Missing values return empty array
 * queryMultipleValues({}, '$.missing');                      // → ok([])
 * ```
 */
export const queryMultipleValues = (
	data: unknown,
	accessor: string
): Result<unknown[], QueryError> => {
	const result = queryJSONPath(data, accessor);
	if (isErr(result)) {
		return result;
	}

	// Ensure array result - gracefully handle missing values as empty array
	let arrayResult: unknown[];
	if (result.data === undefined) {
		arrayResult = [];
	} else if (Array.isArray(result.data)) {
		arrayResult = result.data;
	} else {
		arrayResult = [result.data];
	}

	return ok(arrayResult);
};
