/**
 * Result type for error handling
 *
 * A type-safe way to handle operations that may fail, inspired by Rust's Result<T, E>.
 * Use this instead of throwing exceptions for expected errors.
 *
 * @example
 * ```typescript
 * function divide(a: number, b: number): Result<number, string> {
 *   if (b === 0) {
 *     return err('Division by zero');
 *   }
 *   return ok(a / b);
 * }
 *
 * const result = divide(10, 2);
 * if (result.success) {
 *   console.log(result.data); // 5
 * } else {
 *   console.error(result.error); // Type-safe error handling
 * }
 * ```
 */

/**
 * Successful result containing data
 */
export interface Ok<T> {
  success: true;
  data: T;
}

/**
 * Failed result containing error
 */
export interface Err<E> {
  success: false;
  error: E;
}

/**
 * Result type representing either success or failure
 */
export type Result<T, E = Error> = Ok<T> | Err<E>;

/**
 * Creates a successful Result
 */
export const ok = <T, E = Error>(data: T): Result<T, E> => ({
  success: true,
  data,
});

/**
 * Creates a failed Result
 */
export const err = <T, E = Error>(error: E): Result<T, E> => ({
  success: false,
  error,
});

/**
 * Maps the success value of a Result to a new value
 *
 * @example
 * ```typescript
 * const result = ok(5);
 * const doubled = mapResult(result, x => x * 2);
 * // doubled = ok(10)
 * ```
 */
export const mapResult = <T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => U
): Result<U, E> => {
  if (result.success) {
    return ok(fn(result.data));
  }
  return result;
};

/**
 * Maps the error value of a Result to a new error
 *
 * @example
 * ```typescript
 * const result = err('Something failed');
 * const mapped = mapError(result, e => new Error(e));
 * // mapped = err(Error('Something failed'))
 * ```
 */
export const mapError = <T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> => {
  if (!result.success) {
    return err(fn(result.error));
  }
  return result;
};

/**
 * Chains Results together, useful for sequential operations that may fail
 *
 * @example
 * ```typescript
 * const parseAndDouble = (str: string) =>
 *   chain(parseNumber(str), num => ok(num * 2));
 * ```
 */
export const chain = <T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => Result<U, E>
): Result<U, E> => {
  if (result.success) {
    return fn(result.data);
  }
  return result;
};

/**
 * Extracts the value from a Result, or returns a default value
 *
 * @example
 * ```typescript
 * const value = unwrapOr(divide(10, 0), 0); // 0
 * const value = unwrapOr(divide(10, 2), 0); // 5
 * ```
 */
export const unwrapOr = <T, E>(result: Result<T, E>, defaultValue: T): T => result.success ? result.data : defaultValue;

/**
 * Extracts the value from a Result, or computes it from the error
 *
 * @example
 * ```typescript
 * const value = unwrapOrElse(
 *   divide(10, 0),
 *   (error) => {
 *     console.error(error);
 *     return 0;
 *   }
 * );
 * ```
 */
export const unwrapOrElse = <T, E>(
  result: Result<T, E>,
  fn: (error: E) => T
): T => result.success ? result.data : fn(result.error);

/**
 * Combines multiple Results into a single Result containing an array
 * If any Result is an error, returns the first error encountered
 *
 * @example
 * ```typescript
 * const results = [ok(1), ok(2), ok(3)];
 * const combined = all(results); // ok([1, 2, 3])
 *
 * const resultsWithError = [ok(1), err('failed'), ok(3)];
 * const combined = all(resultsWithError); // err('failed')
 * ```
 */
export const all = <T, E>(results: Result<T, E>[]): Result<T[], E> => {
  const data: T[] = [];

  for (const result of results) {
    if (!result.success) {
      return result;
    }
    data.push(result.data);
  }

  return ok(data);
};

/**
 * Type guard to check if a Result is successful
 *
 * @example
 * ```typescript
 * const result = divide(10, 2);
 * if (isOk(result)) {
 *   console.log(result.data); // TypeScript knows this is the success case
 * }
 * ```
 */
export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => result.success;

/**
 * Type guard to check if a Result is an error
 *
 * @example
 * ```typescript
 * const result = divide(10, 0);
 * if (isErr(result)) {
 *   console.error(result.error); // TypeScript knows this is the error case
 * }
 * ```
 */
export const isErr = <T, E>(result: Result<T, E>): result is Err<E> => !result.success;
