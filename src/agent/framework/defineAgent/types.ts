import type {Result} from '@sigil/src/common/errors/result';

/**
 * Context provided to a tool reducer containing current state and tool invocation details
 */
export interface ToolExecutionContext<State> {
	/**
	 * Current state of the agent execution
	 */
	state: State;
	/**
	 * Name of the tool being executed
	 */
	toolName: string;
	/**
	 * Input provided to the tool by the model
	 */
	toolInput: unknown;
}

/**
 * Handler function for a single tool within a reducer.
 *
 * IMPORTANT: Must return a new state object, never mutate the input state.
 * Follow immutable update patterns: {...state, field: newValue}
 *
 * @param state - Current state (must not be mutated)
 * @param toolInput - Input provided by the model for this tool
 * @returns Result containing new state and tool result, or error message
 *
 * @example
 * ```typescript
 * const handleAddItem: ToolReducerHandler<{items: string[]}> = (state, toolInput) => {
 *   const item = toolInput as string;
 *   return ok({
 *     newState: {...state, items: [...state.items, item]},
 *     toolResult: `Added ${item}`,
 *   });
 * };
 * ```
 */
export type ToolReducerHandler<State> = (
	state: State,
	toolInput: unknown
) => Result<{newState: State; toolResult: unknown}, string>;

/**
 * Primary reducer function for an agent that handles all tool executions.
 *
 * Receives execution context and routes to appropriate tool handler logic.
 * This is the sole execution path for all helper tools in an agent.
 *
 * @param context - Execution context containing state, tool name, and input
 * @returns Result containing new state and tool result, or error message
 *
 * @example
 * ```typescript
 * const reducer: ToolReducer<State> = (ctx) => {
 *   switch (ctx.toolName) {
 *     case 'add_item':
 *       return handleAddItem(ctx.state, ctx.toolInput);
 *     case 'remove_item':
 *       return handleRemoveItem(ctx.state, ctx.toolInput);
 *     default:
 *       return err(`Unknown tool: ${ctx.toolName}`);
 *   }
 * };
 * ```
 */
export type ToolReducer<State> = (
	context: ToolExecutionContext<State>
) => Result<{newState: State; toolResult: unknown}, string>;
