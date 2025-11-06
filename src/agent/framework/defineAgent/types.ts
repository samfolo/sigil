import type {AgentExecutionContext} from '@sigil/src/agent/framework';
import type {Result} from '@sigil/src/common/errors/result';

/**
 * Three-tier state structure for agent execution
 *
 * Agents maintain three separate state tiers:
 * - context: Framework tracking (read-only, attempt/iteration numbers)
 * - run: User persistent state across retry attempts (expensive computations, metrics)
 * - attempt: User per-attempt state that resets on validation failure (working state, disposables)
 *
 * @template Run - User run state type (persists across attempts)
 * @template Attempt - User attempt state type (resets on retry)
 */
export interface AgentState<Run, Attempt> {
	/**
	 * Framework execution context (readonly)
	 */
	readonly context: AgentExecutionContext;

	/**
	 * User persistent run state
	 */
	run: Run;

	/**
	 * User per-attempt state
	 */
	attempt: Attempt;
}

/**
 * User state update returned by handler (context is managed by framework)
 *
 * Handlers only need to return run and attempt state updates.
 * The framework automatically preserves context.
 */
export interface HandlerStateUpdate<Run, Attempt> {
	/**
	 * Updated run state
	 */
	run: Run;

	/**
	 * Updated attempt state
	 */
	attempt: Attempt;
}

/**
 * Result returned by a tool reducer handler
 */
export interface ToolReducerHandlerResult<Run, Attempt> {
	/**
	 * Updated state after handling the tool
	 * IMPORTANT: Must be new objects, not mutated input state
	 */
	newState: HandlerStateUpdate<Run, Attempt>;

	/**
	 * Result produced by the tool
	 */
	toolResult: unknown;
}

/**
 * Handler function for a helper tool.
 *
 * IMPORTANT: Must return new state objects, never mutate the input state.
 * Follow immutable update patterns: {...state.run, field: newValue}
 *
 * Each tool definition includes its own handler, ensuring compile-time safety
 * and automatic tool-to-handler mapping.
 *
 * Handlers only return run and attempt state - the framework automatically
 * manages context (readonly framework metadata like attempt/iteration numbers).
 *
 * @param state - Current state (must not be mutated)
 * @param toolInput - Input provided by the model for this tool
 * @returns Result containing new run/attempt state and tool result, or error message
 *
 * @example
 * ```typescript
 * const handleAddItem: ToolReducerHandler<{items: string[]}, {count: number}> = (state, toolInput) => {
 *   const parsed = addItemInputSchema.safeParse(toolInput);
 *   if (!parsed.success) {
 *     return err('Invalid input');
 *   }
 *
 *   return ok({
 *     newState: {
 *       // No need to pass through context - framework handles it automatically
 *       run: {...state.run, items: [...state.run.items, parsed.data.item]},
 *       attempt: {...state.attempt, count: state.attempt.count + 1},
 *     },
 *     toolResult: `Added ${parsed.data.item}`,
 *   });
 * };
 * ```
 */
export type ToolReducerHandler<Run, Attempt> = (
	state: AgentState<Run, Attempt>,
	toolInput: unknown
) => Result<ToolReducerHandlerResult<Run, Attempt>, string>;
