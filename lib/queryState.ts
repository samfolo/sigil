/**
 * Discriminated union type for async request states.
 *
 * Provides type-safe state management for async operations with data and error handling.
 */
export type QueryState<T, E = Error> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: E };

/**
 * Helper function to check if the query is in loading state.
 */
export const isLoading = <T, E>(state: QueryState<T, E>): state is { status: 'loading' } => {
  return state.status === 'loading';
}

/**
 * Helper function to check if the query completed successfully.
 */
export const isSuccess = <T, E>(state: QueryState<T, E>): state is { status: 'success'; data: T } => {
  return state.status === 'success';
}

/**
 * Helper function to check if the query resulted in an error.
 */
export const isError = <T, E>(state: QueryState<T, E>): state is { status: 'error'; error: E } => {
  return state.status === 'error';
}
