import {parseJSON, parseCSV, parseYAML, parseXML} from './parsers';

export type DataFormat = 'json' | 'csv' | 'yaml' | 'xml' | 'unknown';

export interface DetectionResult {
  format: DataFormat;
  data: unknown;
}

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

  // Try YAML last (most permissive)
  const yamlResult = parseYAML(input);
  if (yamlResult !== null && yamlResult !== undefined) {
    return {format: 'yaml', data: yamlResult};
  }

  // Nothing worked
  return {format: 'unknown', data: null};
}
