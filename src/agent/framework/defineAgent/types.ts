import type {AgentExecutionContext} from '@sigil/src/agent/framework/types';
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
	context: AgentExecutionContext;
	run: Run;
	attempt: Attempt;
}

/**
 * Handler function for a helper tool.
 *
 * IMPORTANT: Must return a new state object, never mutate the input state.
 * Follow immutable update patterns: {...state, field: newValue}
 *
 * Each tool definition includes its own handler, ensuring compile-time safety
 * and automatic tool-to-handler mapping.
 *
 * @param state - Current state (must not be mutated)
 * @param toolInput - Input provided by the model for this tool
 * @returns Result containing new state and tool result, or error message
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
 *       context: state.context,  // Pass through unchanged
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
) => Result<{newState: AgentState<Run, Attempt>; toolResult: unknown}, string>;
