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
interface LoadingState {
  status: 'loading';
}

export const isLoading = <T, E>(state: QueryState<T, E>): state is LoadingState => {
  return state.status === 'loading';
}

/**
 * Helper function to check if the query completed successfully.
 */
interface SuccessState<T> {
  status: 'success';
  data: T;
}

export const isSuccess = <T, E>(state: QueryState<T, E>): state is SuccessState<T> => {
  return state.status === 'success';
}

/**
 * Helper function to check if the query resulted in an error.
 */
interface ErrorState<E> {
  status: 'error';
  error: E;
}

export const isError = <T, E>(state: QueryState<T, E>): state is ErrorState<E> => {
  return state.status === 'error';
}
