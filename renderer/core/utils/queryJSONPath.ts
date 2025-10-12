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
import {err, ok} from '@sigil/src/common/errors/result';

type QueryError = 'invalid_accessor' | 'query_error';

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

	try {
		const results = JSONPath({
			path: accessor,
			json: data,
			wrap: false, // Don't wrap single results in array
		});

		// JSONPath returns undefined for missing paths when wrap: false
		return ok(results);
	} catch (error) {
		// Query syntax errors or other JSONPath failures
		return err('query_error');
	}
};
