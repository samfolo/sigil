/**
 * Logging utilities for spec scripts
 */

/**
 * Logger state for tracking errors
 */
export class Logger {
	private errorCount = 0;

	error(message: string): void {
		console.error(`× ${message}`);
		this.errorCount++;
	}

	warn(message: string): void {
		console.warn(`⚠  ${message}`);
	}

	success(message: string): void {
		console.log(`✓ ${message}`);
	}

	info(message: string): void {
		console.log(`ℹ  ${message}`);
	}

	getErrorCount(): number {
		return this.errorCount;
	}

	hasErrors(): boolean {
		return this.errorCount > 0;
	}

	reset(): void {
		this.errorCount = 0;
	}
}

/**
 * Create a new logger instance
 */
export const createLogger = (): Logger => new Logger();
