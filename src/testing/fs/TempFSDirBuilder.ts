import {TempFSFileBuilder} from './TempFSFileBuilder';

/**
 * File entry in a directory
 */
export interface FileEntry {
	name: string;
	builder: TempFSFileBuilder;
}

/**
 * Directory entry in a directory
 */
export interface DirEntry {
	name: string;
	builder: TempFSDirBuilder;
}

/**
 * Builder for creating temporary directories with files and subdirectories
 */
export class TempFSDirBuilder {
	private files: FileEntry[] = [];
	private dirs: DirEntry[] = [];

	/**
	 * Add a file to this directory
	 *
	 * @param name - File name
	 * @param content - File content string or TempFSFileBuilder for complex cases
	 * @returns This builder for chaining
	 */
	withFile(name: string, content: string | TempFSFileBuilder): this {
		const builder = typeof content === 'string'
			? new TempFSFileBuilder().withContent(content)
			: content;
		this.files.push({name, builder});
		return this;
	}

	/**
	 * Add a subdirectory to this directory
	 *
	 * @param name - Directory name
	 * @param builder - Directory builder
	 * @returns This builder for chaining
	 */
	withDirectory(name: string, builder: TempFSDirBuilder): this {
		this.dirs.push({name, builder});
		return this;
	}

	/**
	 * Get all file entries
	 *
	 * @returns Array of file entries
	 */
	getFiles(): FileEntry[] {
		return this.files;
	}

	/**
	 * Get all directory entries
	 *
	 * @returns Array of directory entries
	 */
	getDirectories(): DirEntry[] {
		return this.dirs;
	}
}
