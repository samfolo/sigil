import {mkdirSync, writeFileSync} from 'fs';
import {join} from 'path';

import {dirSync} from 'tmp';

import type {Result} from '@sigil/src/common/errors/result';
import {err, ok} from '@sigil/src/common/errors/result';

import type {TempFSFileBuilder} from './tempFSFileBuilder';

/**
 * Filesystem node types
 */
export type TempFSNode =
	| {type: 'directory'; name: string; children: TempFSNode[]}
	| {type: 'file'; name: string; content: string | TempFSFileBuilder};

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
 * Provides fluent API for building recursive directory and file hierarchies.
 *
 * @example
 * ```typescript
 * const result = new TempFSBuilder()
 *   .withDirectory('logs', [
 *     dateDir('2025-11-07', [
 *       logFile('test.jsonl', [...]),
 *     ]),
 *   ])
 *   .withFile('root.txt', 'content')
 *   .build();
 *
 * if (!isOk(result)) {
 *   throw new Error(result.error);
 * }
 *
 * const {root, cleanup} = result.data;
 *
 * // Use root in tests
 * const files = readdirSync(root);
 *
 * // Clean up after test
 * cleanup();
 * ```
 */
export class TempFSBuilder {
	private nodes: TempFSNode[] = [];

	/**
	 * Add one or more filesystem nodes to the root
	 *
	 * @param nodes - Filesystem nodes to add (use with helper functions like logFile, dateDir)
	 * @returns This builder for chaining
	 */
	with(...nodes: TempFSNode[]): this {
		this.nodes.push(...nodes);
		return this;
	}

	/**
	 * Add a file to the root directory
	 *
	 * @param name - File name
	 * @param content - File content string or TempFSFileBuilder for complex cases
	 * @returns This builder for chaining
	 */
	withFile(name: string, content: string | TempFSFileBuilder): this {
		this.nodes.push({type: 'file', name, content});
		return this;
	}

	/**
	 * Add a directory to the root with children
	 *
	 * @param name - Directory name
	 * @param children - Array of TempFSNode children (files and subdirectories)
	 * @returns This builder for chaining
	 */
	withDirectory(name: string, children: TempFSNode[]): this {
		this.nodes.push({type: 'directory', name, children});
		return this;
	}

	/**
	 * Build the temporary filesystem
	 *
	 * Creates a temporary directory and recursively writes all configured files and directories.
	 * Returns the root path and a cleanup function.
	 *
	 * @returns Result containing TempFSResult with root path and cleanup function or error message
	 */
	build(): Result<TempFSResult, string> {
		try {
			const tmpDir = dirSync({unsafeCleanup: true});

			for (const node of this.nodes) {
				this.buildNode(tmpDir.name, node);
			}

			return ok({
				root: tmpDir.name,
				cleanup: () => tmpDir.removeCallback(),
			});
		} catch (error) {
			if (error instanceof Error) {
				return err(`Failed to build temporary filesystem: ${error.message}`);
			}
			return err(`Failed to build temporary filesystem: ${String(error)}`);
		}
	}

	/**
	 * Recursively build a filesystem node
	 *
	 * @param parentPath - Absolute path to parent directory
	 * @param node - Filesystem node to build
	 */
	private buildNode(parentPath: string, node: TempFSNode): void {
		if (node.type === 'file') {
			const filePath = join(parentPath, node.name);
			const content =
				typeof node.content === 'string'
					? node.content
					: node.content.getContent();
			writeFileSync(filePath, content, 'utf-8');
		} else {
			const dirPath = join(parentPath, node.name);
			mkdirSync(dirPath, {recursive: true});

			for (const child of node.children) {
				this.buildNode(dirPath, child);
			}
		}
	}
}
