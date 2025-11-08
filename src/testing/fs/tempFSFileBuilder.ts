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
	 * Get the file content
	 *
	 * @returns File content as string
	 */
	getContent(): string {
		return this.fileContent;
	}
}
