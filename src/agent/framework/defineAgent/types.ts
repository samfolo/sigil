import type {Result} from '@sigil/src/common/errors/result';

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
 * const handleAddItem: ToolReducerHandler<{items: string[]}> = (state, toolInput) => {
 *   const parsed = addItemInputSchema.safeParse(toolInput);
 *   if (!parsed.success) {
 *     return err('Invalid input');
 *   }
 *
 *   return ok({
 *     newState: {...state, items: [...state.items, parsed.data.item]},
 *     toolResult: `Added ${parsed.data.item}`,
 *   });
 * };
 * ```
 */
export type ToolReducerHandler<State> = (
	state: State,
	toolInput: unknown
) => Result<{newState: State; toolResult: unknown}, string>;
