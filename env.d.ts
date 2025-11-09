/**
 * Global environment variable type declarations
 *
 * Augments NodeJS.ProcessEnv to provide type safety and documentation for all
 * environment variables used across the application.
 */

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			/**
			 * Node environment
			 *
			 * Controls logger behaviour, error handling, and build optimisations
			 */
			NODE_ENV?: 'development' | 'production' | 'test';

			/**
			 * Console log level for Pino logger
			 *
			 * Controls minimum log level shown in console during development.
			 * Valid values: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
			 *
			 * @default 'debug'
			 */
			LOG_LEVEL?: string;

			/**
			 * Test run directory override
			 *
			 * Allows tests to isolate run artifacts in a temporary directory.
			 * Used by run artifact utilities to determine base directory.
			 *
			 * @default 'runs'
			 */
			SIGIL_TEST_RUN_DIR?: string;

			/**
			 * Enable debug logging for run directory scanning
			 *
			 * When set to 'true', logs detailed information during run directory
			 * scanning, including invalid directory names encountered.
			 *
			 * @default undefined
			 */
			DEBUG_RUN_SCANNING?: string;

			/**
			 * Anthropic API key
			 *
			 * Required for Claude API access via Agent SDK
			 */
			ANTHROPIC_API_KEY?: string;
		}
	}
}

export {};
