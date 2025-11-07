import {mkdirSync, writeFileSync} from 'fs';
import {join} from 'path';
import {dirSync} from 'tmp';

import type {TempFSDirBuilder} from './TempFSDirBuilder';
import type {TempFSFileBuilder} from './TempFSFileBuilder';

/**
 * Result of building a temporary filesystem
 */
export interface TempFSResult {
	/**
	 * Absolute path to the temporary root directory
	 */
	root: string;

	/**
	 * Cleanup function to remove the temporary directory
	 * Call this in test teardown (e.g., afterEach or after)
	 */
	cleanup: () => void;
}

/**
 * Builder for creating temporary filesystem structures for testing
 *
 * Uses the tmp library to create temporary directories with automatic cleanup.
 * Provides fluent API for building directory and file hierarchies.
 *
 * @example
 * ```typescript
 * const fs = new TempFSBuilder()
 *   .withDirectory('logs', new TempFSDirBuilder()
 *     .withFile('test.txt', new TempFSFileBuilder().withContent('data')))
 *   .withFile('root.txt', new TempFSFileBuilder().withContent('content'))
 *   .build();
 *
 * // Use fs.root in tests
 * const files = readdirSync(fs.root);
 *
 * // Clean up after test
 * fs.cleanup();
 * ```
 */
export class TempFSBuilder {
	private rootFiles: Array<{name: string; builder: TempFSFileBuilder}> = [];
	private rootDirs: Array<{name: string; builder: TempFSDirBuilder}> = [];

	/**
	 * Add a file to the root directory
	 *
	 * @param name - File name
	 * @param builder - File builder
	 * @returns This builder for chaining
	 */
	withFile(name: string, builder: TempFSFileBuilder): this {
		this.rootFiles.push({name, builder});
		return this;
	}

	/**
	 * Add a directory to the root
	 *
	 * @param name - Directory name
	 * @param builder - Directory builder
	 * @returns This builder for chaining
	 */
	withDirectory(name: string, builder: TempFSDirBuilder): this {
		this.rootDirs.push({name, builder});
		return this;
	}

	/**
	 * Build the temporary filesystem
	 *
	 * Creates a temporary directory and writes all configured files and directories.
	 * Returns the root path and a cleanup function.
	 *
	 * @returns TempFSResult with root path and cleanup function
	 */
	build(): TempFSResult {
		const tmpDir = dirSync({unsafeCleanup: true});

		// Write root-level files
		for (const {name, builder} of this.rootFiles) {
			const filePath = join(tmpDir.name, name);
			writeFileSync(filePath, builder.getContent(), 'utf-8');
		}

		// Write root-level directories
		for (const {name, builder} of this.rootDirs) {
			const dirPath = join(tmpDir.name, name);
			this.buildDirectory(dirPath, builder);
		}

		return {
			root: tmpDir.name,
			cleanup: () => tmpDir.removeCallback(),
		};
	}

	/**
	 * Recursively build a directory structure
	 *
	 * @param dirPath - Absolute path where directory should be created
	 * @param builder - Directory builder
	 */
	private buildDirectory(dirPath: string, builder: TempFSDirBuilder): void {
		mkdirSync(dirPath, {recursive: true});

		// Write files in this directory
		for (const {name, builder: fileBuilder} of builder.getFiles()) {
			const filePath = join(dirPath, name);
			writeFileSync(filePath, fileBuilder.getContent(), 'utf-8');
		}

		// Recursively build subdirectories
		for (const {name, builder: dirBuilder} of builder.getDirectories()) {
			const subDirPath = join(dirPath, name);
			this.buildDirectory(subDirPath, dirBuilder);
		}
	}
}
