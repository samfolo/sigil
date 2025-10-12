interface AnalysisPromptParams {
	format: string;
	dataSample: string;
}

/**
 * Generate the analysis prompt for data analysis
 */
export const buildAnalysisPrompt = ({format, dataSample}: AnalysisPromptParams): string => {
	return `Analyse this ${format} data sample and provide your analysis using the tool.

IMPORTANT for keyFields:
- "path" must be a valid JSONPath expression starting with $ (e.g., '$.name', '$.user.email', '$.items[0].id')
- "label" is the human-readable description for display
- Example: { "path": "$.A", "label": "Column A values" } or { "path": "$.user.name", "label": "User's full name" }
- All paths MUST start with $ to indicate JSONPath root
- Maximum 5 fields

Data sample:
${dataSample}`;
};
