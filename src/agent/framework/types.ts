/**
 * Framework execution context provided to prompt functions and tool handlers
 *
 * Read-only tracking of attempt and iteration state. This context is available
 * throughout execution but cannot be modified by user code.
 */
export interface AgentExecutionContext {
  /**
   * Current attempt number (1-indexed)
   */
  attempt: number;

  /**
   * Maximum number of attempts allowed from validation config
   */
  maxAttempts: number;

  /**
   * Current iteration number within this attempt (1-indexed)
   */
  iteration: number;

  /**
   * Maximum number of iterations allowed per attempt from validation config
   */
  maxIterations: number;
}
