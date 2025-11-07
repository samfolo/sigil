/**
 * Builder for creating temporary files with content
 */
export class TempFSFileBuilder {
	private fileContent: string = '';

	/**
	 * Set the complete file content
	 *
	 * @param content - File content as string
	 * @returns This builder for chaining
	 */
	withContent(content: string): this {
		this.fileContent = content;
		return this;
	}

	/**
	 * Append content to the file
	 *
	 * @param content - Content to append
	 * @returns This builder for chaining
	 */
	appendContent(content: string): this {
		this.fileContent += content;
		return this;
	}

	/**
	 * Get the file content
	 *
	 * @returns File content string
	 */
	getContent(): string {
		return this.fileContent;
	}
}
