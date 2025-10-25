/**
 * State provided to prompt functions during agent execution
 */
export interface AgentExecutionState {
  /**
   * Current attempt number (1-indexed)
   */
  attempt: number;

  /**
   * Maximum number of attempts allowed from validation config
   */
  maxAttempts: number;
}
