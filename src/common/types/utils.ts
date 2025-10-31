/**
 * Type representing an object with no properties
 *
 * Use this for generic type parameters that extend object but should have no properties.
 * Common in agent state definitions where Run or Attempt state tiers are not used.
 *
 * @example
 * ```typescript
 * // Agent with no custom run or attempt state
 * const agent: AgentDefinition<Input, Output, EmptyObject, EmptyObject> = {...};
 *
 * // Tool handler with no attempt state
 * const handler: ToolReducerHandler<RunState, EmptyObject> = (state, input) => {...};
 * ```
 */
export type EmptyObject = Record<string, never>;
