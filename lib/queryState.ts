/**
 * Standard query state values for request/response states across the application.
 *
 * Use these string literals to represent the state of async operations.
 */
export type QueryState = 'idle' | 'loading' | 'success' | 'errored' | 'reloading';

/**
 * Query state definitions:
 * - 'idle': Query has not been called yet
 * - 'loading': Query is in progress, awaiting data
 * - 'success': Query completed successfully
 * - 'errored': Query completed with an error
 * - 'reloading': Data is being refetched after a previous successful fetch
 */
