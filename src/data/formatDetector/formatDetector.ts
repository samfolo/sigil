import {parseCSV, parseJSON, parseXML, parseYAML} from '@sigil/src/data/parsers';

export type DataFormat = 'json' | 'csv' | 'yaml' | 'xml' | 'unknown';

export interface DetectionResult {
  format: DataFormat;
  data: unknown;
}

const hasYamlStructure = (input: string): boolean => {
	// Check for YAML structural indicators:
	// - Key-value pairs (contains ':')
	// - Lists (starts lines with '-')
	// - Multi-line content (has newlines with structure)
	// - Explicit YAML structures ([], {})
	const trimmed = input.trim();

	// Check for key-value pairs or lists
	if (trimmed.includes(':') || /^\s*-\s+/m.test(trimmed)) {
		return true;
	}

	// Check for multi-line with indentation (structured content)
	const lines = trimmed.split('\n');
	if (lines.length > 1) {
		// Check if any line is indented (suggests structure)
		return lines.some(line => line.startsWith(' ') || line.startsWith('\t'));
	}

	return false;
};

export const detectFormat = (input: string): DetectionResult => {
	if (!input || input.trim().length === 0) {
		return {format: 'unknown', data: null};
	}

	// Try JSON first
	const jsonResult = parseJSON(input);
	if (jsonResult !== null && jsonResult !== undefined) {
		return {format: 'json', data: jsonResult};
	}

	// Try XML second
	const xmlResult = parseXML(input);
	if (xmlResult !== null && xmlResult !== undefined) {
		return {format: 'xml', data: xmlResult};
	}

	// Try CSV third
	const csvResult = parseCSV(input);
	if (csvResult !== null && csvResult !== undefined) {
		return {format: 'csv', data: csvResult};
	}

	// Try YAML last (most permissive), but only if it has structural indicators
	if (hasYamlStructure(input)) {
		const yamlResult = parseYAML(input);
		if (yamlResult !== null && yamlResult !== undefined) {
			return {format: 'yaml', data: yamlResult};
		}
	}

	// Nothing worked
	return {format: 'unknown', data: null};
}
