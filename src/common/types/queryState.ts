/**
 * Discriminated union type for async request states.
 *
 * Provides type-safe state management for async operations with data and error handling.
 */

export interface IdleQueryState {
	status: 'idle';
}

export interface LoadingQueryState {
	status: 'loading';
}

export interface SuccessQueryState<T> {
	status: 'success';
	data: T;
}

export interface ErrorQueryState<E> {
	status: 'error';
	error: E;
}

export type QueryState<T, E = Error> =
	| IdleQueryState
	| LoadingQueryState
	| SuccessQueryState<T>
	| ErrorQueryState<E>;

/**
 * Helper function to check if the query is in idle state.
 */
export const isIdle = <T, E>(state: QueryState<T, E>): state is IdleQueryState => state.status === 'idle'

/**
 * Helper function to check if the query is in loading state.
 */
export const isLoading = <T, E>(state: QueryState<T, E>): state is LoadingQueryState => state.status === 'loading'

/**
 * Helper function to check if the query completed successfully.
 */
export const isSuccess = <T, E>(state: QueryState<T, E>): state is SuccessQueryState<T> => state.status === 'success'

/**
 * Helper function to check if the query resulted in an error.
 */
export const isError = <T, E>(state: QueryState<T, E>): state is ErrorQueryState<E> => state.status === 'error'
